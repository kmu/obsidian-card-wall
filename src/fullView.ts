import { App, ButtonComponent, Component, MarkdownRenderer, Modal, TFile } from "obsidian";
import { enableTasks, readBody, toggleTaskFromClick } from "./card";
import { replaceBody, splitFrontmatter } from "./edit";
import { t } from "./t";

const SAVE_DELAY_MS = 600;

class FullViewModal extends Modal {
  private component = new Component();
  private bodyEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private editor: HTMLTextAreaElement | null = null;
  private saveTimer: number | null = null;
  private dirty = false;

  constructor(app: App, private file: TFile) {
    super(app);
  }

  async onOpen() {
    const { contentEl } = this;
    this.component.load();
    contentEl.addClass("cw-full");
    this.setTitle(this.file.basename);
    this.bodyEl = contentEl.createDiv({ cls: "cw-full-body markdown-rendered" });
    this.actionsEl = contentEl.createDiv({ cls: "cw-full-actions" });

    this.bodyEl.addEventListener("click", (evt) => {
      if (this.editor) return;
      if (toggleTaskFromClick(this.app, this.file, this.bodyEl, evt.target)) return;
      const link = (evt.target as HTMLElement).closest<HTMLAnchorElement>("a.internal-link");
      if (!link) return;
      evt.preventDefault();
      const href = link.getAttribute("data-href") ?? link.getAttribute("href");
      if (href) {
        void this.app.workspace.openLinkText(href, this.file.path);
        this.close();
      }
    });

    await this.showRendered();
  }

  private buttons(...specs: { text: string; cta?: boolean; run: () => void }[]) {
    this.actionsEl.empty();
    this.statusEl = this.actionsEl.createSpan({ cls: "cw-save-status" });
    for (const spec of specs) {
      const button = new ButtonComponent(this.actionsEl).setButtonText(spec.text).onClick(spec.run);
      if (spec.cta) button.setCta();
    }
  }

  private async showRendered() {
    this.editor = null;
    this.bodyEl.empty();
    await MarkdownRenderer.render(this.app, await readBody(this.app, this.file), this.bodyEl, this.file.path, this.component);
    enableTasks(this.bodyEl);
    this.buttons(
      { text: t("full.edit"), run: () => void this.showEditor() },
      {
        text: t("full.openNote"),
        cta: true,
        run: () => {
          void this.app.workspace.getLeaf().openFile(this.file);
          this.close();
        },
      },
    );
  }

  private async showEditor() {
    const { body } = splitFrontmatter(await this.app.vault.read(this.file));
    this.bodyEl.empty();
    const editor = this.bodyEl.createEl("textarea", { cls: "cw-editor" });
    editor.value = body;
    editor.addEventListener("input", () => this.queueSave());
    this.editor = editor;
    this.buttons({
      text: t("full.done"),
      cta: true,
      run: () => {
        void this.flush().then(() => this.showRendered());
      },
    });
    this.statusEl.setText(t("full.autosave"));
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }

  private queueSave() {
    this.dirty = true;
    this.statusEl.setText(t("full.saving"));
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.flush(), SAVE_DELAY_MS);
  }

  private async flush(): Promise<void> {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const editor = this.editor;
    if (!editor || !this.dirty) return;
    this.dirty = false;
    const text = editor.value;
    try {
      await this.app.vault.process(this.file, (data) => replaceBody(data, text));
      this.statusEl?.setText(t("full.saved"));
    } catch (err) {
      this.dirty = true;
      console.error("Card Wall: could not save note", err);
      this.statusEl?.setText(t("full.saveFailed"));
    }
  }

  onClose() {
    void this.flush();
    this.component.unload();
    this.contentEl.empty();
  }
}

export function openFullView(app: App, file: TFile): void {
  new FullViewModal(app, file).open();
}
