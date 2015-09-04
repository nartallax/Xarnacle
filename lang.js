var lang = (function(){
	'use strict';
	var util = (function(){ // различные мелочи
		
		var Striter = function(str){ this.str = str, this.pos = 0, defineStorage(this, 'group', ['name']); };
		Striter.prototype = {
			skip: function(group){ group = this.groups[group]; while(group.have(this.str.charAt(this.pos))) this.pos++; return this; },
			charIn: function(group){ return this.groups.value(group).have(this.str.charAt(this.pos)) },
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
			sequenceInGroup: function(g){ g = this.groups.value(g); var r = ''; while(this.nend() && g.have(this.get())) r += this.gin(); return r; },
			sequenceNotInGroup: function(g){ g = this.groups.value(g); var r = ''; while(this.nend() && !g.have(this.get())) r += this.gin(); return r; }
		}

		// коллекция; значения указанных параметров уникальны для каждого элемента этой коллекции
		var UniqParamList = function(name, params, defaultParam, sortParam){ 
			this.name = name, this.params = params, this.defaultParam = defaultParam || params[0], this.sortParam = defaultParam || params[params.length - 1];
			this.getters = [], this.lists = {};
			for(var i in params) {
				this.getters[params[i]] = getterOf(params[i]);
				this.lists[params[i]] = {};
			}
		}
		UniqParamList.prototype = {
			add: function(val){
				for(var i in this.params){
					var pName = this.params[i], pVal = val[this.getters[pName]]();
					if(this.lists[pName][pVal])
						throw new util.DefinitionException('failed to define ' + this.name + ' with ' + pName + ' "' + name + '": another ' + this.name + ' is already defined with this ' + pName, val);
				}
				
				for(var i in this.params){
					var pName = this.params[i], pVal = val[this.getters[pName]]();
					this.lists[pName][pVal] = val;
				}
				
				return this;
			}, 
			remove: function(key, keyParam){
				keyParam = keyParam || this.defaultParam;
				var val = this.lists[keyParam][key];
				if(!val) throw new util.DefinitionException('failed to undefine ' + this.name + ' with ' + keyParam + ' "' + key + '": ' + this.name + ' not found', null);
				for(var i in this.params){
					var pName = this.params[i];
					delete this.lists[pName][val[this.getters[pName]]()];
				}
				return this;
			},
			sortedValues: function(reverse, sortParam){
				var getter = this.getters[sortParam || this.sortParam] || getterOf(sortParam || this.sortParam),
					inc = reverse? 1: -1,
					dec = reverse? -1: 1,
					compare = function(a, b){ return b = b[getter](), a = a[getter](), a > b? inc: b > a? dec: 0 };
				
				return this.values().sort(compare);
			},
			values: function(){
				var result = [], data = this.lists[this.defaultParam];
				for(var i in data) result.push(data[i]);
				return result;
			},
			valuesBy: function(paramName){ return this.lists[paramName]; },
			value: function(paramValue, paramName){ return this.lists[paramName || this.defaultParam][paramValue] }
		}
		
		var LanguageException = function(name){ this.name = name };
		LanguageException.prototype.toString = function(){ return this.name + (this.pos? ' at ' + this.pos: '') + (this.msg? ': ' + this.msg:''); }
		LanguageException.derive = function(name, base){ return base.prototype = new LanguageException(name), base };
		
			// строковые операции
		var capitalize = function(str){ return str.substr(0, 1).toUpperCase() + str.substr(1); },
			getterOf = function(paramName){ return 'get' + capitalize(paramName) },
			addSlashes = function(str){
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
			},
			
			// операции с коллекциями
			groupBy = function(data, param){
				var result = {}, param = getterOf(param), val, pval;
				for(var i in data) val = data[i], pval = val[param](), result[pval]? result[pval].push(val): result[pval] = [val];
				return result;
			},
			invertArray = function(arr){ // превращение массива в мапу
				var result = {};
				for(var i in arr) result[arr[i]] = true;
				return result;
			},
			
			// вспомогательные функции для определения классов
			defineSettableOnce = function(base, name){
				var cap = util.capitalize(name);
				var get = 'get' + cap, set = 'set' + cap;
				(base[set] = function(v){ 
					if(this[get] && this[get]()) 
						throw new util.DefinitionException(name + ' must not be redefined. Old ' + name + ': ' + this[get](), base);
					return this[get] = function(){ return v }, this;
				}).call(base, null);
			},
			defineStorage = function(base, name, params, sortParam, filter){
				var list = new UniqParamList(name, params), capName = capitalize(name), valsFunc = sortParam? 'sortedValues': 'values';
			
				base[name + 's'] = list;
				base['get' + capName + 's'] = function(){ return list[valsFunc](false, sortParam) };
				base['define' + capName] = function(val){ return (!filter || filter(val)) && list.add(val), this };
				base['undefine' + capName] = function(param){ return list.remove(param), this };
			
				return this;
			},
			defineGetSet = function(base, name, parentRecurseParam){ // если указан имя параметра родителя - то будет рекурсивно искать в родителе значение
				name = util.capitalize(name);
				var get = 'get' + name, set = 'set' + name, pGet;
				if(parentRecurseParam) pGet = getterOf(parentRecurseParam);
				(base[set] = parentRecurseParam
					?function(v){ 
						return (base[get] = function(){ 
							if(v) return v;
							var p = this[pGet]();
							if(!p) return null;
							var m = p[get];
							return m? m.call(p): null;
						}), this }
					:function(v){ return (base[get] = function(){ return v }), this }
				).call(base, null);
			};
		
		return {
			Striter: Striter,
			UniqParamList: UniqParamList,
			
			LanguageException: LanguageException,
			DefinitionException: LanguageException.derive('DefinitionException', function(msg, token){ this.msg = msg, this.token = token }), 
			TokenizationException: LanguageException.derive('TokenizationException', function(msg, pos){ this.msg = msg, this.pos = pos }),
			AggregationException: LanguageException.derive('AggregationException', function(msg, state){ this.msg = msg, this.state = state }),
			CodeGenerationException: LanguageException.derive('CodeGenerationException', function(msg, lexem){ this.msg = msg, this.lexem = lexem }),
			
			capitalize: capitalize,
			getterOf: getterOf, 
			addSlashes: addSlashes,
			
			groupBy: groupBy,
			invertArray: invertArray,
			
			defineGetSet: defineGetSet,
			defineSettableOnce: defineSettableOnce,
			defineStorage: defineStorage
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
		// basic proto-classes
		var Token = function(){}, Lexem = function(){};
		
		var token = function(){
				var token = function(content){ this.content = content; };
				
				util.defineSettableOnce(token, 'priority');
				util.defineSettableOnce(token, 'name');	
				util.defineGetSet(token, 'parse', 'parent');
				util.defineGetSet(token, 'sequence');
				
				(token.setParent = function(parent){
					console.trace();
					this.prototype = new parent();
					this.prototype.getName = function(){ return token.getName(); }
					this.prototype.getContent = function(){ return this.content; }
					this.prototype.toString = function(){ return 't:' + this.getName() + '(' + this.content + ')'; },
					this.getParent = this.prototype.getParent = function(){ return parent };
					return this;
				}).call(token, Token);
				
				token.isAbstract = function(){ return !this.getPriority() || !this.getParse() };
				token.toString = function(){ return 't:' + this.getName() };
				token.parse = function(iter){
					var parser = this.getParse();
					if(!parser) throw new util.TokenizationException('no parsing function supplied for ' + token, iter.pos)
					var content = parser.call(this || token, iter);
					return content === undefined? null: new (this || token)(content);
				}
				
				return token;
			},
			lexem = function(){
				var lexem = function(content){
					this.content = content = content || [];
					var desc = this.getDescription();
					if(content.length !== desc.length)
						throw new util.AggregationException('could not form lexem of ' + content.length + ' parts: expected ' + desc.length + ' parts', lexem);
					for(var i in desc){
						var d = desc[i], c = content[i];
						if(!(content[i] instanceof d.cls))
							throw new util.AggregationException('lexem pattern violation: expected ' + d.cls + ' at position ' + i + ' (param name: ' + d.name + '), got ' + c + ' instead', lexem);
						this[d.name] = c;
					}
				}
				
				lexem.description = [], lexem.pattern = []; // decsription = pattern + names
				
				util.defineSettableOnce(lexem, 'priority');
				util.defineSettableOnce(lexem, 'name');
				util.defineGetSet(lexem, 'translator', 'parent');
				util.defineGetSet(lexem, 'sourcer', 'parent');
				util.defineGetSet(lexem, 'parsingCondition', 'parent');
				util.defineGetSet(lexem, 'parse');
				util.defineGetSet(lexem, 'isRightAssociative');
				util.defineGetSet(lexem, 'sourcerFormatString', 'parent');
				util.defineGetSet(lexem, 'translatorFormatString', 'parent');
				
				(lexem.setParent = function(parent){
					this.prototype = new parent();
					this.prototype.getName = function(){ return lexem.getName(); }
					this.prototype.getContent = function(){ return this.content; }
					this.prototype.getDescription = function(){ return lexem.description; }
					this.prototype.getTranslator = function(){ return lexem.getTranslator(); }
					this.prototype.getSourcerFormatString = function(){ return lexem.getSourcerFormatString(); }
					this.prototype.getTranslatorFormatString = function(){ return lexem.getTranslatorFormatString(); }
					this.prototype.getSourcer = function(){ return lexem.getSourcer(); }
					this.prototype.getDescription = function(){ return lexem.description; }
					this.prototype.toString = function(tabs){ 
						tabs = tabs || '';
						var result = 'l:' + this.getName() + '(', desc = this.getDescription();
						switch(this.content.length){
							case 0: return result + ')';
							case 1: return result + desc[0].name + ' = ' + this.content[0].toString('') + ')';
							default:
								var newTabs = tabs + '\t';
								result += '\n';
								for(var i in this.content) 
									result += newTabs + desc[i].name + ' = ' + this.content[i].toString(newTabs) + '\n';
								result += tabs + ')';
								return result;
						}
					},
					this.prototype.sourcefy = function(){
						var sourcer = this.getSourcer();
						if(!sourcer) throw new util.CodeGenerationException('no sourcefication function supplied for ' + this, this);
						return sourcer.call(this);
					}
					this.prototype.translate = function(){
						var translator = this.getTranslator();
						if(!translator) throw new util.CodeGenerationException('no translation function supplied for ' + this, this);
						return translator.call(this);
					}
					this.getParent = this.prototype.getParent = function(){ return parent };
					return this;
				}).call(lexem, Lexem);
				
				lexem.addPart = function(name, cls){ return this.pattern.push(cls), this.description.push({name:name, cls: cls}), this; }
				lexem.isAbstract = function(){ return this.pattern.length < 1 }
				lexem.getPattern = function(){ return this.pattern };
				lexem.setPattern = function(val){ return this.pattern = val, this };
				lexem.toString = function(){ return 'l:' + this.getName() };
				lexem.parse = function(el, state){
					var parse = this.getParse();
					if(!parse) throw new util.AggregationException('no translation function supplied for ' + this, this);
					return parse.call(this, el, state);
				}
				
				lexem.setParse(defaultLexemParser);
				
				return lexem;
			}
			
		// изменяет состояние, если может; если не может - оставляет все как есть
		// если изменил состояние - должен вернуть непустой ответ
		var defaultLexemParser = (function(){
			
			var getRightAssociativeLexems = function(state, priority){ // вот это бы как-нибудь оптимизировать, некрасиво
				var ls = state.aggregator.getLexems(), result = [];
				for(var i in ls)
					if(ls[i].getPriority() === priority && ls[i].getIsRightAssociative())
						result.push(ls[i]);
				return result;
			}
			
			var parseForward = function(lexems, el, state){
				var p;
				for(var i in lexems)
					if(p = lexems[i].parse(el, state))
						return p;
			}
			
			var parse = function(el){
				var content = [], n = el; // собираем контент; заодно получаем концевую ноду
				for(var i in this.pattern){
					if(!n || !(n.val instanceof this.pattern[i])) return;
					content.push(n.val);
					n = n.next;
				}
				
				var cond = this.getParsingCondition(); // учитываем условие парсинга
				if(cond && !cond.call(this, el)) return;

				if(n && n.prev && this.getIsRightAssociative()) { // учитываем правоассоциативность
					var rolexs = getRightAssociativeLexems(el, this.getPriority());
					var parsed = parseForward(rolexs, n.prev, el);
					if(parsed) content[content.length - 1] = parsed;
					el.next = n.prev.next;
				} else if(el.next = n) n.prev = el;
				
				return el.val = new this(content)
			};
			
			return parse;
			
		})();
		var getDefaultFormatStringForLexem = function(lexem){
			var result = [];
			for(var i in lexem.description) result.push('$' + lexem.description[i].name);
			return result.join(' ');
		}
		var populateFormatString = (function(){
			
			var iChars = util.invertArray("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789".split(''));
			
			var getIdentifier = function(str){
				var i = 0;
				while(iChars[str.charAt(i)]) i++;
				return str.substr(0, i);
			}
			
			var getIdentMap = function(desc){
				var result = {};
				for(var i in desc) result[desc[i].name] = i;
				return result;
			}
			
			return function(lexem, format, methodName){
				
				if(!format){
					var result = [];
					for(var i in lexem.content) result.push(lexem.content[i] instanceof Token? lexem.content[i].content: lexem.content[i][methodName]())
					return result.join(' ');
				}
				format = format.split('$');
				var result = '', imap = getIdentMap(lexem.getDescription());
				result += format[0];
				for(var i = 1; i < format.length; i++){
					var ident = getIdentifier(format[i]);
					if(ident in imap){
						var ival = lexem.content[imap[ident]], rem = format[i].substr(ident.length);
						if(ival instanceof Token) result += ival.content + rem;
						else result += ival[methodName]() + rem;
					} else result += '$' + format[i];
				}
				return result;
			}
			
		})();
		var defaultLexemSourcer = function(){ return populateFormatString(this, this.getSourcerFormatString(), 'sourcefy') }
		var defaultLexemTranslator = function(){ return populateFormatString(this, this.getTranslatorFormatString(), 'translate') }
		
		util.defineGetSet(Lexem, 'sourcer');
		util.defineGetSet(Lexem, 'translator');
		util.defineGetSet(Lexem, 'parent');
		
		Lexem.setSourcer(defaultLexemSourcer);
		Lexem.setTranslator(defaultLexemTranslator);
		Lexem.setParent(null);
		
		var Tokenizer = function(){ 
			util.defineStorage(this, 'token', ['name', 'priority'], 'priority', function(t){ return !t.isAbstract() });
			util.defineStorage(this, 'group', ['name']);
			util.defineStorage(this, 'postProcessor', ['name', 'priority'], 'priority');
			util.defineStorage(this, 'preProcessor', ['name', 'priority'], 'priority');
			this.tokenizer = this;
		}
		Tokenizer.prototype = {
			tokenize:function(str, aggr){ 
				this.aggregator = aggr;
				var result = this.doPostProcess(this.doTokenize(this.doPreProcess(str))) 
				delete this.aggregator;
				return result;
			},
			
			doPreProcess: function(code){
				var procs = this.getPreProcessors();
				for(var i in procs) code = procs[i].apply(code);
				return code;
			},
			doPostProcess: function(tokens){
				var procs = this.getPostProcessors();
				for(var i in procs) tokens = procs[i].apply(tokens);
				return tokens;
			},
			
			doTokenize: function(code){
				var iter = this.createIterator(code), tokens = this.getTokens();
				
				while(iter.nend()){
					var next = this.nextToken(iter, tokens);
					if(!next) throw new util.TokenizationException("could not parse token", iter.pos);
					iter.parsed.push(next);
				}
				
				return iter.parsed;
			},
			
			createIterator: function(code){
				var iter = new util.Striter(code), groups = this.groups.valuesBy('name');
				iter.aggregator = this.aggregator;
				iter.tokenizer = this;
				iter.parsed = [];
				for(var i in groups) iter.defineGroup(groups[i]);
				return iter;
			},
			
			nextToken:function(iter, tokens){
				for(var i in tokens){
					var token = tokens[i].parse(iter);
					if(token) return token;
				}
			}
		};
		
		var getPrioritiesListOf = function(arr){
			var map = {}, result = [];
			for(var i in arr) map[arr[i].getPriority()] = arr[i].getPriority();
			for(var i in map) result.push(parseInt(i));
			return result.sort(function(a,b){ return b - a; });
		}
		var Aggregator = function(tokenizer){ 
			this.tokenizer = tokenizer;
			util.defineStorage(this, 'lexem', ['name'], 'priority', function(l){ return !l.isAbstract() });
		}
		Aggregator.prototype = {
			aggregate:function(tokens){
				var allLexems = this.getLexems(),
					lexemsByPriority = util.groupBy(allLexems, 'priority'),
					priorities = getPrioritiesListOf(allLexems),
				
					state = new State(tokens, this.tokenizer, this), haveMatchInGroup;
				
				while(true){
					for(var i in priorities) if(haveMatchInGroup = state.tryMutate(lexemsByPriority[priorities[i]])) break;
					
					if(!haveMatchInGroup){
						if(state.isMutatedCompletely()) return state.getMutationsResult();
						else throw new util.AggregationException('could not find matching lexem', state);
					}
				}
			}
		}
		
		var State = function(tokens, tokenizer, aggregator){
			this.tokenizer = tokenizer, this.aggregator = aggregator;
			var i = 0, l, el, newEl;
			if((l = tokens.length) === 0) return;
			
			this.first = el = this.createElement(tokens[0]);
			while(++i < l) el = ((newEl = this.createElement(tokens[i])).prev = el).next = newEl;
		}
		State.prototype = {
			createElement: function(val){ return {val:val, tokenizer: this.tokenizer, aggregator:this.aggregator, state:this}; },
			tryMutate: function(lexems){ 
				var node = this.first, localResult, result;
				while(true){
					do{
						for(var i in lexems)
							if(result = (localResult = lexems[i].parse(node)) || result, localResult) break;
					} while(localResult);
					if(!(node = node.next)) return result;
				}
			},
			isMutatedCompletely: function(){ return this.first && !this.first.next && this.first.val instanceof Lexem },
			getMutationsResult: function(){ return this.first.val; },
			toString: function(){
				var el = this.first, result = [];
				while(el) result.push(el.val.toString()), el = el.next;
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
		
		var Processor = function(algo){ // class to bind name and priority to some function
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
			Lexem: Lexem,
			
			token: token,
			lexem: lexem
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
			},
			processor = function(name, priority, func){
				return new ast.Processor(func)
					.setName(name)
					.setPriority(priority);
			}
			
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
				var result = tokens[name] = ast.token()
					.setParent(tokens[isIdentifier(word)? 'KeyWord': 'KeySequence'])
					.setName(name)
					.setPriority(generatePriorityForKey(word))
					
				result.prototype.sequence = result.sequence = word;
				return key;
			}
			
		})();
		
		var lexem = function(parent, name, priority, patternWithNames, toCode, isAbstract, reverseLookaheadLength, condition){
			var l = lexems[name] = ast.lexem()
				.setParent(parent? lexems[parent]: ast.Lexem)
				.setName(name)
				.setPriority(priority)
				.setParsingCondition(condition)
				.setIsRightAssociative(reverseLookaheadLength > 0);
				
			for(var i in patternWithNames)
				for(var j in patternWithNames[i])
					l.addPart(j, patternWithNames[i][j]);
					
			if(toCode) l.setTranslator(toCode);
					
			return l;
		}
		
		var duplicateUnaryOperatorAggregationCondition = function(priority){
			
			var filterLexemByClass = function(lexems, cl){
				var result = [];
				for(var i in lexems)
					if(lexemHaveAncestor(lexems[i], cl))
						result.push(lexems[i]);
				return result;
			}
			
			var lexemsEndingWith = function(lexems, token){
				var result = [];
				for(var i in lexems){
					var lexem =	lexems[i];
					if(!lexem.isAbstract() && (token instanceof lexem.pattern[lexem.pattern.length - 1]))
						result.push(lexem);
				}
				return result;
			}
			
			var lexemHaveAncestor = function(lexem, ancestor){
				return !lexem? false:
						lexem === ancestor? true:
						lexemHaveAncestor(lexem.getParent(), ancestor);
			}
			
			return function(el){
				if(!el.prev) return true;
				if(el.prev.val instanceof ast.Lexem) return false;
				
				var possibleLexems = lexemsEndingWith(el.aggregator.getLexems(), el.prev.val);
				var expressionLexems = filterLexemByClass(possibleLexems, l.Expression);
				
				return expressionLexems.length === 0; 
			};
		}
		
		var tokenTree = {
			TrashToken: {
				Space: {priority: 0x80000000, parse: function(iter){ return iter.sequenceInGroup('space') || undefined; }},
				Comment: {
					OneLineComment: {priority: 0x80000001, parse: function(iter){
						if(!iter.have('//')) return;
						iter.inc(2);
						return iter.sequenceNotInGroup('newline');
					}},
					MultiLineComment: {priority: 0x80000002, parse: function(iter){
						if(!iter.have('/*')) return;
						iter.inc(2);
						var result = '';
						while(iter.nend() && !iter.have('*/')) result += iter.gin();
						if(iter.end()) throw new util.TokenizationException('multiline comment have no end', iter.pos);
						iter.inc(2);
						return result;
					}}
				}
			},
			Key: {
				KeyWord: { parse: function(iter, parsed, tokenizer){
						return iter.have(this.sequence) && !groups.identifier.have(iter.get(this.sequence.length))? 
							(iter.inc(this.sequence.length), this.sequence): 
							undefined;
					}
				},
				KeySequence: { parse: function(iter, parsed, tokenizer){
						return iter.have(this.sequence)? (iter.inc(this.sequence.length), this.sequence): undefined;
					}
				}
			},
			Identifier: { priority: 9000, parse: function(iter){ 
					if(!iter.charIn('identifierStart')) return;
					var result = '';
					while(iter.charIn('identifier')) result += iter.gin();
					return result;
				} 
			},
			Literal:{
				String: { priority: 8000, parse: function(iter){
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
					} 
				},
				Number: { priority: 8001, parse: (function(){
						
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
					})()
				}
			}
		}
		var keyTree = {
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
		
		(function(){
			
			var token = function(name, desc, parent){
				var result = tokens[name] = ast.token().setName(name).setParent(parent);
				for(var i in desc)
					switch(i){
						case 'priority': result.setPriority(desc.priority); continue;
						case 'parse': result.setParse(desc.parse); continue;
						default: token(i, desc[i], result); continue;
					}
			}
			
			for(var i in tokenTree) token(i, tokenTree[i], ast.Token);
			for(var i in keyTree) key(i, keyTree[i]);
		})();
		
		var stringSourcerTranslator = function(){ return '"' + util.addSlashes(this.value.content) + '"'; };
		
		var lexemTree = {
			Expression: {
				Literal: {
					String: {pr: 8000, pat: "value:t:String", sf: stringSourcerTranslator, tf: stringSourcerTranslator},
					Number: {pr: 8000, pat: "value:t:Number" },
					Boolean: {
						True: {pr: 8000, pat: "value:t:True" },
						False: {pr: 8000, pat: "value:t:False" }
					},
					Undefined: {pr: 8000, pat: "value:t:Undefined" },
					Null: {pr: 8000, pat: "value:t:Null" }
				},
				Identifier: {
					SingleIdentifier: {pr: 7999, pat: "value:t:Identifier" },
					IdentifierChain: {
						CommonIdentifierChain: {pr: 900, pat: "left:l:Expression sign:t:Point right:l:Identifier", t:"$left.$right" },
						KeyWordIdentifierChain: {pr: 900, pat: "left:l:Expression sign:t:Point right:t:KeyWord", t:"$left.$right" },
						
					}
				},
				Operator: {
					UnaryOperator:{
						UnaryPrefixOperator:{ t:"($sign$operand)",
							PrefixIncrement: {pr: 800, pat: "sign:t:DoublePlus operand:l:Identifier" },
							PrefixDecrement: {pr: 800, pat: "sign:t:DoubleMinus operand:l:Identifier" },
							BitwiseNot: {pr: 800, pat: "sign:t:Tilde operand:l:Expression" },
							LogicalNot: {pr: 800, pat: "sign:t:Exclamation operand:l:Expression" },
							Typeof: {pr: 800, pat: "sign:t:Typeof operand:l:Expression", t:"(typeof($operand))"},
							Delete: {pr: 800, pat: "sign:t:Delete operand:l:Identifier", t:"(delete $operand)"},
							UnaryMinus: {pr: 800, pat: "sign:t:Minus operand:l:Expression", cond: duplicateUnaryOperatorAggregationCondition(800)},
							UnaryPlus: {pr: 800, pat: "sign:t:Plus operand:l:Expression", cond: duplicateUnaryOperatorAggregationCondition(800)}
						},
						UnaryPostfixOperator: { t: "($operand$sign)",
							PostfixIncrement: {pr: 850, pat: "operand:l:Identifier sign:t:DoublePlus"},
							PostfixDecrement: {pr: 850, pat: "operand:l:Identifier sign:t:DoubleMinus"}
						}
					},
					BinaryOperator:{t:"($left$sign$right)",
						Comma: { pr: 100, pat: "left:l:Expression sign:t:Comma right:l:Expression"},
						Assignment: {pr: 200, pat: "left:l:Identifier sign:t:Equals right:l:Expression", ra:true},
						AdditionAssignment: {pr: 200, pat: "left:l:Identifier sign:t:PlusEquals right:l:Expression", ra:true},
						SubtractionAssignment: {pr: 200, pat: "left:l:Identifier sign:t:MinusEquals right:l:Expression", ra:true},
						ExponentiationAssignment: {pr: 200, pat: "left:l:Identifier sign:t:DoubleAsteriskEquals right:l:Expression", ra:true},
						MultiplicationAssignment: {pr: 200, pat: "left:l:Identifier sign:t:AsteriskEquals right:l:Expression", ra:true},
						DivisionAssignment: {pr: 200, pat: "left:l:Identifier sign:t:SlashEquals right:l:Expression", ra:true},
						RemainderAssignment: {pr: 200, pat: "left:l:Identifier sign:t:PercentEquals right:l:Expression", ra:true},
						ShiftLeftAssignment: {pr: 200, pat: "left:l:Identifier sign:t:DoubleLesserEquals right:l:Expression", ra:true},
						ShiftRightAssignment: {pr: 200, pat: "left:l:Identifier sign:t:DoubleGreaterEquals right:l:Expression", ra:true},
						UnsignedShiftRightAssignment: {pr: 200, pat: "left:l:Identifier sign:t:TripleGreaterEquals right:l:Expression", ra:true},
						BitwiseAndAssignment: {pr: 200, pat: "left:l:Identifier sign:t:AmpersandEquals right:l:Expression", ra:true},
						BitwiseXorAssignment: {pr: 200, pat: "left:l:Identifier sign:t:CircumflexEquals right:l:Expression", ra:true},
						BitwiseOrAssignment: {pr: 200, pat: "left:l:Identifier sign:t:ObeliskEquals right:l:Expression", ra:true},
						
						LogicalOr: {pr: 300, pat: "left:l:Expression sign:t:DoubleObelisk right:l:Expression" },
		
						LogicalAnd: {pr: 350, pat: "left:l:Expression sign:t:DoubleAmpersand right:l:Expression" },
								
						BitwiseOr: {pr: 400, pat: "left:l:Expression sign:t:Obelisk right:l:Expression" },
								
						BitwiseXor: {pr: 450, pat: "left:l:Expression sign:t:Circumflex right:l:Expression" },
								
						BitwiseAnd: {pr: 500, pat: "left:l:Expression sign:t:Ampersand right:l:Expression" },
								
						Equality: {pr: 550, pat: "left:l:Expression sign:t:DoubleEquals right:l:Expression" },
						StrictEquality: {pr: 550, pat: "left:l:Expression sign:t:TripleEquals right:l:Expression" },
						Inequality: {pr: 550, pat: "left:l:Expression sign:t:ExclamationEquals right:l:Expression" },
						StrictInequality: {pr: 550, pat: "left:l:Expression sign:t:ExclamationDoubleEquals right:l:Expression" },
								
						In: {pr: 600, pat: "left:l:Expression sign:t:In right:l:Expression", t:"($left in $right)"},
						Instanceof: {pr: 600, pat: "left:l:Expression sign:t:Instanceof right:l:Expression", t:"($left instanceof $right)"},
						Less: {pr: 600, pat: "left:l:Expression sign:t:Lesser right:l:Expression" },
						LessOrEqual: {pr: 600, pat: "left:l:Expression sign:t:LesserOrEquals right:l:Expression" },
						Greater: {pr: 600, pat: "left:l:Expression sign:t:Greater right:l:Expression" },
						GreaterOrEqual: {pr: 600, pat: "left:l:Expression sign:t:GreaterOrEquals right:l:Expression" },
								
						LeftShift: {pr: 650, pat: "left:l:Expression sign:t:DoubleLesser right:l:Expression" },
						RightShift: {pr: 650, pat: "left:l:Expression sign:t:DoubleGreater right:l:Expression" },
						UnsignedRightShift: {pr: 650, pat: "left:l:Expression sign:t:TripleGreater right:l:Expression" },
								
						Addition: {pr: 700, pat: "left:l:Expression sign:t:Plus right:l:Expression" },
						Subtraction: {pr: 700, pat: "left:l:Expression sign:t:Minus right:l:Expression" },
								
						Multiplication: {pr: 750, pat: "left:l:Expression sign:t:Asterisk right:l:Expression" },
						Division: {pr: 750, pat: "left:l:Expression sign:t:Slash right:l:Expression" },
						Remainder: {pr: 750, pat: "left:l:Expression sign:t:Percent right:l:Expression" },
						Exponentiation: {pr: 750, pat: "left:l:Expression sign:t:DoubleAsterisk right:l:Expression", ra: true}
					},
					TernaryOperator:{t:"($first$leftSign$second$rightSign$third)",
						ConditionalOperator: { pr: 150, pat: "first:l:Expression leftSign:t:Question second:l:Expression rightSign:t:Colon third:l:Expression", ra:true}
					}
				},
				Parenthesis: {pr:1500, pat: "left:t:LeftParenthesis body:l:Expression right:t:RightParenthesis", t:"($body)"}
			}
		};
		
		(function(){
			
			var lexem = function(name, desc, parent){
				var result = lexems[name] = ast.lexem().setName(name).setParent(parent);
				for(var i in desc)
					switch(i){
						case 'pr': result.setPriority(desc.pr); continue;
						case 'pat': 
							var parts = desc.pat.split(' ');
							for(var i in parts){
								var sp = parts[i].split(':');
								result.addPart(sp[0], (sp[1] === 'l'?l:t)[sp[2]]);
							}
							continue;
						case 'tf': result.setTranslator(desc.tf); continue;
						case 'sf': result.setSourcer(desc.tf); continue;
						case 't': result.setTranslatorFormatString(desc.t); continue;
						case 'ra': result.setIsRightAssociative(desc.ra); continue;
						case 'cond': result.setParsingCondition(desc.cond); continue;
						default: lexem(i, desc[i], result); continue;
					}
			}
			
			for(var i in lexemTree) lexem(i, lexemTree[i], ast.Lexem);
		})();
		
		var tokenizerPostProcessors = [
			processor('removeTrashTokens', 100,function(t){
				var result = [];
				for(var i in t)
					if(!(t[i] instanceof tokens.TrashToken))
						result.push(t[i]);
				return result;
			})
		]
	
		return {
			tokens: tokens,
			lexems: lexems,
			groups: groupsRaw,
			
			tokenizerPostProcessors: tokenizerPostProcessors,
			
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
			for(i in this.definition.groups) tokenizer.defineGroup(this.definition.groups[i]);
			for(i in this.definition.tokenizerPostProcessors) tokenizer.definePostProcessor(this.definition.tokenizerPostProcessors[i]);
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
