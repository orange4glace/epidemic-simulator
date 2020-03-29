import { Person } from './person-impl';
import { IEntity } from './ientity';
import { ReadonlyVector2, Vector2 } from './util';

export interface ISociety extends IEntity {

  readonly id: number;

  readonly width: number;
  readonly height: number;
  readonly size: ReadonlyVector2;

  readonly people: ReadonlySet<Person>;

  addPerson(person: Person): void;
  removePerson(person: Person): void;

  iterateNearby(societyPosition: ReadonlyVector2,
      it: (person: Person) => void): void;

  mapPositionWorldToSociety(position: ReadonlyVector2): Vector2;
  positionRelativeToWorld(position: ReadonlyVector2): Vector2;

}