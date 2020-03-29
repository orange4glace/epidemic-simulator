import { Renderer } from './renderer';
import { World } from './world-impl';
import { Engine } from './engine';
import { StatisticView } from './statistic-view';
import { SIRModel } from './sir-model';

let world: World;
let statisticView: StatisticView;

const box = document.getElementById('cvs-box') as HTMLElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer(box, canvas, canvas.width, canvas.height);

let initialized = false;

export async function init(): Promise<void> {

  await renderer.initialize();

  function run(timestamp: number) {
    Engine.update(timestamp);
    if (world) renderer.draw(world);
    if (statisticView) statisticView.render();
    requestAnimationFrame(run);
    // console.log(Engine.delta);
  }
  requestAnimationFrame(run);
  initialized = true;

}

export function createWorld() {
  if (!initialized) return;
  Engine.clear();
  const column = SIRModel.societyColumnLength;
  const row = SIRModel.societyRowLength;
  const size = SIRModel.societySize;
  const population = SIRModel.societyPopulation;

  const SOCIETY_PAD = 40;
  const SCREEN_PAD = 20;
  world = new World();
  statisticView = new StatisticView(
    document.getElementById('stat-box'),
    document.getElementById('statistic') as HTMLCanvasElement,
    world.statistic);
  let width = column * (size + SOCIETY_PAD) + SCREEN_PAD * 2 + size / 2;
  let height = row * (size + SOCIETY_PAD) - SOCIETY_PAD + SCREEN_PAD * 2;
  renderer.setSize(width, height);

  world.createQuarantine(width - SCREEN_PAD - size / 2, height - SCREEN_PAD - size / 2,
    size / 2, size / 2);

  for (let i = 0; i < row; i ++) {
    for (let j = 0; j < column; j ++) {
      const society = world.createSociety(
        SCREEN_PAD+ j * (size + SOCIETY_PAD), 
        SCREEN_PAD + i * (size + SOCIETY_PAD),
        size, size);
      for (let i = 0; i < population; i ++) society.populate();
    }
  }
}
