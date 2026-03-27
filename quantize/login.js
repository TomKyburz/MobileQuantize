const gameGrid = document.querySelector(".gamegrid");
const welcometxt = document.getElementById('link');
const pfp = document.querySelector('.c');
const modelpfp = document.querySelector('img.pfp');
const modelaccname = document.querySelector('.profilename');
const modelusername = document.querySelector('.profiledetail');
const modelemail = document.querySelector('.profiledetail2');
const accountbtn = document.getElementById('proceedaccount');
const signinbtn = document.getElementById('proceedsign');
const logoutbtn = document.getElementById('proceedlog');
const proceed3 = document.getElementById('proceed3');

const ALL_GAMES = [
        // Map your current HTML structure to JS objects
        { title: "Papa's Pizzeria", href: "quantize/game/index.html?title=Papa's Pizzeria&file=papaspizzeria.swf", imgSrc: "https://gamegfx.spielaffe.de/images/game/364/364054/37896_papas-pizzeria.png" },
        { title: "Papa's Burgeria", href: "quantize/game/index.html?title=Papa's Burgeria&file=papasburgeria.swf", imgSrc: "//gamegfx.spielaffe.de/images/game/402/402034/35424_papas-burgeria-rcm186x186u.png" },
        { title: "Papa's Scooperia", href: "quantize/game/index.html?title=Papa's Scooperia&file=papasscooperia.swf", imgSrc: "//gamegfx.spielaffe.de/images/game/1033/1033000/36426_papas-scooperia-rcm186x186u.png" },
        { title: "Redball 4", href: "quantize/game/index.html?title=Redball 4&file=redball4.swf", imgSrc: "https://quantize.me/img/redball.png" },
        { title: "Rogue Soul 2", href: "quantize/game/index.html?title=Rogue Soul 2&file=rogue-soul-2-game.swf", imgSrc: "https://quantize.me/img/roguesoul2.jpg" },
        { title: "Run 3", href: "quantize/game/index.html?title=Run 3&file=run3.swf", imgSrc: "https://quantize.me/img/run3.png" },
        { title: "Papa Louie 3", href: "quantize/game/index.html?title=Papa Louie 3&file=papalouie3.swf&width=700&height=416", imgSrc: "https://quantize.me/img/papalouie3.jpg" },
        { title: "Locked", href: "#", imgSrc: "https://quantize.me/img/locked.png" } // Your HTML has a Papa's Burgeria repeated here, I'm keeping it as a placeholder for now
    ];

    function renderGameGrid(gamesToDisplay) {
        gameGrid.innerHTML = ''; // Always clear existing grid

        // Iterate ONLY over the games the user has unlocked.
        gamesToDisplay.forEach(game => {
            // Since we are only rendering unlocked games, we remove the 'if (isUnlocked)' check.

            const gameElement = document.createElement('a');
            gameElement.id = "item";
            gameElement.href = game.href;

            const div = document.createElement('div');
            div.id = "item";

            const img = document.createElement('img');
            img.id = "gameicon";
            img.src = game.imgSrc;

            // Add conditional style only if needed
            if (game.title === "Papa's Pizzeria") {
                img.style.width = "230px";
                img.style.height = "208px";
            }

            div.appendChild(img);
            gameElement.appendChild(div);

            gameGrid.appendChild(gameElement);
        });

        // NOTE: You no longer need the 'else' block for locked items.
    }

async function fetchUsers() {
    try {
        const response = await fetch('quantize/users.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching user data:", error);
        return [];
    }
}

async function checkLoginAndLoadContent() {
    const loggedInUsername = localStorage.getItem('loggedInUser');
    const users = await fetchUsers();
    let currentUser = null;
    let gamesToRender = []; // Use a clear variable name

    if (loggedInUsername) {
        // ... LOGGED-IN USER LOGIC (REMOVED REDUNDANCY) ...
        currentUser = users.find(u => u.username === loggedInUsername);
    }

    if (currentUser) {
        // **LOGGED-IN USER**
        const unlockedGamesTitles = currentUser.attributes.unlockedGames;

        // Map titles to full game objects
        gamesToRender = unlockedGamesTitles
            .map(title => ALL_GAMES.find(game => game.title === title))
            .filter(game => game); // .filter(game => game !== undefined) is simplified to .filter(game)

        // ... (UI updates)
        welcometxt.textContent = `Welcome back, ${currentUser.ign}`;
        pfp.style.backgroundImage = `url(${currentUser.pfp})`;
        modelpfp.src = currentUser.pfp;
        // ... (other UI updates)
        signinbtn.style.display = 'none';
        logoutbtn.style.display = 'flex';

    } else {
        // **GUEST USER**

        // 1. Find the guest user profile (must be defined in users.json)
        const guestUser = users.find(u => u.username === 'guest');
        const unlockedGamesTitles = guestUser ? guestUser.attributes.unlockedGames : [];

        // 2. Map the guest's unlocked titles to the actual game objects
        gamesToRender = unlockedGamesTitles
            .map(title => ALL_GAMES.find(game => game.title === title))
            .filter(game => game); // Only keep games that exist in ALL_GAMES

        console.log('no'); // Retained from your original code

        // Update UI for guest
        // ... (Guest UI updates, set default PFP, etc.)
        welcometxt.textContent = 'Welcome, Guest'; // Example guest text
        signinbtn.style.display = 'flex';
        logoutbtn.style.display = 'none';
    }

    // 3. Render the games after all logic is complete
    renderGameGrid(gamesToRender);
}

const loginForm = document.getElementById('login');
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const usernameInput = e.target.querySelector('input[placeholder="Username"]').value;
    const passwordInput = e.target.querySelector('input[type="password"]').value;
    const users = await fetchUsers();
    const user = users.find(u => u.username === usernameInput);

    if (user.code == passwordInput && user.username == usernameInput) {
        localStorage.setItem('loggedInUser', user.username);
        toggleAccount();
        checkLoginAndLoadContent();
        loginForm.reset();
    } else {
        alert("Invalid username or password.");
    }
});

function logout() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userProfileData');
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    window.location.reload();
}
window.onload = checkLoginAndLoadContent();
