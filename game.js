/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
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
    this.slowBar = this.add.rectangle(c.width / 2 - 100, 22, 200, 8, c.colors.powerUp).setOrigin(0, 0.5);
    this.slowText = this.add.text(c.width / 2, 34, '', { font: '12px monospace', color: '#4da3ff' })
      .setOrigin(0.5, 0);
    this.schedulePowerUp();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
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
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    this.updateSlow();
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
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
      drone.setFillStyle(slowed ? c.colors.slowedDrone : c.colors.drone);
    });
    this.slowBar.setVisible(slowed).setSize(200 * remaining / (c.powerUp.slowSeconds * 1000), 8);
    this.slowText.setText(slowed ? `SLOW ${(remaining / 1000).toFixed(1)}s` : '');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
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
