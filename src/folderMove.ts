const ROOT = "/";

/** Path of a file called `name` once moved into `folder` ("/" is the vault root). */
export function targetPath(folder: string, name: string): string {
  return folder === ROOT ? name : `${folder}/${name}`;
}

/** Folders a note can be moved to: every folder but the one it is in, sorted by name. */
export function foldersToOffer(all: string[], current: string): string[] {
  return all.filter((f) => f !== current).sort((a, b) => a.localeCompare(b));
}
