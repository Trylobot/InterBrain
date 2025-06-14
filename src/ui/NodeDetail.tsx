import React from 'react';
import { DreamNode } from '../dreamModel';
import { App } from 'obsidian';

export default function NodeDetail({ node, onClose, app }:
  { node: DreamNode; onClose: () => void; app: App }) {
  return (
    <div style={{
      position: 'absolute', top: 20, right: 20, background: 'var(--background-secondary)',
      border: '1px solid var(--background-modifier-border)', padding: '8px',
      borderRadius: '6px', width: '240px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>{node.title}</strong>
        <a style={{ cursor: 'pointer' }} onClick={onClose}>×</a>
      </div>
      {node.talk && <img src={app.vault.getResourcePath(node.talk)} style={{ width: '100%', marginTop: '6px' }}/>}
      <p style={{ fontSize: '0.9em' }}>{node.isPerson ? 'Dreamer (person)' : 'Idea'}</p>
      <button onClick={() => {
        app.workspace.openLinkText(node.md.path, '', true);
        onClose();
      }}>Open Note</button>
    </div>
  );
}
