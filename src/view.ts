// view.ts
import { ItemView, WorkspaceLeaf, TFile, MarkdownView } from "obsidian";
import type { InterBrainSettings } from "./settings";

export const VIEW_TYPE_INTERBRAIN = "INTERBRAIN-VIEW";

export class InterBrainView extends ItemView {
  private settings: InterBrainSettings;

  constructor(leaf: WorkspaceLeaf, settings: InterBrainSettings) {
    super(leaf);
    this.settings = settings;
  }

  getViewType(): string {
    return VIEW_TYPE_INTERBRAIN;
  }

  getDisplayText(): string {
    return "InterBrain";
  }

  getIcon(): string {
    // Use a built-in icon (network graph icon) for the view tab
    return "dot-network";
  }

  async onOpen(): Promise<void> {
    // When the view opens, set up event listener to update on file changes
    this.registerEvent(
      // Use the 'file-open' event to update when active file changes:contentReference[oaicite:8]{index=8}
      this.app.workspace.on("file-open", (file: TFile | null) => {
        this.renderForFile(file);
      })
    );
    // Initial render for the currently active file (if any)
    this.renderForFile(this.app.workspace.getActiveFile());
  }

  onClose(): Promise<void> {
    // Nothing special to clean up (events are auto-unregistered on close)
    return Promise.resolve();
  }

