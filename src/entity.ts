import { Component } from './component';
import { Transform } from './transform';
import { IEntity } from './ientity';
import { Engine } from './engine';

export abstract class Entity implements IEntity {

  private components_: Array<Component> = [];
  
  protected transform_: Transform;
  public get transform() { return this.transform_; }

  constructor() {
    this.transform_ = this.addComponent(new Transform());

    Engine.add(this);
  }

  public update(): void {
    this.components_.forEach(component => {
      component.update();
    })
    this.doUpdate();
  }

  protected abstract doUpdate(): void;

  public addComponent<T extends Component>(comp: T): T {
    this.components_.push(comp);
    return comp;
  }

  public getCompnoent<T extends Component>(
      klass: { new (...args: any[]): T }) : T | null {
    let ret: T = null;
    for (let i = 0; i < this.components_.length; i ++) {
      const comp = this.components_[i];
      if (comp instanceof klass) {
        ret = comp;
        break;
      }
    }
    return ret;
  }

  public removeComponent<T extends Component>(
      klass: { new (...args: any[]): T }) : void {
    for (let i = 0; i < this.components_.length; i ++) {
      const comp = this.components_[i];
      if (comp instanceof klass) {
        this.components_.splice(i, 1);
        break;
      }
    }
  }

  public dispose(): void {}

}