module.exports = basePath => {
	basePath = basePath || __dirname;
	
	var sep = require('path').sep;
	
	global.requireRelative = name => {
		var sep = require('path').sep;
		name = name.replace(/.[Jj][Ss]$/, '') + '.js';
		name = name.split(/[\\\/]/).join(sep)
		return require(basePath + sep + name);
	};
	
	global.fail = function(/* vararg */){
		var str = [];
		for(var i = 0; i < arguments.length; i++){
			var arg = arguments[i];
			str.push(arg && typeof(arg) === 'object' && 'line' in arg && 'column' in arg? 'Error at ' + arg + ':': '' + arg);
		}
		throw new Error(str.join('\n\t'));
	};
	
	requireRelative('commons/class')();
	requireRelative('commons/collections')();
	
};