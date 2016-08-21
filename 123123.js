var a = function(){
	console.log('a: ' + this);
	
	var b = () => {
		console.log('b: ' + this);
	}
}

var c = () => {
	console.log('c: ' + this.prop);
}

c = c.bind({prop: '123'})

c();