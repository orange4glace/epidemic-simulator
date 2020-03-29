import { Component } from './component';
import { Vector2, ReadonlyVector2 } from './util';
import { Subject } from 'rxjs';

export class Transform extends Component {

  public readonly onDidPositionChange: Subject<void> = new Subject();

  private position_: Vector2;
  public get position(): ReadonlyVector2 {
    return this.position_ }
  public set position(value: ReadonlyVector2) {
    this.position_ = new Vector2(value.x, value.y);
    this.onDidPositionChange.next();
  }

  constructor() {
    super();
    this.position_ = new Vector2(0, 0);
  }

  public update(): void {}

}