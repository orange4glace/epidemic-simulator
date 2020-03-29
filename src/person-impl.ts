import { Entity } from './entity';
import { Subject } from 'rxjs';
import { Vector2, ReadonlyVector2, rand, clamp, randInt } from './util';
import { IZone } from './zone';
import { StateMachine } from './state-machine';
import { IWorld } from './world';
import { ISociety } from './society';
import { Engine } from './engine';
import { IPerson, SIRState } from './person';
import { SIRModel } from './sir-model';
import { computed, autorun, IReactionDisposer } from 'mobx';

export enum PersonState {
  Chilling = 0,
  Transfering = 1,
  Shopping = 2,
  Traveling = 3,
}

export class PersonEvent {
  constructor(public readonly person: Person) {}
}

export class PersonSIRStateChangeEvent extends PersonEvent {
  constructor(
    public readonly person: Person,
    public readonly lastState: SIRState) {
    super(person);
  }
}

export class Person extends Entity implements IPerson {

  static RIPPLE_DURATION = 1000;

  private stateMachine_: StateMachine;

  public readonly onDidChangeSIRState =
      new Subject<PersonSIRStateChangeEvent>();
  private state_ = SIRState.Suspectible;
  public get state() { return this.state_; }
  public setState(value: SIRState): void {
    if (this.state_ === value) return;
    if (
      this.state_ == SIRState.Suspectible &&
      (value == SIRState.Infectious ||
       value == SIRState.Infectious_Unknown)) {
      this.infectedTime_ = Engine.elasped;
    }
    const last = this.state_;
    this.state_ = value;
    this.onDidChangeSIRState.next(
      new PersonSIRStateChangeEvent(this, last));
  }

  private elapsed_: number = randInt(0, 5000);
  private day_: number = 0;
  private dayChanged_: boolean = false;
  private infectionIntervalStep_ = 0;
  private infectionInterval_ = 1000;

  private rippleState_: SIRState;
  public get rippleState() { return this.rippleState_; }
  private hasRipple_: boolean = false;
  public get hasRipple() { return this.hasRipple_; }
  private rippleEndedTime_: number;
  private rippleStartedTime_: number;
  public get rippleStartedTime() { return this.rippleStartedTime_; }

  public get infected(): boolean {
    return this.state == SIRState.Infectious_Unknown ||
           this.state == SIRState.Infectious;
  }

  private infectedTime_: number;
  public get infectedTime() { return this.infectedTime_; }

  private chillingDirection_: Vector2;
  private chillingDuration_: number;

  private transferNormalizedSrcRelativeToSoceity_: ReadonlyVector2;
  private transferNormalizedDstRelativeToSoceity_: ReadonlyVector2;
  private transferSrcSoceity_: ISociety;
  private transferDstSociety_: ISociety;
  private transferStartedTime_: number;
  private transferDuration_: number;
  private transferNextState_: PersonState;

  private shoppingNormalizedSrcRelativeToSociety_: ReadonlyVector2;
  private shoppingNormalizedDstRelativeToSociety_: ReadonlyVector2;
  private shoppingStartedTime_: number;
  private shoppingDuration_: number;

  private travelingNormalizedSrcRelativeToSociety_: ReadonlyVector2;
  private travelingNormalizedDstRelativeToSociety_: ReadonlyVector2;
  private travelingSrcSociety_: ISociety;
  private travelingDstSociety_: ISociety;
  private traveling_: boolean = false;

  private quarantinedSociety_:  ISociety;
  private quarantinedNormalizedSrcRelativeToSociety_: Vector2;
  private socialDistanceParticipant_: boolean = false;

  private speed_: number = 30;
  public get speed() { return this.speed_; }

