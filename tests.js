var testData = {
	parser: {
		functions: {
			simple_a: {
				input: 'val main = () => {}',
				code: 'void main(){}'
			},
			
			simple_b: {
				input: 'val main: () => long = () => {}',
				code: 'long long int main(){}'
			},
			
			simple_c: {
				input: 'val main: () => double = () => {}',
				code: 'double main(){}'
			},
			
			two_simple_functions: {
				input: 'val main = () => {}\val helper: () => long = () => {}',
				code: 'main(){}\nlong long int helper(){}'
			},
			
			def_with_args_a: {
				input: 'val main: double => long = param => {}',
				code: 'long long int main(double param){}'
			},	
			
			def_with_args_b: {
				input: 'val main: (double, long) => long = (par_a, par_b) => {}'	,
				code: 'main(double par_a, long long int par_b	){}'
			}
		}
	}
};

typeof(module) !== 'undefined' && (module.exports = testData);