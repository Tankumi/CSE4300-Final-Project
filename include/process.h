#pragma once

enum class State { Running, Ready, Waiting, Done };

class Process {
public:
    Process(int pid, int arrival, int burst, int priority = 0){
        pid_ = pid;
        arrival_ = arrival;
        burst_ = burst;
        priority_ = priority;
        remaining_ = burst;
    }

    int getPid(){
        return pid_;
    }
    int getArrival(){
        return arrival_;
    }
    int getBurst(){
        return burst_;
    }
    int getPriority(){
        return priority_;
    }
    void setPriority(int priority){
        priority_ = priority;
    }
    int getRemaining(){
        return remaining_;
    }
    void setRemaining(int remaining){
        remaining_ = remaining;
    }
    State getState(){
        return state_;
    }
    void setState(State state){
        state_ = state;
    }
    int getStart(){
        return startTime_;
    }
    void setStart(int start){
        startTime_ = start;
    }
    int getEnd(){
        return endTime_;
    }
    void setEnd(int end){
        endTime_ = end;
    }

private:
    int pid_;
    int arrival_;
    int burst_; //CPU time needed
    int remaining_;
    int priority_;
    State state_ = State::Ready;
    int startTime_ = -1;
    int endTime_ = -1;


};