import { Subject } from 'rxjs';
import { observable, autorun } from 'mobx'

interface _SIRModel {

  readonly version: number;

  readonly timeFactor: number;
  readonly dayFactor: number;

  readonly societyColumnLength: number;
  readonly societyRowLength: number;
  readonly societyPopulation: number;
  readonly societySize: number;

  readonly initialInfectionPossiblity: number;
  readonly infectionRate: number;
  readonly infectionDiscoveryRate: number;
  readonly infectionRecoveryRate: number;
  readonly infectionRadius: number;

  readonly shoppingRate: number;
  readonly travelingRate: number;

  readonly quarantined: boolean;
  readonly quarantineRate: number;
  readonly dequarantineAfterRecovered: boolean;

  readonly socialDistance: number;
  readonly socialDistanceParticipantRatio: number;

}

export class _SIRModelImpl implements _SIRModel {

  @observable public version: number;

  @observable public timeFactor: number;
  @observable public dayFactor: number;

  @observable public societyColumnLength: number;
  @observable public societyRowLength: number;
  @observable public societyPopulation: number;
  @observable public societySize: number;
  
  @observable public initialInfectionPossiblity: number;
  @observable public infectionRate: number;
  @observable public infectionDiscoveryRate: number;
  @observable public infectionRecoveryRate: number;
  @observable public infectionRadius: number;

  @observable public shoppingRate: number;
  @observable public travelingRate: number;

  @observable public quarantined: boolean;
  @observable public quarantineRate: number;
  @observable public dequarantineAfterRecovered: boolean;

  @observable public socialDistance: number;
  @observable public socialDistanceParticipantRatio: number;

  constructor() {
    this.timeFactor = 100;
    this.dayFactor = 10;

    this.version = 1;

    this.societyColumnLength = 3;
    this.societyRowLength = 3;
    this.societyPopulation = 700;
    this.societySize = 900;

    this.initialInfectionPossiblity = 0.1;
    this.infectionRate = 0.15;
    this.infectionDiscoveryRate = 0.2;
    this.infectionRecoveryRate = 0.05;
    this.infectionRadius = 40;

    this.shoppingRate = 0.2;
    this.travelingRate = 0.1;

    this.quarantined = true;
    this.quarantineRate = 0.1;
    this.dequarantineAfterRecovered = true;

    this.socialDistance = 40;
    this.socialDistanceParticipantRatio = 0.5;

    const savedModel = localStorage.getItem("SIRModel");
    console.log(savedModel);
    if (savedModel) {
      try {
        const json = JSON.parse(savedModel);
        console.log(json);
        for (let key in json) {
          const value = json[key];
          if (!isNaN(value)) {
            (this as any)[key] = value;
          }
        }
      } catch (e) {
        console.error("Error loading SIR Model", e, savedModel);
      }
    }
    autorun(() => {
      this.timeFactor;
      this.dayFactor;
      this.societyColumnLength;
      this.societyRowLength;
      this.societyPopulation;
      this.societySize;
      this.initialInfectionPossiblity;
      this.infectionRate;
      this.infectionDiscoveryRate;
      this.infectionRecoveryRate;
      this.infectionRadius;
      this.shoppingRate;
      this.travelingRate;
      this.quarantined;
      this.quarantineRate;
      this.dequarantineAfterRecovered;
      this.socialDistance;
      this.socialDistanceParticipantRatio;
      localStorage.setItem("SIRModel", JSON.stringify(this));
    });
  }

}

export const SIRModel: _SIRModel = new _SIRModelImpl();

(window as any).SIRModel = SIRModel;