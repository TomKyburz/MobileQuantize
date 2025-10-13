function isPWA() {
  return window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
}

window.addEventListener('DOMContentLoaded', () => {
  const installButton = document.getElementById('install-button');

  if (isPWA()) {
    // Hide the install button if already running as an app
    installButton.style.display = 'none';
  }
  startIfGamepadConnected();
});

// Function that starts continuous rumble
function startRumble() {
  const gamepad = navigator.getGamepads()[1];
  if (!gamepad?.vibrationActuator) {
    console.log("No vibration support or no gamepad connected.");
    return;
  }

  console.log("Starting continuous vibration on:", gamepad.id);

  const interval = setInterval(() => {
    gamepad.vibrationActuator.playEffect("dual-rumble", {
      startDelay: 0,
      duration: 1000,   // 1 second bursts
      weakMagnitude: 1.0,
      strongMagnitude: 1.0,
    });
  }, 900);

  // Return function to stop rumbling later if needed
  return () => clearInterval(interval);
}

// Helper: check if a gamepad is connected at load
function startIfGamepadConnected() {
  const pads = navigator.getGamepads();
  if (pads && pads[0]) {
    console.log("Gamepad detected on load:", pads[0].id);
    startRumble();
  } else {
    console.log("No gamepad detected at load — waiting for connection...");
  }
}

// Event listener: when a controller is plugged in after load
window.addEventListener("gamepadconnected", (e) => {
  console.log("Gamepad connected:", e.gamepad.id);
  startRumble();
});

// Optional: gamepad disconnected event
window.addEventListener("gamepaddisconnected", (e) => {
  console.log("Gamepad disconnected:", e.gamepad.id);
});

document.getElementById("testnotif").addEventListener("click", () => {
  console.log("Waiting 2.3 seconds before sending notification...");
  setTimeout(() => {
    fetch("/notify", { method: "POST" })
      .then(res => console.log("Notification triggered"))
      .catch(err => console.error(err));
  }, 2300);
});
