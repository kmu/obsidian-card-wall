import { Plugin, addIcon } from "obsidian";
import { CARD_WALL_VIEW_TYPE, CardWallView, cardWallOptions } from "./view";

const ICON_ID = "card-wall";

/** Three columns of cards with staggered heights, drawn to Obsidian's 100x100 icon box. */
const ICON_SVG = [
  [10, 10, 24, 38], [10, 56, 24, 34],
  [38, 10, 24, 24], [38, 42, 24, 48],
  [66, 10, 24, 48], [66, 66, 24, 24],
]
  .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="none" stroke="currentColor" stroke-width="6"/>`)
  .join("");

export default class CardWallPlugin extends Plugin {
  async onload() {
    addIcon(ICON_ID, ICON_SVG);
    this.registerBasesView(CARD_WALL_VIEW_TYPE, {
      name: "Card Wall",
      icon: ICON_ID,
      factory: (controller, containerEl) => new CardWallView(controller, containerEl),
      options: cardWallOptions,
    });
  }
}
