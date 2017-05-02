#include "current_time_millis.h"
#include <stdlib.h>
#include <stdio.h>

#define INVOKE_COUNT 10000000

/*
this test measuring a speed of function invokation

be warned - this code probably fits into cache.
when working with real functions, there may be memory cache misses during code invocation
so call to a function may have increased timing: +memory read of target function and, maybe, +memory read of instructions at return point
*/

int fn_0(){ return 0; }
int fn_1(){ return 1; }
int fn_2(){ return 2; }
int fn_3(){ return 3; }
int fn_4(){ return 4; }
int fn_5(){ return 5; }
int fn_6(){ return 6; }
int fn_7(){ return 7; }
int fn_8(){ return 8; }
int fn_9(){ return 9; }

int main(){
	long start, elapsed, i;
	
	int result = 0;
	start = currentTimeMillis();
	for(i = 0; i < INVOKE_COUNT; i++){
		result += fn_0();
	}
	elapsed = currentTimeMillis() - start;
	
	printf("Average call timing of statically bound function: %f nanosec\n", ((double)elapsed * 1000000) / INVOKE_COUNT);
	
	int (** fs)() = (int (**)())malloc(sizeof(int(*)()) * 10);
	fs[0] = fn_0;
	fs[1] = fn_1;
	fs[2] = fn_2;
	fs[3] = fn_3;
	fs[4] = fn_4;
	fs[5] = fn_5;
	fs[6] = fn_6;
	fs[7] = fn_7;
	fs[8] = fn_8;
	fs[9] = fn_9;
	
	start = currentTimeMillis();
	for(i = 0; i < INVOKE_COUNT; i++){
		result += fs[i % 10]();
	}
	elapsed = currentTimeMillis() - start;
	
	printf("Average call timing of dynamically bound function: %f nanosec\n", ((double)elapsed * 1000000) / INVOKE_COUNT);
}
