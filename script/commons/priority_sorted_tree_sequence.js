// a collection of elements
// could be accessed as following:
// "key" -> [value_with_highest_priority, ..., value_with_lowest_priority]
// on input it has a tree of elements
// each element arbitrary number of keys it should be accessible by and priority (a number)
// each element could also be a branch (non-terminal element with arbitrary number of children) and a leaf (terminal element with null instead of children)
// on first access to key after tree modification, this map is rebuilded
// sibling elements with equal priorities will have their children mixed
var PrioritySortedTreeSequence = (() => {
	
	// tree is pass-by-reference root of the element tree
	// this class expects tree to change, but not keeps track of it all the time
	// to notify this class, use .invalidate()
	var PrioritySortedTreeSequence = function(getChildren, getPriority, getKeys, tree){
		this.getChildren = getChildren;
		this.getPriority = getPriority;
		this.getKeys = getKeys;
		this.root = tree;
		
		this.invalidate();
	}
	
	PrioritySortedTreeSequence.prototype = {
		get: function(name){ this.getMap()[name] || [] },
		invalidate: function(){ this.realMap = null },
		getMap: function(){ return this.realMap || (this.realMap = this.buildMap()) },
		buildMap: function(){
			var fullSequence = this.getSequenceOf(this.root);
			
			var allKeys = [];
			var seqWithKeys = fullSequence.map(el => {
				var keys = this.getKeys(el);
				var keyMap = keys.toMap;
				keys.foreach(k => allKeys.push(k));
				return [keyMap, el];
			});
			
			var result = {};
			allKeys.distinct().foreach(key => result[key] = seqWithKeys.filter(p => key in p[0]));
			
			return result;
		},
		getSequenceOf: function(element){
			var directChilden = this.getChildren(element)
			
			if(directChildren === null) return [element];
			
			var nonMergedSubSeqs = directChildren.map(ch => [this.getPriority(ch), this.getSequenceOf(ch)])
				
			var subseqsToMerge = {};
			nonMergedSubSeqs.foreach(p => {
				var priority = p[0]
				(subseqsToMerge[priority] || (subseqsToMerge[priority] = [])).push(p[1]);
			});
			
			var sequence = Object.keys(subseqsToMerge)
				.map(k => [parseInt(k), subseqsToMerge[k].flatten()])
				.orderBy(p => p[0])
				.flatMap(p => p[1]);
			
			return sequence
		},
		
	}
		
	return PrioritySortedTreeSequence;
	
})();