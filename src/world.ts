import { ISociety } from './society';
import { IEntity } from './ientity';

export interface IWorld extends IEntity {

  readonly societies: ReadonlyArray<ISociety>;
  readonly quarantine: ISociety;

}