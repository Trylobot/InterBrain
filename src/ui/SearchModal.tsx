import { App, Modal } from 'obsidian';
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getAllNodes } from '../dreamModel';
import { embed } from '../lib/embedding';

export default class SearchModal extends Modal {
  root: ReactDOM.Root;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    this.titleEl.setText('Semantic Search');
    this.root = ReactDOM.createRoot(this.contentEl);
    this.root.render(<SearchBody app={this.app} close={() => this.close()}/>);
  }

  onClose() {
    this.root.unmount();
  }
}

function SearchBody({ app, close }: { app: App; close: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  async function run() {
    if (!query) return;
    const qVec = await embed(query);
    const scored = [];
    for (const n of getAllNodes()) {
      const text = await app.vault.read(n.md);
      const v = await embed(text.slice(0, 512));
      const score = dot(qVec, v);
      scored.push({ node: n, score });
    }
    scored.sort((a, b) => b.score - a.score);
    setResults(scored.slice(0, 15));
  }

  function dot(a: number[], b: number[]) {
    return a.reduce((s, x, i) => s + x * b[i], 0);
  }

  return (
    <div style={{ padding: '8px' }}>
      <input
        type="text"
        value={query}
        placeholder="Search..."
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') run(); }}
        style={{ width: '100%' }}
      />
      <div style={{ marginTop: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
        {results.map(r => (
          <div
            key={r.node.id}
            style={{ padding: '4px', cursor: 'pointer' }}
            onClick={() => {
              app.workspace.openLinkText(r.node.md.path, '', true);
              close();
            }}
          >
            {r.node.title}  <span style={{ opacity: 0.6 }}>{r.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
