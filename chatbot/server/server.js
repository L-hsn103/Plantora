// Plantora Chatbot Server
// Node.js 18+ + Express backend for Anthropic Claude API

import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

// ===== Configuration =====
const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:5500,http://localhost:5500")
  .split(",")
  .map(s => s.trim());

// Exit early if API key missing
if (!ANTHROPIC_API_KEY) {
  console.error("\x1b[31m%s\x1b[0m", "[Plantora Chatbot] ERROR: ANTHROPIC_API_KEY is not set.");
  console.error("Please create chatbot/server/.env with your Anthropic API key.");
  console.error("Example: ANTHROPIC_API_KEY=sk-ant-...\n");
  process.exit(1);
}

// Load knowledge.md as system prompt
const KNOWLEDGE_PATH = path.join(__dirname, "knowledge.md");
let SYSTEM_PROMPT = "";
try {
  SYSTEM_PROMPT = fs.readFileSync(KNOWLEDGE_PATH, "utf-8");
  console.log("[Plantora Chatbot] Loaded knowledge.md (" + SYSTEM_PROMPT.length + " chars)");
} catch (err) {
  console.error("[Plantora Chatbot] Failed to read knowledge.md:", err.message);
  process.exit(1);
}

// ===== In-memory rate limiter =====
// Map: IP -> [timestamps]
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  // Remove timestamps outside window
  const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) rateLimitMap.delete(ip);
    else rateLimitMap.set(ip, recent);
  }
}, RATE_LIMIT_WINDOW_MS);

// ===== Express app =====
const app = express();

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// Body parser with size limit (50kb)
app.use(express.json({ limit: "50kb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, model: ANTHROPIC_MODEL });
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";

  // Rate limit
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }

  // Validate request body
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid request: 'messages' array required." });
  }

  // Validate and sanitize messages
  const validMessages = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    const role = msg.role === "user" || msg.role === "assistant" ? msg.role : "user";
    let content = String(msg.content || "").trim();
    if (!content) continue;
    // Truncate to 2000 chars
    if (content.length > 2000) content = content.slice(0, 2000) + "…";
    validMessages.push({ role, content });
  }

  if (validMessages.length === 0) {
    return res.status(400).json({ error: "No valid messages provided." });
  }

  // Keep only last 12 messages
  const history = validMessages.slice(-12);

  try {
    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: history
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Plantora Chatbot] Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "AI service temporarily unavailable." });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text?.trim() || "Sorry, I couldn't generate a response.";

    res.json({ reply });
  } catch (err) {
    console.error("[Plantora Chatbot] Request failed:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Plantora Chatbot] Server running on http://localhost:${PORT}`);
  console.log(`[Plantora Chatbot] Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  console.log(`[Plantora Chatbot] Model: ${ANTHROPIC_MODEL}`);
  console.log(`[Plantora Chatbot] Health check: GET http://localhost:${PORT}/health`);
  console.log(`[Plantora Chatbot] Chat endpoint: POST http://localhost:${PORT}/api/chat`);
});