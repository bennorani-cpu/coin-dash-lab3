/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.glowing = [];
    this.drawBackground();
    this.makeGlowTextures();
    this.hud = this.add.text(18, 12, '', { font: 'bold 18px monospace', color: c.colors.hud })
      .setShadow(0, 0, c.colors.hudGlow, 8, true, true).setDepth(3);
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.styleNeon(this.player, 'neon-player', 0x061d2b, c.colors.player);
    this.styleNeon(this.coin, 'neon-coin', c.colors.coin, 0xfff8d6);
    this.tweens.add({ targets: this.coin.glow, alpha: 0.55, scale: 1.2, duration: 650, yoyo: true, repeat: -1 });
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      this.styleNeon(drone, 'neon-drone', 0x2a0626, c.colors.drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    // Glow sprites follow their physics objects after the physics step each frame.
    this.events.on('postupdate', this.syncGlows, this);
    this.events.once('shutdown', () => this.events.off('postupdate', this.syncGlows, this));
    this.syncGlows();
  }

  // Visual only: synthwave gradient sky, faint striped sun and a glowing 40px grid.
  drawBackground() {
    const c = COIN_DASH;
    const g = this.add.graphics().setDepth(0);
    const top = Phaser.Display.Color.ValueToColor(c.colors.background);
    const bottom = Phaser.Display.Color.ValueToColor(c.colors.backgroundBottom);
    const band = y => {
      const t = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, c.height, y);
      return Phaser.Display.Color.GetColor(t.r, t.g, t.b);
    };
    for (let y = 0; y < c.height; y += 10) g.fillStyle(band(y), 1).fillRect(0, y, c.width, 10);
    const sunY = c.height * 0.62;
    for (let r = 150; r > 0; r -= 30) g.fillStyle(c.colors.sun, 0.05).fillCircle(c.width / 2, sunY, r);
    for (let y = sunY + 10, h = 3; y < sunY + 150; y += 22, h += 2) {
      g.fillStyle(band(y), 0.85).fillRect(c.width / 2 - 160, y, 320, h);
    }
    for (let x = 0; x <= c.width; x += 40) {
      g.lineStyle(5, c.colors.grid, 0.06).lineBetween(x, 44, x, c.height);
      g.lineStyle(1, c.colors.grid, 0.3).lineBetween(x, 44, x, c.height);
    }
    for (let y = 80; y <= c.height; y += 40) {
      g.lineStyle(5, c.colors.grid, 0.06).lineBetween(0, y, c.width, y);
      g.lineStyle(1, c.colors.grid, 0.3).lineBetween(0, y, c.width, y);
    }
    g.fillStyle(0x07020f, 0.75).fillRect(0, 0, c.width, 44);
    g.lineStyle(6, c.colors.player, 0.15).lineBetween(0, 44, c.width, 44);
    g.lineStyle(2, c.colors.player, 0.9).lineBetween(0, 44, c.width, 44);
  }

  // Soft radial glow textures, generated once and reused across restarts.
  makeGlowTextures() {
    const c = COIN_DASH;
    const glows = { 'neon-player': [c.colors.player, 34], 'neon-coin': [c.colors.coin, 24],
      'neon-drone': [c.colors.drone, 36] };
    Object.entries(glows).forEach(([key, [color, radius]]) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      for (let r = radius; r > 4; r -= 2) g.fillStyle(color, 0.035).fillCircle(radius, radius, r);
      g.generateTexture(key, radius * 2, radius * 2);
      g.destroy();
    });
  }

  // Restyle a shape (fill + neon outline) and attach a glow sprite; physics body is untouched.
  styleNeon(shape, glowKey, fill, outline) {
    shape.setFillStyle(fill, 1).setStrokeStyle(2, outline, 1).setDepth(2);
    shape.glow = this.add.image(shape.x, shape.y, glowKey).setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.glowing.push(shape);
  }

  syncGlows() {
    this.glowing.forEach(shape => shape.glow.setPosition(shape.x, shape.y));
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x12021f, 0.92)
      .setStrokeStyle(2, c.colors.drone, 1).setDepth(4);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: 'bold 24px monospace', color: '#ffe9ff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5).setShadow(0, 0, '#ff2bd6', 12, true, true).setDepth(4);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
