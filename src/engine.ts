import { Entity } from './entity';
import { observable } from 'mobx';

class _Engine {

  private lastTimestamp_: number = -1;

  private delta_: number;
  public get delta(): number { return this.delta_; }

  private elasped_: number = 0;
  public get elasped() { return this.elasped_; }

  @observable public paused = false;

  private entities_: Entity[] = [];

  public add(entity: Entity): void {
    this.entities_.push(entity);
  }

  public update(timestamp: number): void {
    if (this.lastTimestamp_ == -1) {
      this.lastTimestamp_ = timestamp;
      return;
    }
    const lastTimestamp = this.lastTimestamp_;
    this.lastTimestamp_ = timestamp;
    if (this.paused) return;
    this.delta_ = timestamp - lastTimestamp;
    this.elasped_ += this.delta_;
    this.entities_.forEach(entity => {
      entity.update();
    })
  }

  public clear() {
    this.lastTimestamp_ = -1;
    this.elasped_ = 0;
    this.entities_.forEach(e => {
      e.dispose();
    })
    this.entities_ = [];
  }

}

const Engine = new _Engine;
export { Engine };

(window as any).Engine = Engine;