  constructor(
      public readonly world: IWorld,
      private society_: ISociety) {
    super();
    this.society_.addPerson(this);
    this.stateMachine_ = this.addComponent(new StateMachine());

    this.state_ = SIRState.Suspectible;

    this.beginChilling = this.beginChilling.bind(this);
    this.updateChilling = this.updateChilling.bind(this);
    this.stateMachine_.setStateCallback(PersonState.Chilling,
      this.beginChilling,
      null,
      this.updateChilling);

    this.beginTransfer = this.beginTransfer.bind(this);
    this.updateTransfer = this.updateTransfer.bind(this);
    this.stateMachine_.setStateCallback(PersonState.Transfering,
      this.beginTransfer,
      null,
      this.updateTransfer);

    this.beginShopping = this.beginShopping.bind(this);
    this.updateShopping = this.updateShopping.bind(this);
    this.stateMachine_.setStateCallback(PersonState.Shopping,
      this.beginShopping,
      null,
      this.updateShopping);

    this.beginTraveling = this.beginTraveling.bind(this);
    this.endTraveling = this.endTraveling.bind(this);
    this.stateMachine_.setStateCallback(PersonState.Traveling,
      this.beginTraveling,
      this.endTraveling,
      null);

    if (rand() < SIRModel.initialInfectionPossiblity) {
      this.setState(SIRState.Infectious_Unknown);
    }

    this.listen();
    this.stateMachine_.state = PersonState.Chilling;
  }

  public setZone(zone: IZone) {

  }

  public doUpdate(): void {
    this.dayChanged_ = false;
    this.elapsed_ += Engine.delta;
    const nextDay = Math.floor(this.elapsed_ / 5000);
    const infectionStep = Math.floor(this.elapsed_ / this.infectionInterval_);
    if (this.infectionIntervalStep_ != infectionStep) {
      this.infectionIntervalStep_ = infectionStep;
      this.infect();
      this.discover();
    }
    if (this.day_ != nextDay) {
      this.dayChanged_ = true;
      this.day_ = nextDay;
    }
    
    if (this.infected && !this.hasRipple_) {
      this.hasRipple_ = true;
      this.rippleStartedTime_ = Engine.elasped + rand(0, 1000);
    }
    else if (!this.infected && this.hasRipple_) {
      if (!this.rippleEndedTime_) {
        this.rippleEndedTime_ = (this.rippleStartedTime_ + 
          Math.ceil((Engine.elasped - this.rippleStartedTime_) /
            Person.RIPPLE_DURATION) * Person.RIPPLE_DURATION);
      }
      if (this.rippleEndedTime_ <= Engine.elasped) {
        this.hasRipple_ = false;
      }
    }
  }

  private infect(): void {
    if (this.society_ == this.world.quarantine) return;
    if (this.state != SIRState.Infectious &&
        this.state != SIRState.Infectious_Unknown) return;
    this.society_.iterateNearby(
      this.society_.mapPositionWorldToSociety(this.transform.position),
      rhs => {
        if (rhs == this) return;
        if (rhs.state != SIRState.Suspectible) return;
        if (Math.random() > SIRModel.infectionRate) return;
        const dist = this.transform.position.sub(rhs.transform.position);
        if (dist.squaredMagnitude < SIRModel.infectionRadius * SIRModel.infectionRadius) {
          rhs.setState(SIRState.Infectious_Unknown);
        }
      });
    // this.society_.people.forEach(rhs => {
    //   if (rhs.state != SIRState.Suspectible) return;
    //   if (Math.random() > SIRModel.infectionRate) return;
    //   const dist = this.transform.position.sub(rhs.transform.position);
    //   if (dist.magnitude < SIRModel.infectionRadius) {
    //     rhs.setState(SIRState.Infectious_Unknown);
    //   }
    // })
  }

  private discover(): void {
    if (this.state == SIRState.Infectious_Unknown) {
      if (rand() < SIRModel.infectionDiscoveryRate) {
        this.setState(SIRState.Infectious);
      }
    }
    if (this.infected) {
      if (rand() < SIRModel.infectionRecoveryRate) {
        this.setState(SIRState.Recovered);
      }
    }
  }

  private beginChilling() {
    this.chillingDuration_ = -1;
    this.chillingDirection_ = new Vector2(rand() * 2 - 1, rand() * 2 - 1).normalize();
  }

