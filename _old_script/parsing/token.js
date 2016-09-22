var tokenDictionary = {},
	tokenByCharMap = {};

var defineToken = (name, relativePriority, base, possibleStartCharacters, read) => {
	relativePriority = relativePriority || 0;
	
	base && !base.isAbstract() && fail('Failed to define token ' + name + ': subtoken may be defined only as child of abstract tokens (or as a root token).');
	
	var isAbstract = read? false: true;
	var startChars = isAbstract? []:
		typeof(possibleStartCharacters) === 'string'? possibleStartCharacters.split(''):
		Array.isArray(possibleStartCharacters)? possibleStartCharacters:
		fail('Failed to define token ' + name + ': non-abstract token must have start characters (as array or string).');
	
	var TokenDefinition = (base || Object).derive(function(strVal, startPos, endPos){
		this.value = strVal;
		this.startPos = startPos;
		this.endPos = endPos;
	}, {
		toString: function(){ return this.getName() + '(' + this.value + ')' }
	});
	
	var addProp = (name, value) => (TokenDefinition.prototype[name] = TokenDefinition[name] = value)
	var addGetter = (name, value) => addProp(name, () => value);
	
	addGetter('getShortName', name);
	addGetter('getRelativePriority', relativePriority);
	addGetter('isAbstract', isAbstract);
	addGetter('getStartChars', startChars || []);
	addProp('getName', function(){
		return (this.super && this.super.getName? this.super.getName() + '.': '') + this.getShortName();
	})
	addProp('getAbsolutePriority', function(){
		return this.getRelativePriority() + (this.super && this.super.getAbsolutePriority? this.super.getAbsolutePriority(): 0)
	});
	
	isAbstract || (TokenDefinition.stringReaderFunction = read);
	
	TokenDefinition.read = base? base.read: function(reader){
		return reader.maybeReadWith(reader => {
			var startPos = reader.getPosition();
			var str = this.stringReaderFunction(reader);
			return str? new this(str, startPos, reader.getPosition()): null
		});
	}
	
	// basic and wide-most definition
	TokenDefinition.defineFull = base? base.defineFull: function(name, startChars, relativePriority, read){
		var NewTokenDefinition = defineToken(name, relativePriority, this, startChars, read);
		this.subtokens[NewTokenDefinition.getName()] = NewTokenDefinition;
		return NewTokenDefinition;
	}
	
	// shorthand to define abstract tokens that only serve purpose of grouping
	TokenDefinition.defineAbstract = base? base.defineAbstract: function(name, relativePriority){
		return this.defineFull(name, null, relativePriority, null);
	}
	
	// shorthand to define tokens that have constant representation: operators etc
	TokenDefinition.defineConstant = base? base.defineConstant: function(name, relativePriority, representations){
		(!representations || (Array.isArray(representations) && representations.length === 0)) && fail('Failed to define token ' + name + ': no representation is present.');
		
		representations = typeof(representations) === 'string'? [representations]:
			Array.isArray(representations)? representations:
			fail('Failed to define token ' + name + ': expected string or array of strings as representation.');
			
		var startChars = representations.map(r => r.charAt(0));
		return this.defineFull(name, startChars, relativePriority, reader => {
			var repr = representations.filter(repr => reader.have(repr))[0];
			return repr? (reader.skip(repr.length), repr): null;
		});
	}
	
	// all-in-one
	TokenDefinition.define = base? base.define: function(name, priority, reprOrReader, startChars){
		return !reprOrReader? this.defineAbstract(name, priority):
			typeof(reprOrReader) === 'function'? this.defineFull(name, startChars, priority, reprOrReader):
			this.defineConstant(name, priority, reprOrReader);
	}
	
	TokenDefinition.rebuildDictionaries = base? base.rebuildDictionaries: function(isCalledRecursively){
		isCalledRecursively || (tokenByCharMap = {});
		
		var mapped = Object.keys(this.subtokens)
			.map(name => this.subtokens[name]);
			
		Object.keys(this.subtokens)
			.map(name => this.subtokens[name])
			.foreach(definition => {
				if(definition.isAbstract()){
					definition.rebuildDictionaries(true);
				} else {
					definition.getStartChars().foreach(startChar => {
						!(startChar in tokenByCharMap) && (tokenByCharMap[startChar] = []);
						tokenByCharMap[startChar].push(definition);
					});
				}
			})
			
		isCalledRecursively || Object.keys(tokenByCharMap)
			.foreach(ch => tokenByCharMap[ch] = tokenByCharMap[ch].sortBy(t => t.getAbsolutePriority(), true));
	}
	
	TokenDefinition.subtokens = {};
	
	tokenDictionary[TokenDefinition.getName()] = TokenDefinition;
	return TokenDefinition;
}

var Token = defineToken('Token');

Token.dictionary = tokenDictionary;

Token.parseAll = reader => {
	var result = [];
	
	Token.rebuildDictionaries();
	
	while(!reader.isFinished()){
		reader.skipSpaces();
		var possibleTokens = tokenByCharMap[reader.peek()] || [];
		var newToken = possibleTokens.mapFind(definition => definition.read(reader));
		newToken || fail(reader.getPosition(), 'Unexpected character: "' + reader.peek() + '".');
		//console.log('Readed ' + newToken);
		result.push(newToken);
	}
	
	return result;
};

module.exports = Token;

requireRelative('parsing/tokens')(tokenDictionary);