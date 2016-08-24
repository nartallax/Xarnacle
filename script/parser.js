var Token = requireRelative('parsing/token'),
	Unit = requireRelative('parsing/unit'),
	Reader = requireRelative('parsing/reader');
	
module.exports = (code, fileName) => {
	var reader = new Reader(code, fileName),
		tokens = Token.parseAll(reader),
		unit = Unit.assembleAll(tokens);
	
	return unit;
}