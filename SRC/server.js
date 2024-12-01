const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

// middleware
app.use(bodyParser.json());
app.use(cors());

//database connection
const db = mysql.createConnection({
  host: "localhost", // Database host
  user: "root", // MySQL username
  password: "CGoffPsw:)", // MySQL password you just set
  database: "se3309_a3", // Your database name
  port: 3306, //database port
});

//connect to the database
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to MySQL database.");
});

// start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

//middleware to print out server requests
app.use((req, res, next) => {
  console.log(`Back-end: ${req.method} request for ${req.url}`);
  next();
});

// -------------------------------- API Endpoints --------------------------------

/*
"Six Alternative Options" w/ validation
Note: "2.1" = endpoint #2, query #1

1) Create an Account
   - uses: 1.1, 1.2 (not interesting query)
   - SELECT & INSERT statement

2) Login to an account
   - uses: 2.1 (not interesting query)
   - SELECT statement

3) SurfLocation Load & Search
   - uses: 3.1 (interesting query; JOINs)
   - SELECT statement

4) SurfLocation Granular & Posts
   - uses: 4.1 (interesting query; JOIN, GROUP BY)
   - SELECT statement

5) SurfLocation Risks
   - uses: 5.1 (interesting query; JOIN, GROUP BY)
   - SELECT statement

6) SurfLocation Top 5 Posts (by interactions count)
   - uses: 6.1 (interesting query; JOINS, GROUP BY, ORDER BY)
   - SELECT statement

7) Weather Conditions for Date & Location
   - uses: 7.1 (not interesting query)
   - SELECT statement

8) Like a Comment (of a Post on a Location)
   - uses: 8.1 (interesting query; ON DUPLICATE KEY UPDATE)
   - INSERT statement

9) All Comments (and Comment Likes) on a Post
   - uses: 9.1 (interesting query; JOINS, GROUP BY)
   - SELECT statement

10) Create Comment on a Post
   - uses: 10.1 (not interesting query)
   - INSERT statement
*/

//Endpoint #1: Create account
app.post("/api/create-account", (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({
      success: false,
      message: "Username, password, and email are required.",
    });
  }

  //Query #1 - check username and email do not exist in database
  const checkQuery = "SELECT * FROM Users WHERE userName = ? OR pEmail = ?";

  db.query(checkQuery, [username, email], (err, results) => {
    if (err) {
      console.error("Error querying the database:", err);
      return res.status(500).json({ success: false, message: "Server error." });
    }

    if (results.length > 0) {
      return res.json({
        success: false,
        message: "Username or email already exists.",
      });
    }

    //Query #2 - insert account information
    const insertQuery =
      "INSERT INTO Users (userName, psword, pEmail) VALUES (?, ?, ?)";

    db.query(insertQuery, [username, password, email], (err, results) => {
      if (err) {
        console.error("Error inserting into the database:", err);
        return res
          .status(500)
          .json({ success: false, message: "Server error." });
      }

      return res.json({
        success: true,
        message: "Account created successfully.",
      });
    });
  });
});

// Endpoint #2: Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Username and password are required." });
  }

  //Query #1 - select user to login
  const query = `SELECT userId FROM Users WHERE userName = ? AND psword = ?`;

  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error("Error querying database:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database query failed." });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password." });
    }

    const userId = results[0].userId; // Extract the userId from the query result
    res.json({ success: true, userId, message: "Login successful" });
  });
});

// Endpoint #3: Surflocation Summaries
app.get("/api/surf-locations", (req, res) => {
  const { country, location } = req.query;

  //Query #1 - get location overview data (using Likes, Posts, and Comments tables)
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

  //adds the above-filters to the query
  if (filters.length > 0) {
    query += ` WHERE ${filters.join(" AND ")}`;
  }

  //adds group by to the end of the query
  query += ` GROUP BY SurfLocation.locationName`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching surf locations:", err);
      return res.status(500).json({ error: "Failed to fetch surf locations." });
    }
    res.json(results);
  });
});

//Endpoint #4: Get All Location Information (when a location is clicked on)
app.get("/api/location-details", (req, res) => {
  const { locationName } = req.query;
  if (!locationName) {
    return res.status(400).json({ error: "Location name is required." });
  }

  //Query #1 - get location data and psts on location
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
      return res
        .status(500)
        .json({ error: "Failed to fetch location details." });
    }
    res.json(results);
  });
});

//Endpoint #5: Get all Risks (when a location is clicked on)
app.get("/api/surf-risks", (req, res) => {
  //Query #1 - get risks of a location
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

//Endpoint #6: Show the Top Posts on a Location (by interactions (count of likes + count of comments))
app.get("/api/location-top-posts", (req, res) => {
  const { locationName } = req.query;

  if (!locationName) {
    return res.status(400).json({ error: "Location name is required." });
  }

  //Query #1 - get top 5 posts for a location (based on interactions)
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

//Endpoint #7: Show Weather for Locaiton and Date
app.post("/api/weather-conditions", (req, res) => {
  const { locationName, date } = req.body;

  if (!locationName || !date) {
    return res
      .status(400)
      .json({ error: "Location name and date are required." });
  }

  //Query #1 - get weather for location and date
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
      return res
        .status(500)
        .json({ error: "Failed to fetch weather conditions." });
    }
    res.json(results);
  });
});

//Endpoint #8: Like a Comment
app.post("/api/like-comment", (req, res) => {
  const { userId, commentId } = req.body;

  if (!userId || !commentId) {
    return res
      .status(400)
      .json({ success: false, error: "User ID and Comment ID are required." });
  }

  //Query #1 - inserts the like into Likes table
  const query = `
        INSERT INTO Likes (userId, commentId, likedStatus)
        VALUES (?, ?, true)
        ON DUPLICATE KEY UPDATE likedStatus = true;
    `;

  db.query(query, [userId, commentId], (err, result) => {
    if (err) {
      console.error("Error liking comment:", err);
      return res
        .status(500)
        .json({ success: false, error: "Failed to like comment." });
    }
    res.json({ success: true, message: "Comment liked successfully." });
  });
});

//Endpoint #9: Gets All Comments (and Likes on Comments) on a Post
app.get("/api/post-comments", (req, res) => {
  const { postId } = req.query;

  if (!postId) {
    return res.status(400).json({ error: "Post ID is required." });
  }

  //Query #1 - selects all the comments and like information
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

//Endpoint #10: Creates a Comment on a Post
app.post("/api/create-comment", (req, res) => {
  const { postId, userId, description } = req.body;

  if (!postId || !userId || !description) {
    return res.status(400).json({
      success: false,
      error: "Post ID, User ID, and description are required.",
    });
  }

  //Query #1 - inserts comment into Comment table
  const query = `
        INSERT INTO Comments (descript, cTimeStamp, userId, postId)
        VALUES (?, NOW(), ?, ?);
    `;

  db.query(query, [description, userId, postId], (err, result) => {
    if (err) {
      console.error("Error creating comment:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to create comment in the database.",
      });
    }
    res.json({ success: true, message: "Comment created successfully." });
  });
});
