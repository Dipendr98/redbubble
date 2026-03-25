import { useState, useCallback, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   REDBUBBLE STICKER STUDIO — Universal Edition
   
   SMART ENGINE AUTO-DETECTION:
   ┌─ Backend Proxy → GPT-4o (SVG)
   └─ Fallback → Pollinations.ai (PNG images, no key)
   
   User can also manually switch engines.
   ═══════════════════════════════════════════════════════════════════ */

/* ─── STYLE PRESETS ──────────────────────────────────────── */
const STYLES = [
  { id:"die-cut", label:"Die-Cut Classic", icon:"✂️", bg:"#e45c3a",
    img:"die-cut sticker design, thick white border outline, clean edges, isolated on solid white background, vinyl sticker",
    svg:`Clean die-cut vinyl sticker. Bold flat colors, subtle gradients. 4px white (#fff) border shape behind entire design. Clean print-safe shapes. Gentle drop shadows for depth.` },
  { id:"kawaii", label:"Kawaii Cute", icon:"🌸", bg:"#e879a8",
    img:"kawaii cute chibi style sticker, pastel colors, big sparkly eyes, rosy blush cheeks, adorable, die-cut white border, white background",
    svg:`Kawaii chibi cute style. Soft pastels (pinks, lavenders, baby blues, mint). Oversized head, tiny body, huge sparkly eyes with white highlight dots, rosy blush circles on cheeks. Add sparkle stars ✦ and hearts. All rounded shapes. White border behind.` },
  { id:"3d", label:"3D Glossy", icon:"🔮", bg:"#7c5ce0",
    img:"3D glossy puffy sticker, glossy highlights, dimensional depth, specular reflections, bold colors, thick white outline, white background",
    svg:`3D glossy puffy sticker. Rich saturated colors, multiple gradient layers for 3D depth. White specular gloss ellipses/strokes for shine highlights. Bold feDropShadow. Thick white border shape behind design.` },
  { id:"retro", label:"Retro Badge", icon:"🎖️", bg:"#d97706",
    img:"vintage retro badge sticker, warm colors amber cream rust navy, concentric borders, emblem style, white background",
    svg:`Vintage retro badge/emblem. Warm palette (amber, cream, rust, navy). Concentric border rings/shapes. Centered symmetric composition. Vintage feel. Distressed texture overlay pattern.` },
  { id:"watercolor", label:"Watercolor", icon:"🎨", bg:"#0ea5a0",
    img:"watercolor illustration sticker, soft translucent washes, delicate brush strokes, artistic style, die-cut, white background",
    svg:`Delicate watercolor illustration. Soft translucent color fills with organic edges. 3-4 harmonious colors blending. Flowing organic shapes. White border behind. Gentle and artistic.` },
  { id:"neon", label:"Neon Glow", icon:"💡", bg:"#a855f7",
    img:"neon glow sticker, bright neon colors on black background, glowing edges, neon sign style, die-cut",
    svg:`Neon glow on dark background. Near-black (#0d0d1e) rounded-rect background. Subject drawn with bright neon strokes (cyan #00ffff, magenta #ff00ff, hot pink #ff1493). Add feGaussianBlur glow filters. Neon sign aesthetic.` },
  { id:"pixel", label:"Pixel Art", icon:"👾", bg:"#3b82f6",
    img:"pixel art sticker, retro 16-bit game aesthetic, clean pixel grid, limited palette, nostalgic, white border, white background",
    svg:`16-bit pixel art. Build with small 6x6px rectangles as pixels. Limited 8-12 color palette. Sharp edges, no smoothing. Retro video game aesthetic. White border.` },
  { id:"holo", label:"Holographic", icon:"🌈", bg:"#ec4899",
    img:"holographic iridescent sticker, rainbow chrome gradient, metallic foil, prismatic spectral, shiny reflective, white border, white background",
    svg:`Holographic iridescent chrome. Multiple linearGradient fills cycling full rainbow spectrum. Metallic chrome reflective look. Prismatic spectral bands. Shiny bold surfaces. White border.` },
];

const IDEAS = [
  { icon:"🐱", label:"Cat", p:"a cute cat with big sparkly eyes" },
  { icon:"🐸", label:"Frog", p:"a happy frog wearing a tiny crown" },
  { icon:"🍕", label:"Pizza", p:"a cheerful pizza slice with a face" },
  { icon:"☕", label:"Coffee", p:"a cozy coffee cup with steam hearts" },
  { icon:"🌵", label:"Cactus", p:"a cute cactus in a decorated pot" },
  { icon:"🚀", label:"Rocket", p:"a colorful rocket ship blasting off" },
  { icon:"🎸", label:"Guitar", p:"an electric guitar with lightning" },
  { icon:"🦊", label:"Fox", p:"a sleepy fox curled in autumn leaves" },
  { icon:"🍄", label:"Mushroom", p:"a magical mushroom with fairy lights" },
  { icon:"💀", label:"Skull", p:"a sugar skull with flowers" },
  { icon:"🦋", label:"Butterfly", p:"a butterfly with ornate wings" },
  { icon:"🐙", label:"Octopus", p:"a playful octopus with items" },
];

const ORCHESTRATOR_LEVELS = [
  { id: "standard", label: "Standard" },
  { id: "advanced", label: "Advanced" },
  { id: "cinematic", label: "Cinematic" },
];

const OUTPUT_MODES = [
  { id: "sticker-pro", label: "Sticker Pro", hint: "Best for Redbubble sticker listing" },
  { id: "hero-real", label: "Hero Real", hint: "Photoreal product-hero style image" },
];

function buildOrchestratorBrief(prompt, outputMode, level) {
  const modeText = outputMode === "hero-real"
    ? "Create a realistic hero image with studio lighting, premium materials, depth, accurate shadows, and premium e-commerce look."
    : "Create a commercial sticker composition with die-cut silhouette, strong readability, and marketplace-friendly contrast.";

  const levelText = {
    standard: "Follow prompt accurately with clean composition.",
    advanced: "Use strict planning: subject fidelity, composition map, style constraints, and visual QA pass before final output.",
    cinematic: "Use advanced art direction: scene hierarchy, cinematic key/fill/rim lighting, realistic material response, and pro color grading."
  }[level] || "Follow prompt accurately with clean composition.";

  return `ORCHESTRATOR BRIEF:
- User request: "${prompt}"
- Output mode: ${outputMode}
- ${modeText}
- ${levelText}
- Never replace the requested subject with random objects.
- Keep the main subject dominant and centered with clear visual hierarchy.`;
}

/** Keep image URLs short — long prompts break CDNs, proxies, and Pollinations GET limits. */
const POLL_URL_MAX = 800;
const POLLINATIONS_API_KEY = "sk_mMB4aVvYz9mfqbZhttnz2BQl1DPtzeKE";

function buildPollinationsPromptCompact(userPrompt, styleImgPrompt, outputMode, orchestratorLevel) {
  const u = (userPrompt || "").trim().replace(/\s+/g, " ").slice(0, 320);
  const st = (styleImgPrompt || "").trim().replace(/\s+/g, " ").slice(0, 160);
  
  // Model-specific reinforcement for "Best Model" (Flux/Z-image)
  const quality = orchestratorLevel === "cinematic" 
    ? "ultra-detailed, 8k, cinematic lighting, masterpiece, sharp focus" 
    : "high resolution, clean details, professional work";

  const mode =
    outputMode === "hero-real"
      ? `${quality}, photoreal hero product shot, studio light, soft shadow, premium ecommerce, depth of field`
      : `${quality}, die-cut vinyl sticker, thick white outline, centered, clean silhouette, isolated on white background, no text, no watermark`;
      
  const lvl =
    orchestratorLevel === "cinematic"
      ? "hyper-realistic materials, rich vibrant color, global illumination"
      : orchestratorLevel === "advanced"
        ? "perfectly balanced artistic composition"
        : "";

  const tail = "single centered object, coherent architecture, no background artifacts";
  let out = [u, st, mode, lvl, tail].filter(Boolean).join(", ");
  
  // Final cleaning to avoid bad characters in URL
  out = out.replace(/[^a-zA-Z0-9\s,._-]/g, "");
  
  if (out.length > POLL_URL_MAX) out = out.slice(0, POLL_URL_MAX);
  return out;
}

function pollinationsImageUrl(promptText, opts) {
  const {
    width = 1024,
    height = 1024,
    seed,
    model = "flux", // "flux" is the current best model for overall quality
    nologo = true,
  } = opts;
  const q = new URLSearchParams();
  q.set("width", String(width));
  q.set("height", String(height));
  q.set("seed", String(seed));
  if (nologo) q.set("nologo", "true");
  q.set("model", model);
  
  // Enhance and Security
  if (model === "flux" || model === "zimage") q.set("enhance", "true");
  if (POLLINATIONS_API_KEY) q.set("pollen", POLLINATIONS_API_KEY);
  
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?${q.toString()}`;
}

/* ─── SVG SYSTEM PROMPT (PERFORMANCE TUNED) ──────────────── */
const SVG_SYS = `You are an elite AI Vector Artist. Generate a high-quality, commercial SVG sticker for Redbubble.
- Root: <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
- Style: Clean die-cut, thick white (#fff) border, professional layering.
- Technique: Efficient <path> geometry with clean Bezier curves. Use <defs> for gradients.
- Rules: NO text, NO markdown, ONLY raw <svg> code.
- Optimize: High visual impact with minimal path complexity for speed.`;

/* ─── API ENGINE (Streaming & Proxy Optimized) ────────────── */
async function generateWithStreaming(prompt, styleSvgPrompt, outputMode, orchestratorLevel, onChunk) {
  const orchestratorBrief = buildOrchestratorBrief(prompt, outputMode, orchestratorLevel);
  const userMsg = `${orchestratorBrief}\n\nStyle: ${styleSvgPrompt}\n\nOutput ONLY the raw SVG code.`;

  // Try local proxy first (usually GPT-4o, very fast), fallback to Pollinations
  let url = "/api/generate";
  let body = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: SVG_SYS },
      { role: "user", content: userMsg }
    ],
    stream: true
  };

  try {
    let res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.warn("Proxy failed, falling back to direct Pollinations...");
      url = "https://gen.pollinations.ai/v1/chat/completions";
      body.model = "claude-large";
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    if (!res.ok) throw new Error("API error: " + res.status);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices[0]?.delta?.content || "";
            fullContent += content;
            if (onChunk) onChunk(fullContent);
          } catch (e) {}
        }
      }
    }

    const match = fullContent.match(/<svg[\s\S]*?<\/svg>/i);
    if (!match) throw new Error("No SVG found in response.");
    return { type: "svg", svg: match[0] };
  } catch (err) {
    throw err;
  }
}

/* ─── POLLINATIONS ENGINE (Fallback) ─────────────────────── */
function generateWithPollinations(prompt, styleImgPrompt, seed, outputMode, orchestratorLevel) {
  const compact = buildPollinationsPromptCompact(prompt, styleImgPrompt, outputMode, orchestratorLevel);
  const w = 1024;
  const h = 1024;
  const url = pollinationsImageUrl(compact, { width: w, height: h, seed, model: "flux" });
  return {
    type: "image",
    url,
    seed,
    imagePrompt: compact,
    pollW: w,
    pollH: h,
    pollModel: "flux",
  };
}

function pollinationsHiRes(imagePrompt, seed, pollModel, outputMode) {
  const size = outputMode === "hero-real" ? 1536 : 1536;
  return pollinationsImageUrl(imagePrompt, {
    width: size,
    height: size,
    seed,
    model: pollModel || "flux",
  });
}

function pollinationsRetryUrl(entry, styleImgPrompt, attempt) {
  const seed = Math.floor(Math.random() * 999999);
  let compact = entry.imagePrompt;
  let w = 1024;
  let h = 1024;
  let model = entry.pollModel || "flux";
  let nologo = true;

  if (attempt === 1) {
    model = "zimage";
    w = 1024;
    h = 1024;
  } else if (attempt === 2) {
    model = "turbo";
    w = 768;
    h = 768;
  } else {
    const minimal = buildPollinationsPromptCompact(entry.prompt || "", styleImgPrompt || "", entry.outputMode || "sticker-pro", "standard");
    compact = minimal.slice(0, 400);
    model = "turbo";
    w = 512;
    h = 512;
    nologo = false;
  }

  return {
    url: pollinationsImageUrl(compact, { width: w, height: h, seed, model, nologo }),
    seed,
    imagePrompt: compact,
    pollW: w,
    pollH: h,
    pollModel: model,
  };
}

/* ─── DOWNLOAD HELPERS ───────────────────────────────────── */
function dlLink(url, name) {
  const a = document.createElement("a"); a.href = url; a.download = name; a.target="_blank";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function dlSvg(svgStr, name) {
  const b = new Blob([svgStr], { type:"image/svg+xml;charset=utf-8" });
  const u = URL.createObjectURL(b); dlLink(u, name);
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}

async function svgToPng(svgStr, size) {
  return new Promise((res, rej) => {
    const b = new Blob([svgStr], { type:"image/svg+xml;charset=utf-8" });
    const u = URL.createObjectURL(b);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width=size; c.height=size;
      c.getContext("2d").drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(u);
      try { res(c.toDataURL("image/png")); } catch(e) { rej(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("render fail")); };
    img.src = u;
  });
}

async function fetchAsDownload(imgUrl, name) {
  try {
    const r = await fetch(imgUrl); const b = await r.blob();
    const u = URL.createObjectURL(b); dlLink(u, name);
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  } catch { window.open(imgUrl, "_blank"); }
}

/* ─── SVG MOCKUP ─────────────────────────────────────────── */
function SvgMockup({ svg }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", bottom:-11, left:"14%", right:"14%", height:26, background:"radial-gradient(ellipse,rgba(0,0,0,.26) 0%,transparent 70%)", filter:"blur(9px)" }} />
        <div style={{ width:270, height:270, borderRadius:28, background:"#fff", padding:11, boxShadow:"0 1px 4px rgba(0,0,0,.08),0 10px 40px rgba(0,0,0,.16)", position:"relative", overflow:"hidden" }}>
          <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width:"100%", height:"100%", borderRadius:19 }} />
          <div style={{ position:"absolute", top:11, left:11, right:"46%", bottom:"54%", borderRadius:"19px 19px 55% 0", background:"linear-gradient(158deg,rgba(255,255,255,.32) 0%,transparent 100%)", pointerEvents:"none" }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:9, alignItems:"flex-end", animation:"fadeSlide .3s ease" }}>
        {[54,40,28].map((sz,i) => (
          <div key={i} style={{ width:sz, height:sz, borderRadius:sz*.19, background:"#fff", padding:3, boxShadow:"0 3px 12px rgba(0,0,0,.14)", overflow:"hidden" }}>
            <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width:"100%", height:"100%", borderRadius:sz*.12 }} />
          </div>
        ))}
        <span style={{ fontSize:10, color:"var(--t3)", fontFamily:"var(--mono)", marginLeft:4 }}>size variants</span>
      </div>
    </div>
  );
}

/* ─── IMAGE MOCKUP ───────────────────────────────────────── */
function ImgMockup({ src, onLoad, onError, loading }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", bottom:-11, left:"14%", right:"14%", height:26, background:"radial-gradient(ellipse,rgba(0,0,0,.26) 0%,transparent 70%)", filter:"blur(9px)" }} />
        <div style={{ width:270, height:270, borderRadius:28, background:"#fff", padding:11, boxShadow:"0 1px 4px rgba(0,0,0,.08),0 10px 40px rgba(0,0,0,.16)", position:"relative", overflow:"hidden" }}>
          {loading && (
            <div style={{ position:"absolute", inset:11, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2, background:"rgba(255,255,255,.93)", borderRadius:19 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #f3f0ff", borderTopColor:"var(--accent)", animation:"spin .9s linear infinite", marginBottom:8 }} />
              <span style={{ fontSize:10, color:"var(--accent)", fontFamily:"var(--mono)" }}>loading image...</span>
              <span style={{ fontSize:9, color:"#aaa", fontFamily:"var(--mono)", marginTop:2 }}>~15-30 sec</span>
            </div>
          )}
          <img
            key={src}
            src={src}
            alt="sticker"
            referrerPolicy="no-referrer"
            onLoad={onLoad}
            onError={onError}
            style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:19, display:"block", opacity:loading?0:1, transition:"opacity .4s" }}
          />
          <div style={{ position:"absolute", top:11, left:11, right:"46%", bottom:"54%", borderRadius:"19px 19px 55% 0", background:"linear-gradient(158deg,rgba(255,255,255,.32) 0%,transparent 100%)", pointerEvents:"none", opacity:loading?0:1 }} />
        </div>
      </div>
      {!loading && (
        <div style={{ display:"flex", gap:9, alignItems:"flex-end", animation:"fadeSlide .3s ease" }}>
          {[54,40,28].map((sz,i) => (
            <div key={i} style={{ width:sz, height:sz, borderRadius:sz*.19, background:"#fff", padding:3, boxShadow:"0 3px 12px rgba(0,0,0,.14)", overflow:"hidden" }}>
              <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:sz*.12 }} />
            </div>
          ))}
          <span style={{ fontSize:10, color:"var(--t3)", fontFamily:"var(--mono)", marginLeft:4 }}>size variants</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [engine, setEngine] = useState("claude");
  const [detectedEngine, setDetectedEngine] = useState("claude");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("die-cut");
  const [outputMode, setOutputMode] = useState("sticker-pro");
  const [orchestratorLevel, setOrchestratorLevel] = useState("advanced");
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [dlStatus, setDlStatus] = useState("");

  const activeEngine = engine === "auto" ? detectedEngine : engine;
  const sel = STYLES.find(s => s.id === style) || STYLES[0];

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("https://gen.pollinations.ai/v1/models");
        if (r.ok) {
          setDetectedEngine("claude");
        } else {
          setDetectedEngine("pollinations");
        }
      } catch {
        setDetectedEngine("pollinations");
      }
    })();
  }, []);

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    let eng = engine === "auto" ? (detectedEngine || "pollinations") : engine;
    if (outputMode === "hero-real") eng = "pollinations";
    setLoading(true); setError(""); setResult(null); setDlStatus(""); setImgLoading(false);

    try {
      if (eng === "claude") {
        const result = await generateWithStreaming(
          prompt.trim(), 
          sel.svg, 
          outputMode, 
          orchestratorLevel,
          (partialContent) => {
            const match = partialContent.match(/<svg[\s\S]*?<\/svg>/i);
            if (match) {
              setResult({ type: "svg", svg: match[0], prompt: prompt.trim(), style, outputMode, orchestratorLevel, ts: Date.now(), streaming: true });
            }
          }
        );
        const entry = { ...result, prompt: prompt.trim(), style, outputMode, orchestratorLevel, ts: Date.now(), streaming: false };
        setResult(entry);
        setHistory(h => [entry, ...h].slice(0, 14));
      } else {
        const seed = Math.floor(Math.random() * 999999);
        const r = generateWithPollinations(prompt.trim(), sel.img, seed, outputMode, orchestratorLevel);
        const entry = {
          ...r,
          prompt: prompt.trim(),
          style,
          outputMode,
          orchestratorLevel,
          imageLoadAttempt: 0,
          ts: Date.now(),
        };
        setResult(entry);
        setImgLoading(true);
      }
    } catch (err) {
      setError(err.message || "Generation failed. Try again.");
      setLoading(false);
      return;
    }
    if (eng === "claude") setLoading(false);
  }, [prompt, style, loading, engine, detectedEngine, sel, outputMode, orchestratorLevel]);

  const onImgLoad = useCallback(() => {
    setImgLoading(false); setLoading(false);
    setResult(prev => {
      if (prev) setHistory(h => { if (h.some(x => x.ts===prev.ts)) return h; return [prev,...h].slice(0,14); });
      return prev;
    });
  }, []);

  const onImgError = useCallback(() => {
    setResult(prev => {
      if (!prev || prev.type !== "image") {
        setImgLoading(false);
        setLoading(false);
        setError("Image failed to load.");
        return null;
      }
      const attempt = (prev.imageLoadAttempt || 0) + 1;
      const styleImg = STYLES.find(s => s.id === prev.style)?.img || "";
      if (attempt > 3) {
        setImgLoading(false);
        setLoading(false);
        setError("Image failed after retries. Click Generate again, try a shorter prompt, or use GPT-4o SVG if your API proxy is available.");
        return null;
      }
      setError("");
      setImgLoading(true);
      const next = pollinationsRetryUrl(prev, styleImg, attempt);
      return {
        ...prev,
        ...next,
        imageLoadAttempt: attempt,
      };
    });
  }, []);

  const selectHist = useCallback((item) => {
    setResult(item); setPrompt(item.prompt); setStyle(item.style);
    if (item.outputMode) setOutputMode(item.outputMode);
    if (item.orchestratorLevel) setOrchestratorLevel(item.orchestratorLevel);
    setError(""); setDlStatus(""); setLoading(false); setImgLoading(false);
  }, []);

  const download = useCallback(async (hiRes) => {
    if (!result) return;
    setDlStatus("dl");
    try {
      if (result.type === "svg") {
        if (hiRes) {
          const png = await svgToPng(result.svg, 2048);
          dlLink(png, `sticker-2048-${Date.now()}.png`);
        } else {
          dlSvg(result.svg, `sticker-${Date.now()}.svg`);
        }
      } else {
        const styleImg = STYLES.find(s=>s.id===result.style)?.img || "";
        const imgPrompt =
          result.imagePrompt ||
          buildPollinationsPromptCompact(result.prompt, styleImg, result.outputMode || outputMode, result.orchestratorLevel || orchestratorLevel);
        if (hiRes) {
          const u = pollinationsHiRes(imgPrompt, result.seed, result.pollModel, result.outputMode || outputMode);
          await fetchAsDownload(u, `sticker-HQ-${result.seed}.png`);
        } else {
          await fetchAsDownload(result.url, `sticker-${result.seed}.png`);
        }
      }
      setDlStatus("done");
    } catch { setDlStatus("done"); }
    setTimeout(() => setDlStatus(""), 2500);
  }, [result, outputMode, orchestratorLevel]);

  const hasResult = result && ((result.type==="svg") || (result.type==="image" && !imgLoading));

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --bg:#0c0c11;--bg1:rgba(255,255,255,.022);--bg2:rgba(255,255,255,.038);--bgH:rgba(255,255,255,.065);
          --bdr:rgba(255,255,255,.055);--bdrA:rgba(228,92,58,.4);--accent:#e45c3a;--accentG:rgba(228,92,58,.13);
          --accent2:#f0a030;--ok:#34d399;--t1:#edeef2;--t2:rgba(255,255,255,.52);--t3:rgba(255,255,255,.22);--t4:rgba(255,255,255,.1);
          --dsp:'Syne',sans-serif;--body:'DM Sans',sans-serif;--mono:'DM Mono',monospace;
        }
        *{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg)}
        .root{min-height:100vh;background:var(--bg);font-family:var(--body);color:var(--t1)}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes shimmer{0%{background-position:-250% center}100%{background-position:250% center}}
        textarea:focus,input:focus{outline:none}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.06);border-radius:10px}
        .P{background:var(--bg1);border:1px solid var(--bdr);border-radius:18px;padding:20px}
        .L{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:10px}
        .SC{transition:all .2s;cursor:pointer;user-select:none}.SC:hover{transform:translateY(-1px);background:var(--bgH)!important}
        .PL{transition:all .15s;cursor:pointer;user-select:none}.PL:hover{background:var(--bgH)!important;transform:scale(1.04)}
        .GB{transition:all .22s}.GB:not(:disabled):hover{transform:translateY(-2px);filter:brightness(1.08);box-shadow:0 8px 30px rgba(228,92,58,.35)!important}.GB:not(:disabled):active{transform:translateY(1px)}
        .AB{transition:all .18s;cursor:pointer}.AB:hover{background:var(--bgH)!important;transform:translateY(-1px)}
        .HT{transition:all .18s;cursor:pointer}.HT:hover{transform:scale(1.1);border-color:var(--bdrA)!important}
      `}</style>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-12%",left:"-6%",width:600,height:600,background:"radial-gradient(circle,rgba(228,92,58,.055) 0%,transparent 55%)",borderRadius:"50%"}} />
        <div style={{position:"absolute",bottom:"-8%",right:"-4%",width:500,height:500,background:"radial-gradient(circle,rgba(240,160,48,.035) 0%,transparent 55%)",borderRadius:"50%"}} />
        <div style={{position:"absolute",inset:0,opacity:.016,backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"28px 28px"}} />
      </div>
      <div style={{position:"relative",zIndex:1,maxWidth:1120,margin:"0 auto",padding:"28px 20px 70px"}}>
        <header style={{textAlign:"center",marginBottom:30,animation:"fadeSlide .5s ease"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"var(--accentG)",border:"1px solid rgba(228,92,58,.2)",borderRadius:99,padding:"5px 16px",marginBottom:12}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"var(--accent)",display:"inline-block",animation:"pulse 2s ease infinite"}} />
            <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)",letterSpacing:2,textTransform:"uppercase"}}>Sticker Studio</span>
          </div>
          <h1 style={{fontFamily:"var(--dsp)",fontSize:"clamp(28px,5vw,48px)",fontWeight:800,lineHeight:1.08,marginBottom:8,background:"linear-gradient(135deg,#fff 20%,var(--accent) 55%,var(--accent2) 90%)",backgroundSize:"250% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 6s linear infinite"}}>
            Design. Preview. Sell.
          </h1>
          <p style={{color:"var(--t3)",fontFamily:"var(--mono)",fontSize:11}}>
            AI sticker generator · Redbubble-ready · {activeEngine === "claude" ? "Claude 3.5 SVG Engine" : activeEngine === "pollinations" ? "Pollinations image engine" : "detecting engine..."}
          </p>
        </header>
        <div style={{display:"grid",gridTemplateColumns:"420px 1fr",gap:20,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:13,animation:"fadeSlide .55s ease"}}>
            <div className="P" style={{padding:"14px 16px"}}>
              <div style={{display:"flex",gap:5,background:"var(--bg2)",borderRadius:11,padding:3}}>
                {[
                  {id:"auto",label:"Auto",desc:"Smart detection"},
                  {id:"claude",label:"Claude SVG",desc:"Vector art"},
                  {id:"pollinations",label:"AI Image",desc:"Photo-real"},
                ].map(e => (
                  <button key={e.id} onClick={() => setEngine(e.id)} style={{
                    flex:1,padding:"7px 4px",borderRadius:9,border:"none",cursor:"pointer",
                    background:engine===e.id?"var(--accentG)":"transparent",
                    color:engine===e.id?"var(--accent)":"var(--t2)",
                    fontFamily:"var(--mono)",fontSize:10,fontWeight:500,transition:"all .18s",
                  }}>
                    {e.label}
                  </button>
                ))}
              </div>
              <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:7,lineHeight:1.5}}>
                {engine==="auto" && `Auto-detected: ${detectedEngine==="claude"?"Claude 3.5 SVG Engine":detectedEngine==="pollinations"?"Pollinations (fallback mode)":"detecting..."}`}
                {engine==="claude" && "Claude 3.5 Sonnet generates high-quality premium SVG stickers via Pollinations"}
                {engine==="pollinations" && "Pollinations generates AI images (fallback mode)"}
              </div>
            </div>
            <div className="P">
              <label className="L">✦ Describe your sticker</label>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))generate()}}
                placeholder="e.g. a cute girl wearing a hairband with flowers..."
                rows={3}
                style={{width:"100%",background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:13,padding:"12px 14px",color:"var(--t1)",fontSize:14,resize:"none",fontFamily:"var(--body)",lineHeight:1.55,transition:"border .2s,box-shadow .2s"}}
                onFocus={e=>{e.target.style.borderColor="var(--bdrA)";e.target.style.boxShadow="0 0 0 3px var(--accentG)"}}
                onBlur={e=>{e.target.style.borderColor="var(--bdr)";e.target.style.boxShadow="none"}}
              />
              <span style={{fontSize:9,color:"var(--t4)",fontFamily:"var(--mono)",marginTop:5,display:"block"}}>⌘+Enter to generate</span>
            </div>
            <div className="P">
              <label className="L">Quick ideas</label>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {IDEAS.map(i=>(
                  <div key={i.label} className="PL" onClick={()=>setPrompt(i.p)}
                    style={{padding:"5px 10px",borderRadius:18,background:"var(--bg2)",border:"1px solid var(--bdr)",fontSize:12,color:"var(--t2)",display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:13}}>{i.icon}</span>{i.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="P">
              <label className="L">Output Mode</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {OUTPUT_MODES.map(m=>(
                  <button key={m.id} className="AB" onClick={()=>setOutputMode(m.id)} style={{
                    textAlign:"left",padding:"10px 11px",borderRadius:11,border:`1px solid ${outputMode===m.id?"var(--bdrA)":"var(--bdr)"}`,
                    background:outputMode===m.id?"var(--accentG)":"var(--bg2)",color:outputMode===m.id?"var(--t1)":"var(--t2)"
                  }}>
                    <div style={{fontSize:12,fontWeight:600}}>{m.label}</div>
                    <div style={{fontSize:9,fontFamily:"var(--mono)",opacity:.8,marginTop:2}}>{m.hint}</div>
                  </button>
                ))}
              </div>
              {outputMode==="hero-real" && (
                <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:8}}>
                  Hero Real uses image engine automatically for realistic output.
                </div>
              )}
            </div>
            <div className="P">
              <label className="L">Orchestrator Level</label>
              <div style={{display:"flex",gap:6}}>
                {ORCHESTRATOR_LEVELS.map(l=>(
                  <button key={l.id} className="AB" onClick={()=>setOrchestratorLevel(l.id)} style={{
                    flex:1,padding:"9px 7px",borderRadius:10,border:`1px solid ${orchestratorLevel===l.id?"var(--bdrA)":"var(--bdr)"}`,
                    background:orchestratorLevel===l.id?"var(--accentG)":"var(--bg2)",
                    color:orchestratorLevel===l.id?"var(--t1)":"var(--t2)",fontSize:11,fontFamily:"var(--mono)"
                  }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="P">
              <label className="L">Sticker style</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {STYLES.map(s=>(
                  <div key={s.id} className="SC" onClick={()=>setStyle(s.id)}
                    style={{padding:"10px 12px",borderRadius:12,background:style===s.id?`linear-gradient(135deg,${s.bg}18,${s.bg}0a)`:"var(--bg2)",border:`1.5px solid ${style===s.id?s.bg+"50":"var(--bdr)"}`,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16,flexShrink:0}}>{s.icon}</span>
                    <span style={{fontSize:12,fontWeight:600,color:style===s.id?"var(--t1)":"var(--t2)"}}>{s.label}</span>
                    {style===s.id&&<div style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:s.bg,boxShadow:`0 0 10px ${s.bg}`}} />}
                  </div>
                ))}
              </div>
            </div>
            <button className="GB" onClick={generate} disabled={loading||!prompt.trim()||(!detectedEngine&&engine==="auto")}
              style={{
                padding:"15px 0",borderRadius:15,border:"none",
                cursor:loading||!prompt.trim()?"not-allowed":"pointer",
                background:loading||!prompt.trim()?"rgba(228,92,58,.12)":"linear-gradient(135deg,#c93a1e,#e45c3a,#f0a030)",
                color:"#fff",fontSize:15,fontWeight:700,fontFamily:"var(--dsp)",letterSpacing:.5,
                boxShadow:loading?"none":"0 6px 28px rgba(228,92,58,.3)",
                display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              }}>
              {!detectedEngine && engine==="auto" ? (
                <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}} />Detecting engine...</>
              ) : loading ? (
                <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}} />Generating...</>
              ) : "✦  Generate Sticker"}
            </button>
            {error && (
              <div style={{background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.15)",borderRadius:13,padding:"10px 14px",fontSize:12,color:"#f87171"}}>
                ⚠ {error}
              </div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:13,animation:"fadeSlide .65s ease"}}>
            <div className="P" style={{padding:28,minHeight:450,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              {!result && !loading && (
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:52,opacity:.1,marginBottom:12}}>✂️</div>
                  <p style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)"}}>your sticker preview appears here</p>
                  <p style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t4)",marginTop:4}}>
                    engine: {activeEngine==="claude"?"Claude 3.5 SVG Engine":activeEngine==="pollinations"?"Pollinations AI":"auto-detecting..."}
                  </p>
                </div>
              )}
              {loading && !result && (
                <div style={{textAlign:"center",animation:"fadeSlide .3s ease"}}>
                  <div style={{width:56,height:56,margin:"0 auto 14px",position:"relative"}}>
                    <div style={{width:56,height:56,borderRadius:"50%",border:"3px solid var(--bdr)",borderTopColor:"var(--accent)",animation:"spin .9s linear infinite"}} />
                    <div style={{position:"absolute",inset:9,borderRadius:"50%",border:"3px solid var(--bdr)",borderBottomColor:"var(--accent2)",animation:"spin 1.4s linear infinite reverse"}} />
                  </div>
                  <p style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)",animation:"pulse 1.5s ease infinite"}}>
                    {activeEngine==="claude"?"Claude is drawing your sticker...":`AI is generating sticker via ${result?.pollModel || "Flux"}...`}
                  </p>
                </div>
              )}
               {(result?.type==="svg" && (!loading || result.streaming)) && (
                <div style={{animation:"fadeSlide .4s ease"}}><SvgMockup svg={result.svg} /></div>
              )}
              {result?.type==="image" && (
                <div style={{animation:"fadeSlide .3s ease"}}>
                  <ImgMockup src={result.url} onLoad={onImgLoad} onError={onImgError} loading={imgLoading} />
                </div>
              )}
              {hasResult && (
                <div style={{textAlign:"center",marginTop:14,animation:"fadeSlide .4s ease .1s both"}}>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--accentG)",border:"1px solid rgba(228,92,58,.2)",borderRadius:10,padding:"4px 13px",fontSize:10,color:"var(--accent)",fontFamily:"var(--mono)"}}>
                    ⬟ {result.type==="svg"?"SVG":"PNG"} · {sel.label}
                  </div>
                </div>
              )}
            </div>
            {hasResult && (
              <div style={{display:"flex",gap:8,animation:"fadeSlide .3s ease"}}>
                <button className="AB" onClick={()=>download(true)} style={{
                  flex:3,padding:"13px 0",borderRadius:13,border:"1px solid rgba(52,211,153,.25)",
                  background:dlStatus==="done"?"rgba(52,211,153,.1)":"rgba(52,211,153,.06)",
                  color:"var(--ok)",fontSize:13,fontWeight:600,fontFamily:"var(--body)",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                }}>
                  {dlStatus==="done"?"✓ Saved!":dlStatus==="dl"?"Exporting...":"🔥  Hi-Res PNG (2048px)"}
                </button>
                <button className="AB" onClick={()=>download(false)} style={{
                  flex:2,padding:"13px 0",borderRadius:13,border:"1px solid var(--bdr)",
                  background:"var(--bg2)",color:"var(--t2)",fontSize:13,fontWeight:500,fontFamily:"var(--body)",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                }}>
                  ⬇ {result.type==="svg"?"SVG":"PNG 1024"}
                </button>
                <button className="AB" onClick={generate} style={{
                  width:48,borderRadius:13,border:"1px solid var(--bdr)",background:"var(--bg2)",
                  color:"var(--t2)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
                }}>↺</button>
              </div>
            )}
            {hasResult && (
              <div style={{background:"rgba(52,211,153,.03)",border:"1px solid rgba(52,211,153,.1)",borderRadius:15,padding:"12px 16px",animation:"fadeSlide .4s ease .1s both"}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--ok)",marginBottom:4}}>📤 Upload to Redbubble</div>
                <div style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--mono)",lineHeight:1.8}}>
                  1. Download Hi-Res PNG 2048px (best for print)<br />
                  2. redbubble.com → Add New Work → Upload<br />
                  3. Enable "Stickers" → Set markup → Publish 🚀
                </div>
              </div>
            )}
            {history.length>0 && (
              <div className="P" style={{padding:15}}>
                <label className="L" style={{marginBottom:8}}>History ({history.length})</label>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {history.map((h,i)=>(
                    <div key={h.ts+"-"+i} className="HT" onClick={()=>selectHist(h)}
                      style={{width:54,height:54,borderRadius:11,overflow:"hidden",background:"#fff",padding:3,flexShrink:0,
                        border:`2px solid ${result?.ts===h.ts?"var(--bdrA)":"var(--bdr)"}`}}>
                      {h.type==="svg"
                        ? <div dangerouslySetInnerHTML={{__html:h.svg}} style={{width:"100%",height:"100%",borderRadius:7}} />
                        : <img src={h.url} alt="" style={{width:"100%",height:"100%",objectFit:"contain",borderRadius:7}} />
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:40,padding:"16px 0",borderTop:"1px solid var(--bdr)"}}>
          <p style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--t4)"}}>
            Claude 3.5 Engine → Vector SVG · Pollinations AI → Flux PNG
          </p>
        </div>
      </div>
    </div>
  );
}