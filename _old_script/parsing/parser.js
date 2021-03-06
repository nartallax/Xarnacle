var units = require('./ast.js');

var Parser = function(text, filename){
	this.t = text;
	this.p = 0; // p for position
	this.filename = filename || '';
}

Parser.prototype = {
	// ugly and slow but working
	getLineNumber: function(pos){ return this.t.substr(0, pos || this.p).replace(/[^\n]/g, '').length + 1 },
	getColumnNumber: function(pos){
		var passed = this.t.substr(0, pos|| this.p);
		return ((passed.match(/[^\n]+$/) || [])[0] || passed).length
	},
	getPositionName: function(pos){
		var ln = this.getLineNumber(pos),
			cn = this.getColumnNumber(pos);
		
		var result = '';
		this.filename && (result += 'in file ' + this.filename + ' ');
		
		return result + 'on line ' + ln + ', at char ' + cn;
	},

	fail: function(msg){ throw new Error('Parsing error ' + this.getPositionName() + ':\n' + msg) },
	
	peek: function(n){ return this.t.substr(this.p, typeof(n) !== 'number'? 1: n) },
	read: function(n){
		var res = this.peek(n);
		this.p += res.length;
		return res;
	},
	readByRegexp: function(reg){
		var result = '';
		while(this.peek().match(reg)) result += this.read();
		return result;
	},
	skipSpaces: function(){ return this.readByRegexp(/[\s\n\r\t]/) },
	maybeSkip: function(seq){
		this.skipSpaces();
		this.checkRead(seq);
		this.skipSpaces();
	},
	skipOrFail: function(seq){
		this.skipSpaces();
		this.checkReadOrFail(seq);
		this.skipSpaces();
	},
	check: function(fwdValue){ return this.peek(fwdValue.length) === fwdValue },
	checkRead: function(fwdValue){ return this.check(fwdValue) && this.read(fwdValue.length) },
	checkReadOrFail: function(fwdVal, failMsg){ this.checkRead(fwdVal) || this.fail(failMsg || 'Expected: '+ fwdVal) },
	
	createUnit: function(name, args, startPos){
		args = args || [];
		// TODO: rewrite with bind()
		result = new units[name](
			args[0], args[1], args[2],
			args[3], args[4], args[5],
			args[6], args[7], args[8],
			args[9], args[10],args[11]
		);
		
		result.fileName = this.filename;
		result.columnNumber = this.getColumnNumber(startPos);
		result.lineNumber = this.getLineNumber(startPos);
		
		return result;
	},
	
	maybeGet: function(unitName, cb){
		var pos = this.p;
		var result = cb();
		if(!result){ 
			this.p = pos;
		} else {
			if(Array.isArray(result)){
				result = this.createUnit(unitName, result, pos);
			} else {
				/* nothing; result is Unit already */
			}
		}
		return result;
	},
	
	getSequenceOf: function(getSingleItem, separator, skipSeparator){
		var resultSeq = new units.sequence(separator);
		
		if(typeof(skipSeparator) === 'string'){
			var actualSeparator = skipSeparator;
			skipSeparator = () => {
				this.maybeSkip(actualSeparator);
			}
		}
		
		skipSeparator = skipSeparator || this.skipSpaces;
		
		while(true){
			var next = getSingleItem.call(this);
			if(!next) break;
			resultSeq.addChild(next);
			skipSeparator.call(this);
		}
		
		return resultSeq;	
	},
	getGuardedOrEmpty: function(prefix, postfix, getter, getterName){
		this.skipSpaces();
		if(this.checkRead(prefix)){
			var result = getter.call(this);
			result || this.fail('Expected ' + getterName + ' after "' + prefix + '".');
			
			if(postfix){
				this.skipSpaces();
				this.checkReadOrFail(postfix);
			}
			return result;
			
		} else return new units.empty();
	},
	
	getAll: function(){ return this.getSequenceOf(this.getExpression) },
	
	getFunctionDefinition: function(){
		return this.maybeGet('func_def', () => {
			console.log(this.p);
			this.skipSpaces();
			
			var args = this.getGuardedOrEmpty('(', ')', () => this.getSequenceOf(this.getFunctionDefinitionArgument, ', ', ','), 'arguments');
			(args instanceof units.empty) && (args = this.getFunctionDefinitionArgument());
			if(!args) return null;
			
			var resultType = this.getGuardedOrEmpty(':', '', this.getType, 'type')
			
			this.skipSpaces();
			if(!this.checkRead('=>')) return null;
			
			body = this.getExpression();
			if(!body) this.fail('Expected function body.');
			
			return [args, resultType, body];
		});
	},
		
	getFunctionDefinitionArgument: function(){
		return this.maybeGet('func_def_arg',() => {
			var name = this.getName();
			if(!name) return null;
			
			this.skipSpaces();
			var type = this.checkRead(':')?
				this.getType():
				new units.empty();

			return [name, type];
		});
	},
	
	getExpression: function(){
		this.skipSpaces();
		if(this.checkRead('{')){
			var result = this.getSequenceOf(
				this.getExpression,
				';\n', ';'
			);
			this.skipSpaces();
			this.checkReadOrFail('}')
			return result;
		} else {
			// FIXME: more expression types
			return this.getVariableDeclaration() || this.getFunctionDefinition() || this.getSimpleValueExpression();
		}
	},
	getSimpleValueExpression: function(){ // 'simple value' is mix of arithmetics, literals, variable value fetches (and assignments), function calls etc
		return this.getArithmeticExpression() || this.getTerminalExpression();
	},
	
	getTerminalExpression: function(){
		return this.getBracketExpression() || this.getLiteral();
	},
	
	getBracketExpression: function(){
		return this.getGuardedOrEmpty('(', ')', this.getSimpleValueExpression, 'value').or(null);
	},
	
	getLiteral: function(){
		return this.getNumericLiteral() || this.getBooleanLiteral() // || this.getStringLiteral();
	},
	getStringLiteral: function(){ this.fail('Not implemented') },
	getNumericLiteral: function(){
		this.maybeGet('', () => {
			this.skipSpaces();
			var neg = this.check('-');
			neg && (this.read(1), this.skipSpaces());
			
			var prePoint = this.readByRegexp(/\d/);
			if(!prePoint) return null;
			
			var dbl = this.check('.'), postPoint;
			if(dbl){
				this.read(1);
				postPoint = this.readByRegexp(/\d/);
				postPoint || this.fail('Expected fractional part of a number.');
			}
			
			var str = (neg? '-': '') + prePoint + (dbl? '.' + postPoint: '');
			
			return dbl? new units.double_literal(str): new units.integer_literal(str);
		})
	},
	getBooleanLiteral: function(){
		this.maybeGet('boolean_literal', () => {
			this.skipSpaces();
			var haveTrue = this.check('true'), haveFalse = this.check('false');
			if(!haveTrue && !haveFalse) return null;
			
			return [haveTrue? (this.read(4), 'true'): (this.read(5), 'false')]
		});
	},
	
	getArithmeticExpression: function(){
		while
	},
	
	getVariableDeclaration: function(){
		return this.maybeGet('var_decl', () => {
			this.skipSpaces();
			 
			// TODO: read visibility flags here
			var isVar = this.check('var'), isVal = this.check('val');
			
			if(!isVar && !isVal) return null;
			this.read(3);
			
			var flags = { 
				immutable: isVal? true: false
			};
			
			var name = this.getName();
			if(!name) this.fail('Expected name.');
			
			console.log(this.p);
			var type = this.getGuardedOrEmpty(':', '', this.getType, 'type');
			var value = this.getGuardedOrEmpty('=', '', this.getExpression, 'value');
			
			
			return [name, type, value, flags];
		});
	},
	getType: function(){
		// FIXME: pointers, generics
		return this.maybeGet('type', () => {
			this.skipSpaces();
			
			var base;
			if(this.checkRead('(')){
				base = this.getSequenceOf(
					this.getType,
					', ', ','
				);
				this.skipSpaces();
				this.checkReadOrFail(')')
			} else {
				var name = this.getName();
				if(!name) return null;
				base = this.createUnit('type', [name, new units.empty(), 0]);
			}
			
			if(base instanceof units.sequence && base.childCount() === 1){
				base = base.getChildren()[0];
			}
			
			this.skipSpaces();
			if(this.checkRead('=>')){
				var funcResType = this.getType();
				if(!funcResType) this.fail('Expected function result type.');
			
				// base is just func arg types
				var gens;
				if(base instanceof units.sequence){
					gens = base;
				} else {
					gens = this.createUnit('sequence');
					gens.addChild(base);
				}
				gens.addChild(funcResType);
				
				
				var funcTypeName = this.createUnit(
					'name', 
					['Function' + (gens.childCount() - 1)]
				);
				
				return [funcTypeName, gens, 0];
			} else {
				if(base instanceof units.sequence){
					if(base.childCount() > 0){
						// non-empty type sequence - tuple
						var tupleTypeName = this.createUnit(
							'name',
							['Tuple' + base.childCount()]
						);
						return [tupleTypeName, base, 0];
					} else {
						// empty type sequence - void
						var voidTypeName = this.createUnit(
							'name', ['Void']
						);
						return [voidTypeName, new units.empty(), 0];
					}
				} else {
					// just a single-named type
					return [name, new units.empty(), 0]
				}
			}
		});
	},
	getName: function(){
		return this.maybeGet('name', () => {
			var str = this.getNameString();
			return str? [str]: null;
		});
	},
	getNameString: function(){
		this.skipSpaces();
		
		var firstChar = this.peek();
		
		if(!firstChar.match(/[a-zA-Z_]/)){
			return null;
		}
		
		return this.read() + this.readByRegexp(/[a-zA-Z\d_]/);
	}
	
};

var parseCode = (code, filename) => {
	var parsed = new Parser(code, filename)
		.getAll()
		
	parsed.inferTypes();
	
	return parsed;
}

typeof(module) !== 'undefined' && (module.exports = parseCode);