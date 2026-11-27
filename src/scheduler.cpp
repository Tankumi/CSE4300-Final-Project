#include "scheduler.h"

using std::vector;

Process* FIFO::pickNext(const vector<Process*>& ready){
    if(ready.empty()){
        return nullptr;
    }
    return ready.front();
}

Process* SJF::pickNext(const vector<Process*>& ready){
    if(ready.empty()){
        return nullptr;
    }
    Process* min = ready.front();
    for(Process* p : ready){
        if(p->getBurst() < min->getBurst()){
            min = p;
        }
    }
    return min;
}

Process* SRTCF::pickNext(const vector<Process*>& ready){
    if(ready.empty()){
        return nullptr;
    }
    Process* min = ready.front();
    for(Process* p : ready){
        if(p->getRemaining() < min->getRemaining()){
            min = p;
        }
    }
    return min;
}