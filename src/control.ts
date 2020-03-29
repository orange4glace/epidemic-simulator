import * as noUiSlider from 'nouislider';
import { SIRModel, _SIRModelImpl } from './sir-model';
import { autorun } from 'mobx';
import { Engine } from './engine';
import { createWorld } from './init';

class Slider {

  private el_: HTMLElement;
  private slider_: noUiSlider.noUiSlider;
  private valueEl_: HTMLElement;

  constructor(parent: HTMLElement,
    label: string, start: number, min: number, max: number, step: number,
    private readonly displayFunc: (value: number) => string,
    private readonly sidEffect: (value: number) => void,
    private readonly sideEffectOnChange?: (value: number) => void) {
    this.el_ = document.createElement('div');
    this.el_.className = "slider-box";
    const labelEl = document.createElement('div');
    labelEl.className = "label";
    labelEl.innerText = label;
    this.el_.append(labelEl);

    const sliderEl = document.createElement('div');
    this.el_.append(sliderEl);

    this.valueEl_ = document.createElement('div');
    this.valueEl_.className = "value";
    this.el_.append(this.valueEl_);


    this.slider_ = noUiSlider.create(sliderEl, {
      start: start,
      range: {
        min: min,
        max: max
      },
      step: step
    });
    this.slider_.on('update', () => {
      this.renderValue();
      this.sidEffect(+this.slider_.get());
    });
    this.slider_.on('change', () => {
      this.sideEffectOnChange && 
      this.sideEffectOnChange(+this.slider_.get());
    });
    parent.append(this.el_);
    this.renderValue();
  }

  private renderValue() {
    this.valueEl_.innerText = this.displayFunc(+this.slider_.get());
  }

}

class Divider {

  constructor(parent: HTMLElement, bold: boolean = false) {
    const div = document.createElement('div');
    div.className = 'divider';
    if (bold) div.className += ' bold';
    parent.append(div);
  }

}

const controlEl = document.getElementById('control');
const modifiableSIRModel = SIRModel as _SIRModelImpl;

function createCategory(): HTMLElement {
  let cate = document.createElement('div');
  cate.className = 'category';
  controlEl.append(cate);
  return cate;
}

let cate = createCategory();
new Slider(cate,
  "Society Column Length (Regenerate)", 
  SIRModel.societyColumnLength, 1, 5, 1,
  value => value + '',
  value => modifiableSIRModel.societyColumnLength = value,
  () => createWorld());
new Divider(cate);

new Slider(cate,
  "Society Row Length (Regenerate)", 
  SIRModel.societyRowLength, 1, 5, 1,
  value => value + '',
  value => modifiableSIRModel.societyRowLength = value,
  () => createWorld());
new Divider(cate);

new Slider(cate,
  "Society Size (Regenerate)", 
  SIRModel.societySize, 50, 3000, 1,
  value => value + '',
  value => modifiableSIRModel.societySize = value,
  () => createWorld());
new Divider(cate);

new Slider(cate,
  "Population Per Society (Regenerate)", 
  SIRModel.societyPopulation, 1, 5000, 1,
  value => value + '',
  value => modifiableSIRModel.societyPopulation = value,
  () => createWorld());
new Divider(cate);

new Slider(cate,
  "Initial Infection Rate (Regenerate)", 
  Math.round(SIRModel.initialInfectionPossiblity * 1000), 0, 1000, 1,
  value => (value / 10) + '%',
  value => modifiableSIRModel.initialInfectionPossiblity = value / 1000,
  () => createWorld());
new Divider(cate, true);
  
cate = createCategory();
new Slider(cate,
  "Infection Rate", 
  Math.round(SIRModel.infectionRate * 100), 0, 100, 1,
  value => value + '%',
  value => modifiableSIRModel.infectionRate = value / 100);
new Divider(cate);
  
new Slider(cate,
  "Infection Discovery Rate", 
  Math.round(SIRModel.infectionDiscoveryRate * 100), 0, 100, 1,
  value => value + '%',
  value => modifiableSIRModel.infectionDiscoveryRate = value / 100)
new Divider(cate);
  
new Slider(cate,
  "Infection Recovery Rate", 
  Math.round(SIRModel.infectionRecoveryRate * 100), 0, 100, 1,
  value => value + '%',
  value => modifiableSIRModel.infectionRecoveryRate = value / 100);
new Divider(cate);
  
new Slider(cate,
  "Infection Radius", 
  SIRModel.infectionRadius, 0, 60, 1,
  value => value + '',
  value => modifiableSIRModel.infectionRadius = value);
new Divider(cate);
new Divider(cate, true);

cate = createCategory();
new Slider(cate,
  "Shopping Rate", 
  Math.round(SIRModel.shoppingRate * 100), 0, 100, 1,
  value => value + '%',
  value => modifiableSIRModel.shoppingRate = value / 100);
new Divider(cate);

new Slider(cate,
  "Travel Rate", 
  Math.round(SIRModel.travelingRate * 100), 0, 100, 1,
  value => value + '%',
  value => modifiableSIRModel.travelingRate = value / 100);
new Divider(cate);

new Slider(cate,
  "Social Distance", 
  SIRModel.socialDistance, 0, 160, 1,
  value => value + '',
  value => modifiableSIRModel.socialDistance = value);
new Divider(cate);

new Slider(cate,
  "Social Distance Participant Ratio", 
  Math.round(SIRModel.socialDistanceParticipantRatio * 100), 0, 100, 1,
  value => value + '%',
  value => modifiableSIRModel.socialDistanceParticipantRatio = value / 100);
new Divider(cate, true);
  
cate = createCategory();
new Slider(cate,
  "Enable Quarantine Zone", 
  +SIRModel.quarantined, 0, 1, 1,
  value => value ? 'Enabled' : 'Disabled',
  value => modifiableSIRModel.quarantined = !!value);
new Divider(cate);
  
new Slider(cate,
  "Returing Society on Recovered", 
  +SIRModel.dequarantineAfterRecovered, 0, 1, 1,
  value => value ? 'Enabled' : 'Disabled',
  value => modifiableSIRModel.dequarantineAfterRecovered = !!value);
new Divider(cate);


const pauseBtn = document.getElementById('paused');
pauseBtn.addEventListener('click', e => { Engine.paused = !Engine.paused} );
autorun(() => {
  if (Engine.paused) {
    pauseBtn.innerText = 'PLAY';
  }
  else {
    pauseBtn.innerText = 'PAUSE';
  }
  pauseBtn.className = Engine.paused ? 'active' : '';
})

document.getElementById('clear').addEventListener('click', e => {
  if (confirm('Clear settings?')) {
    localStorage.removeItem('SIRModel');
    location.reload();
  }
})
