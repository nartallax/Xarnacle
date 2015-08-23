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
			CodeGenerationException: CodeGenerationException,
			
			escapeString: function(str){
				return str
					.replace('\\', '\\\\')
					.replace('"', '\\"')
					.replace("'", "\\'")
					.replace('\n', '\\n')
					.replace('\r', '\\r')
					.replace('\b', '\\b')
					.replace('\f', '\\f')
					.replace('\O', '\\O')
					.replace('\t', '\\t')
					.replace('\v', '\\v');
			}
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
		
		var Aggregator = function(){ this.lexems = [], this.lexemsByPriority = {} }
		Aggregator.prototype = {
			defineLexem:function(lexem){ 
				if(lexem.isAbstract) return;
				this.lexems.push(lexem); 
				if(!this.lexemsByPriority[lexem.priority]) this.lexemsByPriority[lexem.priority] = [];
				this.lexemsByPriority[lexem.priority].push(lexem);
			},
			aggregate:function(tokens){
				this.lexems = this.lexems.sort(compareByPriority);
				var state = new State(tokens);
				
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
		
		var StateElement = function(val){ this.val = val; }
		StateElement.prototype = {
			matches: function(lexem, pos){
				return this.val instanceof lexem.pattern[pos]? 
							pos === lexem.pattern.length - 1? 
								true:
								this.next?
									this.next.matches(lexem, pos + 1):
									false:
							false;
			},
			findMatchingIn: function(lexems){
				for(var i in lexems) if(!lexems[i].isAbstract && this.matches(lexems[i], 0)) return lexems[i];
			},
			haveMatchInChain: function(lexem){
				return this.matches(lexem, 0)? 
							true:
							this.next?
								this.next.haveMatchInChain(lexem):
								false;
			},
			mutate: function(lexem){
				var content = [this.val], l = lexem.pattern.length;
				while(--l > 0){
					content.push(this.next.val);
					this.next = this.next.next;
				}
				this.val = new lexem(content);
			},
			mutateMultiple: function(lexems){
				var lexem;
				while(lexem = this.findMatchingIn(lexems)) this.mutate(lexem);
				if(this.next) this.next.mutateMultiple(lexems);
			}
		}
		
		var State = function(tokens){
			var i = 0, l = tokens.length, el, newEl;
			if(l === 0) return;
			
			this.first = el = new StateElement(tokens[0]);
			while(++i < l){
				newEl = new StateElement(tokens[i]);
				el.next = newEl;
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
				definition: pattern (sequence of token/lexem defintions), priority, toCode
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
			
			token.prototype.toString = token.toString = function(tabs){ 
				return (tabs || '') + (this instanceof token?
					'ti:' + name + '(' + this.content + ')':
					'td:' + name);
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
		
		var lexem = function(parent, name, priority, patternWithNames, toCode, isAbstract){
			
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
				for(var i in this.argNames) this[argNames[i]] = content[i];
			};
			lexem.prototype = new parent();
			
			lexem.prototype.toString = lexem.toString = function(tabs){ 
				tabs = tabs || '';
				if(!(this instanceof lexem)) return tabs + 'ld:' + name;
				var result = tabs + 'li:' + name + '(';
				switch(this.content.length){
					case 0: return result + ')';
					case 1: return result + this.content[0].toString('') + ')';
					default:
						var newTabs = tabs + '\t';
						result += '\n';
						for(var i in this.content) result += this.content[i].toString(newTabs) + '\n';
						result += tabs + ')';
						return result;
				}
			}
			lexem.prototype.priority = lexem.priority = priority;
			lexem.prototype.isAbstract = lexem.isAbstract = typeof(isAbstract) === 'boolean'? isAbstract: pattern? false: true;
			lexem.prototype.getName = lexem.getName = function(){ return name};
			lexem.prototype.parent = lexem.parent = parent;
			lexem.prototype.pattern = lexem.pattern = pattern;
			lexem.prototype.argNames = lexem.argNames = argNames;
			if(pattern && pattern.length < 1) throw new util.DefinitionException('failed to register ' + name + ' lexem: pattern must be at least 1 element long');
			if(toCode) lexem.prototype.toCode = lexem.toCode = toCode;
			
			return lexems[name] = lexem;
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
			return iter.have(this.sequence) && (!isIdentifier(this.sequence) || !identfierChars.have(iter.get(this.sequence.length)))? 
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
		key('DoublePlus', '++');
		key('DoubleMinus', '--');
		
		lexem(null, 'Expression');
		lexem('Expression', 'Literal');
		lexem('Literal', 'String', 8000, [{value:t.String}], function(){ 
			return '"' + util.escapeString(this.value.content.toString()) + '"'; 
		});
		lexem('Literal', 'Number', 8001, [{value:t.Number}], function(){ return this.value.content.toString(); });
		
		lexem('Expression', 'Identifier', 7999, [{value:t.Identifier}], function(){ return this.value.content.toString(); })
		
		var typicalBinOpCodeGen = function(){ return '(' + this.left.toCode() + this.sign.content + this.right.toCode() + ')'; },
			typicalPrefixOpCodeGen = function(){ return '(' + this.sign.content + this.operand.toCode() + ')' },
			typicalPostfixOpCodeGen = function(){ return '(' + this.operand.toCode() + this.sign.content + ')' };
		
		lexem('Expression', 'Operator');
		lexem('Operator', 'BinaryOperator', null, null, typicalBinOpCodeGen);
		lexem('Operator', 'UnaryOperator');
		lexem('UnaryOperator', 'PrefixUnaryOperator', null, null, typicalPrefixOpCodeGen);
		lexem('UnaryOperator', 'PostfixUnaryOperator', null, null, typicalPostfixOpCodeGen);
		lexem('BinaryOperator', 'Addition', 500, [{left:l.Expression}, {sign:t.Plus}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Subtraction', 500, [{left:l.Expression}, {sign:t.Minus}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Multiplication', 550, [{left:l.Expression}, {sign:t.Asterisk}, {right:l.Expression}]);
		lexem('BinaryOperator', 'Division', 550, [{left:l.Expression}, {sign:t.Slash}, {right:l.Expression}]);
		lexem('PrefixUnaryOperator', 'PrefixIncrement', 600, [{sign:t.DoublePlus}, {operand:l.Identifier}]);
		lexem('PrefixUnaryOperator', 'PrefixDecrement', 600, [{sign:t.DoubleMinus}, {operand:l.Identifier}]);
		lexem('PostfixUnaryOperator', 'PostfixIncrement', 650, [{operand:l.Identifier}, {sign:t.DoublePlus}]);
		lexem('PostfixUnaryOperator', 'PostfixDecrement', 650, [{operand:l.Identifier}, {sign:t.DoubleMinus}]);
		
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
		
		tokenize: function(str){
			var tokenizer = new this.ast.Tokenizer(), i;
			for(i in this.definition.tokens) tokenizer.defineToken(this.definition.tokens[i]);
			for(i in this.definition.charGroups) tokenizer.defineCharacterGroup(i, this.definition.charGroups[i]);
			for(i in this.definition.tokenizerPostProcessors) tokenizer.definePostProcessor(this.definition.tokenizerPostProcessors[i], parseInt(i));
			return tokenizer.tokenize(str);
		},
		
		aggregate: function(tokens){
			var aggregator = new this.ast.Aggregator(), i;
			for(i in this.definition.lexems) aggregator.defineLexem(this.definition.lexems[i]);
			return aggregator.aggregate(tokens);
		},
		
		treeOf: function(str){ return this.aggregate(this.tokenize(str)); }
	}
	
})();