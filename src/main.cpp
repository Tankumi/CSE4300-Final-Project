#include <iostream>
#include "simulator.h"
#include "scheduler.h"
#include "process.h"
#include <vector>

using std::vector;

int main(){
    Process one(1, 0, 5);
    Process two(2, 0, 3);
    Process three(3, 1, 4);
    vector<Process> processes = {one, two, three};
    FIFO sched = FIFO();
    Simulator s(processes, sched);
    for(int i = 0; i < 20; i++){
        printf("%i\n", s.tick());
    }
}