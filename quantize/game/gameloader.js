const params = new URLSearchParams(window.location.search);

const gameTitle  = params.get("title")  || "Unknown Game";
const gameFile   = params.get("file")   || null;
const gameWidth  = parseInt(params.get("width"))  || 640;
const gameHeight = parseInt(params.get("height")) || 480;

// Update header and page title
document.getElementById("game-title").textContent = gameTitle;
document.getElementById("page-title").textContent = gameTitle;

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
  player.load(`${gameFile}`);
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
// // 🧹 Clean up the URL (remove query params)
// window.addEventListener("DOMContentLoaded", () => {
//   window.history.replaceState({}, document.title, window.location.pathname);
// });
