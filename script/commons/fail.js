var fail = function(message, typeName){
	var err = new Error(message.toString());
	err.type = typeName;
	throw err;
};