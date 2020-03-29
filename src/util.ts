export interface ReadonlyVector2 {
  readonly x: number;
  readonly y: number;

  equals(o: ReadonlyVector2): boolean;
  normalize(): Vector2;
  add(o: ReadonlyVector2): Vector2;
  sub(o: ReadonlyVector2): Vector2;
  mul(v: number): Vector2;
  mul2(o: ReadonlyVector2): Vector2;
  div2(o: ReadonlyVector2): Vector2;
}

export class Vector2 implements ReadonlyVector2 {

  public get x(): number { return this.x_; }
  public get y(): number { return this.y_; }

  private squaredMagnitude_: number;
  public get squaredMagnitude() { return this.squaredMagnitude_; }
  private magnitude_: number = undefined;
  public get magnitude(): number {
    if (this.magnitude_ === undefined) {
      this.magnitude_ = Math.sqrt(this.squaredMagnitude_);
    }
    return this.magnitude_;
  }

  constructor(
      private x_: number,
      private y_: number) {
    this.update();
  }

  private update(): void {
    this.magnitude_ = undefined;
    this.squaredMagnitude_ = (this.x * this.x + this.y * this.y);
  }

  public equals(o: ReadonlyVector2): boolean {
    return this.x == o.x && this.y == o.y;
  }

  public normalize(): Vector2 {
    if (this.magnitude == 0) return new Vector2(0, 0);
    const mag = this.magnitude;
    return new Vector2(this.x / mag, this.y / mag);
  }

  public add(o: ReadonlyVector2): Vector2 {
    return new Vector2(this.x + o.x, this.y + o.y);
  }

  public sub(o: ReadonlyVector2): Vector2 {
    return new Vector2(this.x - o.x, this.y - o.y);
  }

  public mul(v: number): Vector2 {
    return new Vector2(this.x * v, this.y * v);
  }

  public mul2(o: ReadonlyVector2): Vector2 {
    return new Vector2(this.x * o.x, this.y * o.y);
  }

  public div2(o: ReadonlyVector2): Vector2 {
    return new Vector2(this.x / o.x, this.y / o.y);
  }

}

export function rand(min: number = 0, max: number = 1): number {
  return Math.random() * (max - min) + min;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}