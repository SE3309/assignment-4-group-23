// Elements
const signInButton = document.getElementById('sign-in');
const modal = document.getElementById('auth-modal');
const closeModalButton = document.getElementById('close-modal');
const loginForm = document.getElementById('login-form');
const createAccountForm = document.getElementById('create-account-form');
const createAccountButton = document.getElementById('create-account-btn');
const backToLoginButton = document.getElementById('back-to-login-btn');
const loginButton = document.getElementById('login-btn');
const createButton = document.getElementById('create-btn');
const userDisplay = document.getElementById('user-display');

// Show Modal
signInButton.addEventListener('click', () => {
    modal.style.display = 'flex';
});

// Close Modal
closeModalButton.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Switch to Create Account Form
createAccountButton.addEventListener('click', () => {
    loginForm.style.display = 'none';
    createAccountForm.style.display = 'block';
});

// Switch to Login Form
backToLoginButton.addEventListener('click', () => {
    createAccountForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Login Functionality
loginButton.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Make a fetch call to verify user credentials
    const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (result.success) {
        userDisplay.innerText = `Welcome, ${username}`;
        modal.style.display = 'none';
    } else {
        alert('Incorrect username or password. Please try again.');
    }
});

// Create Account Functionality
createButton.addEventListener('click', async () => {
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;

    // Make a fetch call to create the account
    const response = await fetch('http://localhost:3000/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
    });

    const result = await response.json();

    if (result.success) {
        alert('Account created successfully. You can now log in.');
        createAccountForm.style.display = 'none';
        loginForm.style.display = 'block';
    } else {
        alert('Failed to create account. Please try again.');
    }
});

// Event listener for the "Surf Locations" button
document.getElementById("surf-locations-btn").addEventListener("click", () => {
    loadSurfLocations();
});

// Function to load surf locations
async function loadSurfLocations() {
    const mainContent = document.getElementById("main-content");
    mainContent.innerHTML = `
        <div class="search-bar">
            <input type="text" id="search-country" placeholder="Search by Country">
            <input type="text" id="search-location" placeholder="Search by Location">
            <button id="search-btn">Search</button>
        </div>
        <div id="surf-locations" class="tiles-container"></div>
    `;

    // Fetch and display all surf locations on initial load
    await fetchAndDisplayLocations();

    // Add search functionality
    document.getElementById("search-btn").addEventListener("click", async () => {
        const country = document.getElementById("search-country").value.trim();
        const location = document.getElementById("search-location").value.trim();
        await fetchAndDisplayLocations(country, location);
    });
}

async function fetchAndDisplayLocations(country = "", location = "") {
    try {
        const response = await fetch(
            `http://localhost:3000/api/surf-locations?country=${country}&location=${location}`
        );
        const locations = await response.json();

        const tilesContainer = document.getElementById("surf-locations");
        tilesContainer.innerHTML = ""; // Clear existing tiles

        if (locations.length === 0) {
            tilesContainer.innerHTML = `<p>No surf locations found.</p>`;
            return;
        }

        // Create tiles for each location
        locations.forEach(loc => {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            tile.innerHTML = `
                <h3>${loc.locationName}</h3>
                <p>Break Type: ${loc.breakType}</p>
                <p>Surf Score: ${loc.surfScore}</p>
                <p>Country: ${loc.countryName}</p>
                <p>Added by User ID: ${loc.userId}</p>
                <p>Likes: ${loc.TotalLikes || 0}</p>
                <p>Comments: ${loc.TotalComments || 0}</p>
            `;
            tilesContainer.appendChild(tile);
        });
    } catch (error) {
        console.error("Error fetching surf locations:", error);
    }
}