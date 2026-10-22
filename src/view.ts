import { BasesAllOptions, BasesView, Notice, QueryController, TFile } from "obsidian";
import { applyColor, createCardShell, fillCard, releaseCard, toggleTaskFromClick, updateClipped } from "./card";
import { openFullView } from "./fullView";
import { columnGeometry, placeSections } from "./masonry";
import { moveItem } from "./move";
import { needsInitialization, parseOrder, planWrites, sortByOrder } from "./order";
import { ColorName, PALETTE, parseColor } from "./palette";
import { splitPinned } from "./sections";
import { isSortedByOrderAsc } from "./sortGuard";
import { t } from "./t";
import { estimateCardHeight, visibleIndices } from "./virtual";

export const CARD_WALL_VIEW_TYPE = "card-wall";

const GAP = 12;
const DEFAULT_COLUMN_WIDTH = 260;
const DEFAULT_MAX_BODY_HEIGHT = 230;
const SWAP_LOCK_MS = 260;
const HEADER_HEIGHT = 28;
const SECTION_GAP = 20;

export function cardWallOptions(): BasesAllOptions[] {
  return [
    { type: "text", key: "orderProperty", displayName: t("option.order"), default: "order" },
    { type: "text", key: "pinnedProperty", displayName: t("option.pinned"), default: "pinned" },
    { type: "text", key: "colorProperty", displayName: t("option.color"), default: "color" },
    { type: "slider", key: "columnWidth", displayName: t("option.width"), default: DEFAULT_COLUMN_WIDTH, min: 200, max: 420, step: 10 },
    { type: "slider", key: "maxBodyHeight", displayName: t("option.maxHeight"), default: DEFAULT_MAX_BODY_HEIGHT, min: 100, max: 600, step: 10 },
  ];
}

interface Item {
  file: TFile;
  size: number;
  mtime: number;
  pinned: boolean;
  color: ColorName | null;
}

interface Mounted {
  el: HTMLElement;
  x: number;
  y: number;
  pinned: boolean;
  color: ColorName | null;
}

const WINDOW_MARGIN = 1500;
const SLOW_MS = 50;

