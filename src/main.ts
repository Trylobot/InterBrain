// main.ts
import { App, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from "obsidian";
import { InterBrainSettingTab, InterBrainSettings, DEFAULT_SETTINGS } from "./settings";
import { InterBrainView, VIEW_TYPE_INTERBRAIN } from "./view";
import { TagIndex } from "./tag-index";


export default class InterBrainPlugin extends Plugin {
  settings!: InterBrainSettings;
  tagIndex: TagIndex | null = null;

  async onload() {
    console.log("Loading InterBrain plugin...");
    // Load settings or fallback to default
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Register the custom view (ItemView) for the InterBrain panel
    this.registerView(
      VIEW_TYPE_INTERBRAIN,
      (leaf: WorkspaceLeaf) => new InterBrainView(leaf, this.settings)  // pass settings to the view
    );

    // Add a ribbon icon to toggle the InterBrain panel (uses a network/graph icon)
    const ribbonIconEl = this.addRibbonIcon("dot-network", "Open InterBrain Panel", () => {
      this.activateView();
    });
    // Optionally, add CSS class for styling or active state if needed
    ribbonIconEl.addClass("interbrain-ribbon-icon");

    // Add command to command palette to open the InterBrain panel
    this.addCommand({
      id: "open-interbrain-panel",
      name: "Open InterBrain Panel",
      callback: () => this.activateView()
    });

    // Add the settings tab in Obsidian settings
    this.addSettingTab(new InterBrainSettingTab(this.app, this));

    if (this.settings.enableTagIndex)
      this.tagIndex = new TagIndex(this.app);

    // 🆕 Batch Link Wizard command
    this.addCommand({
      id: "batch-link-wizard",
      name: "InterBrain: Batch Link Wizard (current note)",
      callback: () => this.batchLinkWizard()
    });
  }

  onunload() {
    console.log("Unloading InterBrain plugin...");
    // Detach any open InterBrain views to clean up
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_INTERBRAIN);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  /** Open (or reveal) the InterBrain view in the right sidebar */
  async activateView() {
    // Close existing leaves of this view type (to avoid duplicates)
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_INTERBRAIN);

    // Create a new leaf in the right sidebar (if false, reuses an existing leaf if possible)
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_INTERBRAIN, active: true });
    // Ensure the new leaf is visible to the user
    this.app.workspace.revealLeaf(leaf);
  }

  async batchLinkWizard() {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;
    const title = file.basename;
    const notes = this.app.vault.getMarkdownFiles();
    let total = 0, changed = 0;

    for (const note of notes) {
      if (note === file) continue;
      const text = await this.app.vault.cachedRead(note);
      // skip if already linked
      if (text.includes(`[[${title}]]`)) continue;
      const regex = new RegExp(`\\b${this.escape(title)}\\b`, "g");
      if (regex.test(text)) {
        total++;
        if (this.settings.batchWizardWrite) {
          const newText = text.replace(regex, `[[${title}]]`);
          await this.app.vault.modify(note, newText);
          changed++;
        }
      }
    }
    new Notice(
      this.settings.batchWizardWrite
        ? `Batch Link Wizard: converted ${changed}/${total} notes.`
        : `Batch Link Wizard: ${total} notes would be changed (preview mode).`
    );
  }

  private escape(s: string) { return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); }
}
