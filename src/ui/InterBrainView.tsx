import { ItemView, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom/client';
import GraphPanel from './GraphPanel';
import InterBrainPlugin from '../main';

export const VIEW_TYPE = 'interbrain-view';

export default class InterBrainView extends ItemView {
  plugin: InterBrainPlugin;
  root: ReactDOM.Root;

  constructor(leaf: WorkspaceLeaf, plugin: InterBrainPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'InterBrain'; }
  getIcon() { return 'brain-circuit'; }

  async onOpen() {
    this.root = ReactDOM.createRoot(this.containerEl.children[1] as HTMLElement);
    this.root.render(<GraphPanel plugin={this.plugin} />);
  }

  async onClose() {
    this.root.unmount();
  }
}
