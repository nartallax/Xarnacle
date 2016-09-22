// lexical unit definition (and not the lexical unit instance)
// it can easily be inherited (to create inheritance tree of unit definition) and instantiated (to create actual AST)

// each Lexem is an object and a prototype
// instantiated Lexems could be tested for being particular Lexem with instanceof
var Lexem = (() => {
	
	var lexems = {}, // dictionary of all the lexems defined
		startedTokenMap = null; // map that contains pairs starter -> array of Lexem definition sorted by absolute priority
	
	var createNewConstructor = (proto, baseConstr) => {
		var constr = function(obj){ Object.keys(obj).foreach(k => this[k] = obj[k]) }
		
		if(baseConstr){
			var pseudoParentConstr = function(){ this.constructor = constr };
			pseudoParentConstr.prototype = baseConstr.prototype;
			constr.prototype = new pseudoParentConstr();
		}
		
		Object.keys(proto).foreach(key => constr.prototype[key] = proto[key]);
		return constr;
	}
	
	var deriveLexem = function(baseLexem, name, priority, starters, protoObject){
		priority = priority || 0;
		protoObject = protoObject || {};
		
		var isAbstract = starters === null;
		
		(name && typeof(name) === 'string') || fail('Failed to derive from lexem ' + baseLexem.getFullName() + ': name of new lexem must be textful string.');
		
		isAbstract 
			|| (Array.isArray(starters) && !starters.exists(f => typeof(f) !== 'string'))
			|| fail('Failed to derive from lexem ' + baseLexem.getFullName() + ': starting sequence must be Array of string or null.');
			
		???
		
		var newLexemDefinition = new (createNewConstr(protoObject, baseLexem? baseLexem.constructor: null))({
			isAbstract: isAbstract,	// could be instantiated or not
			priority: priority,		// priorities determine in which cases which lexem should be constructed from source code / lesser lexems
			name: name,				// local name of particular lexem
			children: [],			// a list of definitions of children
			parent: baseLexem,		// link to parent lexem in inheritance tree
			
			// a set of sub-units; each of these could be placed at start of sequence that could be assemled to lexem instance
			// array of string
			starters: starters
		});
		
		startedTokenMap = null; // token definition tree changed, need rebuild
		lexems[newLexemDefinition.getFullName()] = newLexemDefinition;
		
		baseLexem && baseLexem.children.push(newLexemDefinition);
		
		return newLexemDefinition;
	}
	
	return deriveLexem(null, 'Lexem', 0, null, {
		// full-qualified name, including names of all ancestors
		getFullName: function(){ return (this.parent? this.parent.getFullName() + '.': '') + this.name },
		
		// create an instance from given source data
		instantiate: function(source){
			this.isAbstract && fail('Failed to instantiate lexem ' + this.getFullName() + ': abstract lexems could not be instantiated.');
			
			???
		},
		
		// create an inheritor of this lexem
		derive: function(a, b, c, d){ return deriveLexem(this, a, b, c, d) }
	});
	
})();