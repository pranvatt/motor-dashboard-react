// Placeholder thresholds for a 1 HP / 230V single-phase induction motor.
// Recalibrate these once you have real nameplate and sensor data.
export const PARAMS = [
  { key: "C",  name: "Current",     unit: "A",   nominal: 4.9,  warnLow: 3.0,  warnHigh: 6.5,  faultLow: 1.5,  faultHigh: 8.0,  decimals: 2, noise: 0.15 },
  { key: "V",  name: "Voltage",     unit: "V",   nominal: 230,  warnLow: 210,  warnHigh: 248,  faultLow: 195,  faultHigh: 265,  decimals: 1, noise: 1.6 },
  { key: "T",  name: "Temperature", unit: "°C",  nominal: 45,   warnLow: -99,  warnHigh: 65,   faultLow: -99,  faultHigh: 82,   decimals: 1, noise: 0.6 },
  { key: "VB", name: "Vibration",   unit: "g",   nominal: 0.03, warnLow: -99,  warnHigh: 0.12, faultLow: -99,  faultHigh: 0.2,  decimals: 3, noise: 0.006 },
  { key: "S",  name: "Speed",       unit: "RPM", nominal: 1440, warnLow: 1370, warnHigh: 1510, faultLow: 1300, faultHigh: 1560, decimals: 0, noise: 4 }
];

export const HISTORY_LEN = 120;
export const SPARK_LEN = 40;

export function statusFor(param, value) {
  if (value <= param.faultLow || value >= param.faultHigh) return "fault";
  if (value <= param.warnLow || value >= param.warnHigh) return "warn";
  return "ok";
}

export function paramByKey(key) {
  return PARAMS.find((p) => p.key === key);
}
