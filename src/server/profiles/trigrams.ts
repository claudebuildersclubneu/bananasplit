/**
 * Each term's trigrams as pg_trgm makes them (the word padded with two
 * spaces in front and one behind), flattened with the term's index. Pure.
 */
export function termTrigrams(terms: readonly string[]): { grams: string[]; gramTerms: number[] } {
  const grams: string[] = [];
  const gramTerms: number[] = [];
  terms.forEach((term, i) => {
    const words = term.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const seen = new Set<string>();
    for (const word of words) {
      const padded = `  ${word} `;
      for (let k = 0; k + 3 <= padded.length; k++) seen.add(padded.slice(k, k + 3));
    }
    for (const g of seen) {
      grams.push(g);
      gramTerms.push(i);
    }
  });
  return { grams, gramTerms };
}
