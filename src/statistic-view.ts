import { Statistic } from './world-impl';
import { SIRModel } from './sir-model';

const MAX_STEP = 200;

export class StatisticView {

  private readonly ctx_: CanvasRenderingContext2D;

  constructor(
    private readonly box: HTMLElement,
    public readonly canvas: HTMLCanvasElement,
    public readonly statistic: Statistic) {
    this.ctx_ = canvas.getContext('2d');
  }

  private dayr_ = 1;

  private renderDay() {
    const cvs = this.canvas;
    const ctx = this.ctx_;
    const w = cvs.width + 10;
    const h = cvs.height;

    
    while (true) {
      const u = (w * this.dayr_) / this.statistic.elapsed *
          SIRModel.timeFactor * SIRModel.dayFactor;
      if (u < 50) {
        if (this.dayr_ == 1) this.dayr_ = 5;
        else this.dayr_ *= 2;
      }
      else break;
    }
    const u = (w * this.dayr_) / this.statistic.elapsed *
        SIRModel.timeFactor * SIRModel.dayFactor;
    const opac = Math.max(0, Math.min(1, (u - 50) / 50));
    const o = Math.ceil(w / u);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.font = "16px Arial";
    for (let i = 1; i < o; i ++) {
      ctx.save();
      const d = i * this.dayr_;
      if (this.dayr_ == 1) {
        ctx.globalAlpha = (d % 5 ? opac : 1);
      }
      else {
        ctx.globalAlpha = (i % 2 ? opac : 1);
      }
      const x = u * i;
      ctx.translate(x, h - 30);
      ctx.fillText(d + '', 0, 25);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  private render2(calc: (prev: any, next: any) => number) {
    const cvs = this.canvas;
    const ctx = this.ctx_;
    const w = cvs.width + 10;
    const h = cvs.height - 30;
    const step = (this.statistic.records.length - 1) / MAX_STEP;
    ctx.beginPath();
    ctx.moveTo(0, h);
    let lastS = 0;
    let lastY = 0;
    for (let i = 0; i < MAX_STEP; i ++) {
      const idx = i * step;
      lastS = Math.max(lastS, idx);
      const prev = this.statistic.records[Math.floor(idx)];
      const next = this.statistic.records[Math.ceil(idx)];
      if (!prev || !next) break;
      const sum = (prev[0] + prev[1] + prev[2] + next[0] + next[1] + next[2]) / 2;
      const value = calc(prev, next);
      const x = w / MAX_STEP * i;
      const y = h - h / sum * value;
      lastY = y;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  public render() {
    const cvs = this.canvas;
    const ctx = this.ctx_;
    cvs.width = this.box.offsetWidth;
    cvs.height = this.box.offsetHeight;
    ctx.fillStyle = "#444345";
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillRect(0, 0, cvs.width, cvs.height - 30);
    ctx.fillStyle = "#31606e";
    this.render2((a, b) => (a[0] + b[0]) / 2 + (a[1] + b[1]) / 2);
    ctx.fillStyle = "#f56754";
    this.render2((a, b) => (a[1] + b[1]) / 2);
    this.renderDay();
  }

}