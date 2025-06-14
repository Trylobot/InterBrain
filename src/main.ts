// main.ts
import { App, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from "obsidian";
import { InterBrainSettingTab, InterBrainSettings, DEFAULT_SETTINGS } from "./settings";
import { InterBrainView, VIEW_TYPE_INTERBRAIN } from "./view";

export default class InterBrainPlugin extends Plugin {
  settings: InterBrainSettings;

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
}
