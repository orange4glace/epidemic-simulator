import './control';
import { init, createWorld } from './init';

init().then(() => {
  createWorld();
})