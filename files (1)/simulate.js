import { PARAMS } from "./params.js";

// Small mean-reverting random walk per parameter, so simulated readings
// look like a real (mostly steady) motor rather than pure noise.
export function createSimulator() {
  const walk = {};
  PARAMS.forEach((p) => {
    walk[p.key] = p.nominal;
  });
  let forcedFault = null; // { key, until }

  function triggerFault(key, durationMs = 6000) {
    forcedFault = { key, until: Date.now() + durationMs };
  }

  function tick() {
    const values = {};
    PARAMS.forEach((p) => {
      let target = p.nominal;
      if (forcedFault && forcedFault.key === p.key && Date.now() < forcedFault.until) {
        target = p.faultHigh + Math.abs(p.noise) * 3;
      }
      const drift = (target - walk[p.key]) * 0.15;
      const noise = (Math.random() - 0.5) * 2 * p.noise;
      walk[p.key] = walk[p.key] + drift + noise;
      values[p.key] = walk[p.key];
    });
    if (forcedFault && Date.now() >= forcedFault.until) forcedFault = null;
    return values;
  }

  return { tick, triggerFault };
}
