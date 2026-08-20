import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API health endpoint
app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({ status: "ok", geminiAvailable: hasKey });
});

// Server-side Gemini generate endpoint
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, model = "gemini-3.7-flash", maxOutputTokens = 4000, temperature = 0.3 } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY environment variable is not configured on the server. Please enter an API key in the UI or Settings.",
      });
    }

    const config: any = {
      temperature,
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content from Gemini" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
