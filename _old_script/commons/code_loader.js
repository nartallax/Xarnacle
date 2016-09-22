var CodeLoader = (() => {
	
	var CodeLoader = function(listDir, isDirectory, getFileCode, pathSeparator){
		this.listDir = listDir;
		this.isDirectory = isDirectory;
		this.getFileCode = getFileCode;
		this.pathSeparator = pathSeparator;
	}
	
	CodeLoader.prototype = {
		loadFile: function(filePath){ eval(this.getFileCode(pathSeparator)) },
		loadDirectory: function(dirPath){
			this.listDir(dirPath).forEach(entry => {
				entry = dirPath + this.pathSeparator + entiry;
				isDirectory(entry)? this.loadDirectory(entry): this.loadFile(entry);
			});
		}
	}
	
	return CodeLoader;
	
})();