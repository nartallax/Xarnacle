var parseCode = requireRelative('parser');

var SelfTester = function(testCases, allowedTestNames, dontCatchTestExceptions){
	this.testCases = testCases;
	this.dontCatchTestExceptions = dontCatchTestExceptions;
	this.allowedTestNames = (allowedTestNames || []).length > 0? allowedTestNames: null;
	
	this.parserTestRunner = this.testRunnerFor(SelfTester.parserChecker);
}

SelfTester.prototype = {
	
	eachTest: function(action, prefix, data){
		data = data || this.testCases;
		prefix = prefix || '';
		
		if(Array.isArray(data)){
			data.forEach((d, index) => action(d, prefix + '.' + index));
		} else {
			prefix && (prefix += '.');
			Object.keys(data).forEach(name => this.eachTest(action, prefix + name, data[name]));
		}
	},
	
	testRunnerFor: function(testers){
		if(typeof(testers) === 'function') testers = [testers];
		
		return testCase => {
			
			var result = { passed: true	, details: [] };

			testers.forEach((tester, testNum) => {
				var ex = null;
				
				if(this.dontCatchTestExceptions){
					tester(testCase)
				} else {
					try {
						tester(testCase)
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
	},
	
	runWithRunner: function(testData, runner, nameFilter, stats){
		this.eachTest((data, name) => {
			if(nameFilter && !nameFilter[name]){
				stats.skipped++;
				return;
			}
			
			var testRes = runner(data);
			if(!testRes.passed){
				stats.failed++;
				console.log('Test ' + name + ' failed!');
				
				var reason = testRes.details.filter(d => !d.passed)[0];
				
				if(reason.error) return console.log('\t' + reason.error.toString());
			} else {
				stats.passed++;
			}
		});
	},
	
	run: function(){
		console.log('Running self-test...');
		
		var nameFilter = null;
		if(this.allowedTestNames){
			nameFilter = {};
			this.allowedTestNames.forEach(n => nameFilter[n] = true);
		}

		var stats = {
			passed: 0,
			skipped: 0,
			failed: 0
		};

		this.runWithRunner(this.testCases.parser, this.parserTestRunner, nameFilter, stats);
		
		console.log('Done; passed ' + stats.passed + ', skipped ' + stats.skipped + ', failed ' + stats.failed);
		
		return stats.failed !== 0? 1: 0;
	}
}

SelfTester.parserChecker = testCase => {
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

SelfTester.fromArgs = args => {
	var allowedTestNames = args.valuesAfter('--specific')
	var failFast = args.haveOne('--fail-fast')
	var pathToTestFile = args.absolutizePath(args.oneOrZeroValueAfter('--tests') || '../selftesting/selftests', 'js');
	var testCases = require(pathToTestFile);
	return new SelfTester(testCases, allowedTestNames, failFast);
}

SelfTester.argsHelpString = [
	'--specific', '\tRun only specified test name. Could appear multiple times.',
	'--fail-fast', '\tStop after first failed test and print stack trace of error.',
	'--tests', '\tAllows to specify custom test set file. If absent, default test file is used.'
].join('\n');

typeof(module) !== 'undefined' && (module.exports = SelfTester);