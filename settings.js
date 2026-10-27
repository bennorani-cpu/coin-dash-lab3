// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Neon / synthwave palette: purely visual, no gameplay values live here.
  colors: {
    background: 0x12052a, backgroundBottom: 0x3a0a4a, grid: 0xff3cc7, sun: 0xff8a3d,
    player: 0x22f3ff, coin: 0xffe14d, drone: 0xff2bd6, hud: '#9ffcff', hudGlow: '#22f3ff'
  }
};
