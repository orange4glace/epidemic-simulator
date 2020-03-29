export enum SIRState {
  Suspectible,
  Infectious,
  Infectious_Unknown,
  Recovered
}

export interface IPerson {

  readonly state: SIRState;

  setState(value: SIRState): void;
  
}