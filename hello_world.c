#include <stdio.h>
#include <stdlib.h>

//long long int a = 0x8fffffffffffffff;
//double b = 0.00115;

int sum(int a, int b){ return a + b; }
int callOn(int (*func)(int, int), int arg){ return (*func)(arg, arg); }
int *callCallOn(
	int (**caller)(int (*)(int, int), int), 
	int (*func)(int, int), 
	int arg
){ 
	int result = (**caller)(func, arg);
	int *resPointer = malloc(sizeof(int));
	*resPointer = result;
	return resPointer; 
}

int callCallCallOn(
	int* (*callerCaller)(int (**)(int (*)(int, int), int), int (*)(int, int), int),
	int (*caller)(int (*)(int, int), int),
	int (*func)(int, int), 
	int arg
){ return *callerCaller(&caller, func, arg); }

void main(int argc, char** argv){
	printf("%i\n", callCallCallOn(callCallOn, callOn, sum, 5));
	
	/*
	int i = 0;
	while(a != 0){
		a = a / 2;
		i = i + 1;
	}
	
	printf("%i %f	\n", i, b);
	
	for(int argn = 1; argn < argc; argn++){
		printf("arg %i: %s\n", argn, *(argv + argn));
	}
	*/
}	