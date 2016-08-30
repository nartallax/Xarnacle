#include <stdio.h>
#include <stdlib.h>
#include <time.h>

//long long int a = 0x8fffffffffffffff;
//double b = 0.00115;

/*
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

printf("%i\n", callCallCallOn(callCallOn, callOn, sum, 5));
*/

int __fastcall fastcall_function(int a, int b, int c){
	int i, result;
	for(i = 0; i < a; i += b) {
		result += c;
		result *= c;
	}
	return result;
}

int __stdcall stdcall_function(int a, int b, int c){
	int i, result;
	for(i = 0; i < a; i += b) {
		result += c;
		result *= c;
	}
	return result;
}

int __attribute__ ((cdecl)) cdecl_function(int a, int b, int c){
	int i, result;
	for(i = 0; i < a; i += b) {
		result += c;
		result *= c;
	}
	return result;
}

typedef struct SomeData {
	int a, b, c, d, e, f, g, h;
} SomeData;

volatile int i = 0;

void passByRef(SomeData* data){ i++; }
void passByVal(SomeData data){ i++; }

void main(int argc, char** argv){
	
	int j, timing;
	int repeats = 1000000;
	int result;
	
	int timing_a = clock();
	result = 0;
	for(j = 0; j < repeats; j++) result += fastcall_function(5, 1, 3);
	printf("Called by value %i times in %i\n", result, timing_a);
	
	int timing_b = clock();
	result = 0;
	for(j = 0; j < repeats; j++) result += cdecl_function(5, 1, 3);
	printf("Called by reference %i times in %i\n", result, timing_b);
	
	/*
	for(int argn = 1; argn < argc; argn++){
		printf("arg %i: %s\n", argn, *(argv + argn));
	}
	*/
}	