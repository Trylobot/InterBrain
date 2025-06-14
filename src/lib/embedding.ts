/** Tiny mock embedding: returns a deterministic pseudo‑vector so the plugin works offline. */
export async function embed(text: string): Promise<number[]> {
  const hash = Array.from(text).reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
  const vec = Array.from({ length: 128 }, (_, i) =>
    Math.sin((hash + i) * 0.123) * 0.5 + 0.5);
  return vec;
}
