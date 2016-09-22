var Type = function(name, generics, pointerLevel){
	this.name = name;
	this.generics = generics;
	this.pointerLevel = pointerLevel;
}

Type.prototype = {
	getPointerStarString: function(){ return new Array(this.pointerLevel + 1).join('*') },
	toString: function(){
		var stars = this.getPointerStarString();
		var gens = this.generics.length === 0? '': '[' + this.generics.join(', ') + ']';
		return this.stars + this.name + this.gens;
	},
	
	toTranslatedCode: function(){
		var pstars = this.typeObject.getPointerStarString()
		var name = this.typeObject.name;
		
		name in Type.simple && (name = Type.simple[name]);
		
		return name + pstars;
	}
}

var TupleType = Type.Tuple = function(innerTypes, pointerLevel){
	Type.call(this, 'Tuple' + innerTypes.length, innerTypes, pointerLevel);
}
TupleType.prototype = new Type();
TupleType.prototype.toString = function(){
	return this.getPointerStarString() + '(' + this.generics.join(', ') + ')';
}

var FunctionType = Type.Function = function(argTypes, resultType, pointerLevel){
	Type.call(this, 'Function' + argTypes.length, argTypes.concat([resultType]), pointerLevel);
}
FunctionType.prototype = new Type();
FunctionType.prototype.getCallResultType = function(){ return this.generics[this.generics.length - 1] }
FunctionType.prototype.getArgumentTypes = function(){ return this.generics.slice(0, this.generics.length - 1) }
FunctionType.prototype.toString = function(){
	var pss = this.getPointerStarString();
	var resultType = this.getCallResultType().toString();
	var argTypes = this.getArgumentTypes().map(t => t.toString());
	argTypes = argTypes.length === 1? argTypes[0].toString(): '(' + argTypes.map(t => t.toString()).join(', ') + ')'
	
	var arrowNotated = argTypes + ' => ' + resultType;
	return pss? pss + '(' + arrowNotated + ')': arrowNotated;
}
FunctionType.prototype.toTranslatedCode = function(name){
	// TODO: add check for this method not used in top-level function declaration or its parameters without name
	// if type is function, this method must be used only in case if it is parameter of parameter (and through this is not named)
	name = name || '';
	var pss = this.getPointerStarString(),
		result = this.getCallResultType().toTranslatedCode(),
		args = this.getArgumentTypes().map(t => t.toTranslatedCode()).join(', ');
	
	return result + '(' + pss + '*' + name + ')(' + args + ')';
}

// despite of lots of numeric types here, in my opinion there is only three that really should be used: long, double and byte
// others are here mostly for compatibility purposes, yet usable everywhere
Type.simple = {
	// 8 bytes
	'long': 'long long int',
	'ulong': 'unsigned long long int',
	'double': 'double',
	
	// 4 bytes
	'int': 'int',
	'uint': 'unsigned int',
	'float': 'float',
	
	// 2 bytes
	'short': 'short int',
	'ushort': 'unsigned short int',
	
	// 1 byte
	'byte': 'unsigned char',
	'bool': 'char' // TODO: test for performance against int or something like that; aligning could help here
}

typeof(module) !== 'undefined' && (module.exports = Type);