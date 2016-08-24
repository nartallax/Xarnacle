module.exports = (() => {
	var argArr = Array.prototype.slice.call(process.argv, 2);
	
	var args = {
		fail: msg => {
			var e = new Error(msg);
			e.isArgumentParsingError = true;
			throw e;
		},
		
		fixNames: names => {
			typeof(names) === 'string' && (names = [names]);
			
			var doublePrefixed = names.filter(n => n.startsWith('--'));
			doublePrefixed.map(n => n.replace(/^-/, '')).forEach(n => names.push(n));
			
			return names;
		},
		
		indicesOf: names => {
			names = args.fixNames(names);
			
			var filter = {};
			names.forEach(n => filter[n] = true);
			
			return argArr
				.map((a, i) => ({arg: a, index: i}))
				.filter(arg => filter[arg.arg])
				.map(arg => arg.index);
		},
		
		oneOrZeroIndexOf: names => {
			var indices = args.indicesOf(names);
			if(indices.length > 1) args.fail('Expected no more than one of "' + names.join('", "') + '" at time.');
			return indices.length > 0? indices[0]: null;
		},
		
		oneIndexOf: names => {
			var index = args.oneOrZeroIndexOf(names);
			if(index === null) args.fail('Expected one argument of "' + names.join('", "') + '".'); 
			return index;
		},
		
		have: names => args.indicesOf(names).length > 0,
		
		haveOne: names => args.oneOrZeroIndexOf(names) === null? false: true,
		
		oneValueAfter: names => {
			var index = args.oneIndexOf(names);
			if(argArr.length <= index + 1) args.fail('Expected value after "' + argArr[index] + '".');
			return argArr[index + 1];
		},
		
		oneOrZeroValueAfter: names => {
			var index = args.oneOrZeroIndexOf(names);
			if(index === null) return null;
			if(argArr.length <= index + 1) args.fail('Expected value after "' + argArr[index] + '".');
			return argArr[index + 1];
		},
		
		valuesAfter: names => args.indicesOf(names).map(i => {
			if(argArr.length <= i + 1) args.fail('Expected value after "' + argArr[i] + '".');
			return argArr[i + 1];
		}),
		
		absolutizePath: (path, ext) => {
			var sep = require('path').sep;
			ext && (path = path.replace(new RegExp('\\.' + ext + '$'), '') + '.' + ext);
			path = path.split(/[\\\/]/).join(sep)
			return __dirname + sep + path;
		}
	};
	
	return args;
	
})();