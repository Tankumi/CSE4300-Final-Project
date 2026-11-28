#include <vector>
#include <algorithm>
#include <cstring>
#include "process.h"
#include "scheduler.h"
#include "simulator.h"

int Simulator::tick(){
    int done = 1;
    for(Process& p : processes_){
        if(p.getArrival() == time_){
            p.setState(State::Ready);
            ready_.push_back(&p);
        }
        if(p.getRemaining() != 0){
            done = 0;
        }
    }
    if(running_ == nullptr && done){
        return 1; //done
    }
    if(!std::strcmp(sched_.name(), "Shortest Remaining Time to Completion First")){
        Process* next = sched_.pickNext(ready_);
        if(next != nullptr && (running_ == nullptr || next->getRemaining() < running_->getRemaining())){
            if(running_ != nullptr){
                running_->setState(State::Ready);
                ready_.push_back(running_);
            }
            running_ = next;
            running_->setState(State::Running);
            ready_.erase(std::remove(ready_.begin(), ready_.end(), next), ready_.end());
        }
    }
    else if (running_ == nullptr){
        if(running_ == nullptr){
            Process* next = sched_.pickNext(ready_);
            if(next != nullptr){
                running_ = next;
                running_->setState(State::Running);
                ready_.erase(std::remove(ready_.begin(), ready_.end(), next), ready_.end());
            }

            
        }
    }
    if(running_ != nullptr){
        if(running_->getStart() == -1){
            running_->setStart(time_);
        }
    }
    
    time_++;
    if(running_ != nullptr){
        running_->setRemaining(running_->getRemaining()-1);
        if(running_->getRemaining() == 0){
            running_->setState(State::Done);
            running_->setEnd(time_);
            running_ = nullptr;
        }
    }
    
    return 0;
}