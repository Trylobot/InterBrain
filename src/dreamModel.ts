import { App, TFile, TFolder, normalizePath } from 'obsidian';

export interface DreamNode {
  id: string;
  path: string;
  title: string;
  isPerson: boolean;
  md: TFile;
  talk?: TFile;
  links: Set<string>;
}

const DREAM_ROOT = 'InterBrain';
const NODES: Map<string, DreamNode> = new Map();

export async function initDreamIndex(app: App) {
  NODES.clear();
  let root = app.vault.getAbstractFileByPath(DREAM_ROOT) as TFolder | null;
  if (!root) root = await app.vault.createFolder(DREAM_ROOT);
  for (const child of root.children) {
    if (child instanceof TFolder) {
      const id = child.name;
      const md = child.children.find(
        f => f instanceof TFile && f.extension === 'md'
      ) as TFile;
      if (!md) continue;
      const meta = app.metadataCache.getFileCache(md);
      const front = meta?.frontmatter ?? {};
      const isPerson = front.dreamType === 'person';
      const talk = child.children.find(
        f => f instanceof TFile && /png|jpe?g/i.test(f.extension)
      ) as TFile | undefined;
      const node: DreamNode = {
        id,
        path: child.path,
        title: front.title ?? id,
        isPerson,
        md,
        talk,
        links: new Set()
      };
      NODES.set(id, node);
    }
  }
  for (const node of NODES.values()) {
    const meta = app.metadataCache.getFileCache(node.md);
    meta?.links?.forEach(l => {
      const id = l.link.split('/').first();
      if (id && NODES.has(id)) node.links.add(id);
    });
  }
}

export function disposeDreamIndex() {
  NODES.clear();
}

export function getAllNodes() {
  return [...NODES.values()];
}

export function getNode(id: string) {
  return NODES.get(id);
}

export async function createDream(
  app: App,
  title: string,
  isPerson = false,
  talkData?: ArrayBuffer
): Promise<DreamNode> {
  const id = title.slugify();
  const folderPath = normalizePath(`${DREAM_ROOT}/${id}`);
  await app.vault.createFolder(folderPath);
  const md = await app.vault.create(
    `${folderPath}/index.md`,
    `---\ntitle: ${title}\ndreamType: ${isPerson ? 'person' : 'idea'}\n---\n`
  );
  let talk: TFile | undefined;
  if (talkData) {
    talk = await app.vault.createBinary(`${folderPath}/talk.png`, talkData);
  }
  const node: DreamNode = {
    id,
    path: folderPath,
    title,
    isPerson,
    md,
    talk,
    links: new Set()
  };
  NODES.set(id, node);
  return node;
}
