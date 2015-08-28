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
			defineCharacterGroup: function(group){ 
				if(this.groups[group.getName()])
					throw new util.DefinitionException('failed to define character group with name "' + group.getName() + '": another group is already defined with this name', group);
				this.groups[group.getName()] = group; 
			},
			undefineCharacterGroup: function(name){
				if(!this.groups[name])
					throw new util.DefinitionException('failed to undefine character group with name "' + name + '": group not found', null);
				delete this.groups[name];
			},
			sequenceInGroup: function(g){ g = this.groups[g]; var r = ''; while(this.nend() && g.have(this.get())) r += this.gin(); return r; },
			sequenceNotInGroup: function(g){ g = this.groups[g]; var r = ''; while(this.nend() && !g.have(this.get())) r += this.gin(); return r; }
		}

		// коллекция; значения указанных параметров уникальны для каждого элемента этой коллекции
		var UniqParamList = function(name, params, defaultParam, sortParam){ 
			this.name = name, this.params = params, this.defaultParam = defaultParam || params[0], this.sortParam = defaultParam || params[params.length - 1];
			this.getters = [], this.values = {};
			for(var i in params) {
				this.getters[params[i]] = 'get' + capitalize(params[i]);
				this.values[param] = {};
			}
		}
		UniqParamList.prototype = {
			add: function(val){
				for(var i in this.params){
					var pName = params[i], pVal = val[this.getters[pName]]();
					if(this.values[pName][pVal])
						throw new util.DefinitionException('failed to define ' + this.name + ' with ' + pName + ' "' + name + '": another ' + this.name + ' is already defined with this ' + pName, val);
				}
				
				for(var i in this.params){
					var pName = params[i], pVal = val[this.getters[pName]]();
					this.values[pName][pVal] = val;
				}
				
				return this;
			}, 
			remove: function(key, keyParam){
				keyParam = keyParam || this.defaultParam;
				var val = this.values[keyParam][key];
				if(!val) throw new util.DefinitionException('failed to undefine ' + this.name + ' with ' + keyParam + ' "' + key + '": ' + this.name + ' not found', null);
				for(var i in this.params){
					var pName = this.params[i];
					delete this.values[pName][val[this.getters[pName]]()];
				}
				return this;
			},
			sortedValues: function(sortParam){
				var getter = this.getters[sortParam || this.sortParam], data = this.values[this.defaultParam],
					compare = function(a, b){ return b = b[getter](), a = a[getter](), a > b? -1: b > a? 1: 0 };
				
				return this.values().sort(compare);
			},
			values: function(){
				var result = [];
				for(var i in data) result.push(data[i]);
				return result;
			}
		}
		
		var LanguageException = function(name){ this.name = name };
		LanguageException.prototype.toString = function(){ return this.name + (this.pos? ' at ' + this.pos: '') + (this.msg? ': ' + this.msg:''); }
		LanguageException.derive = function(name, base){ return base.prototype = new LanguageException(name), base };
		
		var capitalize = function(str){ return str.substr(0, 1).toUpperCase() + str.substr(1); },
			defineGetSet = function(base, name){
				name = util.capitalize(name);
				var get = 'get' + name, set = 'set' + name;
				(base[set] = function(v){ return (base[get] = function(){ return v }), this })(null);
			},
			defineSettableOnce = function(base, name){
				var cap = util.capitalize(name);
				var get = 'get' + cap, set = 'set' + cap;
				(base[set] = function(v){ 
					if(this[get] && this[get]()) 
						throw new util.DefinitionException(name + ' must not be redefined. Old ' + name + ': ' + this[get](), base);
					return this[get] = function(){ return v }, this;
				})(null);
			};
		
		return {
			Striter: Striter,
			
			LanguageException: LanguageException,
			DefinitionException: LanguageException.derive('DefinitionException', function(msg, token){ this.msg = msg, this.token = token }), 
			TokenizationException: LanguageException.derive('TokenizationException', function(msg, pos){ this.msg = msg, this.pos = pos }),
			AggregationException: LanguageException.derive('AggregationException', function(msg, state){ this.msg = msg, this.state = state }),
			CodeGenerationException: LanguageException.derive('CodeGenerationException', function(msg, lexem){ this.msg = msg, this.lexem = lexem }),
			
			capitalize: capitalize,
			defineGetSet: defineGetSet,
			defineSettableOnce: defineSettableOnce
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
		var compareByPriority = function(a, b){ return b.priority - a.priority },
			compareTokensByPriority = function(a, b ){ return b.getPriority() - a.getPriority() };
		
		// basic proto-classes
		var Token = function(){}, Lexem = function(){};
		
		var token = function(){
			var token = function(content){ this.content = content; };
			
			util.defineSettableOnce(token, 'priority');
			util.defineSettableOnce(token, 'name');
			(token.setPriority = function(v){ return this.getPriority = function(){ return v }, this })(null);
			(token.setParse = function(v){ return this.getParse = function(){ 
				return v? v: this.getParent()? this.getParent().getParse(): null;
			}, this})(null);
			
			token.setParent = function(parent){
				this.prototype = new parent();
				this.prototype.getName = function(){ return token.getName(); }
				this.prototype.getContent = function(){ return this.content; }
				this.prototype.toString = function(){ return 't:' + this.getName() + '(' + this.content + ')'; },
				this.getParent = function(){ return parent };
				return this;
			};
			token.setParent(Token);
			
			token.isAbstract = function(){ return !this.getPriority() || !this.getParse() };
			token.toString = function(){ return 't:' + this.getName() };
			token.parse = function(iter, parsed, tokenizer){
				var alg = this.getParse();
				if(alg){
					var content = alg.call(this || token, iter, parsed, tokenizer);
					return content === undefined? null: new (this || token)(content);
				} else {
					var parent = this.getParent();
					while(parent && !parent.getParse()) parent = parent.parent;
					return parent? parent.parse.call(this || token, iter, parsed, tokenizer): null; 
				}
			}
			
			return token;
		}
		
		var Tokenizer = function(){ 
			this.tokenByPriorities = {}, this.tokenByNames = {},
			this.charGroups = {}, 
			this.postProcessors = []; }
		Tokenizer.prototype = {
			defineToken:function(token){
				if(token.isAbstract()) return;
				if(this.tokenByPriorities[token.getPriority()])
					throw new util.DefinitionException("failed to define token with priority " + token.getPriority() + ": already have token with such priority", token);
				if(this.tokenByNames[token.getName()])
					throw new util.DefinitionException("failed to define token with name " + token.getName() + ": already have token with such name", token);
				this.tokenByPriorities[token.getPriority()] = this.tokenByNames[token.getName()] = token;
			},
			undefineToken: function(name){
				var token = this.tokenByNames[name];
				if(!token) throw new util.DefinitionException("unable to undefine token with name '" + name + "': token not found", null);
				delete this.tokenByNames[name];
				delete this.tokenByPriorities[token.getPriority()];
			},
			getTokens: function(){  return this.tokenByNames; },
			getCharGroups: function(){ return this.charGroups; },
			defineCharacterGroup:function(group){ 
				if(this.charGroups[group.getName()])
					throw new util.DefinitionException('failed to define character group with name "' + group.getName() + '": another group is already defined with this name', group);
				this.charGroups[group.getName()] = group;
			},
			undefineCharacterGroup: function(name){
				if(!this.charGroups[name])
					throw new util.DefinitionException('failed to undefine character group with name "' + name + '": group not found', null);
				delete this.charGroups[name];
			},
			definePostProcessor:function(processor){ this.postProcessors.push({priority:priority || 0, func: func}); },
			tokenize:function(str){
				var parsed = [], iter = new util.Striter(str);
				
				for(i in this.charGroups) iter.defineCharacterGroup(this.charGroups[i]);
				
				var tokens = [];
				for(var i in this.tokenByPriorities) tokens.push(this.tokenByPriorities[i]);
				tokens = tokens.sort(compareTokensByPriority);
				this.postProcessors = this.postProcessors.sort(compareByPriority);
				
				while(iter.nend()){
					var next = this.nextToken(parsed, iter, tokens);
					if(!next) throw new util.TokenizationException("could not parse token", iter.pos);
					parsed.push(next);
				}
				
				for(i in this.postProcessors) parsed = this.postProcessors[i].func.call(this, parsed);
				
				return parsed;
			},
			nextToken:function(parsed, iter, tokens){
				for(var i in tokens){
					var token = tokens[i].parse(iter, parsed, this);
					if(token) return token;
				}
			}
		};
		
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
				return !(this.val instanceof lexem.pattern[pos])? 
							false:
							pos === lexem.pattern.length - 1? 
								true:
								this.next?
									this.next.matches(lexem, pos + 1) && (pos !== 0 || !lexem.condition || lexem.condition(this)):
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
		
		var CharacterGroup = function(firstArg){ // designed to be immutable
			this.chars = {};
			util.defineSettableOnce(this, 'name');
			var args = Array.isArray(firstArg)? firstArg: arguments;
			for(var i = 0; i < args.length; i++){
				var arg = args[i];
				if(typeof(arg) === 'string') for(var j = 0; j < arg.length; j++) this.chars[arg.charAt(j)] = true;
				else for(var j in arg.chars) this.chars[j] = true;
			}
		}
		CharacterGroup.prototype = {
			have: function(c){ return this.chars[c] || false; },
			isMakingUp: function(str){
				for(var i = 0; i < str.length; i++)
					if(!this.chars[str.charAt(i)])
						return false;
				return true;
			}
		}
		
		var Processor = function(algo){ // technically function with name and priority
			util.defineSettableOnce(this, 'name');
			util.defineSettableOnce(this, 'priority');
			this.algo = algo;
		}
		Processor.prototype.apply = function(){ return this.algo.apply(this, arguments); }
		
		return { 
			Tokenizer: Tokenizer, 
			Token: Token, 
			CharacterGroup: CharacterGroup, 
			Processor: Processor,
			Aggregator: Aggregator, 
			State: State, 
			StateElement: StateElement,
			Lexem: Lexem,
			
			token: token
		};
	
	})();
	
	var definition = (function(){ // language token and lexem definitions
	
		var tokens = {}, lexems = {}, groups = {},
			t = tokens, l = lexems; // just to keep code short
			
		var group = function(name, content){ return groups[name] = new ast.CharacterGroup(content).setName(name); },
			token = function(parent, name, priority, parse, isAbstract){
				return tokens[name] = ast.token()
					.setParent(parent? tokens[parent]: ast.Token)
					.setName(name)
					.setPriority(priority)
					.setParse(parse);
			};
			
		var isIdentifier = function(str){ return str.length > 0 && groups.identifierStart.have(str.charAt(0)) && groups.identifier.isMakingUp(str) };
		
		var groupsRaw = [
			group('binDigits', ['01']),
			group('octDigits', [groups.binDigits,'234567']),
			group('digits', [groups.octDigits, '89']),
			group('hexDigits', [groups.digits, "abcdefABCDEF"]),
			group('identifierStart', ['$_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ']),
			group('identifier', [groups.digits, groups.identifierStart]),
			group('newline', ['\n\r']),
			group('space', ['\t ', groups.newline]),
		]
		
		var key = (function(){
			var generatePriorityForKey = (function(){
			
				var offset = 10000, keysPerLength = 1000, maxPriority = 0x8fffffff, ownedValues = {};
				
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
			
			return function(name, word){
				var parent = isIdentifier(word)? 'KeyWord': 'KeySequence';
				var key = token(parent, name, generatePriorityForKey(word), null, false);
				key.prototype.sequence = key.sequence = word;
				return key;
			}
			
		})();
		
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
		var lexemHaveAncestor = function(lexem, ancestor){
			return !lexem? false:
					lexem === ancestor? true:
					lexemHaveAncestor(lexem.parent, ancestor);
		}
		var filterLexemByClass = function(lexems, cl){
			var result = [];
			for(var i in lexems)
				if(lexemHaveAncestor(lexems[i], cl))
					result.push(lexems[i]);
			return result;
		}
		var duplicateUnaryOperatorAggregationCondition = function(priority){
			var targetLexem = l.Expression;
			return function(el){
				if(!el.prev) return true;
				if(el.prev.val instanceof ast.Lexem) return false;
				
				var possibleLexems = lexemsEndingWith(el.aggregator.getLexems(), el.prev.val);
				var expressionLexems = filterLexemByClass(possibleLexems, targetLexem);
				
				return expressionLexems.length === 0; 
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
		token(null, 'Key'); // некая константная последовательность символов
		token('Key', 'KeyWord', null, function(iter, parsed, tokenizer){
			return iter.have(this.sequence) && !groups.identifier.have(iter.get(this.sequence.length))? 
				(iter.inc(this.sequence.length), this.sequence): 
				undefined;
		}, true);
		token('Key', 'KeySequence', null, function(iter, parsed, tokenizer){
			return iter.have(this.sequence)? (iter.inc(this.sequence.length), this.sequence): undefined;
		}, true);
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
				for(i = 0; i < l; i++) res = (res * mult) + (str.charCodeAt(i) - (groups.digits.have(str.charAt(i))? zero: a));
				return res;
			}
			
			var fractOf = function(str){
				var l = str.length, i, res = 0, div = 1;
				for(i = 0; i < l; i++) div *= 10, res += (str.charCodeAt(i) - zero) / div;
				return res;
			}
			
			return function(iter){
				var char = iter.get();
				if(!groups.digits.have(char)) return;
				
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
					if(groups.octDigits.isMakingUp(startPart)) return intOf(startPart, 8);
				}
				return intOf(startPart, 10) + ((iter.get() === '.')? (iter.inc(), fractOf(iter.sequenceInGroup('digits'))): 0);
			}
		})());
		
		var keys = {
			Plus: '+', Minus: '-', Asterisk: '*', Slash: '/', Percent: '%',
			Tilde: '~', Ampersand: '&', Obelisk: '|', Circumflex: '^',
			Comma: ',', Point: '.', Question: '?', Colon: ':', Semicolon: ';',
			
			Equals: '=', 
			PlusEquals: '+=', MinusEquals: '-=', AsteriskEquals: '*=', SlashEquals: '/=', PercentEquals: '%=',
			AmpersandEquals: '&=', ObeliskEquals: '|=', CircumflexEquals: '^=',
			DoubleLesserEquals: '<<=', DoubleGreaterEquals: '>>=', TripleGreaterEquals: '>>>=',
			DoubleAsteriskEquals: '**=', 
			
			Exclamation: '!', Greater: '>', Lesser: '<', LesserOrEquals: '<=', GreaterOrEquals: '>=',
			
			DoubleAsterisk: '**',
			DoubleLesser: '<<', DoubleGreater: '>>', TripleGreater: '>>>',
			DoubleMinus: '--', DoublePlus: '++',
			DoubleAmpersand: '&&', DoubleObelisk: '||',
			
			DoubleEquals: '==', TripleEquals: '===',
			ExclamationEquals: '!=', ExclamationDoubleEquals: '!==',
			
			LeftParenthesis: '(', RightParenthesis: ')',
			LeftBracket: '[', RightBracket: ']',
			LeftBrace: '{', RightBrace: '}',
			
			True: 'true', False: 'false',
			Undefined: 'undefined', Null: 'null',
			
			Typeof: 'typeof',
			Delete: 'delete',
			In: 'in',
			Instanceof: 'instanceof'
		};
		for(var keyName in keys) key(keyName, keys[keyName]);
		
		lexem(null, 'Expression');
		lexem('Expression', 'Literal');
		lexem('Literal', 'String', 8000, [{value:t.String}], function(){ 
			return '"' + this.value.content
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
		lexem('Identifier', 'IdentifierChain');
		lexem('IdentifierChain', 'CommonIdentifierChain', 900, [{left:l.Expression}, {sign:t.Point}, {right:l.Identifier}], function(){
			return this.left.toCode() + '.' + this.right.toCode();
		});
		lexem('IdentifierChain', 'KeyWordIdentifierChain', 900, [{left:l.Expression}, {sign:t.Point}, {right:t.KeyWord}], function(){
			return this.left.toCode() + '.' + this.right.content;
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
			groups: groupsRaw,
			
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
			for(i in this.definition.groups) tokenizer.defineCharacterGroup(this.definition.groups[i]);
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
