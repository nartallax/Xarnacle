#include <stdio.h>

long long int a = 0x8fffffffffffffff;
double b = 0.00115;

void main(int argc, char**	 argv){
	int i = 0;
	while(a != 0){
		a = a / 2;
		i = i + 1;
	}
	
	printf("%i %f	\n", i, b);
	
	for(int argn = 1; argn < argc; argn++){
		printf("arg %i: %s\n", argn, *(argv + argn));
	}
}	