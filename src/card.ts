import { App, Component, MarkdownRenderer, TFile, setIcon } from "obsidian";
import { toggleNthTask } from "./edit";
import { ColorName, PALETTE } from "./palette";
import { t } from "./t";

export interface CardOpts {
  maxBodyHeight: number;
  component: Component;
}

export async function readBody(app: App, file: TFile): Promise<string> {
  const text = await app.vault.cachedRead(file);
  const end = app.metadataCache.getFileCache(file)?.frontmatterPosition?.end.offset;
  return end === undefined ? text : text.slice(end).replace(/^\s+/, "");
}

export function applyColor(card: HTMLElement, color: ColorName | null): void {
  for (const c of PALETTE) card.removeClass(`cw-color-${c.name}`);
  if (color) card.addClass(`cw-color-${color}`);
}

const CHECKBOX = "input.task-list-item-checkbox";

/** Checkboxes of this note's own tasks, in document order (embedded notes' tasks excluded). */
function ownCheckboxes(root: HTMLElement): HTMLInputElement[] {
  return Array.from(root.querySelectorAll<HTMLInputElement>(CHECKBOX)).filter(
    (box) => !box.closest(".internal-embed, .markdown-embed"),
  );
}

/** Rendered checkboxes are live; the click is written back to the note. */
export function enableTasks(root: HTMLElement): void {
  ownCheckboxes(root).forEach((box) => {
    box.disabled = false;
  });
}

/**
 * If the click landed on a task checkbox, flips that task in the file and returns true.
 * The browser has already drawn the new state; the card refreshes when the file change arrives.
 */
export function toggleTaskFromClick(app: App, file: TFile, root: HTMLElement, target: EventTarget | null): boolean {
  const box = (target as HTMLElement | null)?.closest<HTMLInputElement>(CHECKBOX);
  if (!box) return false;
  const n = ownCheckboxes(root).indexOf(box);
  if (n >= 0) void app.vault.process(file, (data) => toggleNthTask(data, n));
  return true;
}

export function updateClipped(card: HTMLElement): void {
  const body = card.querySelector<HTMLElement>(".cw-body");
  if (!body) return;
  card.toggleClass("cw-clipped", body.scrollHeight > body.clientHeight + 1);
}

/** The card frame: title and an empty body. Cheap enough to make for every note. */
export function createCardShell(parent: HTMLElement, file: TFile, maxBodyHeight: number): HTMLElement {
  const card = parent.createDiv({ cls: "cw-card" });
  card.dataset.path = file.path;
  card.createDiv({ cls: "cw-title", text: file.basename });
  const body = card.createDiv({ cls: "cw-body markdown-rendered" });
  body.style.maxHeight = `${maxBodyHeight}px`;

  const foot = card.createDiv({ cls: "cw-foot" });
  foot.createSpan({ cls: "cw-more", text: t("card.more") });
  const actions = foot.createDiv({ cls: "cw-actions" });
  const color = actions.createEl("button", { cls: "cw-color clickable-icon", attr: { "aria-label": t("card.color") } });
  setIcon(color, "palette");
  const pin = actions.createEl("button", { cls: "cw-pin clickable-icon", attr: { "aria-label": t("card.pin") } });
  setIcon(pin, "pin");
  return card;
}

const children = new WeakMap<HTMLElement, Component>();
const lastText = new WeakMap<HTMLElement, string>();
const fillTokens = new WeakMap<HTMLElement, number>();

/** Unloads whatever the card's rendered markdown registered (embeds, plugin code blocks). */
export function releaseCard(component: Component, card: HTMLElement): void {
  const child = children.get(card);
  if (child) component.removeChild(child);
  children.delete(card);
  lastText.delete(card);
  fillTokens.set(card, (fillTokens.get(card) ?? 0) + 1);
}

/**
 * Renders the note's text into a shell made by createCardShell. Renders off-screen first
 * and swaps in, so the card never collapses while it re-reads. A newer call wins.
 */
export async function fillCard(app: App, card: HTMLElement, file: TFile, component: Component): Promise<void> {
  const body = card.querySelector<HTMLElement>(".cw-body");
  if (!body) return;
  const token = (fillTokens.get(card) ?? 0) + 1;
  fillTokens.set(card, token);

  const text = await readBody(app, file);
  if (fillTokens.get(card) !== token) return;
  if (lastText.get(card) === text) return;

  const child = new Component();
  component.addChild(child);
  const staging = createDiv();
  await MarkdownRenderer.render(app, text, staging, file.path, child);
  if (fillTokens.get(card) !== token) {
    component.removeChild(child);
    return;
  }

  const previous = children.get(card);
  if (previous) component.removeChild(previous);
  children.set(card, child);
  lastText.set(card, text);

  enableTasks(staging);
  body.replaceChildren(...Array.from(staging.childNodes));
  body.querySelectorAll("img").forEach((img) => {
    img.addEventListener("load", () => updateClipped(card));
  });
  updateClipped(card);
}

export async function renderCard(
  app: App,
  parent: HTMLElement,
  file: TFile,
  opts: CardOpts,
): Promise<HTMLElement> {
  const card = createCardShell(parent, file, opts.maxBodyHeight);
  await fillCard(app, card, file, opts.component);
  return card;
}
