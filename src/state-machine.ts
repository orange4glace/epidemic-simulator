import { Component } from './component';

export interface StateMachineStateCallback {
  (): void;
}

export class StateMachine extends Component {

  private state_: number;
  public get state() { return this.state_; }
  public set state(value: number) {
    const lastState = this.state;
    if (lastState === value) return;
    const ed = this.ends_.get(lastState);
    ed && ed();
    this.state_ = value;
    const bg = this.begins_.get(value);
    bg && bg();
  }

  private begins_: Map<number, StateMachineStateCallback> = new Map();
  private ends_: Map<number, StateMachineStateCallback> = new Map();
  private updates_: Map<number, StateMachineStateCallback> = new Map();

  public setStateCallback(
    state: number,
    begin: StateMachineStateCallback | null,
    end: StateMachineStateCallback | null,
    update: StateMachineStateCallback | null
  ): void {
    this.begins_.set(state, begin);
    this.ends_.set(state, end);
    this.updates_.set(state, update);
  }

  public update(): void {
    const upd = this.updates_.get(this.state);
    upd && upd();
  }

}