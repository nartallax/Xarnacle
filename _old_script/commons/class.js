module.exports = () => {

	var getProtoInstanceFunction = cstr => {
		var FakeConstr = function(){}
		FakeConstr.prototype = (cstr || function(){}).prototype;
			
		return mix => {
			var result = cstr? new FakeConstr(): {};
			mix && Object.keys(mix).forEach(key => result[key] = mix[key])
			return result;
		}
	}
	
	var defineClass = (constr, mix, protoConstr) => {
		if((constr && typeof(constr) !== 'function')){
			throw new Error('Failed to define a class: passed constructor value is not a function: ' + constr);
		}
		
		if(mix && typeof(mix) !== 'object'){
			throw new Error('Failed to define a class: passed mix is not an object: ' + mix);
		}
		
		protoConstr = protoConstr || function(){};
		mix = mix || {};
		
		var realConstr = constr || function(){};
		var pseudoConstr = function(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,x,t,u,v,w,s,y,z){
			if(!(this instanceof pseudoConstr)) {
				return new pseudoConstr(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,x,t,u,v,w,s,y,z);
			}
			// we better do not use 'arguments' here
			// as long as it's famous performance killer (due to de-opt)
			// if someone ever got stuck with parameter count, it's better just to increase the count
			// surprisingly, it don't significantly affect performance (maybe because of inlining?)
			realConstr.call(this, a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,x,t,u,v,w,s,y,z);
		}
		
		pseudoConstr.prototype = protoConstr.getProtoInstance(mix);
		pseudoConstr.prototype.class = pseudoConstr.class = pseudoConstr;
		pseudoConstr.prototype.super = pseudoConstr.super = protoConstr;
		pseudoConstr.prototype.derive = pseudoConstr.derive = (newConstr, newMix) => defineClass(newConstr, newMix, pseudoConstr);
		pseudoConstr.prototype.getProtoInstance = pseudoConstr.getProtoInstance = getProtoInstanceFunction(pseudoConstr);
		
		return pseudoConstr;
	};
	
	// the one and the only way of creating new class - derive()ing from some known class
	// if there is no obvious ancestor - then Object is to be inherited of
	Object.derive = (newConstr, newMix) => defineClass(newConstr, newMix, null);
	Object.prototype.getProtoInstance = Object.getProtoInstance = getProtoInstanceFunction(null);
	
	Function.prototype.getProtoInstance = Function.getProtoInstance = getProtoInstanceFunction(null);

};