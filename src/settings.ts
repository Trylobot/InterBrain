// settings.ts
import { App, PluginSettingTab, Setting } from "obsidian";
import type InterBrainPlugin from "./main";  // import the plugin class for type reference

// Define the settings structure
export interface InterBrainSettings {
  includeTagSuggestions: boolean;
  includeMentionSuggestions: boolean;
  includeSiblingSuggestions: boolean;
  maxSuggestionsPerCategory: number;
  /** NEW 0.3.0 */
  enableQuickLinkButtons: boolean;
  enableTagIndex: boolean;
  batchWizardWrite: boolean;   // true=write links, false=preview only
}

// Default settings values
export const DEFAULT_SETTINGS: InterBrainSettings = {
  includeTagSuggestions: true,
  includeMentionSuggestions: true,
  includeSiblingSuggestions: true,
  maxSuggestionsPerCategory: 5,

  enableQuickLinkButtons: true,
  enableTagIndex: true,
  batchWizardWrite: false,  
};

export class InterBrainSettingTab extends PluginSettingTab {
  plugin: InterBrainPlugin;

  constructor(app: App, plugin: InterBrainPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h3", { text: "InterBrain Plugin Settings" });

    // Toggle: Include Tag-Based Suggestions
    new Setting(containerEl)
      .setName("Include Tag Suggestions")
      .setDesc("Suggest notes that share tags with the current note.")
      .addToggle(toggle => 
        toggle
          .setValue(this.plugin.settings.includeTagSuggestions)
          .onChange(value => {
            this.plugin.settings.includeTagSuggestions = value;
            this.plugin.saveSettings();
          }));

    // Toggle: Include Unlinked Mention Suggestions
    new Setting(containerEl)
      .setName("Include Unlinked Mentions")
      .setDesc("Suggest notes where the current note's title appears in text but is not linked.")
      .addToggle(toggle => 
        toggle
          .setValue(this.plugin.settings.includeMentionSuggestions)
          .onChange(value => {
            this.plugin.settings.includeMentionSuggestions = value;
            this.plugin.saveSettings();
          }));

    // Toggle: Include "Sibling" Suggestions (common links)
    new Setting(containerEl)
      .setName("Include Mutual Link Suggestions")
      .setDesc("Suggest notes that share a common link or backlink with the current note.")
      .addToggle(toggle => 
        toggle
          .setValue(this.plugin.settings.includeSiblingSuggestions)
          .onChange(value => {
            this.plugin.settings.includeSiblingSuggestions = value;
            this.plugin.saveSettings();
          }));

    // Slider: Maximum suggestions per category
    new Setting(containerEl)
      .setName("Max Suggestions per Category")
      .setDesc("Limit the number of suggestions shown for each category of related notes.")
      .addSlider(slider => {
        slider.setLimits(1, 20, 1)
          .setValue(this.plugin.settings.maxSuggestionsPerCategory)
          .setDynamicTooltip()  // shows the numeric value while sliding
          .onChange(value => {
            this.plugin.settings.maxSuggestionsPerCategory = value;
            this.plugin.saveSettings();
          });
      });

    // In SettingTab.display(): add three more controls
    new Setting(containerEl)
      .setName("Enable Quick‑Link buttons")
      .setDesc("Show a ➕ icon next to each suggestion to insert the link into the current editor.")
      .addToggle(t => t.setValue(this.plugin.settings.enableQuickLinkButtons)
        .onChange(v => { this.plugin.settings.enableQuickLinkButtons = v; this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Enable Tag Indexing")
      .setDesc("Maintain a live in‑memory tag map for faster tag suggestions (uses more RAM but faster).")
      .addToggle(t => t.setValue(this.plugin.settings.enableTagIndex)
        .onChange(v => { this.plugin.settings.enableTagIndex = v; this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Batch Link Wizard ‑ write changes")
      .setDesc("If ON, the wizard will write links; if OFF, it only shows a preview count.")
      .addToggle(t => t.setValue(this.plugin.settings.batchWizardWrite)
        .onChange(v => { this.plugin.settings.batchWizardWrite = v; this.plugin.saveSettings(); }));

    
  }
}
