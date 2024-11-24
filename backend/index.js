require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const http = require("http");
const { Server } = require("socket.io");
const argon2 = require("argon2");

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
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

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

// Helper function for password strength validation
const isPasswordStrong = (password) => {
  // Require at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

// Registration route
app.post("/register", async (req, res) => {
  console.log("Incoming request:", req.body);

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    console.log("Missing fields in request.");
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!isPasswordStrong(password)) {
    console.log("Password is not strong enough.");
    return res
      .status(400)
      .json({
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

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
    console.error("Error in /login route:", err);
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

// Get the user list
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
