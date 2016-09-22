var CodePosition = requireRelative('parsing/position');

var Reader = Object.derive(function(code, fileName){
	this.str = code;
	this.pos = 0;
	this.fileName = fileName || '';
}, {
	spaceChars: {'\n': true, '\t': true, ' ': true, '\r': true},
	getPosition: function(){ return CodePosition.inText(this.str, this.pos, this.fileName) },
	fail: function(msg){ fail(this.getPosition(), msg) },
	
	skipSpaces: function(){
		while(this.spaceChars[this.peek()]) this.skip();
	},
	
	isFinished: function(){ return this.pos >= this.str.length },
	
	peek: function(count){ 
		this.isFinished() && this.fail("Could not read after end of file. Probably something bad happened with file grammar.");
		count = typeof(count) === 'number'? count: 1;
		return this.str.substr(this.pos, count);
	},
	skip: function(count){
		this.pos += typeof(count) === 'number'? count: 1;
	},
	read: function(count){
		var result = this.peek(count);
		this.skip(count);
		return result;
	},
	
	maybeReadWith: function(reader){
		var pos = this.pos;
		var readed = reader(this);
		readed || (this.pos = pos);
		return readed;
	},
	
	have: function(str){ return !this.isFinished() && this.peek(str.length) === str },
	haveCharBetween: function(a, b){ 
		if(this.isFinished()) return false;
		var c = this.peek();
		return c >= a && c <= b;
	},
	haveDigit: function(){ return this.haveCharBetween('0', '9'); }
})

module.exports = Reader;