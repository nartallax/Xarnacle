var units = {};

// some lexical unit
var Unit = function(){
	// approximate coordinates of unit in source code
	// NOT guaranteed to be accurate or even filled
	// use only to roughly point programmer to error site
	this.lineNumber = null;
	this.columnNumber = null;
	this.filename = null;
	
	this.parent = null;
}

Unit.define = (name, constr, obj, base) => {
	constr = constr || function(){};
	obj = obj || {};
	base = base || Unit;

	constr.prototype = new base();
	
	Object.keys(obj).forEach(key => constr.prototype[key] = obj[key])
	
	constr.prototype.getName = () => name;
	
	// trick to ensure good value in ident param
	var transCode = constr.prototype.toTranslatedCode;
	constr.prototype.toTranslatedCode = function(ident, prefix, postfix){
		return this.isEmpty()? '': (prefix || '') + transCode.call(this, ident || '') + (postfix || '');
	};
	
	if(name in units)
		throw 'Duplicate definition of lexical unit "' + name + '"';
	
	units[name] = constr;
	
	return constr;
}

Unit.prototype = {
	getName: function(){ return '' },
	getChildren: function(){
		return this.children || (this.children = [])
	},
	
	getLastChild: function(){
		var ch = this.children || [];
		return ch[ch.length - 1];
	},
	
	childCount: function(){
		return (this.children || []).length;
	},
	
	haveChildren: function(){
		return this.childCount() > 0
	},
	
	eachChild: function(cb){
		return (this.children || []).map(cb);
	},
	
	addChild: function(child){
		this.getChildren().push(child)
		child.parent = this;
	},

	toTokenString: function(){ 
		return this.getName();
	},
		
	toTranslatedCode: function(){ return '' },
	
	toString: function(){
		return this.toTokenString();
	},
	
	isEmpty: function(){ return false; },
	
	isTopLevel: function(){
		return this.parent === null || (
			(this.parent instanceof units.sequence)
			&& this.parent.parent === null
		)
	},
	
	fail: function(msg){
		throw new Error('Error in file ' + this.fileName + ' at line ' + this.lineNumber + ', at column ' + this.columnNumber + ':\n\t' + msg);
	},
	
	failNeedType: function(){
		this.fail('Need type here; type is not infered nor stated explicitly.');
	},
	
	inferTypes: function(){},
	getResultType: function(){ return null }
}

// unit that can be represented just as grouper of other unit
// its still expected from this unit to have some logic of translated code formation
var SimpleUnit = function(){}
SimpleUnit.prototype = new Unit();
SimpleUnit.define = (name, inputNames, proto) => {
	var constr = function(/* vararg */){
		var args = arguments
		inputNames.forEach((name, index) => {
			var child = args[index];
			this[name] = child;
			if(child && typeof(child) === 'object' && child instanceof Unit){
				this.addChild(child);
			}
		});
	}

	if(!('toTokenString' in proto)){
		proto.toTokenString = function(){
			var result = this.getName();
			
			if(inputNames.length > 0){
				result += '('
				
				result += inputNames.map(name => {
					var part = this[name];
					
					if(!part 
						|| typeof(part) !== 'object'
						|| !('toTokenString' in part)){
						return part + ''
					}
					
					return part.toTokenString();
				}).join(', ');
				
				result += ')'
			}
			
			return result;
		}
	}

	var result = Unit.define(name, constr, proto);
	
	return result;
}

// empty pseudo-token
// used in place it COULD be, but not present
// (and that's okay)
Unit.define('empty', function(){}, {
	isEmpty: function(){ return true }
});

// sequence of units
Unit.define('sequence', function(codeSeparator){
	this.codeSep = codeSeparator || '\n';
}, {
	
	toTokenString: function(){
		return 'sequence(' + this.eachChild(c => {
			return c.toTokenString()
		}).join(', ') + ')'
	},
	
	toTranslatedCode: function(ident){
		return this.eachChild(c => {
			return c.toTranslatedCode(ident);
		}).join(this.codeSep);
	},
	
	isEmpty: function(){ 
		return !this.haveChildren();
	},
	
	inferTypes: function(){
		this.eachChild(c => c.inferTypes());
	}
});

// name is identifier
SimpleUnit.define('name', ['valueStr'], {
	toTranslatedCode: function(ident){
		return this.valueStr;
	}
});

SimpleUnit.define('func_def', ['argToken', 'bodyToken'], {
	toTranslatedCode: function(i){
		this.fail('This unit should not be translated directly.');
	}
})

SimpleUnit.define('func_def_arg', ['nameToken', 'typeToken'], {
	toTranslatedCode: function(){
		if(this.typeToken.isEmpty()){
			this.failNeedType();
		}
	
		return this.typeToken.toTranslatedCode()
			+ ' ' + this.nameToken.toTranslatedCode();
	}
})

SimpleUnit.define('type', ['nameToken', 'genericsToken', 'pointerNestingLevel'], {
	toTranslatedCode: function(){
		var pstars = new Array(this.pointerNestingLevel + 1).join('*')
		
		var name = this.nameToken.toTranslatedCode()
		
		// TODO: more beautiful way to do this?
		name = name === 'long'?
			'long long int':
			name;
		
		return pstars + name;
	},
	
	getFunctionResultTypeUnit: function(){
		return this.getLastChild();
	}
})

// TODO: modifiers (mutability, visibility)
SimpleUnit.define('var_decl', ['nameToken', 'typeToken', 'valueToken', 'flags'], {

	toTranslatedCode: function(i){
		if(this.typeToken.isEmpty()){
			this.failNeedType();
		}
	
		var name = this.nameToken.toTranslatedCode();
	
		var isFuncDecl = this.valueToken instanceof units.func_def;

		if(isFuncDecl && this.flags.immutable){
			if(this.isTopLevel()){
				var type = this.typeToken
					.getFunctionResultTypeUnit()
					.toTranslatedCode();
			
				return type + ' ' + name + '(' + this.valueToken.argToken.toTranslatedCode() + '){' + this.valueToken.bodyToken.toTranslatedCode('','\n', '\n' + i) + '}';
			} else {
				// TODO: handle methods declaration and closures here
				this.fail('not implemented');
			}
		} else {
			var type = this.typeToken.toTranslatedCode();
		
			return type + ' ' + name + this.valueToken.toTranslatedCode('', ' = ') + ';';
		}
	}

});

typeof(module) !== 'undefined' && (module.exports = units);