const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

const db = mysql.createConnection({
    host: 'localhost', // Database host
    user: 'root',      // MySQL username
    password: 'cody_maverick123', // MySQL password you just set
    database: 'cody_maverick_db', // Your database name
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database.');
});

// API Endpoints

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    const query = `SELECT userId FROM Users WHERE userName = ? AND psword = ?`;

    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ success: false, message: "Database query failed." });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const userId = results[0].userId; // Extract the userId from the query result
        res.json({ success: true, userId, message: "Login successful" });
    });
});


app.post('/api/create-account', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ success: false, message: 'Username, password, and email are required.' });
    }

    const checkQuery = 'SELECT * FROM Users WHERE userName = ? OR pEmail = ?';
    db.query(checkQuery, [username, email], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }

        if (results.length > 0) {
            return res.json({ success: false, message: 'Username or email already exists.' });
        }

        const insertQuery = 'INSERT INTO Users (userName, psword, pEmail) VALUES (?, ?, ?)';
        db.query(insertQuery, [username, password, email], (err, results) => {
            if (err) {
                console.error('Error inserting into the database:', err);
                return res.status(500).json({ success: false, message: 'Server error.' });
            }

            return res.json({ success: true, message: 'Account created successfully.' });
        });
    });
});

app.get('/api/surf-locations', (req, res) => {
    const { country, location } = req.query;
    let query = `
        SELECT 
            SurfLocation.locationName, 
            SurfLocation.breakType, 
            SurfLocation.surfScore, 
            SurfLocation.countryName, 
            SurfLocation.userId,
            COUNT(DISTINCT Likes.userId) AS TotalLikes,
            COUNT(DISTINCT Comments.commentId) AS TotalComments
        FROM SurfLocation
        LEFT JOIN Post ON SurfLocation.locationName = Post.locationName
        LEFT JOIN Likes ON Post.postId = Likes.commentId
        LEFT JOIN Comments ON Post.postId = Comments.postId
    `;
    const filters = [];

    if (country) {
        filters.push(`SurfLocation.countryName LIKE '%${country}%'`);
    }
    if (location) {
        filters.push(`SurfLocation.locationName LIKE '%${location}%'`);
    }

    if (filters.length > 0) {
        query += ` WHERE ${filters.join(' AND ')}`;
    }

    query += ` GROUP BY SurfLocation.locationName`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching surf locations:", err);
            return res.status(500).json({ error: "Failed to fetch surf locations." });
        }
        res.json(results);
    });
});



// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

app.get('/api/location-details', (req, res) => {
    const { locationName } = req.query;
    if (!locationName) {
        return res.status(400).json({ error: "Location name is required." });
    }

    const query = `
        SELECT 
            SurfLocation.locationName, 
            SurfLocation.breakType, 
            SurfLocation.surfScore, 
            SurfLocation.countryName, 
            SurfLocation.userId,
            Post.postId, 
            Post.descript, 
            COUNT(DISTINCT Likes.userId) AS TotalLikes, 
            COUNT(DISTINCT Comments.commentId) AS TotalComments
        FROM SurfLocation
        LEFT JOIN Post ON SurfLocation.locationName = Post.locationName
        LEFT JOIN Likes ON Post.postId = Likes.commentId
        LEFT JOIN Comments ON Post.postId = Comments.postId
        WHERE SurfLocation.locationName = ?
        GROUP BY Post.postId, SurfLocation.locationName
    `;

    db.query(query, [locationName], (err, results) => {
        if (err) {
            console.error("Error fetching location details:", err);
            return res.status(500).json({ error: "Failed to fetch location details." });
        }
        res.json(results);
    });
});