  private updateChilling() {
    this.chillingDuration_ -= Engine.delta;
    if (this.chillingDuration_ < 0) {
      this.chillingDuration_ = rand(500, 2000);
      this.chillingDirection_ = new Vector2(rand() * 2 - 1, rand() * 2 - 1).normalize();
    }
    const socialDistance = this.getSocialDistance();
    // const socialDistance: Vector2 = null;
    
    this.chillingDirection_ = socialDistance || this.chillingDirection_;
    const dd = this.chillingDirection_.mul(
        this.speed_ / 1000 * Engine.delta * (socialDistance ? 3 : 1));
    this.transform.position = this.transform.position.add(dd);
    const fixed = this.fixCoordinateByPolicy();
    if (fixed) {
      this.chillingDuration_ = -1;
    }

    if (this.society_ == this.world.quarantine) {
      if (!SIRModel.quarantined) {
        this.startDequarantine();
      }
      else if (SIRModel.dequarantineAfterRecovered && !this.infected) {
        this.startDequarantine();
      }
    }
    else {
      if (SIRModel.quarantined &&
          this.state == SIRState.Infectious /* &&
          rand() < SIRModel.quarantineRate*/) {
        this.startQuarantine();
      }
      else if (this.dayChanged_) {
        if (rand() < SIRModel.shoppingRate) {
          this.startShopping();
        }
        else if (rand() < SIRModel.travelingRate) {
          this.startTraveling();
        }
      }
    }

  }

  private getSocialDistance(): Vector2 {
    if (this.society_ == this.world.quarantine) return null;
    if (!this.socialDistanceParticipant_) return null;
    let mag = Infinity;
    let go = new Vector2(rand() * 2 - 1, rand() * 2 - 1).normalize();
    this.society_.iterateNearby(
      this.society_.mapPositionWorldToSociety(this.transform.position),
      person => {
        if (person == this) return;
        if (person.traveling_) return;
        const s = this.transform.position.sub(person.transform.position);
        if (s.squaredMagnitude < mag) {
          mag = s.squaredMagnitude;
          go = s;
        }
      });
    // this.society_.people.forEach(person => {
    //   if (person == this) return;
    //   const s = this.transform.position.sub(person.transform.position);
    //   if (s.magnitude < mag) {
    //     mag = s.magnitude;
    //     go = s;
    //   }
    // });
    if (mag == Infinity ||
        mag > SIRModel.socialDistance * SIRModel.socialDistance) {
      return null;
    }
    if (go.squaredMagnitude == 0) {
      return new Vector2(rand() * 2 - 1, rand() * 2 - 1).normalize();
    }
    const norm = go.normalize();
    if (norm.x == 1 || norm.y == 1) {
      return new Vector2(rand() * 2 - 1, rand() * 2 - 1).normalize();
    }
    return norm;
  }
  
  private startQuarantine() {
    this.quarantinedSociety_ = this.society_;
    this.quarantinedNormalizedSrcRelativeToSociety_ =
        this.getSocietyPosition().div2(this.society_.size);
    this.startTraveling(this.world.quarantine);
  }

  private startDequarantine() {
    this.startTraveling(this.quarantinedSociety_,
        this.quarantinedNormalizedSrcRelativeToSociety_);
    this.quarantinedSociety_ = null;
  }

  private startTransfer(
    srcRelativeToSociety: ReadonlyVector2,
    dstRelativeToSociety: ReadonlyVector2,
    srcSociety: ISociety,
    dstSociety: ISociety, nextState: PersonState) {
    const normalizedSrc = srcRelativeToSociety.div2(srcSociety.size);
    const normalizedDst = dstRelativeToSociety.div2(dstSociety.size);
    this.transferNormalizedSrcRelativeToSoceity_ = normalizedSrc;
    this.transferNormalizedDstRelativeToSoceity_ = normalizedDst;
    this.transferSrcSoceity_ = srcSociety;
    this.transferDstSociety_ = dstSociety;
    this.transferNextState_ = nextState;
    this.stateMachine_.state = PersonState.Transfering;
  }

  private beginTransfer() {
    this.transferStartedTime_ = this.elapsed_;
    this.transferDuration_ = 2500;
  }

