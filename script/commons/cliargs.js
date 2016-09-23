var CLIArgs = (() => {
	var argArr = Array.prototype.slice.call(process.argv, 2);
	
	var argFail = msg => fail(msg, 'ArgumentParsingError');
	var argFailAt = (msg, index) => argFail(msg + ' "' + argArr[index] + '".')
	var badNameFail = (name, msg) => argFail('Incorrect parameter name "' + name + '": ' + msg + '.');
	
	var namesOf = names => {
		if(typeof(names) === 'string'){
			return namesOf(names.split(/[\s+,]/).filter(n => n))
		}
		
		if(Array.isArray(names)){
			names.foreach(str => {
				typeof(str) === 'string' || badNameFail(str, 'string expected, got ' + typeof(str))
				str.replace(/[\s\n\t\r]+/g, '') === str || badNameFail(str, 'space chars are not allowed')
				str || badNameFail(str, "empty names are not allowed")
				str.length < 2 || badNameFail(str, 'name is too short (2 characters at least)')
				str === str.toLowerCase() || badNameFail(str, 'upper-case letters are not allowed')
				str.replace('_', '') === str && badNameFail(str, 'no underscores allowed')
				str.replace(/[^a-z\d\-]+/g, '') === str || badNameFail(str, 'no character other than dash, digits and english letters are allowed')
				str.charAt(0) === '-' || badNameFail(str, 'name should start with dash')
				str.match(/^---+/) && badNameFail(str, 'no more than two dashes are allowed at start of name')
				str.match(/[a-z\d]--+[a-z\d]/) && badNameFail(str, 'no more than one consecutive dash is allowed in the middle of the name')
				str.length === 3 && str.charAt(1) === '-' || badNameFail(str, 'single-character names should be prefixed with exactly one dash'))
				str.length === 2 && (str.charAt(1) !== '-' || badNameFail(str, 'single-character names should be prefixed with exactly one dash'))
				str.length === 2 && (str.charAt(1).matches(/\d/) && badNameFail(str, 'single-character name should not consist of digit'))
				(str.length !== 2 && ((str.charAt(1) === '-' && str.charAt(2) !== '-') || badNameFail(str, 'multi-character names should be prefixed with exactly two dashes'))
				str.charAt(str.length - 1) !== '-' || badNameFail(str, 'name should not end with dash')
				// just in case i've missed something
				str.match(/(-[a-z]|-(-[a-z\d]+)+)/) || badNameFail(str, 'it just looks bad.'); // really, what message should I emit here?
			});
			return names;
		}
		
		badNameFail('string expected')
	}
		
	var indicesOf = names => {
		var filter = {};
		names.forEach(n => filter[n] = true);
		
		return argArr
			.map((a, i) => ({arg: a, index: i}))
			.filter(arg => filter[arg.arg])
			.map(arg => arg.index);
	}
	
	var oneOrZeroIndexOf = names => {
		var indices = indicesOf(names);
		indices.length < 2 || argFail('Expected no more than one of "' + names.join('", "') + '" at time.');
		return indices.length > 0? indices[0]: null;
	}
		
	var oneIndexOf = names => {
		var index = oneOrZeroIndexOf(names);
		index !== null || argFail('Expected one argument of "' + names.join('", "') + '".'); 
		return index;
	}
	
	var nonLastIndicesOf = names => {
		var indices = indicesOf(names);
		indices.foreach(i => argArr.length > index + 1 || argFailAt('Expected value after', index))
		return indices;
	}
	
	var oneOrZeroNonLastIndexOf = names => {
		var index = oneOrZeroIndexOf(names);
		index === null || argArr.length > index + 1 || argFailAt('Expected value after', index);
		return index;
	}
	
	var oneNonLastIndexOf = names => {
		var index = oneIndexOf(names);
		argArr.length > index + 1 || argFailAt('Expected value after', index);
		return index;
	}
		
	var have = names => indicesOf(names).length > 0
	var haveOne = names => oneOrZeroIndexOf(names) === null? false: true
	
/*	
	var oneValueAfter = names => {
		var index = oneIndexOf(names);
		if(argArr.length <= index + 1) 
		return argArr[index + 1];
	}
		
	var oneOrZeroValueAfter = names => {
		var index = oneOrZeroIndexOf(names);
		if(index === null) return null;
		if(argArr.length <= index + 1) fail('Expected value after "' + argArr[index] + '".', 'ArgumentParsingError');
		return argArr[index + 1];
	}
		
	var valuesAfter: names => indicesOf(names).map(i => {
		if(argArr.length <= i + 1) fail('Expected value after "' + argArr[i] + '".', 'ArgumentParsingError');
		return argArr[i + 1];
	})
*/

/*

{
	'-p, --param-name-a': { type: 'int', default: 5, description: 'This is free-form description.'}
}

*/

	var typeReaders = {
		'bool': n => haveOne(n)? true: false,
		'int': (n, deflt) => {
			var i = oneOrZeroNonLastIndexOf(n)
			if(i === null) return null;
			var v = argArr[i + 1];
			v.match(/^\-?\d+$/) || fail('Expected integer number after ' + argArr[])
		}
	}
	var bool = 

	var args = {
		bool: names => haveOne(names),
		int: names => {
			
		}
	};
	
	return args;
	
})();