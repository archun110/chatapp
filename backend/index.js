require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const argon2 = require("argon2");
const svgCaptcha = require("svg-captcha");

const app = express();
const PORT = process.env.PORT || 5000;

// Create an HTTP server for WebSocket integration
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow requests from your frontend
    methods: ["GET", "POST"],
  },
});

// Enable CORS for all routes
app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend origin
    credentials: true, // Allow credentials (cookies) to be sent
  })
);

// Middleware to parse JSON requests
app.use(express.json());

// Session middleware for storing captcha text
app.use(
  session({
    secret: "your_secret_key", // Replace with a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // Use `true` only with HTTPS
      httpOnly: true,
      maxAge: 60000, // 1 minute
      sameSite: "lax", // Adjust for cross-site cookie policy if needed
    },
  })
);


// Example GET route to confirm the backend is running
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Test database connection
app.get("/test-db", async (req, res) => {
  try {
    const [test] = await db.query("SELECT 1");
    console.log("Database connection test successful:", test);
    res.status(200).json({ message: "Database connection successful.", test });
  } catch (err) {
    console.error("Database connection test failed:", err);
    res.status(500).json({ message: "Database connection failed." });
  }
});

// Generate captcha
app.get("/captcha", (req, res) => {
  console.log("Generating captcha...");
  const captcha = svgCaptcha.create({
    size: 6,
    noise: 3,
    color: true,
    background: "#ccf2ff",
  });

  req.session.captcha = captcha.text; // Store CAPTCHA text in session
  console.log("Generated CAPTCHA text:", captcha.text);
  console.log("Session ID for CAPTCHA generation:", req.sessionID);

  res.type("svg");
  res.status(200).send(captcha.data);
});

// Helper function for password strength validation
const isPasswordStrong = (password) => {
  // Require at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

// Registration route with captcha validation
app.post("/register", async (req, res) => {
  console.log("Incoming request:", req.body);

  const { username, email, password, userCaptcha } = req.body;

  // Validate captcha
  if (!req.session.captcha || req.session.captcha !== userCaptcha) {
    console.log("Invalid captcha:", userCaptcha);
    return res.status(400).json({ message: "Invalid captcha" });
  }

  if (!username || !email || !password) {
    console.log("Missing fields in request.");
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!isPasswordStrong(password)) {
    console.log("Password is not strong enough.");
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.",
    });
  }

  try {
    console.log("Checking if email exists...");
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      console.log("Email already exists.");
      return res.status(409).json({ message: "Email already exists." });
    }

    console.log("Hashing password...");
    const hashedPassword = await argon2.hash(password);
    console.log("Password hashed:", hashedPassword);

    console.log("Inserting user into database...");
    await db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    console.log("User registered successfully.");
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Error in /register route:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password, captcha } = req.body;

  console.log("Session ID for CAPTCHA validation:", req.sessionID);
  console.log("Stored CAPTCHA in session:", req.session.captcha);
  console.log("User-provided CAPTCHA:", captcha);

  if (!req.session.captcha || req.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
    console.log("Invalid CAPTCHA:", captcha);
    return res.status(400).json({ message: "Invalid CAPTCHA." });
  }

  // Clear the CAPTCHA from the session after validation
  req.session.captcha = null;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = rows[0];

    // Compare the hashed password
    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    res.status(200).json({
      message: "Login successful.",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Send a message
app.post("/chat", async (req, res) => {
  const { sender_id, receiver_id, message } = req.body;

  if (!sender_id || !receiver_id || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    await db.query("INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)", [
      sender_id,
      receiver_id,
      message,
    ]);

    // Emit the message to both users in real-time
    io.emit("new_message", { sender_id, receiver_id, message });

    res.status(201).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Get chat messages between two users
app.get("/chat/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const [messages] = await db.query(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [user1, user2, user2, user1]
    );

    res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for new messages
  socket.on("send_message", (data) => {
    console.log("Message received:", data);
    // Emit the message to all connected clients
    io.emit("receive_message", data);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
app.get("/users", async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, username FROM users");
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
