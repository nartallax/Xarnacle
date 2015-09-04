var tests = {
	"Basic javascript structures":{
		"Numbers": {
			"Decimal integers": [
				{code: "1", result: "1", source: "1", source: "1"},
				{code: "0", result: "0", source: "0", source: "0"},
				{code: "1234567890", result: "1234567890", source: "1234567890"},
			], "Decimal fractionals": [
				{code: "1.0", result: "1", source: "1"},
				{code: "1.6", result: "1.6", source: "1.6"},
				{code: "0.4", result: "0.4", source: "0.4"},
				{code: "0.400", result: "0.4", source: "0.4"},
				{code: "0.35", result: "0.35", source: "0.35"},
				{code: "0.04", result: "0.04", source: "0.04"},
				{code: "0.00004", result: "0.00004", source: "0.00004"},
			], "Octals": [
				{code: "01", result: "1", source: "1"},
				{code: "000", result: "0", source: "0"},
				{code: "0001", result: "1", source: "1"},
				{code: "07", result: "7", source: "7"},
				{code: "010", result: "8", source: "8"},
				{code: "01234567", result: "342391", source: "342391"},
			], "Hexadecimals": [
				{code: "0x1", result: "1", source: "1"},
				{code: "0x0", result: "0", source: "0"},
				{code: "0x000000", result: "0", source: "0"},
				{code: "0x01", result: "1", source: "1"},
				{code: "0x000001", result: "1", source: "1"},
				{code: "0xabcdef", result: "11259375", source: "11259375"},
				{code: "0x", result: "0", source: "0"}
			]
		}, "Strings": [
			{code: "'test'", result: "\"test\"", source: "\"test\""},
			{code: "\"test\"", result: "\"test\"", source: "\"test\""},
			{code: "\"\"", result: "\"\"", source: "\"\""},
			{code: "''", result: "\"\"", source: "\"\""},
			{code: "'\\n'", result: '"\\n"', source: "\"\\n\""},
			{code: "'\\t'", result: '"\\t"', source: "\"\\t\""},
			{code: "'\\f'", result: '"\\f"', source: "\"\\f\""},
			{code: "'\\r'", result: '"\\r"', source: "\"\\r\""},
			{code: "'\\b'", result: '"\\b"', source: "\"\\b\""},
			{code: "'\\e'", result: '"e"', source: "\"e\""},
			{code: "'\\!\\!!'", result: '"!!!"', source: "\"!!!\""},
			{code: "'\\\\'", result: '"\\\\"', source: "\"\\\\\""},
			{code: "'\\''", result: '"\\\'"', source: "\"\\'\""},
			{code: "'\"'", result: '"\\""', source: "\"\\\"\""},
			{code: "'\\\"'", result: '"\\\""', source: "\"\\\"\""},
			{code: "'\\\\\"'", result: '"\\\\\\""', source: "\"\\\\\\\"\""},
			{code: "'\\\\\\\"'", result: '"\\\\\\""', source: "\"\\\\\\\"\""},
			{code: "'   '", result: '"   "', source: "\"   \""},
			{code: "'a b c d'", result: '"a b c d"', source: "\"a b c d\""}
		], "Comments": [
			{code: "/**/''", result: '""', source: "\"\""},
			{code: "1/**/", result: '1', source: "1"},
			{code: "1/*2*/", result: '1', source: "1"},
			{code: "1//", result: '1', source: "1"},
			{code: "2//1", result: '2', source: "2"},
			{code: "'/*test*/'", result: '"/*test*/"', source: "\"/*test*/\""},
			{code: "'//test'", result: '"//test"', source: "\"//test\""},
		]/*, "Regular expressions": [
			{code: "/.+/", result: '/.+/', source: "/.+/"},
			{code: "/.+/gim", result: '/.+/gim', source: "/.+/gim"},
			{code: "/\\//", result: '/\\//', source: "/\\//"},
			{code: "/\\//", result: '/\\//', source: "/\\//"},
			{code: "/\\s+/g", result: '/\\s+/g', source: "/\\s+/g"},
			{code: "/(\\d+\\.?\\d+)/g", result: '/(\\d+\\.?\\d+)/g', source: "/(\\d+\\.?\\d+)/g"},
			{code: "/[\\[\\]]/g", result: '/[\\[\\]]/g', source: "/[\\[\\]]/g"}
		]*/, "Expressions": {
				"Everything else": [
					{code: "2 + 2", result: '(2+2)', source: "2 + 2"},
					{code: "2 * 2", result: '(2*2)', source: "2 * 2"},
					{code: "2 + 2 - 2 + 2", result: '(((2+2)-2)+2)', source: "2 + 2 - 2 + 2"},
					{code: "2 * 2 + 2", result: '((2*2)+2)', source: "2 * 2 + 2"},
					{code: "2 + 2 * 2", result: '(2+(2*2))', source: "2 + 2 * 2"},
					{code: "2 * 2 + 2 * 2", result: '((2*2)+(2*2))', source: "2 * 2 + 2 * 2"},
					{code: "(2 + 2) * 2", result: '(((2+2))*2)', source: "( 2 + 2 ) * 2"},
					{code: "2 + 2 * 2", result: '(2+(2*2))', source: "2 + 2 * 2"},
					{code: "2 + (2 * 2)", result: '(2+((2*2)))', source: "2 + ( 2 * 2 )"},
					{code: "2 + 3 - 1", result: '((2+3)-1)', source: "2 + 3 - 1"},
					{code: "2 * 3 / 5", result: '((2*3)/5)', source: "2 * 3 / 5"},
					{code: "2 * 3 / 5 % 2 * 8 % 9", result: '(((((2*3)/5)%2)*8)%9)', source: "2 * 3 / 5 % 2 * 8 % 9"},
					{code: "(a instanceof b) - 2", result: '(((a instanceof b))-2)', source: "( a instanceof b ) - 2"},
					{code: "(a + b) - 2", result: '(((a+b))-2)', source: "( a + b ) - 2"},
					{code: "(a.b) - 2", result: '((a.b)-2)', source: "( a . b ) - 2"},
					{code: "a instanceof b", result: '(a instanceof b)', source: "a instanceof b"},
					{code: "typeof a === 'string'", result: '((typeof(a))==="string")', source: "typeof a === \"string\""},
					{code: "typeof a !== 'string'", result: '((typeof(a))!=="string")', source: "typeof a !== \"string\""},
					{code: "typeof a == 'string'", result: '((typeof(a))=="string")', source: "typeof a == \"string\""},
					{code: "typeof a != 'string'", result: '((typeof(a))!="string")', source: "typeof a != \"string\""},
					{code: "a || true === b && false", result: '(a||((true===b)&&false))', source: "a || true === b && false"},
					{code: "a | 3 ^ b & 0xff === 0xff", result: '(a|(3^(b&(255===255))))', source: "a | 3 ^ b & 255 === 255"},
					{code: "2 - 3", result: '(2-3)', source: "2 - 3"},
					//{code: "/.*?$/ / /^\d+/g", result: '/.*?$/ / /^\d+/g', source: "/.*?$/ / /^\d+/g"},
					//{code: "/\/*/ / /\*\//", result: '/\/*/ / /\*\//', source: "/\/*/ / /\*\//"},
					{code: "'abcde' in someObject", result: '("abcde" in someObject)', source: "\"abcde\" in someObject"},
					{code: "!true !== !false", result: '((!true)!==(!false))', source: "! true !== ! false"},
					{code: "~0xff !== ~~0xff", result: '((~255)!==(~(~255)))', source: "~ 255 !== ~ ~ 255"}
				], "Identifiers and chaining": [
					{code: "abc", result: 'abc', source: "abc"},
					{code: "abc.def.ghi", result: 'abc.def.ghi', source: "abc . def . ghi"},
					{code: "instanceoffer", result: 'instanceoffer', source: "instanceoffer"},
					{code: 'abc.instanceof.cde', result: 'abc.instanceof.cde', source:'abc . instanceof . cde'}
				], "Unambiguous unary operators": [
					{code: "i++", result: '(i++)', source: "i ++"},
					{code: "++i", result: '(++i)', source: "++ i"},
					{code: "i++ + ++i", result: '((i++)+(++i))', source: "i ++ + ++ i"},
					{code: "i++ / ++i", result: '((i++)/(++i))', source: "i ++ / ++ i"},
					{code: "--i*i--", result: '((--i)*(i--))', source: "-- i * i --"}
				], "Ambiguous unary operators": [
					{code: "-3", result: '(-3)', source: "- 3"},
					{code: "+3", result: '(+3)', source: "+ 3"},
					{code: "2 + -3", result: '(2+(-3))', source: "2 + - 3"},
					{code: "1 + - 2", result: '(1+(-2))', source: "1 + - 2"},
					{code: "1 - + 2", result: '(1-(+2))', source: "1 - + 2"},
					{code: "- 1 + - 2", result: '((-1)+(-2))', source: "- 1 + - 2"},
					{code: "+ 1 - + 2", result: '((+1)-(+2))', source: "+ 1 - + 2"}
				], "Right-Associative Operators":[
					{code: "a = b = c = d", result: '(a=(b=(c=d)))', source: "a = b = c = d"}, // простейшая правоассоциативность
					{code: "2 ** 2 ** 2", result: '(2**(2**2))', source: "2 ** 2 ** 2"},
					{code: "a += c ** d", result: '(a+=(c**d))', source: "a += c ** d"},
					{code: "typeof typeof a !== string", result: '((typeof((typeof(a))))!==string)', source: "typeof typeof a !== string"},
					{code: "a = b = 2 + 2 + 2", result: '(a=(b=((2+2)+2)))', source: "a = b = 2 + 2 + 2"}, // чуть более сложная правоассоциативность
					{code: "a >>>= 3 >> 2 << 1", result: '(a>>>=((3>>2)<<1))', source: "a >>>= 3 >> 2 << 1"},
					{code: "a = b >>>= c += d - (e = 2)", result: '((a=(b>>>=(c+=d)))-((e=2)))', source: "a = b >>>= c += d - ( e = 2 )"} // правоассоциативность разных равноприоритетных операторов
				], "Complex expressions": [
					{code: "function(a, b){ return a + b; }", result: 'function(a, b){ return a + b;}', source: "function( a , b ){ return a + b ; }"},
					{code: "var a = 5, b = 6; a += b++; consume(a); consume(--b);", result: 'var a = 5 , b = 6 ; a += b ++ ; consume ( a ) ; consume ( -- b ) ;', source: "var a = 5, b = 6; a += b++; consume( a ); consume(--b);"},
					{code: "for(var i in obj) obj[i] = obj[i] * (obj[i - 1] || 1)", result: 'for ( var i in obj ) obj [ i ] = obj [ i ] * ( obj [ i - 1 ] || 1 )', source: "for(var i in obj) obj[i] = obj[i] * (obj[i - 1] || 1)"},
					{code: "var a = getA(), b = getB(); if(a > b) { swap(); } else { dontSwap(); }", result: 'var a = getA ( ) , b = getB ( ) ; if ( a > b ) { swap ( ) ; , source: "var a = getA(), b = getB(); if(a > b) { swap(); } else { dontSwap(); }"} else { dontSwap ( ) ; }'},
					{code: "myFunc()", result: 'myFunc ( )', source: "myFunc()"},
					{code: "abc().def().ghi()", result: 'abc ( ) . def ( ) . ghi ( )', source: "abc().def().ghi()"},
					{code: "abc().def.ghi()", result: 'abc ( ) . def . ghi ( )', source: "abc().def.ghi()"}
				]
		}
	}
}; 