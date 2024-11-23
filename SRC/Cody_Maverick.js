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

async function fetchAndDisplayLocations(country = "", location = "", filterLikes = false) {
    try {
        const response = await fetch(
            `http://localhost:3000/api/surf-locations?country=${country}&location=${location}&filterLikes=${filterLikes}`
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
            tile.addEventListener("click", () => loadLocationDetails(loc.locationName));
            tilesContainer.appendChild(tile);
        });
    } catch (error) {
        console.error("Error fetching surf locations:", error);
    }
}

async function loadLocationDetails(locationName) {
    try {
        const response = await fetch(`http://localhost:3000/api/location-details?locationName=${locationName}`);
        const data = await response.json();

        const mainContent = document.getElementById("main-content");
        mainContent.innerHTML = ""; // Clear previous content

        if (data.length === 0) {
            mainContent.innerHTML = `<p>No data available for this location.</p>`;
            return;
        }

        // Extract location details
        const location = data[0];
        const posts = data.filter(post => post.postId !== null);

        // Display location details
        mainContent.innerHTML = `
            <h2>${locationName}</h2>
            <div id="location-info">
                <h3>Risks:</h3>
                <div id="risks-section"></div>
                <h3>Weather Conditions:</h3>
                <div id="weather-section">
                    <form id="weather-form">
                        <input type="date" id="weather-date" required />
                        <button type="submit">Get Weather</button>
                    </form>
                    <div id="weather-results"></div>
                </div>
            </div>
            <h3>Posts:</h3>
            <div id="post-tiles" class="tiles-container"></div>
        `;

        // Load Risks
        await loadSurfRisks(locationName);

        // Display all posts by default
        const postTiles = document.getElementById("post-tiles");
        posts.forEach(post => {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            tile.innerHTML = `
                <h3>Post ID: ${post.postId}</h3>
                <p>${post.descript}</p>
                <p>Likes: ${post.TotalLikes || 0}</p>
                <p>Comments: ${post.TotalComments || 0}</p>
            `;
            postTiles.appendChild(tile);
        });

        // Handle Weather Form Submission
        const weatherForm = document.getElementById("weather-form");
        weatherForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const date = document.getElementById("weather-date").value;
            await loadWeatherConditions(locationName, date);
        });

        // Add a "Top Posts" button
        const topPostsButton = document.createElement("button");
        topPostsButton.innerText = "Show Top Posts";
        topPostsButton.classList.add("top-posts-btn");
        topPostsButton.addEventListener("click", () => fetchAndDisplayTopPosts(locationName));
        mainContent.appendChild(topPostsButton);
    } catch (error) {
        console.error("Error loading location details:", error);
    }
}

async function loadSurfRisks(locationName) {
    try {
        const response = await fetch(`http://localhost:3000/api/surf-risks`);
        const risks = await response.json();

        const risksSection = document.getElementById("risks-section");
        const locationRisks = risks.find(risk => risk.locationName === locationName);

        if (!locationRisks || !locationRisks.Risks) {
            risksSection.innerHTML = `<p>No risks associated with this location.</p>`;
        } else {
            risksSection.innerHTML = `<p>${locationRisks.Risks}</p>`;
        }
    } catch (error) {
        console.error("Error loading surf risks:", error);
    }
}

async function loadWeatherConditions(locationName, date) {
    try {
        const response = await fetch(`http://localhost:3000/api/weather-conditions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locationName, date }),
        });
        const weather = await response.json();

        const weatherResults = document.getElementById("weather-results");
        if (weather.length === 0) {
            weatherResults.innerHTML = `<p>No weather data available for the selected date.</p>`;
        } else {
            const weatherDetails = weather[0];
            weatherResults.innerHTML = `
                <p><strong>Date:</strong> ${weatherDetails.wTimeStamp}</p>
                <p><strong>Wave Size:</strong> ${weatherDetails.waveSize} m</p>
                <p><strong>Wind Speed:</strong> ${weatherDetails.windSpeed} km/h</p>
                <p><strong>Precipitation:</strong> ${weatherDetails.precipitation ? "Yes" : "No"}</p>
            `;
        }
    } catch (error) {
        console.error("Error loading weather conditions:", error);
    }
}

async function fetchAndDisplayTopPosts(locationName) {
    try {
        const response = await fetch(`http://localhost:3000/api/location-top-posts?locationName=${locationName}`);
        const topPosts = await response.json();

        const postTiles = document.getElementById("post-tiles");
        postTiles.innerHTML = ""; // Clear existing posts

        if (topPosts.length === 0) {
            postTiles.innerHTML = `<p>No top posts found for this location.</p>`;
            return;
        }

        topPosts.forEach(post => {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            tile.innerHTML = `
                <h3>Post ID: ${post.postId}</h3>
                <p>${post.descript}</p>
                <p>Likes: ${post.TotalLikes || 0}</p>
                <p>Comments: ${post.TotalComments || 0}</p>
                <p>Total Interactions: ${post.TotalInteractions || 0}</p>
            `;
            postTiles.appendChild(tile);
        });
    } catch (error) {
        console.error("Error fetching top posts:", error);
    }
}
