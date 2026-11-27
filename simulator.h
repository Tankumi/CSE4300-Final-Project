#pragma once
#include <vector>
#include "process.h"
#include "scheduler.h"

using std::vector;

class Simulator{
public:
private:
    vector<Process> processes_;
    vector<Process*> ready_;
    vector<Process*> waiting_;
    Process* running_ = nullptr;
    Scheduler& sched_;

    int time_ = 0;
    int quantumUsed_ = 0; //For RR; how many quantums this process has used so we know when to kick it out

};