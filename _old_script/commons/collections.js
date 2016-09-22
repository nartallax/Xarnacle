module.exports = () => {
	// for consistency with other languages
	// proven to have same performance as original (at least in V8)
	Array.prototype.foreach = Array.prototype.forEach;
	
	Array.prototype.toMap = function(keyOf, valueOf){
		var result = {};
		keyOf?
			valueOf? this.forEach(i => result[keyOf(i)] = valueOf(i)): this.forEach(i => result[keyOf(i)] = true):
			valueOf? this.forEach(i => result[i] = valueOf(i)): this.forEach(i => result[i] = true)
		return result
	}
	
	Array.prototype.flatMap = function(mapper){
		var result = [];
		this.foreach(elem => mapper(elem).foreach(mapped => result.push(mapped)));
		return result;
	}
	
	Array.prototype.flatten = function(){
		var result = [];
		this.foreach(elem => elem.foreach(mapped => result.push(mapped)));
		return result;
	}
	
	Array.prototype.distinct = function(keyOf){
		var map = this.toMap(keyOf, i => i)
		return Object.keys(map).map(key => map[key]);
	}
	
	Array.prototype.exists = function(criteria){
		for(var i = 0; i < this.length; i ++){
			if(criteria){
				return true;
			}
		}
		return false;
	}
	
	Array.prototype.mapFind = function(mapper, evaluator){
		evaluator = evaluator || (v => v);
		for(var i = 0; i < this.length; i++){
			var v = mapper(this[i]);
			if(evaluator(v)) return v;
		}
		return null;
	}
	
	Array.prototype.sortBy = function(mapper, desc){
		var ruler = desc? -1: 1,
			comparator = (a, b) => ((a = mapper(a)), (b = mapper(b)), a > b? ruler: a < b? -ruler: 0)
		return this.sort(comparator);
	}
	
}