  private updateTransfer() {
    const dt = this.elapsed_ - this.transferStartedTime_;
    const t = this.ease(clamp(dt / this.transferDuration_, 0, 1));

    const src = this.transferSrcSoceity_.positionRelativeToWorld(
      this.transferNormalizedSrcRelativeToSoceity_.mul2(this.transferSrcSoceity_.size));
    const dst = this.transferDstSociety_.positionRelativeToWorld(
      this.transferNormalizedDstRelativeToSoceity_.mul2(this.transferDstSociety_.size));
    const interp = src.add(dst.sub(src).mul(t));
    // console.log(this.transferNormalizedSrcRelativeToSoceity_, this.transferSrcSoceity_.size);
    this.transform.position = interp;
    if (t == 1) {
      this.stateMachine_.state = this.transferNextState_;
    }
  }

  private ease(t: number) {
    return (--t)*t*t+1;
  }

  private startShopping() {
    this.shoppingNormalizedSrcRelativeToSociety_ =
        this.getSocietyPosition().div2(this.society_.size);
    let rw = this.society_.width * rand(-0.15, 0.15);
    let rh = this.society_.height * rand(-0.15, 0.15);
    this.startTransfer(
      this.getSocietyPosition(),
      new Vector2(this.society_.width / 2 + rw,
                  this.society_.height / 2 + rh),
      this.society_,
      this.society_,
      PersonState.Shopping);
  }

  private beginShopping() {
    this.shoppingDuration_ = rand(500, 1000);
  }

  private updateShopping() {
    this.shoppingDuration_ -= Engine.delta;
    if (this.shoppingDuration_ <= 0) {
      this.startTransfer(
        this.getSocietyPosition(),
        this.shoppingNormalizedSrcRelativeToSociety_.mul2(this.society_.size),
        this.society_,
        this.society_,
        PersonState.Chilling);
    }
  }

  private startTraveling(dstSociety?: ISociety,
      normalizedDstRelativeToSociety?: ReadonlyVector2) {
    this.traveling_ = true;
    this.travelingDstSociety_ = dstSociety;
    if (!this.travelingDstSociety_) {
      for (let i = 0; i < 10; i ++) {
        this.travelingDstSociety_ = 
            this.world.societies[randInt(0, this.world.societies.length - 1)];
        if (this.travelingDstSociety_ != this.society_) break;
      }
    }
    if (this.travelingDstSociety_ == this.society_) {
      return;
    }
    let dst = null;
    if (normalizedDstRelativeToSociety) {
      dst = normalizedDstRelativeToSociety.mul2(dstSociety.size);
    }
    else {
      let rw = this.travelingDstSociety_.width * rand(-0.3, 0.3);
      let rh = this.travelingDstSociety_.height * rand(-0.3, 0.3);
      dst = new Vector2(this.travelingDstSociety_.width / 2 + rw,
                  this.travelingDstSociety_.height / 2 + rh)
    }
    this.startTransfer(
      this.getSocietyPosition(),
      dst,
      this.society_,
      this.travelingDstSociety_,
      PersonState.Traveling);
  }

  private beginTraveling() {
    this.society_.removePerson(this);
    this.society_ = this.travelingDstSociety_;
    this.society_.addPerson(this);
    this.stateMachine_.state = PersonState.Chilling;
  }

  private endTraveling() {
    this.traveling_ = false;
  }

  private fixCoordinateByPolicy(): boolean {
    const society = this.society_;

    if (this.society_) {
      const societyPosition = this.getSocietyPosition();
      if (societyPosition.x < 0 || societyPosition.x >= society.width ||
          societyPosition.y < 0 || societyPosition.y >= society.height) {
        this.transform.position = new Vector2(
            society.transform.position.x + clamp(societyPosition.x, 0, society.width),
            society.transform.position.y + clamp(societyPosition.y, 0, society.height));
        return true;
      }
    }
    return false;
  }
  
  public getSocietyPosition(): Vector2 {
    return this.society_.mapPositionWorldToSociety(this.transform.position);
  }

  /** Observables */
  private disposer_: IReactionDisposer;
  private listen(): void {
    this.disposer_ = autorun(() => {
      this.socialDistanceParticipant_ = 
          rand() < SIRModel.socialDistanceParticipantRatio;
    });
  }

  public dispose(): void {
    this.disposer_();
  }
 
}