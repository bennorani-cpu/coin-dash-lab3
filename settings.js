// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  lives: 3,
  hitInvincibleMs: 1500,
  // Rare blue power-up: slows every drone for a few seconds.
  powerUp: { spawnMinSeconds: 10, spawnMaxSeconds: 18, lifetimeSeconds: 6, slowSeconds: 5, slowFactor: 0.4 },
  // Neon / synthwave palette: purely visual, no gameplay values live here.
  colors: {
    background: 0x12052a, backgroundBottom: 0x3a0a4a, grid: 0xff3cc7, sun: 0xff8a3d,
    player: 0x22f3ff, coin: 0xffe14d, drone: 0xff2bd6, hud: '#9ffcff', hudGlow: '#22f3ff',
    powerUp: 0x4da3ff, slowedDrone: 0x9b8cff
  }
};
