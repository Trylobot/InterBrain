import { Plugin, Notice } from 'obsidian';
import { createDream, getNode } from './dreamModel';
import SearchModal from './ui/SearchModal';
import { openInGitClient } from './lib/git';

export function registerInterBrainCommands(plugin: Plugin) {
  plugin.addCommand({
    id: 'ib-open',
    name: 'Open InterBrain View',
    callback: () => (plugin as any).activateView()
  });

  plugin.addCommand({
    id: 'ib-new-dream',
    name: 'Create New Dream',
    callback: async () => {
      const title = window.prompt('New Dream title:');
      if (!title) return;
      const node = await createDream(plugin.app, title);
      await plugin.app.workspace.openLinkText(node.md.path, '', true);
    }
  });

  plugin.addCommand({
    id: 'ib-semantic-search',
    name: 'Semantic Search Dreams',
    callback: () => new SearchModal(plugin.app).open()
  });

  plugin.addCommand({
    id: 'ib-open-git',
    name: 'Open Current Dream in Git Client',
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      if (!file) return false;
      const id = file.path.split('/').slice(-2, -1)[0];
      const node = getNode(id);
      if (!node) return false;
      if (checking) return true;
      openInGitClient(node.path);
    }
  });
}
