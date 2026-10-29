import { FuzzySuggestModal, type App } from "obsidian";
import { t } from "./t";

/** Type to filter the vault's folders and pick one; the vault root is "/". */
export class FolderPickModal extends FuzzySuggestModal<string> {
  constructor(
    app: App,
    private readonly folders: string[],
    private readonly onChoose: (folder: string) => void,
  ) {
    super(app);
    this.setPlaceholder(t("full.moveTo"));
  }

  getItems() {
    return this.folders;
  }

  getItemText(folder: string) {
    return folder === "/" ? t("full.root") : folder;
  }

  onChooseItem(folder: string) {
    this.onChoose(folder);
  }
}
