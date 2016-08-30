var unitDictionary = {},
	tokenDictionary = requireRelative('parsing/token').dictionary;

var defineUnit = (name, partNames, base, relativePriority) => {
	var priority = relativePriority || 0;
	
	var isAbstract = partNames? false: true;
	
	isAbstract || partNames.length || fail('Failed to define ' + name + ': expected at least one part.');
	
	var UnitDefinition = (base || Object).derive(function(components){
		isAbstract && fail('Cannot instantiate ' + this.getName() + ': this unit is abstract.');
		
		this.parts = components;
		(components.length === this.getPartTypes().length) 
			|| fail('Unit ' + this.getName() + 'could not be constructed of ' + components.length + ' parts, it need ' + this.getPartTypes().length + ' parts.');
	}, {
		toString: function(ident){
			ident = ident || '';
			switch(this.parts.length){
				case 0: return this.getName() + '()'
				case 1: return this.getName() + '(' + this.parts[0] + ')'
				default: return this.getName() + '(' + this.parts.join(',\n\t' + ident) + '\n' + ident + ')'
			}
		}
	});
	
	var addProp = (name, value) => (TokenDefinition.prototype[name] = TokenDefinition[name] = value)
	var addGetter = (name, value) => addProp(name, () => value);
	
	var partTypes = isAbstract? []: partNames.map(partName => {
		(partName in unitDictionary) 
			|| (partName in tokenDictionary)
			|| fail('Failed to define ' + name + ': unresolvable reference to ' + partName);
		
		return unitDictionary[partName] || tokenDictionary[partName];
	});
	
	// TODO: generalize (same functions as in Token)
	addGetter('getRelativePriority', priority);
	addGetter('getShortName', name);
	addGetter('getPartTypes', partTypes);
	addProp('getAbsolutePriority', function(){ 
		return (this.super && this.super.getAbsolutePriority? this.super.getAbsolutePriority(): 0) + this.getRelativePriority();
	})
	addProp('getName', function(){ 
		return ((this.super && this.super.getName)? this.super.getName() + '.': '') + this.getShortName() 
	});
	addProp('getStartTypeNames', function(){
		var result = [];
		
		var processDef = def => {
			result.push[def.getName()];
			Object.keys(def.subtokens).foreach(key => processDef(def.subtokens[key]))
		}
		
		processDef(partTypes[0]);
		
		return result;
	});
	
	UnitDefinition.subunits = {};
	UnitDefinition.define = base? base.define: function(name, parts){
		var NewDef = defineUnit(name, parts, base);
		this.subunits[name] = NewDef;
		return NewDef;
	}
	
}

var Unit = Object.derive();

Unit.assembleAll = tokens => { fail('Not implemented.'); }

module.exports = Unit;