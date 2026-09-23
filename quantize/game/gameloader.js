const params = new URLSearchParams(window.location.search);

const gameTitle = params.get("title") || "Unknown Game";
const fileParam = params.get("file");
const gameFile = fileParam ? `swf/${fileParam}` : null;
const gameWidth = parseInt(params.get("width")) || 640;
const gameHeight = parseInt(params.get("height")) || 480;
const ruffleplayer = document.getElementById("ruffle-player")

// Update header and page title
document.getElementById("game-title").textContent = gameTitle;
document.getElementById("page-title").textContent = gameTitle;
const screen = document.getElementById("game-container");

// Apply aspect ratio dynamically
const container = document.getElementById("game-container");
container.style.setProperty("aspect-ratio", `${gameWidth} / ${gameHeight}`);

// Load game
if (gameFile) {
  window.RufflePlayer = window.RufflePlayer || {};
  const ruffle = window.RufflePlayer.newest();
  const player = ruffle.createPlayer();
  container.appendChild(player);
  player.style.width = "100%";
  player.style.height = "100%";
  player.load(gameFile);
} else {
  console.error("No SWF file specified.");
}

document.getElementById("fullscreen").addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.getElementById("game-container").requestFullscreen();
    document.getElementById("wrapper").style.height = "100%";
    document.getElementById("game-container").style.height = "100%";
  } else {
    document.exitFullscreen();
    document.getElementById("game-container").style.height = "80vh";
  }
});

document.addEventListener("fullscreenchange", () => {
    const gameContainer = document.getElementById("game-container");

    // Check if the document is NOT in fullscreen mode
    if (!document.fullscreenElement) {
        // Reset the height to the default 80vh
        gameContainer.style.height = "80vh";
    }
    // If it IS in fullscreen mode, the button click already set it to 100%
    // and no action is needed here unless you want to re-enforce the 100%
});

const isMobile =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0;

