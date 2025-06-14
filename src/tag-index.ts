// tag-index.ts
import { App, TFile } from "obsidian";

export class TagIndex {
  private app: App;
  private map: Map<string, Set<TFile>> = new Map();

  constructor(app: App) {
    this.app = app;
    this.rebuild();
    // live updates
    this.app.metadataCache.on("changed", (_file) => this.updateFile(_file));
  }

  /** Return Set of notes that carry any of the supplied tags (lower‑case, no '#'). */
  matchAny(tags: Set<string>): Set<TFile> {
    const out = new Set<TFile>();
    tags.forEach(t => {
      const set = this.map.get(t);
      if (set) set.forEach(f => out.add(f));
    });
    return out;
  }

  // -------- private helpers --------
  private rebuild() {
    this.map.clear();
    this.app.vault.getMarkdownFiles().forEach(f => this.indexFile(f));
  }
  private updateFile(file: TFile) {
    if (file.extension !== "md") return;
    // remove old tags
    this.map.forEach(set => set.delete(file));
    // add new
    this.indexFile(file);
  }
  private indexFile(file: TFile) {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return;
    const tags = new Set<string>();
    cache.tags?.forEach(t => tags.add(t.tag.replace(/^#/, "").toLowerCase()));
    const fmTags = cache.frontmatter?.tags;
    if (fmTags) {
      (Array.isArray(fmTags) ? fmTags : String(fmTags).split(/[\s,]+/))
        .forEach((t: string) => tags.add(t.replace(/^#/, "").toLowerCase()));
    }
    tags.forEach(tag => {
      if (!this.map.has(tag)) this.map.set(tag, new Set());
      this.map.get(tag)!.add(file);
    });
  }
}
