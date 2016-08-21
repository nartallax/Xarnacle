var requireLocal = name => {
	var sep = require('path').sep;
	name = name.replace(/.[Jj][Ss]$/, '') + '.js';
	name = name.split(/[\\\/]/).join(sep)
	return require(__dirname + sep + name);
}

var args = requireLocal('args'),
	SelfTester = requireLocal('selfTester');

var targetToRunnerMap = {
	'selftest': SelfTester
};

var mainArgHelpString = [
	'--target, -t', '\tAllows to specify launch purpose. Possible values:',
	'\t' + Object.keys(targetToRunnerMap).join(', ')
].join('\n');

try {
	
	if(args.haveOne(['-h', '--help'])){
		var helpStrings = [mainArgHelpString];
		Object.keys(targetToRunnerMap)
			.forEach(target => helpStrings.push('Target: ' + target + '\n' + targetToRunnerMap[target].argsHelpString))
			
		return console.log(helpStrings.join('\n\n'));
	} else {
		var target = args.oneValueAfter(['--target', '-t']).toLowerCase();
		if(!(target in targetToRunnerMap)) args.fail('Illegal target value: ' + target);
		var runResult = targetToRunnerMap[target].fromArgs(args).run();
		process.exit(runResult);
	}
	
} catch(e){
	console.error(e.isArgumentParsingError? e.message: e);
}

