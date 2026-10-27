// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Rare blue power-up: slows every drone for a few seconds.
  powerUp: { spawnMinSeconds: 10, spawnMaxSeconds: 18, lifetimeSeconds: 6, slowSeconds: 5, slowFactor: 0.4 },
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a,
    powerUp: 0x4da3ff, slowedDrone: 0x9b8cff }
};
