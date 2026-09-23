const params = new URLSearchParams(window.location.search);

const gameTitle = params.get("title") || "Unknown Game";
const fileParam = params.get("file");
const gameFile = fileParam ? `swf/${fileParam}` : null;
const gameWidth = parseInt(params.get("width")) || 640;
const gameHeight = parseInt(params.get("height")) || 480;

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
    document.getElementById("wrapper").requestFullscreen();
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

const isMobile = 'ontouchstart' in window;

const mobileInput = {
  x: 0,
  z: 0,
  jump: false
};

if (isMobile) {
  const mobileUI = document.createElement('div');

  mobileUI.id = 'mobile-ui';
  mobileUI.style.cssText = `
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 100;
  `;

  screen.appendChild(mobileUI);

  // -------------------------
  // Joystick
  // -------------------------

  const joyBase = document.createElement('div');

  joyBase.style.cssText = `
    position: absolute;
    bottom: 40px;
    left: 40px;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 2px solid rgba(255,255,255,0.35);
    pointer-events: auto;
    touch-action: none;
  `;

  mobileUI.appendChild(joyBase);

  const joyKnob = document.createElement('div');

  joyKnob.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.55);
    transform: translate(-50%, -50%);
    pointer-events: none;
  `;

  joyBase.appendChild(joyKnob);

  // -------------------------
  // Jump button
  // -------------------------

  const jumpBtn = document.createElement('div');

  jumpBtn.textContent = 'UP';

  jumpBtn.style.cssText = `
    position: absolute;
    bottom: 40px;
    right: 40px;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: 2px solid rgba(255,255,255,0.45);
    pointer-events: auto;
    touch-action: none;

    display: flex;
    align-items: center;
    justify-content: center;

    color: white;
    font-size: 28px;
    font-family: sans-serif;
    user-select: none;
  `;

  mobileUI.appendChild(jumpBtn);

  // -------------------------
  // Jump
  // -------------------------

  function jump() {
    const event = new KeyboardEvent("keydown", {
      key: "q",
      code: "KeyQ",
      keyCode: 81,
      which: 81,
      bubbles: true,
      cancelable: true
    });

    document.dispatchEvent(event);
    console.log("event dispatched")
  }

  jumpBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
  }, { passive: false });


  // -------------------------
  // Joystick movement
  // -------------------------

  let joyTouchId = null;

  const JOY_RADIUS = 55;

  let joyOrigin = {
    x: 0,
    y: 0
  };

  joyBase.addEventListener('touchstart', (e) => {
    e.preventDefault();

    const touch = e.changedTouches[0];

    joyTouchId = touch.identifier;

    const rect = joyBase.getBoundingClientRect();

    joyOrigin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }, { passive: false });


  document.addEventListener('touchmove', (e) => {

    for (const touch of e.changedTouches) {

      if (touch.identifier !== joyTouchId) {
        continue;
      }

      e.preventDefault();

      const dx = touch.clientX - joyOrigin.x;
      const dy = touch.clientY - joyOrigin.y;

      const distance = Math.min(
        Math.sqrt(dx * dx + dy * dy),
        JOY_RADIUS
      );

      const angle = Math.atan2(dy, dx);

      const x =
        (distance / JOY_RADIUS) *
        Math.cos(angle);

      const z =
        (distance / JOY_RADIUS) *
        Math.sin(angle);

      mobileInput.x = x;
      mobileInput.z = z;

      joyKnob.style.transform = `
        translate(
          calc(-50% + ${x * JOY_RADIUS}px),
          calc(-50% + ${z * JOY_RADIUS}px)
        )
      `;
    }

  }, { passive: false });


  function resetJoystick() {
    joyTouchId = null;

    mobileInput.x = 0;
    mobileInput.z = 0;

    joyKnob.style.transform =
      'translate(-50%, -50%)';
  }


  document.addEventListener('touchend', (e) => {

    for (const touch of e.changedTouches) {

      if (touch.identifier === joyTouchId) {
        resetJoystick();
      }

    }

  });


  document.addEventListener('touchcancel', (e) => {

    for (const touch of e.changedTouches) {

      if (touch.identifier === joyTouchId) {
        resetJoystick();
      }

    }

  });

}
