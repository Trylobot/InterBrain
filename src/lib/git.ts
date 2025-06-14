import { Notice } from 'obsidian';
import { exec } from 'child_process';

export function openInGitClient(path: string) {
  exec(`open "${path}"`, (err) => {
    if (err) new Notice('Failed to open path.');
  });
}
