var lang = (function(){

	var util = (function(){ // различные мелочи
		
		var Striter = function(str){ this.str = str, this.pos = 0, this.groups = {}; };
		Striter.prototype = {
			skip: function(group){ group = this.groups[group]; while(group.have(this.str.charAt(this.pos))) this.pos++; return this; },
			charIn: function(group){ return this.groups[group].have(this.str.charAt(this.pos)) },
			get: function(off, len){ return this.str.substr(this.pos + (off || 0), arguments.length < 2? 1: len); },
			gin: function(){ return this.str.charAt(this.pos++); }, // get and increase pos
			ing: function(){ return this.str.charAt(++this.pos); }, // increase pos and get
			end: function(){ return this.pos >= this.str.length },
			nend: function(){ return this.pos < this.str.length },
			have: function(str){ return this.str.substr(this.pos, str.length) === str; },
			match: function(reg){
				var match = (this.str.substr(this.pos).match(reg) || [])[0];
				return match && this.have(match)? match: null;
			},
			inc: function(len){ return this.pos += (arguments.length > 0? len: 1), this; },
			isSpace: function(c){ return this.spaces[c] },
			defineCharacterGroup: function(name, group){ this.groups[name] = group; },
			sequenceInGroup: function(g){ g = this.groups[g]; var r = ''; while(this.nend()&&g.have(this.get())) r += this.gin(); return r;},
			sequenceNotInGroup: function(g){ g = this.groups[g]; var r = ''; while(this.nend()&&!g.have(this.get())) r+=this.gin();return r;}
		}
		
		// abstract language exception
		var LanguageException = function(){};
		
		// some clash of definitions of tokens or lexems
		var DefinitionException = function(msg, token){ this.msg = msg, this.token = token }
		DefinitionException.prototype = new LanguageException();
		DefinitionException.prototype.toString = function(){ return 'DefinitionException: ' + this.msg; }
		
		// exception of turning source code string into a sequence of tokens
		var TokenizationException = function(msg, pos){ this.msg = msg, this.pos = pos }
		TokenizationException.prototype = new LanguageException();
		TokenizationException.prototype.toString = function(){ return 'TokenizationException at ' + this.pos + ': ' + this.msg; }
		
		var AggregationException = function(msg, state){ this.msg = msg, this.state = state };
		AggregationException.prototype = new LanguageException();
		AggregationException.prototype.toString = function(){ return 'AggregationException: ' + this.msg; }
		
		var CodeGenerationException = function(msg, lexem){ this.msg = msg, this.lexem = lexem }
		CodeGenerationException.prototype = new LanguageException();
		CodeGenerationException.prototype.toString = function(){ return 'CodeGenerationException: ' + this.msg }
		
		return {
			Striter: Striter,
			
			LanguageException: LanguageException,
			DefinitionException: DefinitionException, 
			TokenizationException: TokenizationException,
			AggregationException: AggregationException,
			CodeGenerationException: CodeGenerationException
		};
		
	})();

	var ast = (function(){ // abstract syntactic tree builder
	
		/*
			все построение синтаксического дерева разбито на две части: 
				токенизация - разбиение исходного текста на неделимые части, токены
				аггрегация - сборка из токенов единиц языка
				
			токен - кусок исходного кода. 
				определяется функцией, которая вызывается при попытке распарсить этот токен из кода
				такая функция может не вернуть значения - в случае, если в месте кода, где она вызвана, токена нет
				также функция имеет доступ к предыдущим токенам
				токены имеют приоритет, причем уникальный для каждого токена. 
				приоритет определяет, когда функция токена будет вызвана относительно функций других токенов
				
			лексическая конструкция, лексема - структура, объединяющая несколько токенов и/или других лексем
				лексема определяется последовательностью типов токенов и/или лексем
				такая последовательность - как маска.
				когда аггрегатор находит в токенах и ранее разобранных лексемах последовательность, подходящую под эту маску, 
					он создает из них новую лексему
				также лексемы имеют приоритет, но не обязательно уникальный. 
				он определяет, какие лексемы будут собраны из токенов раньше, какие - позже
				
				так как лексемы могут полагаться на другие лексемы, то в первую очередь собираются лексемы, не полагающиеся на другие лексемы, самодостаточные;
				далее на основании них собираются лексемы по приоритетам
				
			и токены, и лексемы формируют дерево классов
			токен/лексема, не имеющая функции парсинга/последовательности токенов-лексем - абстрактная; такой токен/лексема никогда не парсятся
			абстрактные токены/лексемы нужны исключительно для удобства пользования ими
			также токен/лексема может быть назначена абстрактной даже при наличии функции/последовательности, при необходимости
				
		*/
		var compareByPriority = function(a, b){ return b.priority - a.priority }

		var Tokenizer = function(){ this.tokens = [], this.tokenPriorities = {}, this.charGroups = {}, this.postProcessors = []; }
		Tokenizer.prototype = {
			defineToken:function(token){
				if(token.isAbstract) return;
				if(this.tokenPriorities[token.priority]) 
					throw new util.DefinitionException("failed to define token with priority " + token.priority + ": already have token with such priority", token);
				this.tokenPriorities[token.priority] = true;
				this.tokens[token.priority] = token;
			},
			getTokens: function(){ return this.tokens },
			defineCharacterGroup:function(name, group){ this.charGroups[name] = group },
			definePostProcessor:function(func, priority){ this.postProcessors.push({priority:priority || 0, func: func}); },
			tokenize:function(str){
				var parsed = [], iter = new util.Striter(str);
				
				for(i in this.charGroups) iter.defineCharacterGroup(i, this.charGroups[i]);
				
				this.tokens = this.tokens.sort(compareByPriority);
				this.postProcessors = this.postProcessors.sort(compareByPriority);
				
				while(iter.nend()){
					var next = this.nextToken(parsed, iter);
					if(!next) throw new util.TokenizationException("could not parse token", iter.pos);
					parsed.push(next);
				}
				
				for(i in this.postProcessors) parsed = this.postProcessors[i].func.call(this, parsed);
				
				return parsed;
			},
			nextToken:function(parsed, iter){
				for(var i in this.tokens){
					var token = this.tokens[i].parse(iter, parsed);
					if(token) return token;
				}
			}
		};
		
		
		var Token = function(){ 
			/* properties: 
				definition: parse, priority, isAbstract
				instance: content
			*/
		}
		Token.prototype.parse = function(iter){ 
			throw new util.TokenizationException('could not parse token: no parsing function defined', iter.pos); 
		}
		
		var Aggregator = function(tokenizer){ this.lexems = [], this.lexemsByPriority = {}, this.tokenizer = tokenizer }
		Aggregator.prototype = {
			defineLexem:function(lexem){ 
				if(lexem.isAbstract) return;
				this.lexems.push(lexem); 
				if(!this.lexemsByPriority[lexem.priority]) this.lexemsByPriority[lexem.priority] = [];
				this.lexemsByPriority[lexem.priority].push(lexem);
			},
			getLexems: function(){ return this.lexems; },
			aggregate:function(tokens){
				this.lexems = this.lexems.sort(compareByPriority);
				var state = new State(tokens, this.tokenizer, this);
				
				while(true){
					var lexem = state.findMatchingLexem(this.lexems);
					if(!lexem) {
						if(state.isMutatedCompletely()) return state.getMutationsResult();
						else throw new util.AggregationException('could not find matching lexem', state);
					}
					state.mutate(this.lexemsByPriority[lexem.priority]);
				}
			}
		}
		
		var StateElement = function(val, tokenizer, aggregator){ this.val = val, this.tokenizer = tokenizer, this.aggregator = aggregator }
		StateElement.prototype = {
			matches: function(lexem, pos){
				return !(this.val instanceof lexem.pattern[pos] && (pos !== 0 || !lexem.condition || lexem.condition(this)))? 
							false:
							pos === lexem.pattern.length - 1? 
								true:
								this.next?
									this.next.matches(lexem, pos + 1):
									false;
			},
			findMatchingIn: function(lexems){
				for(var i in lexems) if(this.matches(lexems[i], 0)) return lexems[i];
			},
			haveMatchInChain: function(lexem){
				return this.matches(lexem, 0)? 
							true:
							this.next?
								this.next.haveMatchInChain(lexem):
								false;
			},
			getAhead: function(count){
				var res = this;
				while(res && count--) res = res.next;
				return res;
			},
			mutateAheadMultiple: function(lexems){
				var aheadable = [], i;
				for(i in lexems)
					if(lexems[i].reverseLookaheadLength)
						aheadable.push(lexems[i]);
						
				if(!aheadable.length) return false;
				
				for(var i in aheadable){
					var lexem = aheadable[i];
					var ahead = this.getAhead(lexem.reverseLookaheadLength);
					if(!ahead || !ahead.findMatchingIn(aheadable)) continue;
					if(!ahead.mutateAheadMultiple(aheadable))
						ahead.mutateMultiple(aheadable)
					return true;
				}
				return false;
			},
			mutate: function(lexem){
				var content = [this.val], l = lexem.pattern.length;
				while(--l > 0){
					content.push(this.next.val);
					this.next = this.next.next;
				}
				if(this.next) this.next.prev = this;
				this.val = new lexem(content);
			},
			mutateMultiple: function(lexems){
				var lexem;
				while(lexem = this.findMatchingIn(lexems)){
					while(this.mutateAheadMultiple(lexems));
					this.mutate(lexem);
				}
				if(this.next) this.next.mutateMultiple(lexems);
			}
		}
		
		var State = function(tokens, tokenizer, aggregator){
			this.tokenizer = tokenizer, this.aggregator = aggregator;
			var i = 0, l = tokens.length, el, newEl;
			if(l === 0) return;
			
			this.first = el = new StateElement(tokens[0], tokenizer, aggregator);
			while(++i < l){
				newEl = new StateElement(tokens[i], tokenizer, aggregator);
				el.next = newEl;
				newEl.prev = el;
				el = newEl;
			}
		}
		State.prototype = {
			findMatchingLexem: function(lexems){ 
				for(var i in lexems)
					if(this.haveMatch(lexems[i])) 
						return lexems[i]; 
			},
			haveMatch: function(lexem){ return this.first.haveMatchInChain(lexem); },
			mutate: function(lexems){ this.first.mutateMultiple(lexems); },
			isMutatedCompletely: function(){
				return this.first && !this.first.next && this.first.val instanceof Lexem 
			},
			getMutationsResult: function(){ return this.first.val; },
			toString: function(){
				var el = this.first, result = [];
				while(el){
					result.push(el.val + '');
					el = el.next;
				}
				return result.join(' ');
			}
		}
		
		
		var Lexem = function(){
			/* properties:
				definition: pattern (sequence of token/lexem defintions), priority, toCode, condition
				instance: content (sequence of token/lexem instances)
			*/
		}
		Lexem.prototype.toCode = function(){ throw new util.CodeGenerationException('could not generate code from lexem: have no code generation function', this); }
		
		var CharacterGroup = function(characters){
			this.chars = {}, this.linked = [];
			for(var i = 0; i < arguments.length; i++){
				var arg = arguments[i];
				if(typeof(arg) === 'string') this.add(arg);
				else this.link(arg);
			}
		}
		CharacterGroup.prototype = {
			add: function(c){ this.chars[c] = true; },
			remove: function(c){ delete this.chars[c]; },
			link: function(group){ this.linked.push(group); },
			unlink: function(group){
				var linked = [];
				for(var i in this.linked)
					if(this.linked[i] !== group)
						linked.push(this.linked[i]);
				this.linked = linked;
			},
			have: function(c){
				if(this.chars[c]) return true;
				for(var i in this.linked) if(this.linked[i].have(c)) return true;
				return false;
			},
			isMakingUp: function(str){
				for(var i = 0; i < str.length; i++)
					if(!this.have(str.charAt(i)))
						return false;
				return true;
			}
		}
		
		return { 
			Tokenizer: Tokenizer, 
			Token: Token, 
			CharacterGroup: CharacterGroup, 
			Aggregator: Aggregator, 
			State: State, 
			StateElement: StateElement,
			Lexem: Lexem
		};
	
	})();
	
	var definition = (function(){ // language token and lexem definitions
	
		var tokens = {}, lexems = {},
			t = tokens, l = lexems; // just to keep code short
		
		// функция для определения нового токена
		var token = function(parent, name, priority, parse, isAbstract){
			
			parent = parent? tokens[parent]: ast.Token;
			var token = function(content){ this.content = content; };
			token.prototype = new parent();
			
			token.prototype.toString = token.toString = function(){ 
				return this instanceof token?
					'ti:' + name + '(' + this.content + ')':
					'td:' + name;
			}
			token.prototype.priority = token.priority = priority;
			token.prototype.isAbstract = token.isAbstract = typeof(isAbstract) === 'boolean'? isAbstract: parse? false: true;
			token.prototype.getName = token.getName = function(){ return name };
			token.prototype.parent = token.parent = parent;
			token.prototype.parse = token.parse = parse? function(iter, parsed){
					var content = parse.call(this || token, iter, parsed);
					return content === undefined? null: new (this || token)(content);
				} : function(iter, parsed){ 
					var firstParseableParent = parent;
					while(!firstParseableParent.parse) firstParseableParent = firstParseableParent.parent;
					return firstParseableParent.parse.call(this, iter, parsed); 
				}
			
			return tokens[name] = token;
		};
		
		var generatePriorityForKey = (function(){
			
			var offset = 10000, // приоритеты для ключей длиной 1 начнутся с этого значения
				keysPerLength = 1000, // количество возможных различных ключей на 1 значение длины
				maxPriority = 0x8fffffff;
				
			var ownedValues = {};
			
			return function(word){
				var len = word.length, result;
				if(!((len + '') in ownedValues)) {
					ownedValues[len] = 0;
					result = (len * keysPerLength) + offset;
				} else {
					ownedValues[len] = ownedValues[len] + 1;
					if(ownedValues[len] >= keysPerLength)
						throw new util.DefinitionException('could not determine priority for key "' + word + '": there is already defined maximum of ' + keysPerLength + ' for keys with length ' + len, word);
					result = (len * keysPerLength) + offset + ownedValues[len];
				}
				if(result >= maxPriority)
					throw new util.DefinitionException('could not determine priority for key "' + word + '": priority ' + result + ' is above maximum priority for keys =' + maxPriority + '. (maybe the key is too long?)', word);
				return result;
			}
			
		})();
		
		// функция для определения нового ключевого слова / ключевой последовательности символов (оператора или чего-то в этом роде)
		var key = function(name, word){
			var key = token('Key', name, generatePriorityForKey(word), null, false);
			key.prototype.sequence = key.sequence = word;
			return key;
		}
		
		var lexem = function(parent, name, priority, patternWithNames, toCode, isAbstract, reverseLookaheadLength, condition){
			
			var pattern = [], argNames = [];
			if(!Array.isArray(patternWithNames) || !patternWithNames || patternWithNames.length === 0) 
				pattern = undefined, argNames = undefined;
			else 
				for(var i in patternWithNames) {
					var count = 0;
					for(var j in patternWithNames[i]){
						pattern.push(patternWithNames[i][j]);
						argNames.push(j);
						count ++;
					}
					if(count !== 1) throw new util.DefinitionException('failed to register ' + name + ' lexem: every single part of pattern must be object with exactly one key-value pair');
				}
			
			parent = parent? lexems[parent]: ast.Lexem;
			var lexem = function(content){ 
				this.content = content; 
				for(var i in this.argNames) this[this.argNames[i]] = content[i];
			};
			lexem.prototype = new parent();
			
			lexem.prototype.toString = lexem.toString = function(tabs){ 
				tabs = tabs || '';
				if(!(this instanceof lexem)) return tabs + 'ld:' + name;
				var result = 'li:' + name + '(';
				switch(this.content.length){
					case 0: return result + ')';
					case 1: return result + this.argNames[0] + ' = ' + this.content[0].toString('') + ')';
					default:
						var newTabs = tabs + '\t';
						result += '\n';
						for(var i in this.content) result += newTabs + this.argNames[i] + ' = ' + this.content[i].toString(newTabs) + '\n';
						result += tabs + ')';
						return result;
				}
			}
			
			lexem.prototype.reverseLookaheadLength = lexem.reverseLookaheadLength = reverseLookaheadLength || 0;
			lexem.prototype.priority = lexem.priority = priority;
			lexem.prototype.isAbstract = lexem.isAbstract = typeof(isAbstract) === 'boolean'? isAbstract: pattern? false: true;
			lexem.prototype.getName = lexem.getName = function(){ return name};
			lexem.prototype.parent = lexem.parent = parent;
			lexem.prototype.pattern = lexem.pattern = pattern;
			lexem.prototype.argNames = lexem.argNames = argNames;
			if(pattern && pattern.length < 1) throw new util.DefinitionException('failed to register ' + name + ' lexem: pattern must be at least 1 element long');
			if(toCode) lexem.prototype.toCode = lexem.toCode = toCode;
			if(condition) lexem.prototype.condition = lexem.condition = condition;
			
			return lexems[name] = lexem;
		}
		
		var lexemsEndingWith = function(lexems, token){
			var result = [];
			for(var i in lexems){
				var lexem =	lexems[i];
				if(!lexem.isAbstract && (token instanceof lexem.pattern[lexem.pattern.length - 1]))
					result.push(lexem);
			}
			return result;
		}
		var allLexemsHaveHigherOrEqualPriorityThan = function(lexems, priority){
			for(var i in lexems)
				if(lexems[i].priority < priority)
					return false;
			return true;
		}
		var duplicateUnaryOperatorAggregationCondition = function(priority){
			return function(el){
				
				return !el.prev || (
							el.prev.val instanceof ast.Token && 
							allLexemsHaveHigherOrEqualPriorityThan(
								lexemsEndingWith(
									el.aggregator.getLexems(), 
									el.prev
								), 
								priority
							)
						)
			};
		}
		
		token(null, 'TrashToken');
		token('TrashToken', 'Space', 0x80000000, function(iter){ return iter.sequenceInGroup('space') || undefined; });
		token('TrashToken', 'Comment');
		token('Comment', 'OneLineComment', 0x80000001, function(iter){
			if(!iter.have('//')) return;
			iter.inc(2);
			return iter.sequenceNotInGroup('newline');
		});
		token('Comment', 'MultiLineComment', 0x80000002, function(iter){
			if(!iter.have('/*')) return;
			iter.inc(2);
			var result = '';
			while(iter.nend() && !iter.have('*/')) result += iter.gin();
			if(iter.end()) throw new util.TokenizationException('multiline comment have no end', iter.pos);
			iter.inc(2);
			return result;
		});
		token(null, 'Key', null, function(iter){
			return iter.have(this.sequence) && (!isIdentifier(this.sequence) || !identifierChars.have(iter.get(this.sequence.length)))? 
						(iter.inc(this.sequence.length), this.sequence):
						undefined;
		}, true); // некая константная последовательность символов
		token(null, 'Identifier', 9000, function(iter){ 
			if(!iter.charIn('identifierStart')) return;
			var result = '';
			while(iter.charIn('identifier')) result += iter.gin();
			return result;
		}); 
		token(null, 'Literal');
		token('Literal', 'String', 8000, function(iter){
			var startChar = iter.get(), escaped = false, result = '', char;
			if(startChar !== '"' && startChar !== "'") return;

			while(iter.nend()){
				char = iter.ing()

				if(escaped) {
					escaped = false;
					switch(char){
						case 'n': result += '\n'; continue;
						case 'r': result += '\r'; continue;
						case 't': result += '\t'; continue;
						case 'b': result += '\b'; continue;
						case 'f': result += '\f'; continue;
						case 'O': result += '\O'; continue;
						case 'v': result += '\v'; continue;
						default: result += char; continue;
					} 
				}
				else if(char === '\\') escaped = true;
				else if(char === startChar) {
					iter.inc();
					break;
				} else result += char;
			}
			
			if(char !== startChar) throw new util.TokenizationException("string have opening quote, but have no closing one", iter.pos);

			return result;
		});
		token('Literal', 'Number', 8001, (function(){
			
			var zero = '0'.charCodeAt(0), a = 'a'.charCodeAt(0) - 10;
			
			var intOf = function(str, mult){
				var l = str.length, i, res = 0, c;
				for(i = 0; i < l; i++) res = (res * mult) + (str.charCodeAt(i) - (digits.have(str.charAt(i))? zero: a));
				return res;
			}
			
			var fractOf = function(str){
				var l = str.length, i, res = 0, div = 1;
				for(i = 0; i < l; i++) div *= 10, res += (str.charCodeAt(i) - zero) / div;
				return res;
			}
			
			return function(iter){
				var char = iter.get();
				if(!digits.have(char)) return;
				
				var result = 0, startPart = iter.sequenceInGroup('digits');
				
				if(char === '0'){
					if(startPart.length === 1){
						switch(iter.get()){
							case 'x': return iter.inc(), intOf(iter.sequenceInGroup('hexDigits'), 16);
							case 'b': return iter.inc(), intOf(iter.sequenceInGroup('binDigits'), 2);
							case '.': return iter.inc(), intOf(startPart, 10) + fractOf(iter.sequenceInGroup('digits'));
							default: return 0;
						}
					}
					if(octDigits.isMakingUp(startPart)) return intOf(startPart, 8);
				}
				return intOf(startPart, 10) + ((iter.get() === '.')? (iter.inc(), fractOf(iter.sequenceInGroup('digits'))): 0);
			}
		})());
		
		key('Plus', '+');
		key('Minus', '-');
		key('Asterisk', '*');
		key('Slash', '/');
		key('Percent', '%');
		key('Tilde', '~');
		key('Ampersand', '&');
		key('Obelisk', '|');
		key('Circumflex', '^');
		key('Comma', ',');
		key('Point', '.');
		key('Question', '?');
		key('Colon', ':');
		
		key('Equals', '=');
		key('PlusEquals', '+=');
		key('MinusEquals', '-=');
		key('DoubleAsteriskEquals', '**=');
		key('AsteriskEquals', '*=');
		key('SlashEquals', '/=');
		key('PercentEquals', '%=');
		key('DoubleLesserEquals', '<<=');
		key('DoubleGreaterEquals', '>>=');
		key('TripleGreaterEquals', '>>>=');
		key('AmpersandEquals', '&=');
		key('CircumflexEquals', '^=');
		key('ObeliskEquals', '|=');
		
		key('Exclamation', '!');
		key('Greater', '>');
		key('Lesser', '<');
		key('LesserOrEquals', '<=');
		key('GreaterOrEquals', '>=');
		
		key('Typeof', 'typeof');
		key('Delete', 'delete');
		key('In', 'in');
		key('Instanceof', 'instanceof');
		
		key('DoubleAsterisk', '**');
		key('DoublePlus', '++');
		key('DoubleMinus', '--');
		key('DoubleAmpersand', '&&');
		key('DoubleObelisk', '||');
		key('DoubleGreater', '>>');
		key('TripleGreater', '>>>');
		key('DoubleLesser', '<<');
		
		key('DoubleEquals', '==');
		key('TripleEquals', '===');
		key('ExclamationEquals', '!=');
		key('ExclamationDoubleEquals', '!==');
		
		key('LeftParenthesis', '(');
		key('RightParenthesis', ')');
		key('LeftBracket', '[');
		key('RightBracket', ']');
		key('LeftBrace', '{');
		key('RightBrace', '}');
		
		key('True', 'true');
		key('False', 'false');
		key('Undefined', 'undefined');
		key('Null', 'null');
		
		lexem(null, 'Expression');
		lexem('Expression', 'Literal');
		lexem('Literal', 'String', 8000, [{value:t.String}], function(){ 
			return '"' + this.value.content.toString()
					.replace('\\', '\\\\')
					.replace('"', '\\"')
					.replace("'", "\\'")
					.replace('\n', '\\n')
					.replace('\r', '\\r')
					.replace('\b', '\\b')
					.replace('\f', '\\f')
					.replace('\O', '\\O')
					.replace('\t', '\\t')
					.replace('\v', '\\v')
					+ '"'; 
		});
		lexem('Literal', 'Number', 8000, [{value:t.Number}], function(){ return this.value.content.toString(); });
		lexem('Literal', 'Boolean');
		lexem('Boolean', 'True', 8000, [{value:t.True}], function(){ return 'true' });
		lexem('Boolean', 'False', 8000, [{value:t.False}], function(){ return 'false' });
		lexem('Literal', 'Undefined', 8000, [{value:t.Undefined}], function(){ return 'undefined' });
		lexem('Literal', 'Null', 8000, [{value:t.Null}], function(){ return 'null' });
		
		lexem('Expression', 'Identifier');
		lexem('Identifier', 'SingleIdentifier', 7999, [{value:t.Identifier}], function(){ return this.value.content.toString(); })
		lexem('Identifier', 'IdentifierChain', 900, [{left:l.Expression}, {sign:t.Point}, {right:l.Identifier}], function(){
			return this.left.toCode() + '.' + this.right.toCode();
		});
		
		var typicalBinOpCodeGen = function(){ return '(' + this.left.toCode() + this.sign.content + this.right.toCode() + ')'; },
			typicalTernOpCodeGen = function(){ return '(' + 
				this.first.toCode() + 
				this.leftSign.content + 
				this.second.toCode() + 
				this.rightSign.content + 
				this.third.toCode() + ')'; },
			typicalPrefixOpCodeGen = function(){ return '(' + this.sign.content + this.operand.toCode() + ')' },
			typicalPostfixOpCodeGen = function(){ return '(' + this.operand.toCode() + this.sign.content + ')' };
		
		lexem('Expression', 'Operator');
		lexem('Operator', 'BinaryOperator', null, null, typicalBinOpCodeGen);
		lexem('Operator', 'TernaryOperator', null, null, typicalTernOpCodeGen);
		lexem('Operator', 'UnaryOperator');
		lexem('UnaryOperator', 'PrefixUnaryOperator', null, null, typicalPrefixOpCodeGen);
		lexem('UnaryOperator', 'PostfixUnaryOperator', null, null, typicalPostfixOpCodeGen);
		
		lexem('BinaryOperator', 'Comma', 100, [{left:l.Expression}, {sign:t.Comma}, {right:l.Expression}]);
		
		lexem('TernaryOperator', 'ConditionalOperator', 150, [{first:l.Expression}, {leftSign:t.Question}, {second:l.Expression}, {rightSign:t.Colon}, {third:l.Expression}], null, false, 4);
		
		lexem('BinaryOperator', 'Assignment', 200, [{left:l.Identifier}, {sign:t.Equals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'AdditionAssignment', 200, [{left:l.Identifier}, {sign:t.PlusEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'SubtractionAssignment', 200, [{left:l.Identifier}, {sign:t.MinusEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'ExponentiationAssignment', 200, [{left:l.Identifier}, {sign:t.DoubleAsteriskEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'MultiplicationAssignment', 200, [{left:l.Identifier}, {sign:t.AsteriskEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'DivisionAssignment', 200, [{left:l.Identifier}, {sign:t.SlashEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'RemainderAssignment', 200, [{left:l.Identifier}, {sign:t.PercentEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'ShiftLeftAssignment', 200, [{left:l.Identifier}, {sign:t.DoubleLesserEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'ShiftRightAssignment', 200, [{left:l.Identifier}, {sign:t.DoubleGreaterEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'UnsignedShiftRightAssignment', 200, [{left:l.Identifier}, {sign:t.TripleGreaterEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'BitwiseAndAssignment', 200, [{left:l.Identifier}, {sign:t.AmpersandEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'BitwiseXorAssignment', 200, [{left:l.Identifier}, {sign:t.CircumflexEquals}, {right:l.Expression}], null, false, 2);
		lexem('BinaryOperator', 'BitwiseOrAssignment', 200, [{left:l.Identifier}, {sign:t.ObeliskEquals}, {right:l.Expression}], null, false, 2);
		
		lexem('BinaryOperator', 'LogicalOr', 300, [{left:l.Expression}, {sign:t.DoubleObelisk}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'LogicalAnd', 350, [{left:l.Expression}, {sign:t.DoubleAmpersand}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'BitwiseOr', 400, [{left:l.Expression}, {sign:t.Obelisk}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'BitwiseXor', 450, [{left:l.Expression}, {sign:t.Circumflex}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'BitwiseAnd', 500, [{left:l.Expression}, {sign:t.Ampersand}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'Equality', 550, [{left:l.Expression}, {sign:t.DoubleEquals}, {right:l.Expression}]);
		lexem('BinaryOperator', 'StrictEquality', 550, [{left:l.Expression}, {sign:t.TripleEquals}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Inequality', 550, [{left:l.Expression}, {sign:t.ExclamationEquals}, {right:l.Expression}]);
		lexem('BinaryOperator', 'StrictInequality', 550, [{left:l.Expression}, {sign:t.ExclamationDoubleEquals}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'In', 600, [{left:l.Expression}, {sign:t.In}, {right:l.Expression}],
			function(){ return '('  + this.left.toCode() + ' in ' + this.right.toCode() + ')'});
		lexem('BinaryOperator', 'Instanceof', 600, [{left:l.Expression}, {sign:t.Instanceof}, {right:l.Expression}],
			function(){ return '('  + this.left.toCode() + ' instanceof ' + this.right.toCode() + ')'});
		lexem('BinaryOperator', 'Less', 600, [{left:l.Expression}, {sign:t.Lesser}, {right:l.Expression}]);
		lexem('BinaryOperator', 'LessOrEqual', 600, [{left:l.Expression}, {sign:t.LesserOrEquals}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Greater', 600, [{left:l.Expression}, {sign:t.Greater}, {right:l.Expression}]);
		lexem('BinaryOperator', 'GreaterOrEqual', 600, [{left:l.Expression}, {sign:t.GreaterOrEquals}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'LeftShift', 650, [{left:l.Expression}, {sign:t.DoubleLesser}, {right:l.Expression}]);
		lexem('BinaryOperator', 'RightShift', 650, [{left:l.Expression}, {sign:t.DoubleGreater}, {right:l.Expression}]);
		lexem('BinaryOperator', 'UnsignedRightShift', 650, [{left:l.Expression}, {sign:t.TripleGreater}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'Addition', 700, [{left:l.Expression}, {sign:t.Plus}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Subtraction', 700, [{left:l.Expression}, {sign:t.Minus}, {right:l.Expression}]);
		
		lexem('BinaryOperator', 'Multiplication', 750, [{left:l.Expression}, {sign:t.Asterisk}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Division', 750, [{left:l.Expression}, {sign:t.Slash}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Remainder', 750, [{left:l.Expression}, {sign:t.Percent}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Exponentiation', 750, [{left:l.Expression}, {sign:t.DoubleAsterisk}, {right:l.Expression}], null, false, 2);
		
		lexem('PrefixUnaryOperator', 'PrefixIncrement', 800, [{sign:t.DoublePlus}, {operand:l.Identifier}]);
		lexem('PrefixUnaryOperator', 'PrefixDecrement', 800, [{sign:t.DoubleMinus}, {operand:l.Identifier}]);
		lexem('PrefixUnaryOperator', 'BitwiseNot', 800, [{sign:t.Tilde}, {operand:l.Expression}]);
		lexem('PrefixUnaryOperator', 'LogicalNot', 800, [{sign:t.Exclamation}, {operand:l.Expression}]);
		lexem('PrefixUnaryOperator', 'Typeof', 800, [{sign:t.Typeof}, {operand:l.Expression}], 
			function(){ return '(typeof(' + this.operand.toCode() + '))'});
		lexem('PrefixUnaryOperator', 'Delete', 800, [{sign:t.Delete}, {operand:l.Identifier}], 
			function(){ return '(delete ' + this.operand.toCode() + ')' });
		lexem('PrefixUnaryOperator', 'UnaryMinus', 800, [{sign:t.Minus}, {operand:l.Expression}], null, false, 0, duplicateUnaryOperatorAggregationCondition(800));
		lexem('PrefixUnaryOperator', 'UnaryPlus', 800, [{sign:t.Plus}, {operand:l.Expression}], null, false, 0, duplicateUnaryOperatorAggregationCondition(800));
		
		lexem('PostfixUnaryOperator', 'PostfixIncrement', 850, [{operand:l.Identifier}, {sign:t.DoublePlus}]);
		lexem('PostfixUnaryOperator', 'PostfixDecrement', 850, [{operand:l.Identifier}, {sign:t.DoubleMinus}]);
		
		lexem('Expression','Parenthesis', 1500, [{left: t.LeftParenthesis}, {body:l.Expression}, {right: t.RightParenthesis}], 
			function(){ return '(' + this.body.toCode() + ')'; })
		
		var binDigits = new ast.CharacterGroup('0','1'),
			octDigits = new ast.CharacterGroup(binDigits,'2','3','4','5','6','7'),
			digits = new ast.CharacterGroup(octDigits, '8', '9'),
			hexDigits = new ast.CharacterGroup(digits, "a","b","c","d","e","f","A","B","C","D","E","F"),
			identifierStartChars = new ast.CharacterGroup(),
			identifierChars = new ast.CharacterGroup(digits, identifierStartChars),
			newlineChars = new ast.CharacterGroup('\n', '\r'),
			spaceChars = new ast.CharacterGroup('\t', ' ', newlineChars);
			
		(function(){
			var i, start, finish;
			
			identifierStartChars.add('_');
			identifierStartChars.add('$');
			
			start = 'a'.charCodeAt(0), finish = 'z'.charCodeAt(0);
			for(i = start; i <= finish; i++) identifierStartChars.add(String.fromCharCode(i));
			
			start = 'A'.charCodeAt(0), finish = 'Z'.charCodeAt(0);
			for(i = start; i <= finish; i++) identifierStartChars.add(String.fromCharCode(i));
		})();
		
		var isIdentifier = function(str){ return str.length > 0 && identifierStartChars.have(str.charAt(0)) && identifierChars.isMakingUp(str) }
		
		var removeTrashTokensPostProcessor = function(t){
			var result = [];
			for(var i in t)
				if(!(t[i] instanceof tokens.TrashToken))
					result.push(t[i]);
			return result;
		}
	
		return {
			tokens: tokens,
			lexems: lexems,
			
			charGroups: {
				space: spaceChars,
				newline: newlineChars,
				identifier: identifierChars,
				identifierStart: identifierStartChars,
				digits: digits,
				octDigits: octDigits,
				hexDigits: hexDigits,
				binDigits: binDigits
			},
			
			tokenizerPostProcessors: {
				'100': removeTrashTokensPostProcessor
			},
			
			defineToken: token
		}
	
	})();


	return {
		ast: ast,
		util: util,
		definition: definition,
		
		getTokenizer: function(){
			var tokenizer = new this.ast.Tokenizer(), i;
			for(i in this.definition.tokens) tokenizer.defineToken(this.definition.tokens[i]);
			for(i in this.definition.charGroups) tokenizer.defineCharacterGroup(i, this.definition.charGroups[i]);
			for(i in this.definition.tokenizerPostProcessors) tokenizer.definePostProcessor(this.definition.tokenizerPostProcessors[i], parseInt(i));
			return tokenizer;
		},
		
		getAggregator: function(tokenizer){
			var aggregator = new this.ast.Aggregator(tokenizer || this.getTokenizer()), i;
			for(i in this.definition.lexems) aggregator.defineLexem(this.definition.lexems[i]);
			return aggregator;
		},
		
		tokenize: function(str, tokenizer, aggregator){ return (tokenizer || this.getTokenizer()).tokenize(str, aggregator || this.getAggregator()); },
		aggregate: function(tokens, aggregator){ return (aggregator || this.getAggregator()).aggregate(tokens); },
		
		treeOf: function(str){ 
			var t = this.getTokenizer(), a = this.getAggregator(t);
			return this.aggregate(this.tokenize(str, t, a), a); 
		}
	}
	
})();
