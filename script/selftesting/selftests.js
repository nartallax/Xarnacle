var testData = {
	parser: {
		
		simpleExpressions: [
			{input: '1 + 1', code: '1 + 1'}
		],
/*		
		globalVariables: [
			{input: 'val numberGlobalVal = 5', code: 'const long long int numberGlobalVal = 5;'},
			{input: 'var numberGlobalVar = 5', code: 'long long int numberGlobalVar = 5;'}
		], 
		
		globalFunctions: [
			{input: 'val func: (int, int) => int = (a, b) => a + b', code: 'int func(int a, int b){\n\treturn a + b;\n}'}, // same; simple reverse type inference
			{input: 'val func = (a: int, b: int) => a + b', code: 'int func(int a, int b){\n\treturn a + b;\n}'}, // same; simple forward type inference
			{input: 'val func = (a: int, b: int) => { a + b }', code: 'int func(int a, int b){\n\treturn a + b;\n}'}, // same; braces should not matter
			{input: 'val func: (int, int) => int = ((a, b) => a + b)', code: 'int func(int a, int b){\n\treturn a + b;\n}'}, // same; brackets should not matter also
			{input: 'val func: (int, int) => int = ((((a, b) => a + b)))', code: 'int func(int a, int b){\n\treturn a + b;\n}'}, // still doesn't matter
			
			{input: 'val func = int => int = a => a * 5', code: 'int func(){\n\treturn a * 5;\n}'}, // there could be no brackets around params
			{input: 'val func = (int) => int = a => a * 5', code: 'int func(){\n\treturn a * 5;\n}'}, // ...and there could be.
			{input: 'val func = int => int = (a) => a * 5', code: 'int func(){\n\treturn a * 5;\n}'},
			{input: 'val func = (int) => int = (a) => a * 5', code: 'int func(){\n\treturn a * 5;\n}'},
			{input: 'val func = (int) => int = (a) => { a * 5 }', code: 'int func(){\n\treturn a * 5;\n}'},
			
			{input: 'val func: => int = => 5', code: 'int func(){\n\treturn 5;\n}'}, // param-function; could be called just like 'val a = func' (while others can not)
			{input: 'val func = => 5', code: 'int func(){\n\treturn 5;\n}'}, // same, with type inference
			
			{input: 'val func = (a: int, b: int): void => a + b', code: 'void func(int a, int b){}'}, // non-profitable actions eliminated
			{input: 'val func = () => {}', code: 'void func(){}'}, // shortest function declaration
			{input: 'val func = => {}', code: 'void func(){}'}, // shortest param function declaration
			
			{input: 'val func = int => int = a => { val tmp = a + 5; tmp}', code: 'int func(int a){\n\tconst int tmp = a + 5;\n\treturn tmp;\n}'}, // some more complex functions
			{input: 'val func = int => int = a => { var tmp = a + 5; tmp *= 2; tmp}', code: 'int func(int a){\n\tint tmp = a + 5;\n\ttmp *= 2;\n\treturn tmp;\n}'},
		]
		*/
	}
};

typeof(module) !== 'undefined' && (module.exports = testData);