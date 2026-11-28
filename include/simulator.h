#pragma once
#include <vector>
#include "process.h"
#include "scheduler.h"

using std::vector;

class Simulator{
public:
    Simulator(vector<Process> processes, Scheduler& sched) : processes_(std::move(processes)), sched_(sched) {}
    Simulator(const Simulator&) = delete;
    Simulator& operator=(const Simulator&) = delete;
    const vector<Process>& getProcesses() const {return processes_;}
    const vector<Process*>& getReady() const {return ready_;}
    //const vector<Process*>& getWaiting() const {return waiting_;}
    const int getTime() const {return time_;}
    int tick(); //Every time increment, return 1 if done (no process running and no more processes in ready_)
private:
    vector<Process> processes_;
    vector<Process*> ready_;
    //vector<Process*> waiting_;
    Process* running_ = nullptr;
    Scheduler& sched_;

    int time_ = 0;
    int quantumUsed_ = 0; //For RR; how many quantums this process has used so we know when to kick it out

};