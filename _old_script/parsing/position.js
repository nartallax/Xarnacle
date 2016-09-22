module.exports = Object.derive(function(file, line, col, totalCharsFromFileStart){
	this.file = file;
	this.line = line;
	this.column = col;
	this.position = totalCharsFromFileStart;
}, {
	toString: function(){
		var result = '';
		this.filename && (result += 'in file ' + this.file + ' ');
		
		return result + 'on line ' + this.line + ', at char ' + this.column;
	}
});

module.exports.inText = (text, cursor, fileName) => {
	// slow and ugly but working
	var passed = text.substr(0, cursor),
		ln = passed.replace(/[^\n]/g, '').length + 1,
		col = ((passed.match(/[^\n]+$/) || [])[0] || passed).length;
		
	return new module.exports(fileName, ln, col, cursor);
}