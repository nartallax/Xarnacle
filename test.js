var fs = require('fs');

var testData = require('./tests.js');

var parseCode = require('./parser.js');

var eachTestIn = (data, action, prefix) => {
	prefix = prefix || '';
	var keys = Object.keys(data);
	if('input' in data){
		action(data, prefix);
	} else {
		prefix && (prefix += '.');
		keys.forEach(name => {
			eachTestIn(data[name], action, prefix + name);
		});
	}
}

var runTestFunction = testers => testData => {
	var result = { passed: true	, details: [] };

	testers.forEach((tester, testNum) => {
		var ex = null;
		
		if(dontCatchTestExceptions){
			tester(testData)
		} else {
			try {
				tester(testData)
			} catch(e){
				ex = e;
			}
		}
		
		var passed = !ex;
		
		result.passed = result.passed && passed;
		result.details.push({
			passed: passed,
			error: ex
		});
	});
	
	return result;
}

var testerForParser = testCase => {
	var parsed = parseCode(
		testCase.input,
		'test_input'
	);
	if(!parsed) 
		throw 'Failed to parse code';
		
	if('tokens' in testCase){
		var tokens = parsed.toTokenString();
		if(tokens !== testCase.tokens)
			throw [
				'Tokenization error:',
				'expected: ' + testCase.tokens,
				'got:      ' + tokens
			].join('\n  ');
	}
	
	var code = parsed.toTranslatedCode();
	if(code !== testCase.code)
		throw [
			'Translation error:',
			'expected: ' + testCase.code,
			'got:      ' + code,
			'tokens:   ' + parsed.toTokenString()
		].join('\n  ');
}

var runAllTests = nameFilterArray => {
	var nameFilter = {};
	var haveNameFilter = nameFilterArray.length > 0;
	nameFilterArray.forEach(n => {
		nameFilter[n] = true;
	});

	var stats = {
		passed: 0,
		skipped: 0,
		failed: 0
	};

	var runParserTest = runTestFunction(
		[testerForParser]
	);

	eachTestIn(testData.parser, (data, name) => {
		if(haveNameFilter && !nameFilter[name]){
			stats.skipped++;
			return;
		}
		
		var testRes = runParserTest(data);
		if(!testRes.passed){
			stats.failed++;
			console.log('Test ' + name + ' failed!');
			
			var reason = testRes.details.filter(d =>{ 
				return !d.passed
			})[0];
			
			if(reason.error){
				return console.log(
					'  with error: ' + reason.error
				);
			}
		} else {
			stats.passed++;
		}	
	});
	
	return stats;
}

var args = (() => {
	var args = [];
	
	for(var i = 2; i < process.argv.length; i++)
		args.push(process.argv[i]);
		
	return args;
})();

var dontCatchTestExceptions = args
	.filter(a => a === '--unsafe' || a === '-u')
	.length > 0
	
var testNames = (() => {
	var result = [];
	
	args.forEach((arg, i) => {
		if(arg === '-s' || arg === '--specific'){
			result.push(args[i + 1]);
		}
	})
	
	return result;
})();

console.log('Running tests...');
var stats = runAllTests(testNames);
console.log('Testing is done; passed ' + stats.passed + ', failed ' + stats.failed + ', skipped ' + stats.skipped);