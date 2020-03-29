import { IZone } from './zone';
import { ISociety } from './society';
import { IWorld } from './world';
import { Person } from './person-impl';

export class Zone implements IZone {

  private people_: Set<Person> = new Set();
  public get people() : ReadonlySet<Person> { return this.people_; }

  constructor(
      public readonly world: IWorld,
      public readonly society: ISociety,
      public readonly x: number,
      public readonly y: number,
      public readonly width: number,
      public readonly height: number) {

  }

  public addPerson(person: Person) {
    this.people_.add(person);
  }

  public removePerson(person: Person) {
    this.people_.delete(person);
  }

}