if (isMobile) {


  // =========================================================
  // MOBILE INPUT
  // =========================================================

  const mobileUI = document.createElement('div');

  mobileUI.id = 'mobile-ui';

  mobileUI.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1000;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
  `;

  screen.appendChild(mobileUI);

  let mobileControlsVisible = true;

  function toggleMobcontrols() {
    mobileControlsVisible = !mobileControlsVisible;

    if (mobileControlsVisible) {
      mobileUI.style.visibility = "visible";
      mobileUI.style.opacity = "1";
    } else {
      // Release anything currently being held
      resetJoystick();

      // Release attack buttons
      document.querySelectorAll('.attack-button').forEach(button => {
        button.style.transform = 'scale(1)';
        button.style.background = 'rgba(255,255,255,0.18)';
      });

      mobileUI.style.visibility = "hidden";
      mobileUI.style.opacity = "0";
    }
  }


  document.getElementById("mobcontrols").addEventListener("click", () => {
    toggleMobcontrols();
  });
  // =========================================================
  // KEYBOARD EMULATION
  // =========================================================

  function keyEvent(type, key, code) {

    const keyCodes = {
      ArrowLeft: 37,
      ArrowUp: 32,
      ArrowRight: 39,
      ArrowDown: 40,
      ' ': 32,

      a: 65,
      s: 83,
      d: 68,

      q: 81,
      w: 87,
      e: 69
    };

    const event = new KeyboardEvent(type, {
      key: key,
      code: code,
      keyCode: keyCodes[key] || 0,
      which: keyCodes[key] || 0,
      bubbles: true,
      cancelable: true
    });

    /*
     * Send it to the Ruffle player as well as the document.
     * This gives Ruffle the best chance of receiving the input.
     */
    document.dispatchEvent(event);
  }


  function pressKey(key, code) {
    keyEvent('keydown', key, code);
  }


  function releaseKey(key, code) {
    keyEvent('keyup', key, code);
  }


  // =========================================================
  // JOYSTICK
  //
  // LEFT  = ArrowLeft
  // RIGHT = ArrowRight
  // DOWN  = ArrowDown
  // =========================================================

  const joystick = document.createElement('div');

  joystick.style.cssText = `
    position: absolute;
    left: 35px;
    bottom: 35px;

    width: 125px;
    height: 125px;

    border-radius: 50%;

    background: rgba(255,255,255,0.12);
    border: 2px solid rgba(255,255,255,0.35);

    pointer-events: auto;
    touch-action: none;
  `;

  mobileUI.appendChild(joystick);


  const joystickKnob = document.createElement('div');

  joystickKnob.style.cssText = `
    position: absolute;

    left: 50%;
    top: 50%;

    width: 50px;
    height: 50px;

    margin-left: -25px;
    margin-top: -25px;

    border-radius: 50%;

    background: rgba(255,255,255,0.55);

    pointer-events: none;
  `;

  joystick.appendChild(joystickKnob);


  const JOY_RADIUS = 60;

  let joystickTouch = null;

  let joystickCenter = {
    x: 0,
    y: 0
  };

  let leftHeld = false;
  let rightHeld = false;
  let downHeld = false;
  let upHeld = false;


  function setJoystickKey(
    current,
    desired,
    key,
    code
  ) {

    if (current === desired) {
      return desired;
    }

    if (desired) {
      pressKey(key, code);
    } else {
      releaseKey(key, code);
    }

    return desired;
  }


  function updateJoystick(touch) {

    const dx =
      touch.clientX - joystickCenter.x;

    const dy =
      touch.clientY - joystickCenter.y;

    const distance =
      Math.sqrt(dx * dx + dy * dy);

    const clampedDistance =
      Math.min(distance, JOY_RADIUS);

    const angle =
      Math.atan2(dy, dx);

    const x =
      Math.cos(angle) * clampedDistance;

    const y =
      Math.sin(angle) * clampedDistance;


    // Move knob visually

    joystickKnob.style.transform =
      `translate(${x}px, ${y}px)`;


    // Normalized joystick values

    const nx = x / JOY_RADIUS;
    const ny = y / JOY_RADIUS;


    // -------------------------------------------------------
    // Horizontal movement
    // -------------------------------------------------------

    const deadzone = 0.25;

    const wantLeft =
      nx < -deadzone;

    const wantRight =
      nx > deadzone;


    // -------------------------------------------------------
    // Down / dodge
    // -------------------------------------------------------

    const wantDown =
      ny > 0.55;

    const wantUp =
      ny < -0.55;

    upHeld = setJoystickKey(
      upHeld,
      wantUp,
      ' ',
      'Space'
    );

    leftHeld = setJoystickKey(
      leftHeld,
      wantLeft,
      'ArrowLeft',
      'ArrowLeft'
    );

    rightHeld = setJoystickKey(
      rightHeld,
      wantRight,
      'ArrowRight',
      'ArrowRight'
    );

    downHeld = setJoystickKey(
      downHeld,
      wantDown,
      'ArrowDown',
      'ArrowDown'
    );
  }


  function resetJoystick() {

    if (leftHeld) {
      releaseKey(
        'ArrowLeft',
        'ArrowLeft'
      );
    }

    if (rightHeld) {
      releaseKey(
        'ArrowRight',
        'ArrowRight'
      );
    }

    if (downHeld) {
      releaseKey(
        'ArrowDown',
        'ArrowDown'
      );
    }
    if (upHeld) {
      releaseKey(
        ' ',
        'Space'
      );
    }

    leftHeld = false;
    rightHeld = false;
    downHeld = false;
    upHeld = false;

    joystickKnob.style.transform =
      'translate(0px, 0px)';

    joystickTouch = null;
  }


  joystick.addEventListener(
    'touchstart',
    (e) => {

      e.preventDefault();

      if (joystickTouch !== null) {
        return;
      }

      const touch =
        e.changedTouches[0];

      joystickTouch =
        touch.identifier;

      const rect =
        joystick.getBoundingClientRect();

      joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      updateJoystick(touch);

    },
    { passive: false }
  );


  document.addEventListener(
    'touchmove',
    (e) => {

      if (joystickTouch === null) {
        return;
      }

      for (const touch of e.changedTouches) {

        if (
          touch.identifier ===
          joystickTouch
        ) {

          e.preventDefault();

          updateJoystick(touch);

          break;
        }
      }

    },
    { passive: false }
  );


  document.addEventListener(
    'touchend',
    (e) => {

      for (const touch of e.changedTouches) {

        if (
          touch.identifier ===
          joystickTouch
        ) {

          resetJoystick();

          break;
        }
      }

    }
  );


  document.addEventListener(
    'touchcancel',
    (e) => {

      for (const touch of e.changedTouches) {

        if (
          touch.identifier ===
          joystickTouch
        ) {

          resetJoystick();

          break;
        }
      }

    }
  );


  // =========================================================
  // ATTACK BUTTONS
  // =========================================================

  const attackContainer =
    document.createElement('div');

  attackContainer.style.cssText = `
    position: absolute;

    right: 30px;
    bottom: 30px;

    width: 180px;

    display: grid;
    grid-template-columns: repeat(3, 60px);
    grid-template-rows: repeat(2, 60px);

    gap: 10px;

    pointer-events: auto;
  `;

  mobileUI.appendChild(attackContainer);


  function createAttackButton(
    label,
    key,
    code,
    className = ''
  ) {

    const button =
      document.createElement('div');

    button.className =
      `attack-button ${className}`;

    button.textContent = label;

    button.style.cssText = `
      width: 60px;
      height: 60px;

      border-radius: 50%;

      display: flex;
      align-items: center;
      justify-content: center;

      box-sizing: border-box;

      color: white;

      font-family: Arial, sans-serif;
      font-size: 20px;
      font-weight: bold;

      background: rgba(255,255,255,0.18);

      border: 2px solid rgba(255,255,255,0.45);

      text-shadow:
        0 1px 3px rgba(0,0,0,0.8);

      pointer-events: auto;

      touch-action: none;

      -webkit-user-select: none;
      user-select: none;

      transition:
        transform 0.05s,
        background 0.05s;
    `;


    function down(e) {

      e.preventDefault();

      button.style.transform =
        'scale(0.88)';

      button.style.background =
        'rgba(255,255,255,0.40)';

      pressKey(key, code);
    }


    function up(e) {

      e.preventDefault();

      button.style.transform =
        'scale(1)';

      button.style.background =
        'rgba(255,255,255,0.18)';

      releaseKey(key, code);
    }


    button.addEventListener(
      'touchstart',
      down,
      { passive: false }
    );

    button.addEventListener(
      'touchend',
      up,
      { passive: false }
    );

    button.addEventListener(
      'touchcancel',
      up,
      { passive: false }
    );


    attackContainer.appendChild(button);

    return button;
  }


  // =========================================================
  // BUTTON LAYOUT
  //
  // Q = Slow Punch
  // W = Slow Kick
  // E = Slow Grab
  //
  // A = Punch
  // S = Kick
  // D = Grab
  // =========================================================

  createAttackButton(
    'Q',
    'q',
    'KeyQ',
    'slow'
  );

  createAttackButton(
    'W',
    'w',
    'KeyW',
    'slow'
  );

  createAttackButton(
    'E',
    'e',
    'KeyE',
    'slow'
  );

  createAttackButton(
    'A',
    'a',
    'KeyA'
  );

  createAttackButton(
    'S',
    's',
    'KeyS'
  );

  createAttackButton(
    'D',
    'd',
    'KeyD'
  );


  // =========================================================
  // LABELS
  // =========================================================

  const attackLabels = [
    ['Q', 'SLOW PUNCH'],
    ['W', 'SLOW KICK'],
    ['E', 'SLOW GRAB'],
    ['A', 'PUNCH'],
    ['S', 'KICK'],
    ['D', 'GRAB']
  ];

  const buttons =
    attackContainer.children;

  for (
    let i = 0;
    i < buttons.length;
    i++
  ) {

    buttons[i].title =
      attackLabels[i][1];
  }

}
