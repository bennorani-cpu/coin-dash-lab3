/* global Phaser, COIN_DASH */
const HIGH_SCORE_KEY = 'coinDash.highScore';

// localStorage can throw (blocked storage, some file:// setups), so fall back to 0 / no-op.
function loadHighScore() {
  try {
    const value = Number.parseInt(window.localStorage.getItem(HIGH_SCORE_KEY), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (e) { return 0; }
}

function saveHighScore(value) {
  try { window.localStorage.setItem(HIGH_SCORE_KEY, String(value)); } catch (e) { /* ignore */ }
}

// Visual only: synthwave gradient sky, faint striped sun and a glowing 40px grid.
// Shared by the start screen and the game; returns the graphics so callers can draw more.
function drawNeonBackground(scene) {
  const c = COIN_DASH;
  const g = scene.add.graphics().setDepth(0);
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
  return g;
}

class StartScreen extends Phaser.Scene {
  constructor() { super('StartScreen'); }

  create() {
    const c = COIN_DASH;
    drawNeonBackground(this);
    this.add.text(c.width / 2, c.height / 2 - 50, 'COIN DASH',
      { font: 'bold 56px monospace', color: c.colors.hud, padding: { x: 16, y: 16 } })
      .setOrigin(0.5).setShadow(0, 0, c.colors.hudGlow, 16, true, true);
    const prompt = this.add.text(c.width / 2, c.height / 2 + 40, 'Press Space to start',
      { font: 'bold 24px monospace', color: '#ffe9ff' })
      .setOrigin(0.5).setShadow(0, 0, '#ff2bd6', 12, true, true);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.input.keyboard.addCapture('SPACE');
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('CoinDash'));
  }
}

class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.highScore = loadHighScore();
    this.lives = c.lives;
    this.invincibleUntil = 0;
    this.finished = false;
    this.paused = false;
    // The scene clock keeps its paused flag across restarts (e.g. R pressed while paused).
    this.time.paused = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.glowing = [];
    this.drawBackground();
    this.makeGlowTextures();
    this.hud = this.add.text(18, 12, '', { font: 'bold 18px monospace', color: c.colors.hud })
      .setShadow(0, 0, c.colors.hudGlow, 8, true, true).setDepth(3);
    this.hearts = [];
    for (let i = 0; i < c.lives; i++) {
      this.hearts.push(this.add.text(c.width - 18 - (c.lives - 1 - i) * 26, 10, '\u2665',
        { font: '22px monospace', color: '#ff657a' }).setOrigin(1, 0).setDepth(3));
    }
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
    this.physics.add.overlap(this.player, this.drones, () => this.hit());
    this.slowUntil = 0;
    this.powerUp = this.add.rectangle(0, 0, 16, 16, c.colors.powerUp).setAngle(45);
    this.physics.add.existing(this.powerUp);
    this.powerUp.setVisible(false).body.enable = false;
    this.tweens.add({ targets: this.powerUp, scale: 1.3, duration: 350, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.powerUp, () => {
      if (this.finished || !this.powerUp.visible) return;
      this.hidePowerUp();
      this.slowUntil = this.time.now + c.powerUp.slowSeconds * 1000;
    });
    // Sits between the HUD text and the hearts so it doesn't cover either.
    this.slowBar = this.add.rectangle(540, 16, 160, 8, c.colors.powerUp).setOrigin(0, 0.5);
    this.slowText = this.add.text(620, 24, '', { font: '12px monospace', color: '#4da3ff' })
      .setOrigin(0.5, 0);
    this.schedulePowerUp();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
      this.add.rectangle(0, 0, 300, 110, 0x12021f, 0.92).setStrokeStyle(2, c.colors.drone, 1),
      this.add.text(0, 0, 'Paused\nPress P to resume',
        { font: 'bold 24px monospace', color: '#ffe9ff', align: 'center', lineSpacing: 12 }
      ).setOrigin(0.5).setShadow(0, 0, '#ff2bd6', 12, true, true)
    ]).setDepth(10).setVisible(false);
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.addCapture('SPACE');
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.finished) this.scene.restart();
    });
    // Glow sprites follow their physics objects after the physics step each frame.
    this.events.on('postupdate', this.syncGlows, this);
    this.events.once('shutdown', () => this.events.off('postupdate', this.syncGlows, this));
    this.syncGlows();
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
      this.tweens.pauseAll();
      // Stops power-up spawn/expiry timers; time.now keeps advancing, so the shifts below still work.
      this.time.paused = true;
    } else {
      // Push the deadline back so time spent paused doesn't count against the round.
      const pausedFor = this.time.now - this.pausedAt;
      this.deadline += pausedFor;
      // Same for any post-hit invincibility that was still running when we paused.
      if (this.invincibleUntil > this.pausedAt) this.invincibleUntil += pausedFor;
      if (this.slowUntil > this.pausedAt) this.slowUntil += pausedFor;
      this.physics.resume();
      this.tweens.resumeAll();
      this.time.paused = false;
    }
    this.pauseOverlay.setVisible(this.paused);
  }

  // Visual only: neon background plus the darkened HUD strip along the top.
  drawBackground() {
    const c = COIN_DASH;
    const g = drawNeonBackground(this);
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

  // Pick a random spot that is not directly underneath the player.
  randomSpot() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    return { x, y };
  }

  placeCoin() {
    const { x, y } = this.randomSpot();
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  hit() {
    if (this.finished || this.time.now < this.invincibleUntil) return;
    this.lives--;
    this.hearts[this.lives].setColor('#3a4a63');
    if (this.lives === 0) {
      this.finish('A drone caught you!');
      return;
    }
    const ms = COIN_DASH.hitInvincibleMs;
    this.invincibleUntil = this.time.now + ms;
    // Blink while invincible so the player can see the grace period; the glow blinks with it.
    const blinking = [this.player, this.player.glow];
    this.tweens.add({
      targets: blinking, alpha: 0.25, duration: 100, yoyo: true,
      repeat: Math.max(0, Math.round(ms / 200) - 1),
      onComplete: () => blinking.forEach(obj => obj.setAlpha(1))
    });
  }

  schedulePowerUp() {
    const p = COIN_DASH.powerUp;
    this.time.delayedCall(Phaser.Math.Between(p.spawnMinSeconds, p.spawnMaxSeconds) * 1000, () => {
      if (this.finished) return;
      const { x, y } = this.randomSpot();
      this.powerUp.setPosition(x, y).setVisible(true);
      this.powerUp.body.reset(x, y);
      this.powerUp.body.enable = true;
      // Vanishes if not collected in time; either way, the next one is scheduled.
      this.powerUpExpiry = this.time.delayedCall(p.lifetimeSeconds * 1000, () => this.hidePowerUp());
    });
  }

  hidePowerUp() {
    if (this.powerUpExpiry) this.powerUpExpiry.remove();
    this.powerUp.setVisible(false);
    this.powerUp.body.enable = false;
    this.schedulePowerUp();
  }

  update() {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    this.updateSlow();
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    const best = Math.max(this.highScore, this.score);
    this.hud.setText(`Coins: ${this.score}          Best: ${best}          Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
  }

  updateSlow() {
    const c = COIN_DASH;
    const remaining = Math.max(0, this.slowUntil - this.time.now);
    const slowed = remaining > 0;
    // Bounces keep speed, so setting the length each frame is enough to slow and restore drones.
    const speed = c.droneSpeed * (slowed ? c.powerUp.slowFactor : 1);
    this.drones.getChildren().forEach(drone => {
      drone.body.velocity.setLength(speed);
      // Only the neon outline changes; the fill stays the dark one set by styleNeon().
      drone.setStrokeStyle(2, slowed ? c.colors.slowedDrone : c.colors.drone, 1);
    });
    this.slowBar.setVisible(slowed).setSize(160 * remaining / (c.powerUp.slowSeconds * 1000), 8);
    this.slowText.setText(slowed ? `SLOW ${(remaining / 1000).toFixed(1)}s` : '');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const newBest = this.score > this.highScore;
    if (newBest) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
    const best = newBest ? 'New high score!' : `High score: ${this.highScore}`;
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 190, 0x12021f, 0.92)
      .setStrokeStyle(2, c.colors.drone, 1).setDepth(4);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n${best}\nPress Space to restart`,
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
  scene: [StartScreen, CoinDash]
});
