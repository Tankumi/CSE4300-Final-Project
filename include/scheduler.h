#pragma once
#include <vector>
#include "process.h"

using std::vector;

class Scheduler {
public:
    virtual ~Scheduler() = default;

    virtual Process* pickNext(const vector<Process*>& ready) = 0;

    virtual int timeSlice() const { return -1; }

    virtual const char* name() const = 0;

};

class FIFO : public Scheduler {
    virtual Process* pickNext(const vector<Process*>& ready) override;
    const char* name() const override {return "First In First Out";}
};

class SJF : public Scheduler {
    virtual Process* pickNext(const vector<Process*>& ready) override;
    const char* name() const override {return "Shortest Job First";}
};

class SRTCF : public Scheduler {
    virtual Process* pickNext(const vector<Process*>& ready) override;
    const char* name() const override {return "Shortest Remaining Time to Completion First";}
};

class RR : public Scheduler {
    explicit RR(int quantum) : quantum_(quantum) {}
    virtual Process* pickNext(const vector<Process*>& ready) override;
    const char* name() const override {return "Round Robin";}
    int timeSlice() const override {return quantum_;}
    
private:
    int quantum_;
};

class PriorityScheduler : public Scheduler {
    virtual Process* pickNext(const vector<Process*>& ready) override;
    const char* name() const override {return "Priority Scheduler";}
};