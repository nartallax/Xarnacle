var CLIArgs = (() => {
	var argFail = msg => fail(msg, 'ArgumentParsingError');
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
		
		badNameFail('string or array of string expected, got ' + typeof(names))
	}
	
	var typeAliases = {
		'double': 'double',
		'float': 'double',
		'number': 'double',
		'dbl': 'double',
		'flt': 'double',
		'num': 'double',
		
		'int': 'int',
		'lng': 'int',
		'long': 'int',
		
		'string': 'string',
		'str': 'string',
		
		'boolean': 'bool',
		'bool': 'bool'
	}
	
	var getArgValueByDescription = (argArr, names, rawDesc) => {
		var isArray = rawDesc.type.endsWith('s');
		var realType = typeAliases[rawDesc.type.replace(/s$/, '')];
		
		if(!realType) argFail('"' + rawDesc.type + '" is not known type name.');
		if(realType === 'bool' && isArray) argFail('Boolean flags could not come in arrays.');
		if(realType === 'string' && isArray) argFail('Strings could not come in arrays.');
		
		var haveDefault = 'default' in rawDesc;
		var index = indexOf(names);
		
		if(index === null){
			haveDefault || argFail('Required at least one option of ' + names);
			return rawDesc.default;
		} else {
			if(realType === 'bool') return true;
			
			(index === argArr.length - 1) && argFail('Expected some value after ' + argArr[index]);
			
			var rawValue = argArr[index];
			
			if(realType === 'string') return rawValue;
			
			var values = (isArray? rawValue.split(/,/).filter(p => p): [rawValue]).map(v => {
				if(realType === 'int'){
					v.match(/^\d+$/) || argFail('Expected integer after ' + argArr[index] + ', got "' + v + '" instead.');
					return parseInt(v, 10);
				} else {
					v.match(/^\d+(\.\d+)?$/) || argFail('Expected number after ' + argArr[index] + ', got "' + v + '" instead.');
					return parseFloat(v, 10);
				}
			});
			
			return isArray? values: values[0];
		}
	}
	
	
	var parseArgsByDescription = (argArr, description) => {
		var result = {};
		var usedNames = {};
		
		Object.keys(description).foreach(rawName => {
			var names = namesOf(rawName);
			var v = getArgValueByDescription(argArr, names, description[rawName]);
			names.foreach(n => {
				(n in result) && argFail('Duplicate argument key: ' + n);
				result[n] = v;
			});
		})
	};
	
	var showHelpByDescription = description => {
		var helpString = Object.keys(description).map(k => {
			var desc = 'description' in description[k]? '\n' + description[k].description: '';
			return '\t' + k + '\n' + desc;
		}).mkString('\n');
		
		console.error(helpString);
	}

/*
{
	'-p, --param-name-a': { type: 'int', default: 5, description: 'This is free-form description.'}
}
*/
	
	var CLI = function(desc, args){ this.desc = desc; this.args = args || Array.prototype.slice.call(process.argv, 2) }
	
	CLI.prototype = {
		values: function(){ return parseArgsByDescription(this.args, this.desc) },
		showHelp: function(){ return showHelpByDescription(this.desc) }
	}
	
	return CLI;
	
})();