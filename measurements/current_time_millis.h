#define _POSIX_C_SOURCE 200809L

#include <sys/time.h>

long currentTimeMillis(){
    struct timeval te; 
    gettimeofday(&te, 0); // get current time
    long milliseconds = te.tv_sec*1000LL + te.tv_usec/1000; // caculate milliseconds
    // printf("milliseconds: %lld\n", milliseconds);
    return milliseconds;
}
