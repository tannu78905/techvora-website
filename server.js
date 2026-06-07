const express = require("express");
const cors = require("cors");
const loadEnv = require("./config");

loadEnv();
const { pool, initializeDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "http://127.0.0.1:8081",
    "http://localhost:8081"
  ],
  methods: ["GET", "POST"]
}));
app.use(express.json());

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function testDatabaseConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("MySQL database connected");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "TechVora Hub Technologies backend is running"
  });
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "not connected"
    });
  }
});

app.post("/contact", async (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email);
  const phone = cleanText(req.body.phone);
  const message = cleanText(req.body.message);

  if (!name || !email || !phone || !message) {
    return res.status(400).json({
      message: "Please fill all required fields."
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: "Please enter a valid email address."
    });
  }

  try {
    const sql = "INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)";
    await pool.query(sql, [name, email, phone, message]);
    res.json({
      message: "Thank you. Your message has been sent successfully."
    });
  } catch (error) {
    console.error("Contact form error:", error.message);
    res.status(500).json({
      message: "Server error. Please try again later."
    });
  }
});

app.get("/contacts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, message, created_at FROM contacts ORDER BY created_at DESC"
    );

    res.json({
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error("Contacts fetch error:", error.message);
    res.status(500).json({
      message: "Unable to fetch contacts."
    });
  }
});

async function startServer() {
  try {
    await initializeDatabase();
    console.log("Database and contacts table are ready");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      testDatabaseConnection();
    });
  } catch (error) {
    console.error("Could not start database server:", error.message);
    process.exit(1);
  }
}

startServer();
