export class Color {

  public readonly r: number;
  public readonly g: number;
  public readonly b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r / 255;
    this.g = g / 255;
    this.b = b / 255;
  }
}


class _ColorPalette {
  readonly PERSON_SUSCEPTIBLE = new Color(148, 193, 203);
  readonly PERSON_INFECTED = new Color(246, 142, 159);
  readonly PERSON_INFECTED_UNKNOWN = new Color(248, 255,52);
  readonly PERSON_RECOVERED = new Color(78, 75, 77);
}

export const ColorPalette = new _ColorPalette();