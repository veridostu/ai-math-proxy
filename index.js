/**
 * AI Math Proxy – Production Server
 * Railway compatible
 */

import express from "express";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================

app.use(cors({
  origin: "*", // Mobile apps
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "5mb" }));

// ===============================
// Rate Limiting (per IP)
// ===============================

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/solve", limiter);

// ===============================
// Health Check
// ===============================

app.get("/", (_, res) => {
  res.json({
    status: "ok",
    service: "ai-math-proxy",
    timestamp: new Date().toISOString(),
  });
});

// ===============================
// OpenAI Proxy Endpoint
// ===============================

app.post("/solve", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: { message: "OpenAI API key is not configured on server." },
      });
    }

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const text = await openaiResponse.text();

    res.status(openaiResponse.status).send(text);
  } catch (error) {
    console.error("[PROXY ERROR]", error);
    res.status(500).json({
      error: { message: "Proxy server error." },
    });
  }
});

// ===============================
// Start Server
// ===============================

app.listen(PORT, () => {
  console.log(`🚀 AI Math Proxy running on port ${PORT}`);
});
