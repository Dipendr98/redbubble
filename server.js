import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Proxy stream to GitHub Models API for GPT-4o
app.post('/api/generate', async (req, res) => {
  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: { message: "GITHUB_TOKEN is missing on the server" } });
  }

  try {
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: { message: `API error: ${response.status} - ${err}` } });
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (response.body) {
      if (typeof Readable.fromWeb === 'function') {
        Readable.fromWeb(response.body).pipe(res);
      } else {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      }
    } else {
      res.status(500).json({ error: { message: "No response body received" } });
    }
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

/** New: Image Proxy to prevent CORS/URL-length issues (Zero-Latency Streaming) */
app.get('/api/image', async (req, res) => {
  const { prompt, model, seed, width, height } = req.query;
  if (!prompt) return res.status(400).send("Prompt required");

  const q = new URLSearchParams();
  // Default to 'turbo' for blazing fast results in standard mode
  q.set("model", model || "turbo"); 
  if (seed) q.set("seed", seed);
  q.set("width", width || "1024");
  q.set("height", height || "1024");
  if (process.env.VITE_POLLINATIONS_API_KEY) q.set("pollen", process.env.VITE_POLLINATIONS_API_KEY);

  const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${q.toString()}`;
  
  try {
    const response = await fetch(pollUrl);
    if (!response.ok) throw new Error("Pollinations fail");
    
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Pipe response stream directly for instant delivery
    if (response.body) {
      if (typeof Readable.fromWeb === 'function') {
        Readable.fromWeb(response.body).pipe(res);
      } else {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      }
    }
  } catch (error) {
    res.status(500).send("Imaging failed");
  }
});

// Serve frontend assets
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
