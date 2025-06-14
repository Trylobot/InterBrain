import { App, Plugin, PluginManifest, WorkspaceLeaf } from 'obsidian';
import InterBrainView, { VIEW_TYPE } from './ui/InterBrainView';
import { registerInterBrainCommands } from './commands';
import { initDreamIndex, disposeDreamIndex } from './dreamModel';

export default class InterBrainPlugin extends Plugin {
  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
  }

  async onload() {
    await initDreamIndex(this.app);
    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) =>
      new InterBrainView(leaf, this)
    );
    this.addRibbonIcon('brain-circuit', 'Open InterBrain', () =>
      this.activateView()
    );
    registerInterBrainCommands(this);
    this.registerEvent(
      this.app.metadataCache.on('resolved', () => initDreamIndex(this.app))
    );
  }

  onunload() {
    disposeDreamIndex();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) leaf = workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    workspace.revealLeaf(leaf);
  }
}
