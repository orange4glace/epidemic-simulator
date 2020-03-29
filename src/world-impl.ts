import { IWorld } from './world';
import { Society } from './society-impl';
import { Person } from './person-impl';
import { Entity } from './entity';
import { Vector2 } from './util';
import { Engine } from './engine';
import { SIRState } from './person';
import { SIRModel } from './sir-model';

let k = 0;

export class Statistic {

  private elapsed_: number = 0;
  public get elapsed() { return this.elapsed_; }

  private numSuspectible_: number = 0;
  public get numSuspectible() { return this.numSuspectible_; }
  private numInfectious_: number = 0;
  public get numInfectious() { return this.numInfectious_; }
  private numRecovered_: number = 0;
  public get numRecovered() { return this.numRecovered_; }

  private records_: Array<[number, number, number]> = [];
  public get records(): ReadonlyArray<[number, number, number]> {
    return this.records_; }

  constructor() {

  }

  public update(
    numSuspectible_: number, numInfectious_: number, numRecovered_: number) {
    this.numSuspectible_ = numSuspectible_;
    this.numInfectious_ = numInfectious_;
    this.numRecovered_ = numRecovered_;
  }

  public elapse(value: number): void {
    this.elapsed_ = value;
  }

  public record() {
    this.records_.push([this.numSuspectible_,
        this.numInfectious_, this.numRecovered_]);
  }

}

export class World extends Entity implements IWorld {

  public readonly statistic = new Statistic();

  private societies_: Society[] = [];
  public get societies(): ReadonlyArray<Society> {
    return this.societies_; }

  private quarantine_: Society = null;
  public get quarantine() { return this.quarantine_; }

  private time_: number;
  private day_: number;
  public get day() { return this.day_; }

  constructor() {
    super();
    this.time_ = 0;
    this.day_ = 0;

  }

  public createQuarantine(x: number, y: number, w: number, h: number): Society {
    this.quarantine_ = new Society(this, w, h);
    this.quarantine_.transform.position = new Vector2(x, y);
    this.quarantine_.quarantine = true;
    this.listenSociety(this.quarantine);
    return this.quarantine_;
  }

  public createSociety(x: number, y: number, w: number, h: number): Society {
    const society = new Society(this, w, h);
    society.transform.position = new Vector2(x, y);
    this.societies_.push(society);
    this.listenSociety(society);
    return society;
  }

  public doUpdate(): void {
    this.time_ += Engine.delta;
    const nextDay = Math.floor(this.time_ / SIRModel.timeFactor);
    for (let i = this.day_; i < nextDay; i ++) {
      this.statistic.record();
    }
    if (this.day_ != nextDay) {
      this.day_ = nextDay;
    }
    this.statistic.elapse(this.time_);
  }

  private listenSociety(society: Society) {
    society.onDidPopulatePerson.subscribe(e => {
      this.statistic.update(
        this.statistic.numSuspectible + 1,
        this.statistic.numInfectious,
        this.statistic.numRecovered);
    })
    society.onDidChangePersonSIRState.subscribe(e => {
      switch (e.lastState) {
        case (SIRState.Suspectible):
          this.statistic.update(
            this.statistic.numSuspectible - 1,
            this.statistic.numInfectious,
            this.statistic.numRecovered);
        break;
        case (SIRState.Infectious):
        case (SIRState.Infectious_Unknown):
          this.statistic.update(
            this.statistic.numSuspectible,
            this.statistic.numInfectious - 1,
            this.statistic.numRecovered);
        break;
        case (SIRState.Recovered):
          this.statistic.update(
            this.statistic.numSuspectible,
            this.statistic.numInfectious,
            this.statistic.numRecovered - 1);
        break;
      }
      
      switch (e.person.state) {
        case (SIRState.Suspectible):
          this.statistic.update(
            this.statistic.numSuspectible + 1,
            this.statistic.numInfectious,
            this.statistic.numRecovered);
        break;
        case (SIRState.Infectious):
        case (SIRState.Infectious_Unknown):
          this.statistic.update(
            this.statistic.numSuspectible,
            this.statistic.numInfectious + 1,
            this.statistic.numRecovered);
        break;
        case (SIRState.Recovered):
          this.statistic.update(
            this.statistic.numSuspectible,
            this.statistic.numInfectious,
            this.statistic.numRecovered + 1);
        break;
      }
      
    })
  }

}