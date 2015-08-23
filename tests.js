var tests = {
	"Basic javascript structures":{
		"Numbers": {
			"Decimal integers": [
				{source: "1", result: "1"},
				{source: "0", result: "0"},
				{source: "1234567890", result: "1234567890"},
			], "Decimal fractionals": [
				{source: "1.0", result: "1"},
				{source: "1.6", result: "1.6"},
				{source: "0.4", result: "0.4"},
				{source: "0.400", result: "0.4"},
				{source: "0.35", result: "0.35"},
				{source: "0.04", result: "0.04"},
				{source: "0.00004", result: "0.00004"},
			], "Octals": [
				{source: "01", result: "1"},
				{source: "000", result: "0"},
				{source: "0001", result: "1"},
				{source: "07", result: "7"},
				{source: "010", result: "8"},
				{source: "01234567", result: "342391"},
			], "Hexadecimals": [
				{source: "0x1", result: "1"},
				{source: "0x0", result: "0"},
				{source: "0x000000", result: "0"},
				{source: "0x01", result: "1"},
				{source: "0x000001", result: "1"},
				{source: "0xabcdef", result: "11259375"},
				{source: "0x", result: "0"}
			]
		}, "Strings": [
			{source: "'test'", result: "\"test\""},
			{source: "\"test\"", result: "\"test\""},
			{source: "\"\"", result: "\"\""},
			{source: "''", result: "\"\""},
			{source: "'\\n'", result: '"\\n"'},
			{source: "'\\t'", result: '"\\t"'},
			{source: "'\\f'", result: '"\\f"'},
			{source: "'\\r'", result: '"\\r"'},
			{source: "'\\b'", result: '"\\b"'},
			{source: "'\\e'", result: '"e"'},
			{source: "'\\!\\!!'", result: '"!!!"'},
			{source: "'\\\\'", result: '"\\\\"'},
			{source: "'\\''", result: '"\\\'"'},
			{source: "'\"'", result: '"\\""'},
			{source: "'\\\"'", result: '"\\""'},
			{source: "'\\\\\"'", result: '"\\\\\\""'},
			{source: "'\\\\\\\"'", result: '"\\\\\\""'},
			{source: "'   '", result: '"   "'},
			{source: "'a b c d'", result: '"a b c d"'}
		], "Comments": [
			{source: "/**/''", result: '""'},
			{source: "1/**/", result: '1'},
			{source: "1/*2*/", result: '1'},
			{source: "1//", result: '1'},
			{source: "2//1", result: '2'},
			{source: "'/*test*/'", result: '"/*test*/"'},
			{source: "'//test'", result: '"//test"'},
		]/*, "Regular expressions": [
			{source: "/.+/", result: '/.+/'},
			{source: "/.+/gim", result: '/.+/gim'},
			{source: "/\\//", result: '/\\//'},
			{source: "/\\//", result: '/\\//'},
			{source: "/\\s+/g", result: '/\\s+/g'},
			{source: "/(\\d+\\.?\\d+)/g", result: '/(\\d+\\.?\\d+)/g'},
			{source: "/[\\[\\]]/g", result: '/[\\[\\]]/g'}
		]*/, "Expressions": [
			{source: "2 + 2", result: '2 + 2'},
			{source: "2 * 2", result: '2 * 2'},
			{source: "2 * 2 + 2", result: '2 * 2 + 2'},
			{source: "2 + 2 * 2", result: '2 + 2 * 2'},
			{source: "2 * 2 + 2 * 2", result: '2 * 2 + 2 * 2'},
			{source: "2 + 3 - 1", result: '2 + 3 - 1'},
			{source: "2 * 3 / 5", result: '2 * 3 / 5'},
			{source: "2 * 3 / 5 % 2 * 8 % 9", result: '2 * 3 / 5 % 2 * 8 % 9'},
			{source: "i++", result: 'i ++'},
			{source: "++i", result: '++ i'},
			{source: "++i++", result: '++ i ++'},
			{source: "--i--", result: '-- i --'},
			{source: "i++ + ++i", result: 'i ++ + ++ i'},
			{source: "i++ / ++i", result: 'i ++ / ++ i'},
			{source: "--i*i--", result: '-- i * i --'},
			{source: "abc", result: 'abc'},
			{source: "abc.def.ghi", result: 'abc . def . ghi'},
			{source: "myFunc()", result: 'myFunc ( )'},
			{source: "abc().def().ghi()", result: 'abc ( ) . def ( ) . ghi ( )'},
			{source: "abc().def.ghi()", result: 'abc ( ) . def . ghi ( )'},
			{source: "a instanceof b", result: 'a instanceof b'},
			{source: "instanceoffer", result: 'instanceoffer'},
			{source: 'abc.instanceof.cde', result: 'abc . instanceof . cde'},
			{source: "typeof a === 'string'", result: 'typeof a === "string"'},
			{source: "typeof a !== 'string'", result: 'typeof a !== "string"'},
			{source: "typeof a == 'string'", result: 'typeof a == "string"'},
			{source: "typeof a != 'string'", result: 'typeof a != "string"'},
			{source: "a = b = c = d", result: 'a = b = c = d'},
			{source: "a += c ** d", result: 'a += c ** d'},
			{source: "/.*?$/ / /^\d+/g", result: '/.*?$/ / /^\d+/g'},
			{source: "/\/*/ / /\*\//", result: '/\/*/ / /\*\//'},
			{source: "a >>>= 3 >> 2 << 1", result: 'a >>>= 3 >> 2 << 1'},
			{source: "a || true === b && false", result: 'a || true === b && false'},
			{source: "a | 3 ^ b & 0xff === 0xff", result: 'a | 3 ^ b & 255 === 255'},
			{source: "2 - 3", result: '2 - 3'},
			{source: "-3", result: '- 3'},
			{source: "+3", result: '+ 3'},
			{source: "2 + -3", result: '2 + - 3'},
			{source: "voed 0", result: 'voed 0'},
			{source: "void 0", result: 'void 0'},
			{source: "'abcde' in someObject", result: '"abcde" in someObject'},
			{source: "!true !== !false", result: '! true !== ! false'},
			{source: "~0xff !== ~~0xff", result: '~ 255 !== ~ ~ 255'},
			{source: "(2 + 2) * 2", result: '( 2 + 2 ) * 2'},
			{source: "2 + 2 * 2", result: '2 + 2 * 2'},
			{source: "2 + (2 * 2)", result: '2 + ( 2 * 2 )'},
			{source: "function(a, b){ return a + b; }", result: 'function ( a , b ) { return a + b ; }'},
			{source: "var a = 5, b = 6; a += b++; consume(a); consume(--b);", result: 'var a = 5 , b = 6 ; a += b ++ ; consume ( a ) ; consume ( -- b ) ;'},
			{source: "for(var i in obj) obj[i] = obj[i] * (obj[i - 1] || 1)", result: 'for ( var i in obj ) obj [ i ] = obj [ i ] * ( obj [ i - 1 ] || 1 )'},
			{source: "var a = getA(), b = getB(); if(a > b) { swap(); } else { dontSwap(); }", result: 'var a = getA ( ) , b = getB ( ) ; if ( a > b ) { swap ( ) ; } else { dontSwap ( ) ; }'},
		]
	}
};