function findScroller(from: HTMLElement): HTMLElement {
  for (let el: HTMLElement | null = from; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY;
    if (overflow === "auto" || overflow === "scroll") return el;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

export class CardWallView extends BasesView {
  readonly type = CARD_WALL_VIEW_TYPE;

  private root: HTMLElement;
  private wall: HTMLElement;
  private emptyEl: HTMLElement;
  private hintEl: HTMLElement;

  /** Every note in the Base. Cheap data only: DOM exists just for cards near the viewport. */
  private items = new Map<string, Item>();
  /** Pinned cards first, then the rest; each group in display order. */
  private displayOrder: string[] = [];
  private pinnedCount = 0;
  private headerEls: HTMLElement[] = [];
  /** Pin states we have just written; used until the metadata cache catches up. */
  private pinOverrides = new Map<string, boolean>();
  private colorOverrides = new Map<string, ColorName | "none">();
  private paletteEl: HTMLElement | null = null;
  private closePalette: (() => void) | null = null;
  private mounted = new Map<string, Mounted>();
  /** Measured card heights, valid for `layoutKey`; other cards use an estimate. */
  private measured = new Map<string, number>();
  private layoutKey = "";
  private xs: number[] = [];
  private ys: number[] = [];
  private hs: number[] = [];
  private colWidth = DEFAULT_COLUMN_WIDTH;

  private scroller: HTMLElement | null = null;
  private layoutQueued = false;
  private windowQueued = false;
  private wallObserver: ResizeObserver;
  private cardObserver: ResizeObserver;
  private onScroll = () => this.scheduleWindow();

  private orders = new Map<string, number | null>();
  /** Values we have just written; used until the metadata cache catches up. */
  private overrides = new Map<string, number>();
  private dragEnabled = false;
  private dragPath: string | null = null;
  private dragStartOrder: string[] = [];
  private dropped = false;
  private lockUntil = 0;
  private writing = false;
  private pendingUpdate = false;
  private lastOrderProperty = "";

  constructor(controller: QueryController, parentEl: HTMLElement) {
    super(controller);
    this.root = parentEl.createDiv({ cls: "cw-root" });
    this.hintEl = this.root.createDiv({ cls: "cw-hint" });
    this.emptyEl = this.root.createDiv({ cls: "cw-empty", text: t("wall.empty") });
    this.wall = this.root.createDiv({ cls: "cw-wall" });

    this.wallObserver = new ResizeObserver(() => this.scheduleLayout());
    this.wallObserver.observe(this.wall);
    this.cardObserver = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const path = el.dataset.path;
        if (!path) continue;
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        updateClipped(el);
        if (height > 0 && Math.abs((this.measured.get(path) ?? 0) - height) > 0.5) {
          this.measured.set(path, height);
          changed = true;
        }
      }
      if (changed) this.scheduleLayout();
    });
    this.wall.addEventListener("dragstart", (evt) => this.onDragStart(evt));
    this.wall.addEventListener("dragover", (evt) => this.onDragOver(evt));
    this.wall.addEventListener("drop", (evt) => {
      evt.preventDefault();
      this.dropped = true;
    });
    this.wall.addEventListener("dragend", () => void this.onDragEnd());
  }

  onunload(): void {
    this.closePalette?.();
    this.wallObserver.disconnect();
    this.cardObserver.disconnect();
    this.scroller?.removeEventListener("scroll", this.onScroll);
  }

  onDataUpdated(): void {
    if (this.writing || this.dragPath) {
      this.pendingUpdate = true;
      return;
    }
    const started = performance.now();
    const orderProperty = this.orderProperty();
    if (orderProperty !== this.lastOrderProperty) {
      this.overrides.clear();
      this.lastOrderProperty = orderProperty;
    }
    const sortedByOrder = isSortedByOrderAsc(this.config.getSort(), orderProperty);
    const pinnedProperty = this.pinnedProperty();
    const colorProperty = this.colorProperty();

    const files = this.data.data.map((entry) => entry.file);
    const live = new Set<string>();
    for (const file of files) {
      live.add(file.path);
      const previous = this.items.get(file.path);
      this.items.set(file.path, {
        file,
        size: file.stat.size,
        mtime: file.stat.mtime,
        pinned: this.readPinned(file, pinnedProperty),
        color: this.readColor(file, colorProperty),
      });
      const card = this.mounted.get(file.path);
      if (card && previous && previous.mtime !== file.stat.mtime) {
        void fillCard(this.app, card.el, file, this);
      }
    }
    for (const path of Array.from(this.items.keys())) {
      if (live.has(path)) continue;
      this.items.delete(path);
      this.measured.delete(path);
      this.overrides.delete(path);
      this.pinOverrides.delete(path);
      this.colorOverrides.delete(path);
      this.unmount(path);
    }

    this.orders = new Map(files.map((f) => [f.path, this.readOrder(f, orderProperty)]));
    let list = files.map((f) => ({ id: f.path, order: this.orders.get(f.path) ?? null }));
    if (sortedByOrder) list = sortByOrder(list);
    const split = splitPinned(list.map((item) => ({ id: item.id, pinned: this.items.get(item.id)?.pinned ?? false })));
    this.displayOrder = [...split.pinned, ...split.others];
    this.pinnedCount = split.pinned.length;

    const needsInit = sortedByOrder && needsInitialization(list.map((item) => item.order));
    this.dragEnabled = sortedByOrder && !needsInit;
    this.renderHint(sortedByOrder, needsInit, orderProperty, files.length);
    this.emptyEl.toggle(files.length === 0);
    for (const card of this.mounted.values()) card.el.draggable = this.dragEnabled;

    this.layoutAll();
    this.logIfSlow("update", started);
  }

  private renderHint(sortedByOrder: boolean, needsInit: boolean, property: string, count: number): void {
    this.hintEl.empty();
    if (count === 0 || (sortedByOrder && !needsInit)) {
      this.hintEl.hide();
      return;
    }
    this.hintEl.show();
    if (!sortedByOrder) {
      this.hintEl.setText(t("hint.needSort", { property }));
      return;
    }
    this.hintEl.createSpan({ text: t("hint.init", { property, count }) });
    const button = this.hintEl.createEl("button", { text: t("hint.initButton"), cls: "mod-cta cw-init" });
    button.addEventListener("click", () => void this.initializeOrders());
  }

  private async initializeOrders(): Promise<void> {
    if (this.writing || this.displayOrder.length === 0) return;
    const list = this.displayOrder.map((id) => ({ id, order: this.orders.get(id) ?? null }));
    try {
      await this.writeOrders(planWrites(list, list[0].id));
    } catch (err) {
      this.reportWriteError(err);
    } finally {
      this.finishWriting();
    }
  }

  private logIfSlow(what: string, started: number): void {
    const ms = performance.now() - started;
    if (ms > SLOW_MS) console.warn(`Card Wall: ${what} took ${Math.round(ms)}ms for ${this.displayOrder.length} notes`);
  }

  private scheduleLayout(): void {
    if (this.layoutQueued) return;
    this.layoutQueued = true;
    window.requestAnimationFrame(() => {
      this.layoutQueued = false;
      this.layoutAll();
    });
  }

  private scheduleWindow(): void {
    if (this.windowQueued || this.layoutQueued) return;
    this.windowQueued = true;
    window.requestAnimationFrame(() => {
      this.windowQueued = false;
      this.updateWindow();
    });
  }

  /** Positions every card from known or estimated heights. No DOM reads per card. */
  private layoutAll(): void {
    const width = this.wall.clientWidth;
    if (width === 0) return;
    const started = performance.now();
    const maxBody = this.numberOption("maxBodyHeight", DEFAULT_MAX_BODY_HEIGHT);
    const { cols, colWidth } = columnGeometry(width, this.numberOption("columnWidth", DEFAULT_COLUMN_WIDTH), GAP);
    this.colWidth = colWidth;

    const key = `${Math.round(colWidth)}|${maxBody}`;
    if (key !== this.layoutKey) {
      this.layoutKey = key;
      this.measured.clear();
      this.restyleMounted(colWidth, maxBody);
    }

    if (!this.scroller) {
      this.scroller = findScroller(this.root);
      this.scroller.addEventListener("scroll", this.onScroll, { passive: true });
    }

    // Keep what the user is looking at in place when heights above it change.
    const anchor = this.dragPath ? null : this.findAnchor();

    this.hs = this.displayOrder.map(
      (path) => this.measured.get(path) ?? estimateCardHeight(this.items.get(path)?.file.stat.size ?? 0, colWidth, maxBody),
    );
    const labelled = this.pinnedCount > 0;
    const placed = placeSections(
      [
        { label: labelled ? t("section.pinned") : null, heights: this.hs.slice(0, this.pinnedCount) },
        { label: labelled ? t("section.others") : null, heights: this.hs.slice(this.pinnedCount) },
      ],
      cols,
      colWidth,
      GAP,
      HEADER_HEIGHT,
      SECTION_GAP,
    );
    this.xs = placed.xs;
    this.ys = placed.ys;
    this.renderHeaders(placed.headers);
    this.wall.style.height = `${placed.totalHeight}px`;

    if (anchor) {
      const index = this.displayOrder.indexOf(anchor.path);
      if (index >= 0 && this.scroller && this.scroller.scrollTop > 0) {
        const delta = this.ys[index] - anchor.y;
        if (Math.abs(delta) > 0.5) this.scroller.scrollTop += delta;
      }
    }

    this.updateWindow();
    this.logIfSlow("layout", started);
  }

  private renderHeaders(headers: { label: string; y: number }[]): void {
    while (this.headerEls.length < headers.length) {
      this.headerEls.push(this.wall.createDiv({ cls: "cw-section-title" }));
    }
    this.headerEls.forEach((el, i) => {
      const header = headers[i];
      el.toggle(!!header);
      if (!header) return;
      el.setText(header.label);
      el.style.transform = `translateY(${header.y}px)`;
    });
  }

  /**
   * Width or height limit changed: put the new values on the cards already on screen and
   * measure them again now. Their size may not change, so the resize observer cannot be relied on.
   */
  private restyleMounted(colWidth: number, maxBody: number): void {
    for (const card of this.mounted.values()) {
      card.el.style.width = `${colWidth}px`;
      card.el.querySelector<HTMLElement>(".cw-body")?.style.setProperty("max-height", `${maxBody}px`);
    }
    for (const [path, card] of this.mounted) {
      updateClipped(card.el);
      const height = card.el.getBoundingClientRect().height;
      if (height > 0) this.measured.set(path, height);
    }
  }

  private findAnchor(): { path: string; y: number } | null {
    let best: { path: string; y: number } | null = null;
    const viewTop = this.viewTop();
    for (const [path, card] of this.mounted) {
      if (card.y + (this.measured.get(path) ?? 0) < viewTop) continue;
      if (!best || card.y < best.y) best = { path, y: card.y };
    }
    return best;
  }

  private viewTop(): number {
    if (!this.scroller) return 0;
    return this.scroller.getBoundingClientRect().top - this.wall.getBoundingClientRect().top;
  }

  /** Makes DOM for the cards near the viewport and drops the rest. */
  private updateWindow(): void {
    if (!this.scroller || this.ys.length === 0) {
      for (const path of Array.from(this.mounted.keys())) this.unmount(path);
      return;
    }
    const top = this.viewTop();
    const bottom = top + this.scroller.clientHeight;
    const want = new Set(
      visibleIndices(this.ys, this.hs, top - WINDOW_MARGIN, bottom + WINDOW_MARGIN).map((i) => this.displayOrder[i]),
    );
    if (this.dragPath) want.add(this.dragPath);

    for (const path of Array.from(this.mounted.keys())) {
      if (!want.has(path)) this.unmount(path);
    }
    this.displayOrder.forEach((path, i) => {
      if (!want.has(path)) return;
      const item = this.items.get(path);
      if (!item) return;
      let card = this.mounted.get(path);
      if (!card) card = this.mount(path, item);
      card.el.style.width = `${this.colWidth}px`;
      if (card.pinned !== item.pinned) {
        card.pinned = item.pinned;
        card.el.toggleClass("cw-pinned", item.pinned);
      }
      if (card.color !== item.color) {
        card.color = item.color;
        applyColor(card.el, item.color);
      }
      if (card.x !== this.xs[i] || card.y !== this.ys[i]) {
        card.x = this.xs[i];
        card.y = this.ys[i];
        card.el.style.transform = `translate(${card.x}px, ${card.y}px)`;
      }
    });
  }

  private mount(path: string, item: Item): Mounted {
    const el = createCardShell(this.wall, item.file, this.numberOption("maxBodyHeight", DEFAULT_MAX_BODY_HEIGHT));
    el.draggable = this.dragEnabled;
    el.addEventListener("click", (evt) => {
      const current = this.items.get(path);
      if (!current) return;
      const target = evt.target as HTMLElement;
      if (target.closest(".cw-pin")) {
        void this.togglePin(path);
        return;
      }
      const colorButton = target.closest<HTMLElement>(".cw-color");
      if (colorButton) {
        this.openPalette(path, colorButton);
        return;
      }
      if (toggleTaskFromClick(this.app, current.file, el, evt.target)) return;
      openFullView(this.app, current.file);
    });
    el.toggleClass("cw-pinned", item.pinned);
    applyColor(el, item.color);
    const card: Mounted = { el, x: Number.NaN, y: Number.NaN, pinned: item.pinned, color: item.color };
    this.mounted.set(path, card);
    this.cardObserver.observe(el);
    void fillCard(this.app, el, item.file, this);
    return card;
  }

  private unmount(path: string): void {
    const card = this.mounted.get(path);
    if (!card) return;
    this.cardObserver.unobserve(card.el);
    releaseCard(this, card.el);
    card.el.remove();
    this.mounted.delete(path);
  }

  private orderProperty(): string {
    const v = this.config.get("orderProperty");
    const name = typeof v === "string" ? v.trim().replace(/^note\./, "") : "";
    return name !== "" ? name : "order";
  }

  private pinnedProperty(): string {
    const v = this.config.get("pinnedProperty");
    const name = typeof v === "string" ? v.trim().replace(/^note\./, "") : "";
    return name !== "" ? name : "pinned";
  }

  private readPinned(file: TFile, property: string): boolean {
    const raw: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.[property];
    const cached = raw === true || raw === "true";
    const override = this.pinOverrides.get(file.path);
    if (override === undefined) return cached;
    if (cached === override) {
      this.pinOverrides.delete(file.path);
      return cached;
    }
    return override;
  }

  private colorProperty(): string {
    const v = this.config.get("colorProperty");
    const name = typeof v === "string" ? v.trim().replace(/^note\./, "") : "";
    return name !== "" ? name : "color";
  }

  private readColor(file: TFile, property: string): ColorName | null {
    const cached = parseColor(this.app.metadataCache.getFileCache(file)?.frontmatter?.[property]);
    const override = this.colorOverrides.get(file.path);
    if (override === undefined) return cached;
    if ((cached ?? "none") === override) {
      this.colorOverrides.delete(file.path);
      return cached;
    }
    return override === "none" ? null : override;
  }

  private async setColor(path: string, color: ColorName | null): Promise<void> {
    const item = this.items.get(path);
    if (!item) return;
    const property = this.colorProperty();
    this.colorOverrides.set(path, color ?? "none");
    this.onDataUpdated();
    try {
      await this.app.fileManager.processFrontMatter(item.file, (fm: Record<string, unknown>) => {
        if (color) fm[property] = color;
        else delete fm[property];
      });
    } catch (err) {
      console.error("Card Wall: could not save color", err);
      new Notice(t("notice.colorFailed"));
      this.colorOverrides.delete(path);
      this.onDataUpdated();
    }
  }

  /** A small floating palette under the colour button. Lives on document.body so cards cannot clip it. */
  private openPalette(path: string, anchor: HTMLElement): void {
    this.closePalette?.();
    const current = this.items.get(path)?.color ?? null;
    const palette = document.body.createDiv({ cls: "cw-palette" });
    const choices: { name: ColorName | null; label: string }[] = [
      { name: null, label: t("color.none") },
      ...PALETTE.map((c) => ({ name: c.name, label: t(`color.${c.name}`) })),
    ];
    for (const choice of choices) {
      const swatch = palette.createEl("button", {
        cls: `cw-swatch ${choice.name ? `cw-color-${choice.name}` : "cw-swatch-none"}`,
        attr: { "aria-label": choice.label, title: choice.label },
      });
      if (choice.name === current) swatch.addClass("is-current");
      swatch.addEventListener("click", (evt) => {
        evt.stopPropagation();
        void this.setColor(path, choice.name);
        close();
      });
    }

    const rect = anchor.getBoundingClientRect();
    palette.style.top = `${rect.bottom + 6}px`;
    palette.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - palette.offsetWidth - 8))}px`;

    const onPointerDown = (evt: MouseEvent) => {
      if (palette.contains(evt.target as Node)) return;
      close();
      // The click that dismissed the palette must not also open whatever lies under it.
      const swallow = (click: MouseEvent) => click.stopPropagation();
      document.addEventListener("click", swallow, { capture: true, once: true });
    };
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") close();
    };
    const close = () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
      this.scroller?.removeEventListener("scroll", close);
      palette.remove();
      this.paletteEl = null;
      this.closePalette = null;
    };
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    this.scroller?.addEventListener("scroll", close, { once: true });
    this.paletteEl = palette;
    this.closePalette = close;
  }

  private async togglePin(path: string): Promise<void> {
    const item = this.items.get(path);
    if (!item) return;
    const property = this.pinnedProperty();
    const next = !item.pinned;
    this.pinOverrides.set(path, next);
    this.onDataUpdated();
    try {
      await this.app.fileManager.processFrontMatter(item.file, (fm: Record<string, unknown>) => {
        if (next) fm[property] = true;
        else delete fm[property];
      });
    } catch (err) {
      console.error("Card Wall: could not save pin", err);
      new Notice(t("notice.pinFailed"));
      this.pinOverrides.delete(path);
      this.onDataUpdated();
    }
  }

  private readOrder(file: TFile, property: string): number | null {
    const cached = parseOrder(this.app.metadataCache.getFileCache(file)?.frontmatter?.[property]);
    const override = this.overrides.get(file.path);
    if (override === undefined) return cached;
    if (cached === override) {
      this.overrides.delete(file.path);
      return cached;
    }
    return override;
  }

  private onDragStart(evt: DragEvent): void {
    const card = (evt.target as HTMLElement).closest<HTMLElement>(".cw-card");
    if (!card || !this.dragEnabled || this.writing) {
      if (card && this.dragEnabled) evt.preventDefault();
      return;
    }
    this.dragPath = card.dataset.path ?? null;
    this.dragStartOrder = this.displayOrder.slice();
    this.dropped = false;
    this.lockUntil = 0;
    card.addClass("cw-dragging");
    if (evt.dataTransfer) {
      evt.dataTransfer.effectAllowed = "move";
      evt.dataTransfer.setData("text/plain", this.dragPath ?? "");
    }
  }

  private onDragOver(evt: DragEvent): void {
    if (!this.dragPath) return;
    evt.preventDefault();
    if (Date.now() < this.lockUntil) return;
    const target = (evt.target as HTMLElement).closest<HTMLElement>(".cw-card");
    const targetPath = target?.dataset.path;
    if (!targetPath || targetPath === this.dragPath) return;
    const from = this.displayOrder.indexOf(this.dragPath);
    const to = this.displayOrder.indexOf(targetPath);
    if (from < 0 || to < 0) return;
    if (from < this.pinnedCount !== to < this.pinnedCount) return; // cards stay in their own group
    this.displayOrder = moveItem(this.displayOrder, from, to);
    this.lockUntil = Date.now() + SWAP_LOCK_MS;
    this.layoutAll();
  }

  private async onDragEnd(): Promise<void> {
    const path = this.dragPath;
    this.dragPath = null;
    this.mounted.get(path ?? "")?.el.removeClass("cw-dragging");
    if (!path) return;

    try {
      if (!this.dropped) {
        this.displayOrder = this.dragStartOrder;
        this.layoutAll();
        return;
      }
      const index = this.displayOrder.indexOf(path);
      const group = index < this.pinnedCount ? this.displayOrder.slice(0, this.pinnedCount) : this.displayOrder.slice(this.pinnedCount);
      const list = group.map((id) => ({ id, order: this.orders.get(id) ?? null }));
      await this.writeOrders(planWrites(list, path));
    } catch (err) {
      this.reportWriteError(err);
    } finally {
      this.finishWriting();
    }
  }

  private reportWriteError(err: unknown): void {
    console.error("Card Wall: could not save order", err);
    new Notice(t("notice.orderFailed"));
  }

  private finishWriting(): void {
    this.writing = false;
    if (this.pendingUpdate) {
      this.pendingUpdate = false;
      this.onDataUpdated();
    }
  }

  private async writeOrders(writes: Map<string, number>): Promise<void> {
    if (writes.size === 0) return;
    const property = this.orderProperty();
    const progress = writes.size > 1 ? new Notice(t("notice.writing", { property, done: 0, total: writes.size }), 0) : null;
    this.writing = true;
    let done = 0;
    try {
      for (const [id, value] of writes) {
        const item = this.items.get(id);
        if (!item) continue;
        const before = this.orders.get(id) ?? null;
        this.overrides.set(id, value);
        this.orders.set(id, value);
        try {
          await this.app.fileManager.processFrontMatter(item.file, (fm: Record<string, unknown>) => {
            fm[property] = value;
          });
        } catch (err) {
          this.overrides.delete(id);
          this.orders.set(id, before);
          throw err;
        }
        done++;
        if (progress && done % 100 === 0) {
          progress.setMessage(t("notice.writing", { property, done, total: writes.size }));
        }
      }
    } finally {
      progress?.hide();
    }
  }

  protected numberOption(key: string, fallback: number): number {
    const v = this.config.get(key);
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  }

}
