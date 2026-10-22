# Manual testing

The logic that does not need Obsidian (order maths, layout, translations, text editing helpers) is covered by `npm test`. These checks need a real Obsidian 1.10 or later.

## Setup

1. `npm run build`, then copy or symlink `main.js`, `manifest.json` and `styles.css` into `<test vault>/.obsidian/plugins/card-wall/`.
2. Turn off restricted mode and enable **Card Wall**.
3. Make a folder of notes (a few hundred is fine, a few thousand is better for the speed checks) with headings, lists, task lines (`- [ ] …`), images and some long notes.
4. Create a Base filtered to that folder, add a view of type **Card Wall**, and sort by `order`, ascending.

After rebuilding, turn the plugin off and on in Settings → Community plugins, then reopen the Base tab.

## Cards

- [ ] Cards pack with no gaps; resizing the window re-flows the columns.
- [ ] A long note is cut with a fade and "Read more"; clicking the card opens the whole note.
- [ ] A note with an image settles to its final height after the image loads.
- [ ] Changing card width or max height in the view options re-cuts and re-packs the cards with no overlap.
- [ ] An empty Base shows the "No notes" message.
- [ ] Thousands of notes: opening the view and scrolling stay responsive; jumping far down shows cards at once.

## Order

- [ ] With no `order` on any note, a hint and **Set up order** appear and dragging does nothing.
- [ ] Pressing the button writes `order` 1..n to every note in the view and removes the hint.
- [ ] A drag then changes exactly one note (check file modification times).
- [ ] Dropping a card back where it was writes nothing.
- [ ] A new note without `order` sorts last; dragging another card does not rewrite it.
- [ ] Sorting the Base by something other than `order` shows the hint and disables dragging.

## Pin and color

- [ ] The pin button moves a card into the "Pinned" group and writes `pinned: true`; unpinning removes the line.
- [ ] Dragging works inside each group; dropping on the other group does nothing.
- [ ] The palette writes `color: <name>`; "No color" removes the line.
- [ ] Clicking outside the palette closes it without opening the card underneath; Escape closes it.
- [ ] Colors stay readable in light and dark themes.

## Groups

- [ ] Grouping the Base (Group menu, or `groupBy` in the `.base` file) gives each group a heading with its own packed cards.
- [ ] Notes without a value land in a "No value" group at the end.
- [ ] Pinned notes from every group appear together in "Pinned" on top.
- [ ] Dragging works inside a group and does nothing across groups.

## Tasks and editing

- [ ] Clicking a task checkbox on a card changes only that line and does not open the note.
- [ ] Tasks in nested lists, and in notes with frontmatter, change the right line.
- [ ] In the opened note, **Edit** shows the text box; typing saves after a moment; frontmatter and `order` are unchanged.
- [ ] Closing the window right after typing still saves.
- [ ] Japanese input (IME) works in the text box.

## Language

- [ ] With Obsidian set to Japanese the interface is Japanese; with English, or any other language, it is English.
