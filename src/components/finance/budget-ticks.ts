/**
 * The budget lines' tick meters (Moonstone: one tick per real unit): a round
 * amount per tick, picked from the largest allocation so it gets at most
 * `maxTicks`, and used on every line, so lines read to scale.
 */
export function tickUnitCents(maxCents: number, maxTicks = 30): number {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 125, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  for (const dollars of steps) {
    if (maxCents / (dollars * 100) <= maxTicks) return dollars * 100;
  }
  return Math.ceil(maxCents / maxTicks / 100) * 100;
}
