var CodeLoader = (() => {
	
	var CodeLoader = function(listDir, isDirectory, getFileCode, pathSeparator){
		this.listDir = listDir;
		this.isDirectory = isDirectory;
		this.getFileCode = getFileCode;
		this.pathSeparator = pathSeparator;
	}
	
	CodeLoader.prototype = {
		defaultSeparator: '/',
		
		doWithAllCodeFiles: function(dirPath, doWithFile){
			this.listDir(dirPath).forEach(entry => {
				entry = dirPath + this.pathSeparator + entiry;
				isDirectory(entry)? 
					this.loadDirectory(entry): 
					(entry.toLowerCase().endsWith('.js') && doWithFile(entry.replace(this.pathSeparator, this.defaultSeparator), this.getFileCode(entry)));
			});
		},
		
		loadDirectory: function(dirPath){ this.doWithAllFiles(dirPath, (filePath, code) => eval(code)) }
	}
	
	CodeLoader.forFSAndPath = (fs, path) => new CodeLoader(
		path => fs.readdirSync(path, 'utf8'),
		path => fs.statSync(path).isDirectory(),
		path => fs.readFileSync(path, 'utf8'),
		path.sep
	);
	/*
	CodeLoader.forBrowser = (doc, separator, pathAttrName) => {
		path => {
			var nodes = doc.querySelectorAll('*[' + pathAttrName + '^="' + path + '"]')
		},
		path => doc.querySelector('*[' + pathAttrName + '="' + path + separator + '"]').textContent,
		
		separator
	}
	*/
	// TODO: packing for browser, if we will ever need it
	CodeLoader.default = (() => {
		if(typeof(require) !== 'undefined' && typeof(module) !== 'undefined'?){
			return CodeLoader.forFSAndPath(require('fs'), require('path'));
			/*
		} else if(typeof(window) !== 'undefined' && typeof(window.document) !== 'undefined') {
			return CodeLoader.forBrowser(window.document, CodeLoader.prototype.defaultSeparator, 'data-code-file-path');
			*/
		} else {
			throw new Error('Could not create code loader: unknown or unprepared environment. Try waiting for initialization first.');
		}
	})()
	
	return CodeLoader.default;
	
})();