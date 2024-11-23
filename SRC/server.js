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

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const query = 'SELECT * FROM Users WHERE userName = ? AND psword = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }

        if (results.length > 0) {
            return res.json({ success: true, message: 'Login successful.' });
        } else {
            return res.json({ success: false, message: 'Invalid username or password.' });
        }
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
