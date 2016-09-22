module.exports = tokenDictionary => {
	
	var t = tokenDictionary;
	
	var readNumber = (reader, needPoint, noSkipSpaces) => {
		var result = '';
		while(reader.haveDigit()) result += reader.read();
		
		if(!result) return null;
		if(!needPoint) return result;
		
		if(!reader.have('.')) return null;
		reader.skip(1);
		var fract = readNumber(reader, false, true);
		fract || reader.fail('Expected fractional part after dot.');
		return result + '.' + fract;
	}

	var readString = reader => {
		var result = '"';
		
		var isEscapedNow = false, ch;
		while(true){
			result += (ch = reader.read());
			if(ch === '"' && !isEscapedNow) break;
			isEscapedNow = ch === '\\'? !isEscapedNow: false;
		}
		return result;
	}
	
	t['Token'].define('Literal', 100);
	
	t['Token.Literal'].define('Number', 0);
	t['Token.Literal.Number'].define('Fractional', 1, reader => readNumber(reader, true), '0123456789');
	t['Token.Literal.Number'].define('Integer', 0, reader => readNumber(reader, false), '0123456789');
	t['Token.Literal'].define('String', 0, reader => readString(reader), '"');
	
	t['Token'].define('Operator', 100);
	
	t['Token.Operator'].define('Unary', 1);
	t['Token.Operator.Unary'].define('DoubleMinus', 0, '--');
	t['Token.Operator.Unary'].define('DoublePlus', 0, '++');
	
	t['Token.Operator'].define('Binary', 0);
	t['Token.Operator.Binary'].define('Minus', 0, '-');
	t['Token.Operator.Binary'].define('Plus', 0, '+');
	t['Token.Operator.Binary'].define('Asterisk', 0, '*');
	t['Token.Operator.Binary'].define('Slash', 0, '/');

}