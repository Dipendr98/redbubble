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

/* ─── API: Optimize & Review Prompt (Council of 4 Agents) ─── */
app.post('/api/optimize-prompt', async (req, res) => {
  const { prompt } = req.body;
  const token = process.env.GITHUB_TOKEN;
  if (!prompt) return res.status(400).send("Prompt required");
  if (!token) return res.json({ optimized: prompt });

  try {
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are the Leader of the "Council of 4 Sticker Agents":
1. AGENT COMPOSITION: Ensures full body visibility and 10% safety margin.
2. AGENT ANATOMY: Ensures perfect subject features and recognizable DNA.
3. AGENT LIGHTING: Ensures cinematic ray-traced shadows and global illumination.
4. AGENT MATERIAL: Ensures premium die-cut vinyl texture and white outline.

Your task: Review the user idea, let the agents "debate" internally, and then output the SINGLE PERFECT CONSOLIDATED PROMPT that combines all their wisdom.
Output ONLY the final consolidated prompt text (max 450 chars). No preamble.` },
          { role: "user", content: `Council, perfect this idea: "${prompt}"` }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const optimized = data.choices[0].message.content.replace(/^"|"$/g, '').trim();
    res.json({ optimized });
  } catch (error) {
    res.json({ optimized: prompt }); 
  }
});

/* ─── API: Optimize & Review Prompt (Senior Orchestrator) ──── */
app.post('/api/optimize-prompt', async (req, res) => {
  const { prompt } = req.body;
  const token = process.env.GITHUB_TOKEN;
  if (!prompt) return res.status(400).send("Prompt required");
  if (!token) return res.json({ optimized: prompt }); // Fallback if no token

  try {
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a Senior Sticker Art Director. Rewrite the user prompt into a high-fidelity 'Masterpiece Sticker Brief'.\nRules:\n1. Ensure the subject is FULLY VISIBLE and centered (no cutoffs).\n2. Add keywords for: die-cut vinyl, thick white outline, centered composition, high-res detail, cinematic lighting.\n3. Output ONLY the optimized prompt text." },
          { role: "user", content: `Review and perfect this idea for a high-quality sticker: "${prompt}"` }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const optimized = data.choices[0].message.content.replace(/^"|"$/g, '').trim();
    res.json({ optimized });
  } catch (error) {
    res.json({ optimized: prompt }); 
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
