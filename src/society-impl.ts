import { Zone } from './zone-impl';
import { Entity } from './entity';
import { ISociety } from './society';
import { IWorld } from './world';
import { ReadonlyVector2, Vector2, clamp, randInt, rand } from './util';
import { Person, PersonSIRStateChangeEvent, PersonEvent } from './person-impl';
import { SIRState } from './person';
import { SIRModel } from './sir-model';
import { Subscription, Subject } from 'rxjs';

let __next_society_id = 0;

export class Society extends Entity implements ISociety {

  public readonly id = __next_society_id++;

  public quarantine: boolean = false;

  private size_: Vector2;
  public get size(): ReadonlyVector2 { return this.size_; }
  public get width() { return this.size_.x; }
  public get height() { return this.size_.y; }

  private readonly zoneWidth_: number;
  private readonly zoneHeight_: number;
  private zoneColumn_: number;
  private zoneRow_: number;

  private zones_: Map<Number, Zone> = new Map();
  private personToZoneMap_: Map<Person, Zone> = new Map();

  private people_: Set<Person> = new Set();
  public get people() { return this.people_; }
  public readonly onDidChangePersonSIRState =
      new Subject<PersonSIRStateChangeEvent>();
  public readonly onDidPopulatePerson = 
      new Subject<PersonEvent>();

  private peopleSubscription_: Map<Person, Array<Subscription>> = new Map();

  constructor(
      public readonly world: IWorld,
      width: number, height: number) {
    super();
    this.size_ = new Vector2(width, height);
    
    this.zoneWidth_ = 30;
    this.zoneHeight_ = 30;

    this.instantiateZones();
  }

  public doUpdate(): void {

  }

  public populate(): Person {
    const person = new Person(this.world, this);
    const pos = this.positionRelativeToWorld(new Vector2(
        randInt(0, this.width), randInt(0, this.height)));
    person.transform.position = pos;
    this.onDidPopulatePerson.next(new PersonEvent(person));
    return person;
  }

  public addPerson(person: Person) {
    this.people_.add(person);
    this.updateZone(person);
    const subs: Array<Subscription> = [];
    subs.push(person.transform.onDidPositionChange.subscribe(e => {
      this.updateZone(person);
    }));
    subs.push(person.onDidChangeSIRState.subscribe(e => {
      this.onDidChangePersonSIRState.next(e);
    }));
    this.peopleSubscription_.set(person, subs);
  }

  public removePerson(person: Person) {
    this.people_.delete(person);
    const zone = this.personToZoneMap_.get(person);
    if (zone) {
      zone.removePerson(person);
    }
    this.personToZoneMap_.delete(person);
    const subs = this.peopleSubscription_.get(person);
    subs.forEach(sub => sub.unsubscribe());
    this.peopleSubscription_.delete(person);
  }

  private updateZone(person: Person) {
    const old = this.personToZoneMap_.get(person);
    const cur = this.getZone(
      this.mapPositionWorldToSociety(person.transform.position));
    if (old == cur) return;
    if (old) {
      old.removePerson(person);
    }
    if (cur) {
      cur.addPerson(person);
    }
    this.personToZoneMap_.set(person, cur);
  }

  private getZone(position: ReadonlyVector2): Zone | null {
    const c = Math.floor(position.x / this.zoneWidth_);
    const r = Math.floor(position.y / this.zoneHeight_);
    const idx = r * this.zoneColumn_ + c;
    return this.zones_.get(idx);
  }

  private instantiateZones(): void {
    const zoneColumns = Math.ceil(this.width / this.zoneWidth_);
    const zoneRows = Math.ceil(this.height / this.zoneHeight_);
    for (let i = 0; i < zoneRows; i ++) {
      for (let j = 0; j < zoneColumns; j ++) {
        const idx = i * zoneColumns + j;
        const zone = new Zone(this.world, this, j, i,
            this.zoneWidth_, this.zoneHeight_);
        this.zones_.set(idx, zone);
      }
    }
    this.zoneColumn_ = zoneColumns;
    this.zoneRow_ = zoneRows;
  }

  public getZoneByCoordinate(coord: ReadonlyVector2): Zone {
    const c =  Math.floor(coord.x / this.zoneWidth_);
    const r = Math.floor(coord.y / this.zoneHeight_);
    const idx = r * this.zoneWidth_ + c;
    return this.zones_.get(idx);
  }

  public iterateNearby(societyPosition: ReadonlyVector2, it: (person: Person) => void) {
    const cen = this.getZone(societyPosition);
    if (!cen) return;
    for (let i = -1; i <= 1; i ++) {
      for (let j = -1; j <= 1; j ++) {
        const x = cen.x + j;
        const y = cen.y + i;
        const idx = y * this.zoneColumn_ + x;
        const zone = this.zones_.get(idx);
        if (!zone) continue;
        zone.people.forEach(person => {
          it(person);
        })
      }
    }
  }

  public mapPositionWorldToSociety(position: ReadonlyVector2): Vector2 {
    return position.sub(this.transform.position);
  }

  public positionRelativeToWorld(position: ReadonlyVector2): Vector2 {
    return position.add(this.transform.position);
  }

  public update(): void {

  }

}