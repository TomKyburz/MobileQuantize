var config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 6000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

function preload ()
{
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.spritesheet('dude',
        'assets/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );
}

var platforms;

function create ()
{
    this.add.image(960, 540, 'sky');
    // this.add.image(960, 540, 'star');
    platforms = this.physics.add.staticGroup();

    platforms.create(960, 1048, 'ground').setScale(4.8).refreshBody();

    // platforms.create(600, 400, 'ground');
    // platforms.create(50, 250, 'ground');
    // platforms.create(750, 220, 'ground');
    player = this.physics.add.sprite(100, 450, 'dude').setScale(3);
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);
    cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      // optional: still support arrow keys too
      arrowUp: Phaser.Input.Keyboard.KeyCodes.UP,
      arrowLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
      arrowDown: Phaser.Input.Keyboard.KeyCodes.DOWN,
      arrowRight: Phaser.Input.Keyboard.KeyCodes.RIGHT
    });
    let jumpCount = 0;
    const maxJumps = 2;

    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
});

    this.anims.create({
      key: 'turn',
      frames: [ { key: 'dude', frame: 4 } ],
      frameRate: 20
});

    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
});
}

function update () {
  if (cursors.left.isDown || cursors.arrowLeft.isDown)
{
    player.setVelocityX(-1000);

    player.anims.play('left', true);
}
else if (cursors.right.isDown || cursors.arrowRight.isDown)
{
    player.setVelocityX(1000);

    player.anims.play('right', true);
}
else
{
    player.setVelocityX(0);

    player.anims.play('turn');
}

if (player.body.touching.down) {
   jumpCount = 0;
 }

 // Check for jump key press (use Phaser’s justDown to trigger once)
 if (cursors.up.isDown || cursors.arrowUp.isDown) {
   if (player.body.touching.down) {
      player.setVelocityY(-2000);
    }
 }
}