app.get('/api/location-top-posts', (req, res) => {
    const { locationName } = req.query;

    if (!locationName) {
        return res.status(400).json({ error: "Location name is required." });
    }

    const query = `
        SELECT 
            Post.postId, 
            Post.descript, 
            COUNT(DISTINCT Likes.userId) AS TotalLikes, 
            COUNT(DISTINCT Comments.commentId) AS TotalComments,
            (COUNT(DISTINCT Likes.userId) + COUNT(DISTINCT Comments.commentId)) AS TotalInteractions
        FROM Post
        LEFT JOIN Likes ON Post.postId = Likes.commentId
        LEFT JOIN Comments ON Post.postId = Comments.postId
        WHERE Post.locationName = ?
        GROUP BY Post.postId
        ORDER BY TotalInteractions DESC
        LIMIT 5;
    `;

    db.query(query, [locationName], (err, results) => {
        if (err) {
            console.error("Error fetching top posts:", err);
            return res.status(500).json({ error: "Failed to fetch top posts." });
        }
        res.json(results);
    });
});

app.get('/api/surf-risks', (req, res) => {
    const query = `
        SELECT 
            SurfLocation.locationName, 
            SurfLocation.breakType, 
            GROUP_CONCAT(Risks.riskType SEPARATOR ', ') AS Risks
        FROM SurfLocation
        LEFT JOIN Risks ON SurfLocation.locationName = Risks.locationName
        GROUP BY SurfLocation.locationName, SurfLocation.breakType;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching surf risks:", err);
            return res.status(500).json({ error: "Failed to fetch surf risks." });
        }
        res.json(results);
    });
});

app.post('/api/weather-conditions', (req, res) => {
    const { locationName, date } = req.body;

    if (!locationName || !date) {
        return res.status(400).json({ error: "Location name and date are required." });
    }

    const query = `
        SELECT 
            Weather.locationName, 
            Weather.wTimeStamp, 
            Weather.waveSize, 
            Weather.windSpeed, 
            Weather.precipitation
        FROM Weather
        WHERE locationName = ? AND DATE(wTimeStamp) = ?;
    `;

    db.query(query, [locationName, date], (err, results) => {
        if (err) {
            console.error("Error fetching weather conditions:", err);
            return res.status(500).json({ error: "Failed to fetch weather conditions." });
        }
        res.json(results);
    });
});

app.post('/api/like-comment', (req, res) => {
    const { userId, commentId } = req.body;

    if (!userId || !commentId) {
        return res.status(400).json({ success: false, error: "User ID and Comment ID are required." });
    }

    // Insert or update the like status in the database
    const query = `
        INSERT INTO Likes (userId, commentId, likedStatus)
        VALUES (?, ?, true)
        ON DUPLICATE KEY UPDATE likedStatus = true;
    `;

    db.query(query, [userId, commentId], (err, result) => {
        if (err) {
            console.error("Error liking comment:", err);
            return res.status(500).json({ success: false, error: "Failed to like comment." });
        }
        res.json({ success: true, message: "Comment liked successfully." });
    });
});


app.get('/api/post-comments', (req, res) => {
    const { postId } = req.query;

    if (!postId) {
        return res.status(400).json({ error: "Post ID is required." });
    }

    const query = `
        SELECT 
            Comments.commentId,
            Comments.descript AS commentDescription,
            Comments.userId,
            COUNT(Likes.userId) AS TotalLikes
        FROM Comments
        LEFT JOIN Likes ON Comments.commentId = Likes.commentId
        WHERE Comments.postId = ?
        GROUP BY Comments.commentId;
    `;

    db.query(query, [postId], (err, results) => {
        if (err) {
            console.error("Error fetching post comments:", err);
            return res.status(500).json({ error: "Failed to fetch comments." });
        }
        res.json(results);
    });
});

app.post('/api/create-comment', (req, res) => {
    const { postId, userId, description } = req.body;

    if (!postId || !userId || !description) {
        return res.status(400).json({ success: false, error: "Post ID, User ID, and description are required." });
    }

    const query = `
        INSERT INTO Comments (descript, cTimeStamp, userId, postId)
        VALUES (?, NOW(), ?, ?);
    `;

    db.query(query, [description, userId, postId], (err, result) => {
        if (err) {
            console.error("Error creating comment:", err);
            return res.status(500).json({ success: false, error: "Failed to create comment in the database." });
        }
        res.json({ success: true, message: "Comment created successfully." });
    });
});
