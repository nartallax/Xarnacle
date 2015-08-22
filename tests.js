var tests = {
	"Basic javascript structures":{
		"Numbers": {
			"Decimal integers": [
				{source: "1", tokens: "1"},
				{source: "0", tokens: "0"},
				{source: "1234567890", tokens: "1234567890"},
			], "Decimal fractionals": [
				{source: "1.0", tokens: "1"},
				{source: "1.6", tokens: "1.6"},
				{source: "0.4", tokens: "0.4"},
				{source: "0.400", tokens: "0.4"},
				{source: "0.35", tokens: "0.35"},
				{source: "0.04", tokens: "0.04"},
				{source: "0.00004", tokens: "0.00004"},
			], "Octals": [
				{source: "01", tokens: "1"},
				{source: "000", tokens: "0"},
				{source: "0001", tokens: "1"},
				{source: "07", tokens: "7"},
				{source: "010", tokens: "8"},
				{source: "01234567", tokens: "342391"},
			], "Hexadecimals": [
				{source: "0x1", tokens: "1"},
				{source: "0x0", tokens: "0"},
				{source: "0x000000", tokens: "0"},
				{source: "0x01", tokens: "1"},
				{source: "0x000001", tokens: "1"},
				{source: "0xabcdef", tokens: "11259375"},
				{source: "0x", tokens: "Tokenization exception at 2: hexadecimal must have at least one meaningful digit"} // just as planned
			]
		}, "Strings": [
			{source: "'test'", tokens: "\"test\""},
			{source: "\"test\"", tokens: "\"test\""},
			{source: "\"\"", tokens: "\"\""},
			{source: "''", tokens: "\"\""},
			{source: "'\\n'", tokens: '"\\n"'},
			{source: "'\\t'", tokens: '"\\t"'},
			{source: "'\\f'", tokens: '"\\f"'},
			{source: "'\\r'", tokens: '"\\r"'},
			{source: "'\\b'", tokens: '"\\b"'},
			{source: "'\\e'", tokens: '"e"'},
			{source: "'\\!\\!!'", tokens: '"!!!"'},
			{source: "'\\\\'", tokens: '"\\\\"'},
			{source: "'\\''", tokens: '"\'"'},
			{source: "'\"'", tokens: '"\\""'},
			{source: "'\\\"'", tokens: '"\\""'},
			{source: "'\\\\\"'", tokens: '"\\\\\\""'},
			{source: "'\\\\\\\"'", tokens: '"\\\\\\""'},
			{source: "'   '", tokens: '"   "'},
			{source: "'a b c d'", tokens: '"a b c d"'}
		], "Comments": [
			{source: "/**/''", tokens: '/**/ ""'},
			{source: "1/**/", tokens: '1 /**/'},
			{source: "1/*2*/", tokens: '1 /*2*/'},
			{source: "1//", tokens: '1 //'},
			{source: "2//1", tokens: '2 //1'},
			{source: "'/*test*/'", tokens: '"/*test*/"'},
			{source: "'//test'", tokens: '"//test"'},
		], "Regular expressions": [
			{source: "/.*/", tokens: '/.*/'},
			{source: "/.*/gim", tokens: '/.*/gim'},
			{source: "/\\//", tokens: '/\\//'},
			{source: "/\\//", tokens: '/\\//'},
			{source: "/\\s+/g", tokens: '/\\s+/g'},
			{source: "/(\\d+\\.?\\d+)/g", tokens: '/(\\d+\\.?\\d+)/g'},
			{source: "/[\\[\\]]/g", tokens: '/[\\[\\]]/g'}
		], "Expressions": [
			{source: "2 + 2", tokens: '2 + 2'},
			{source: "2 * 2", tokens: '2 * 2'},
			{source: "2 * 2 + 2", tokens: '2 * 2 + 2'},
			{source: "2 + 2 * 2", tokens: '2 + 2 * 2'},
			{source: "2 * 2 + 2 * 2", tokens: '2 * 2 + 2 * 2'},
			{source: "2 + 3 - 1", tokens: '2 + 3 - 1'},
			{source: "2 * 3 / 5", tokens: '2 * 3 / 5'},
			{source: "2 * 3 / 5 % 2 * 8 % 9", tokens: '2 * 3 / 5 % 2 * 8 % 9'},
			{source: "i++", tokens: 'i ++'},
			{source: "++i", tokens: '++ i'},
			{source: "++i++", tokens: '++ i ++'},
			{source: "--i--", tokens: '-- i --'},
			{source: "i++ + ++i", tokens: 'i ++ + ++ i'},
			{source: "i++ / ++i", tokens: 'i ++ / ++ i'},
			{source: "--i*i--", tokens: '-- i * i --'},
			{source: "abc", tokens: 'abc'},
			{source: "abc.def.ghi", tokens: 'abc . def . ghi'},
			{source: "myFunc()", tokens: 'myFunc ( )'},
			{source: "abc().def().ghi()", tokens: 'abc ( ) . def ( ) . ghi ( )'},
			{source: "abc().def.ghi()", tokens: 'abc ( ) . def . ghi ( )'},
			{source: "a instanceof b", tokens: 'a instanceof b'},
			{source: "instanceoffer", tokens: 'instanceoffer'},
			{source: 'abc.instanceof.cde', tokens: 'abc . instanceof . cde'},
			{source: "typeof a === 'string'", tokens: 'typeof a === "string"'},
			{source: "typeof a !== 'string'", tokens: 'typeof a !== "string"'},
			{source: "typeof a == 'string'", tokens: 'typeof a == "string"'},
			{source: "typeof a != 'string'", tokens: 'typeof a != "string"'},
			{source: "a = b = c = d", tokens: 'a = b = c = d'},
			{source: "a += c ** d", tokens: 'a += c ** d'},
			{source: "/.*?$/ / /^\d+/g", tokens: '/.*?$/ / /^\d+/g'},
			{source: "/\/*/ / /\*\//", tokens: '/\/*/ / /\*\//'},
			{source: "a >>>= 3 >> 2 << 1", tokens: 'a >>>= 3 >> 2 << 1'},
			{source: "a || true === b && false", tokens: 'a || true === b && false'},
			{source: "a | 3 ^ b & 0xff === 0xff", tokens: 'a | 3 ^ b & 255 === 255'},
			{source: "2 - 3", tokens: '2 - 3'},
			{source: "-3", tokens: '- 3'},
			{source: "+3", tokens: '+ 3'},
			{source: "2 + -3", tokens: '2 + - 3'},
			{source: "voed 0", tokens: 'voed 0'},
			{source: "void 0", tokens: 'void 0'},
			{source: "'abcde' in someObject", tokens: '"abcde" in someObject'},
			{source: "!true !== !false", tokens: '! true !== ! false'},
			{source: "~0xff !== ~~0xff", tokens: '~ 255 !== ~ ~ 255'},
			{source: "(2 + 2) * 2", tokens: '( 2 + 2 ) * 2'},
			{source: "2 + 2 * 2", tokens: '2 + 2 * 2'},
			{source: "2 + (2 * 2)", tokens: '2 + ( 2 * 2 )'},
			{source: "function(a, b){ return a + b; }", tokens: 'function ( a , b ) { return a + b ; }'},
			{source: "var a = 5, b = 6; a += b++; consume(a); consume(--b);", tokens: 'var a = 5 , b = 6 ; a += b ++ ; consume ( a ) ; consume ( -- b ) ;'},
			{source: "for(var i in obj) obj[i] = obj[i] * (obj[i - 1] || 1)", tokens: 'for ( var i in obj ) obj [ i ] = obj [ i ] * ( obj [ i - 1 ] || 1 )'},
			{source: "var a = getA(), b = getB(); if(a > b) { swap(); } else { dontSwap(); }", tokens: 'var a = getA ( ) , b = getB ( ) ; if ( a > b ) { swap ( ) ; } else { dontSwap ( ) ; }'},
		]
	}
};