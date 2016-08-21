/*
var tag = opts => {
	var result = document.createElement(opts.tagName || 'div');
	
	if(opts.style){
		result.style.cssText = opts.style;
		delete opts.style;
	}
	
	if(opts.class){
		result.className = opts.class;
		delete opts.class;
	}
	
	if(opts.text){
		result.textContent = opts.text;
		delete opts.text;
	}
	
	Object.keys(opts).forEach(key => {
		result.setAttribute(key, opts[key]);
	});
		
	return result;
}

var logTag = null;
var log = msg => {
	
}

var initLog = () => {
	logTag = tag({
		class: 'log-wrap',
		style: 'background: #00f'
	});
	
	document.body.appendChild(logTag);
}

var onload = () => {
//	console.log("Initializing...");
	
	window.document.body.innerHTML = '';
	
//	initLog();
	
};

(() => {
	var check = () => {
		if(window.document && window.document.body){
			onload();
		} else {
			setTimeout(check, 50);
		}
	}
	
	check();	
})()	;
*/
setTimeout(() => {
	window.document.body.innerHTML = '';
}, 1000);
