export type Locale = "en" | "ja";

const en = {
  "card.pin": "Pin",
  "card.color": "Color",
  "card.more": "… Read more",

  "full.edit": "Edit",
  "full.openNote": "Open note",
  "full.done": "Done",
  "full.autosave": "Changes are saved automatically",
  "full.saving": "Saving…",
  "full.saved": "Saved",
  "full.saveFailed": "Could not save",

  "wall.empty": "No notes in this Base.",
  "section.pinned": "Pinned",
  "section.others": "Notes",

  "hint.needSort": "Reordering works only when the Base is sorted by “{property}” ascending.",
  "hint.init": "To start reordering, “{property}” will be written to {count} notes.",
  "hint.initButton": "Set up order",

  "notice.orderFailed": "Card Wall: could not save the order. See the developer console.",
  "notice.pinFailed": "Card Wall: could not save the pin. See the developer console.",
  "notice.colorFailed": "Card Wall: could not save the color. See the developer console.",
  "notice.writing": "Card Wall: writing “{property}” {done} / {total}",

  "color.none": "No color",
  "color.red": "Red",
  "color.orange": "Orange",
  "color.yellow": "Yellow",
  "color.green": "Green",
  "color.teal": "Teal",
  "color.blue": "Blue",
  "color.purple": "Purple",
  "color.pink": "Pink",
  "color.gray": "Gray",

  "option.order": "Order property",
  "option.pinned": "Pinned property",
  "option.color": "Color property",
  "option.width": "Card width",
  "option.maxHeight": "Card max height",
} as const;

export type MessageKey = keyof typeof en;

const ja: Record<MessageKey, string> = {
  "card.pin": "ピン留め",
  "card.color": "色",
  "card.more": "… 続きを開く",

  "full.edit": "編集",
  "full.openNote": "ノートを開く",
  "full.done": "完了",
  "full.autosave": "自動で保存されます",
  "full.saving": "保存中…",
  "full.saved": "保存しました",
  "full.saveFailed": "保存できませんでした",

  "wall.empty": "この Base にノートがありません。",
  "section.pinned": "ピン留め",
  "section.others": "ノート",

  "hint.needSort": "並べ替えは、Base の並べ替えを「{property}」の昇順にしたときだけできます。",
  "hint.init": "並べ替えを始めるには、{count} 件のノートに「{property}」を書き込みます。",
  "hint.initButton": "順序を初期化",

  "notice.orderFailed": "Card Wall: 並び順を保存できませんでした。コンソールを確認してください。",
  "notice.pinFailed": "Card Wall: ピン留めを保存できませんでした。コンソールを確認してください。",
  "notice.colorFailed": "Card Wall: 色を保存できませんでした。コンソールを確認してください。",
  "notice.writing": "Card Wall: 「{property}」を書き込み中 {done} / {total}",

  "color.none": "色なし",
  "color.red": "赤",
  "color.orange": "橙",
  "color.yellow": "黄",
  "color.green": "緑",
  "color.teal": "青緑",
  "color.blue": "青",
  "color.purple": "紫",
  "color.pink": "ピンク",
  "color.gray": "灰",

  "option.order": "並び順のプロパティ",
  "option.pinned": "ピン留めのプロパティ",
  "option.color": "色のプロパティ",
  "option.width": "カードの幅",
  "option.maxHeight": "カードの最大の高さ",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, ja };

/** Obsidian's language code ("ja", "en", "zh-TW" …) to a language we have text for. */
export function pickLocale(language: string | null | undefined): Locale {
  return /^ja(\b|-|_|$)/i.test(language ?? "") ? "ja" : "en";
}

export function translate(locale: Locale, key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[locale][key].replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}
