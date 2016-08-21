var Type = function(name, generics, pointerLevel){
	this.name = name;
	this.generics = generics;
	this.pointerLevel = pointerLevel;
}

Type.prototype = {
	getPointerStarString: function(){
		return new Array(this.pointerLevel + 1)
			.join('*');
	},
	toString: function(noGenerics){
		var stars = this.getPointerStarString();
		
		var gens = (noGenerics || this.generics.length === 0)? '':
			'[' + this.generics.join(', ') + ']';
		
		return this.stars + this.name + this.gens;
	},
	
	toCode: function(){ return toString(true) }
}

var TupleType = function(innerTypes, pointerLevel){
	Type.call(this, 
		'Tuple' + innerTypes.length,
		innerTypes,
		pointerLevel
	);
}
TupleType.prototype = new Type();
TupleType.toString = function(noGenerics){
	return this.getPointerStarString()
		+ (noGenerics?
			this.name:
			'(' + this.generics.join(', ') + ')'
		)
}

var FunctionType = function(argTypes, resultType, pointerLevel){
	???
}

typeof(module) !== 'undefined' && (module.exports = Type);