  /** Render the InterBrain panel content for a given file (or show a message if null). */
  private async renderForFile(file: TFile | null) {
    const { contentEl } = this;
    contentEl.empty();  // Clear previous content

    if (!file) {
      contentEl.createEl("div", { text: "No note is open.", cls: "interbrain-none" });
      return;
    }

    // Display the header with the current note title
    const noteTitle = file.basename;
    contentEl.createEl("h3", { text: `InterBrain: ${noteTitle}` });

    // Gather forward (outgoing) links from this note
    const forwardLinks: Record<string, number> = this.app.metadataCache.resolvedLinks[file.path] || {};
    const forwardPaths = Object.keys(forwardLinks).filter(p => p);  // keys are target paths
    // Gather backlinks (incoming links) to this note (undocumented API):contentReference[oaicite:9]{index=9}
    let backPaths: string[] = [];
    const backlinks = (this.app.metadataCache as any).getBacklinksForFile(file);
    if (backlinks && backlinks.data) {
      backPaths = Object.keys(backlinks.data);
    }

    // Filter out non-markdown files from forward/back links to focus on notes
    const forwardNotePaths = forwardPaths.filter(path => path.endsWith(".md"));
    const backNotePaths = backPaths.filter(path => path.endsWith(".md"));

    // Remove self-references if any (a note linking to itself, uncommon)
    const currPath = file.path;
    const forwardSet = new Set(forwardNotePaths.filter(p => p !== currPath));
    const backSet = new Set(backNotePaths.filter(p => p !== currPath));
    const directLinkSet = new Set<string>([...forwardSet, ...backSet]);

    // ** Outgoing Links Section **
    const outgoingBody = this.addSection("Linked notes (outgoing)", contentEl);
    outgoingBody.createEl("h4", { text: "Linked notes (outgoing):" });
    if (forwardSet.size > 0) {
      const list = outgoingBody.createEl("ul");
      forwardSet.forEach(path => {
        const targetFile = this.app.vault.getAbstractFileByPath(path);
        if (targetFile && targetFile instanceof TFile && targetFile.extension === "md") {
          const item = list.createEl("li");
          const link = item.createEl("a", { text: targetFile.basename, href: "#" });
          link.onclick = (ev: MouseEvent) => {
            ev.preventDefault();
            this.openFile(targetFile as TFile);
          };
        }
      });
    } else {
      outgoingBody.createEl("div", { text: "None", cls: "interbrain-none" });
    }

    // ** Incoming Links Section **
    contentEl.createEl("h4", { text: "Linked from (backlinks):" });
    if (backSet.size > 0) {
      const list = contentEl.createEl("ul");
      backSet.forEach(path => {
        const srcFile = this.app.vault.getAbstractFileByPath(path);
        if (srcFile && srcFile instanceof TFile && srcFile.extension === "md") {
          const item = list.createEl("li");
          const link = item.createEl("a", { text: srcFile.basename, href: "#" });
          link.onclick = (ev: MouseEvent) => {
            ev.preventDefault();
            this.openFile(srcFile as TFile);
          };
        }
      });
    } else {
      contentEl.createEl("div", { text: "None", cls: "interbrain-none" });
    }

    // ** Suggestions Section ** (if enabled in settings)
    // Prepare a cap for suggestions
    const maxSuggest = this.settings.maxSuggestionsPerCategory;

    // (A) Tag-based suggestions
    if (this.settings.includeTagSuggestions) {
      contentEl.createEl("h4", { text: "Notes with Shared Tags:" });
      // Collect current note's tags (from frontmatter and in-body tags):contentReference[oaicite:10]{index=10}
      const thisCache = this.app.metadataCache.getFileCache(file);
      const currTags = new Set<string>();
      if (thisCache) {
        // Frontmatter tags
        const fmTags = thisCache.frontmatter?.tags;
        if (fmTags) {
          if (Array.isArray(fmTags)) {
            fmTags.forEach(tag => {
              if (typeof tag === "string") currTags.add(tag.replace(/^#/, "").toLowerCase());
            });
          } else if (typeof fmTags === "string") {
            fmTags.split(/[\s,]+/).forEach(tag => {
              if (tag) currTags.add(tag.replace(/^#/, "").toLowerCase());
            });
          }
        }
        // In-document #tags
        if (thisCache.tags) {
          thisCache.tags.forEach((t: any) => {
            if (t.tag) currTags.add(t.tag.replace(/^#/, "").toLowerCase());
          });
        }
      }
      if (currTags.size === 0) {
        // No tags in current note
        contentEl.createEl("div", { text: "None (no tags in this note)", cls: "interbrain-none" });
      } else {
        // Iterate all markdown files to find shared tags
        const tagSuggestions: { file: TFile, count: number }[] = [];
        const allNotes = this.app.vault.getMarkdownFiles();
        for (const otherFile of allNotes) {
          if (otherFile.path === currPath) continue;  // skip self
          // Skip if already directly linked (already in network)
          if (directLinkSet.has(otherFile.path)) continue;
          const otherCache = this.app.metadataCache.getFileCache(otherFile);
          if (!otherCache) continue;
          // Collect tags of the other file
          const otherTags = new Set<string>();
          const fmTags2 = otherCache.frontmatter?.tags;
          if (fmTags2) {
            if (Array.isArray(fmTags2)) {
              fmTags2.forEach((tag: any) => {
                if (typeof tag === "string") otherTags.add(tag.replace(/^#/, "").toLowerCase());
              });
            } else if (typeof fmTags2 === "string") {
              fmTags2.split(/[\s,]+/).forEach(tag => {
                if (tag) otherTags.add(tag.replace(/^#/, "").toLowerCase());
              });
            }
          }
          if (otherCache.tags) {
            otherCache.tags.forEach((t: any) => {
              if (t.tag) otherTags.add(t.tag.replace(/^#/, "").toLowerCase());
            });
          }
          // Count common tags
          let commonCount = 0;
          currTags.forEach(tag => {
            if (otherTags.has(tag)) commonCount++;
          });
          if (commonCount > 0) {
            tagSuggestions.push({ file: otherFile, count: commonCount });
          }
        }
        if (tagSuggestions.length === 0) {
          contentEl.createEl("div", { text: "None", cls: "interbrain-none" });
        } else {
          // Sort suggestions by number of common tags (descending), then alphabetically
          tagSuggestions.sort((a, b) => b.count - a.count || a.file.basename.localeCompare(b.file.basename));
          const list = contentEl.createEl("ul");
          for (let i = 0; i < tagSuggestions.length && i < maxSuggest; i++) {
            const { file: sugFile, count } = tagSuggestions[i];
            const item = list.createEl("li");
            const link = item.createEl("a", { text: sugFile.basename, href: "#" });
            // Tooltip shows how many tags in common
            link.setAttr("title", `Shares ${count} tag(s) in common`);
            link.onclick = (ev: MouseEvent) => {
              ev.preventDefault();
              this.openFile(sugFile);
            };
            if (this.settings.enableQuickLinkButtons) {
              this.addQuickLinkIcon(item, sugFile.basename);
            }
          }
          if (tagSuggestions.length > maxSuggest) {
            list.createEl("li", { text: `…and ${tagSuggestions.length - maxSuggest} more`, cls: "interbrain-more" });
          }
        }
      }
    }

    // (B) Unlinked mention suggestions
    if (this.settings.includeMentionSuggestions) {
      contentEl.createEl("h4", { text: `Notes mentioning "${noteTitle}":` });
      const titleLower = noteTitle.toLowerCase();
      const mentionSuggestions: { file: TFile, count: number }[] = [];
      const allNotes = this.app.vault.getMarkdownFiles();
      for (const otherFile of allNotes) {
        if (otherFile.path === currPath) continue;
        if (directLinkSet.has(otherFile.path)) continue;
        // Read the file content (cached read)
        const text = await this.app.vault.cachedRead(otherFile);
        if (!text) continue;
        const textLower = text.toLowerCase();
        // Skip if the current note is already linked in this file (presence of a wiki-link)
        // e.g., if "[[NoteTitle]]" exists, then it's not an unlinked mention
        if (textLower.includes("[[" + titleLower)) {
          continue;
        }
        // Check for raw title occurrences in text (word-boundary search)
        const regex = new RegExp(`\\b${this.escapeRegExp(noteTitle)}\\b`, "gi");
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          mentionSuggestions.push({ file: otherFile, count: matches.length });
        }
      }
      if (mentionSuggestions.length === 0) {
        contentEl.createEl("div", { text: "None", cls: "interbrain-none" });
      } else {
        // Sort by frequency of mention (descending), then name
        mentionSuggestions.sort((a, b) => b.count - a.count || a.file.basename.localeCompare(b.file.basename));
        const list = contentEl.createEl("ul");
        for (let i = 0; i < mentionSuggestions.length && i < maxSuggest; i++) {
          const { file: sugFile, count } = mentionSuggestions[i];
          const item = list.createEl("li");
          const link = item.createEl("a", { text: sugFile.basename, href: "#" });
          link.setAttr("title", `Mentions "${noteTitle}" ${count} time(s)`);
          link.onclick = (ev: MouseEvent) => {
            ev.preventDefault();
            this.openFile(sugFile);
          };
          if (this.settings.enableQuickLinkButtons) {
            this.addQuickLinkIcon(item, sugFile.basename);
          }
        }
        if (mentionSuggestions.length > maxSuggest) {
          list.createEl("li", { text: `…and ${mentionSuggestions.length - maxSuggest} more`, cls: "interbrain-more" });
        }
      }
    }

    // (C) Mutual connection ("sibling") suggestions
    if (this.settings.includeSiblingSuggestions) {
      contentEl.createEl("h4", { text: "Notes with Mutual Connections:" });
      const siblingMap: Record<string, number> = {};
      // Siblings via common parent (share an incoming link)
      backSet.forEach(parentPath => {
        // For each note that links to current, get its outgoing links
        const outMap: Record<string, number> = this.app.metadataCache.resolvedLinks[parentPath] || {};
        for (const targetPath in outMap) {
          if (!targetPath.endsWith(".md")) continue;
          if (targetPath === currPath) continue;
          if (directLinkSet.has(targetPath)) continue;
          siblingMap[targetPath] = (siblingMap[targetPath] || 0) + 1;
        }
      });
      // Siblings via common child (share an outgoing link)
      forwardSet.forEach(childPath => {
        const childFile = this.app.vault.getAbstractFileByPath(childPath);
        if (!childFile || !(childFile instanceof TFile)) return;
        const childBacklinks = (this.app.metadataCache as any).getBacklinksForFile(childFile);
        if (childBacklinks && childBacklinks.data) {
          for (const parentPath in childBacklinks.data) {
            if (!parentPath.endsWith(".md")) continue;
            if (parentPath === currPath) continue;
            if (directLinkSet.has(parentPath)) continue;
            siblingMap[parentPath] = (siblingMap[parentPath] || 0) + 1;
          }
        }
      });
      const siblingSuggestions: { file: TFile, count: number }[] = [];
      for (const path in siblingMap) {
        const count = siblingMap[path];
        const fileObj = this.app.vault.getAbstractFileByPath(path);
        if (fileObj && fileObj instanceof TFile && fileObj.extension === "md") {
          siblingSuggestions.push({ file: fileObj, count });
        }
      }
      if (siblingSuggestions.length === 0) {
        contentEl.createEl("div", { text: "None", cls: "interbrain-none" });
      } else {
        // Sort by number of mutual connections (desc), then name
        siblingSuggestions.sort((a, b) => b.count - a.count || a.file.basename.localeCompare(b.file.basename));
        const list = contentEl.createEl("ul");
        for (let i = 0; i < siblingSuggestions.length && i < maxSuggest; i++) {
          const { file: sugFile, count } = siblingSuggestions[i];
          const item = list.createEl("li");
          const link = item.createEl("a", { text: sugFile.basename, href: "#" });
          link.setAttr("title", `Shares ${count} mutual connection(s)`);
          link.onclick = (ev: MouseEvent) => {
            ev.preventDefault();
            this.openFile(sugFile);
          };
          if (this.settings.enableQuickLinkButtons) {
            this.addQuickLinkIcon(item, sugFile.basename);
          }
        }
        if (siblingSuggestions.length > maxSuggest) {
          list.createEl("li", { text: `…and ${siblingSuggestions.length - maxSuggest} more`, cls: "interbrain-more" });
        }
      }
    }

  }

  // 1) Collapsible sections helper
  private addSection(header: string, container: HTMLElement): HTMLElement {
    const wrap = container.createEl("div", { cls: "interbrain-section" });
    const h = wrap.createEl("h4", { text: header, cls: "interbrain-h4" });
    const body = wrap.createEl("div", { cls: "interbrain-body" });

    h.onclick = () => body.toggleClass("is-collapsed");
    return body;
  }

  /** Open a file in the main workspace (without affecting the InterBrain view) */
  private openFile(file: TFile) {
    // Open the given file in a new tab (or existing leaf if available)
    this.app.workspace.getLeaf(true).openFile(file);
  }

  /** Escape RegExp special characters in a string (for safe regex building) */
  private escapeRegExp(str: string): string {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  /** Create a clickable ➕ icon that inserts a wikilink to the given file */
  private addQuickLinkIcon(item: HTMLElement, fileBasename: string) {
    const plus = item.createEl("span", {
      cls: "interbrain-plus",
      text: " ➕",
    });
    plus.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.insertLinkTo(fileBasename);
    };
  }

  private insertLinkTo(linkTarget: string) {
    const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    const linkText = `[[${linkTarget}]]`;
    if (editor) {
      editor.replaceSelection(linkText);
    } else {
      const file = this.app.workspace.getActiveFile();
      if (file) this.app.vault.append(file, `\n${linkText}`);
    }
  }
}

