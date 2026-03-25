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
    advanced: "Prioritize artistic composition and subject fidelity.",
    cinematic: "Use advanced lighting and material depth for premium results."
  }[level] || "Follow prompt accurately with clean composition.";

  const detailChecklist = `
- COORDINATES: Use a center-aligned coordinate system. (0,0) is the center. 
- DRAWING AREA: All paths MUST stay within the -200 to +200 range (total width 400).
- SUBJECT DNA: Define signature features (mask, eyes, cowl, emblem) before code.
- COMPOSITION: Subject MUST be perfectly centered. Use symmetrical balancing.
- BORDER: A thick white (#fff) border MUST be the first graphic layer, slightly larger than the subject.`;

  return `ORCHESTRATOR BRIEF:
- User request: "${prompt}"
- Output mode: ${outputMode}
- ${modeText}
- ${levelText}
${detailChecklist}
- Keep the main subject dominant and centered with clear visual hierarchy.`;
}

/** Keep image URLs short — long prompts break CDNs, proxies, and Pollinations GET limits. */
const POLL_URL_MAX = 450; 
const PROXY_KEY = import.meta.env.VITE_GITHUB_TOKEN || "";
const POLLINATIONS_API_KEY = import.meta.env.VITE_POLLINATIONS_API_KEY || "sk_mMB4aVvYz9mfqbZhttnz2BQl1DPtzeKE";

function buildPollinationsPromptCompact(userPrompt, styleImgPrompt, outputMode, orchestratorLevel) {
  const u = (userPrompt || "").trim().replace(/\s+/g, " ").slice(0, 320);
  const st = (styleImgPrompt || "").trim().replace(/\s+/g, " ").slice(0, 160);
  
  const quality = "ultra-detailed masterpiece, photorealistic, 8k, sharp focus, cinematic lighting, professional studio work, intricate textures, masterpiece, ray-traced";

  const mode =
    outputMode === "hero-real"
      ? `${quality}, photoreal luxury hero product shot, cinema 4D, volumetric lighting, premium e-commerce depth`
      : `${quality}, premium die-cut vinyl sticker, thick clean white outline, centered, clean silhouette, isolated on white background, no text, no watermark`;
      
  const lvl = "hyper-realistic materials, vibrant global illumination, perfect artistic symmetry";

  let out = [u, st, mode, lvl].filter(Boolean).join(", ");
  out = out.replace(/[^a-zA-Z0-9\s,]/g, "");
  
  if (out.length > POLL_URL_MAX) out = out.slice(0, POLL_URL_MAX);
  return out;
}

function pollinationsImageUrl(promptText, opts) {
  const { width = 1024, height = 1024, seed, model = "flux" } = opts;
  const q = new URLSearchParams();
  q.set("model", model);
  q.set("seed", String(seed));
  q.set("width", String(width));
  q.set("height", String(height));
  q.set("prompt", promptText);
  q.set("enhance", "true"); 
  q.set("nologo", "true");  

  return `/api/image?${q.toString()}`;
}

/* ─── SVG SYSTEM PROMPT (SENIOR ARCHITECT EDITION) ───────── */
const SVG_SYS = `You are a Senior Vector Architect. Your task is to generate perfectly composed character stickers.
- Grid: Your coordinate system is center-based. The center of the character is (0, 0).
- Constraints: Maintain all paths within a -200 to +200 bounding box. This ensures NO cutoffs.
- Framing: The character must be fully visible and centered.
- Anatomy: For characters, ensure eyes, head, and features are proportionately correct.
- Format: Raw <svg> only. Root tag: <svg viewBox="-250 -250 500 500">.`;

async function generateWithStreaming(prompt, styleSvgPrompt, outputMode, orchestratorLevel, onChunk) {
  const orchestratorBrief = buildOrchestratorBrief(prompt, outputMode, orchestratorLevel);
  const userMsg = `${orchestratorBrief}\n\nStyle: ${styleSvgPrompt}\n\nOutput ONLY the raw SVG code.`;

  const pollKey = import.meta.env.VITE_POLLINATIONS_API_KEY || "";
  let url = "https://gen.pollinations.ai/v1/chat/completions";
  let body = {
    model: "openai", 
    messages: [
      { role: "system", content: SVG_SYS },
      { role: "user", content: userMsg }
    ],
    stream: true
  };

  const headers = { "Content-Type": "application/json" };
  if (pollKey) headers["Authorization"] = `Bearer ${pollKey}`;

  try {
    let res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

    if (!res.ok) {
      url = "/api/generate";
      body.model = "gpt-4o";
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`API Error: ${res.status} - ${errTxt.slice(0, 100)}`);
    }

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
    if (!match) throw new Error("No SVG found.");
    return { type: "svg", svg: match[0] };
  } catch (err) { throw err; }
}

function generateWithPollinations(prompt, styleImgPrompt, seed, outputMode, orchestratorLevel) {
  const compact = buildPollinationsPromptCompact(prompt, styleImgPrompt, outputMode, orchestratorLevel);
  const url = pollinationsImageUrl(compact, { width: 1024, height: 1024, seed, model: "flux" });
  return { type: "image", url, seed, imagePrompt: compact, pollModel: "flux" };
}

function pollinationsHiRes(imagePrompt, seed, pollModel, outputMode) {
  const size = 1536;
  return pollinationsImageUrl(imagePrompt, { width: size, height: size, seed, model: pollModel || "flux" });
}

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

function SvgMockup({ svg }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current || !svg) return;
    try {
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgEl.setAttribute("width", "100%"); svgEl.setAttribute("height", "100%");
      }
    } catch(e) {}
  }, [svg]);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", bottom:-11, left:"14%", right:"14%", height:26, background:"radial-gradient(ellipse,rgba(0,0,0,.26) 0%,transparent 70%)", filter:"blur(9px)" }} />
        <div style={{ width:270, height:270, borderRadius:28, background:"#fff", padding:11, boxShadow:"0 1px 4px rgba(0,0,0,.08),0 10px 40px rgba(0,0,0,.16)", position:"relative", overflow:"hidden" }}>
          <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} style={{ width:"100%", height:"100%", borderRadius:19 }} />
          <div style={{ position:"absolute", top:11, left:11, right:"46%", bottom:"54%", borderRadius:"19px 19px 55% 0", background:"linear-gradient(158deg,rgba(255,255,255,.32) 0%,transparent 100%)", pointerEvents:"none" }} />
        </div>
      </div>
    </div>
  );
}

function ImgMockup({ src, onLoad, onError, loading }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", bottom:-11, left:"14%", right:"14%", height:26, background:"radial-gradient(ellipse,rgba(0,0,0,.26) 0%,transparent 70%)", filter:"blur(9px)" }} />
        <div style={{ width:270, height:270, borderRadius:28, background:"#fff", padding:11, boxShadow:"0 1px 4px rgba(0,0,0,.08),0 10px 40px rgba(0,0,0,.16)", position:"relative", overflow:"hidden" }}>
          {loading && (
            <div style={{ position:"absolute", inset:11, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2, background:"rgba(255,255,255,.93)", borderRadius:19 }}>
               <div style={{ width:40, height:40, borderRadius:"50%", border:"3px solid #f3f0ff", borderTopColor:"var(--accent)", animation:"spin .9s linear infinite", marginBottom:8 }} />
               <span style={{ fontSize:10, color:"var(--accent)", fontFamily:"var(--mono)" }}>loading masterpiece...</span>
            </div>
          )}
          <img src={src} alt="sticker" onLoad={onLoad} onError={onError} style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:19, display:"block", opacity:loading?0:1, transition:"opacity .4s" }} />
          <div style={{ position:"absolute", top:11, left:11, right:"46%", bottom:"54%", borderRadius:"19px 19px 55% 0", background:"linear-gradient(158deg,rgba(255,255,255,.32) 0%,transparent 100%)", pointerEvents:"none", opacity:loading?0:1 }} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [engine, setEngine] = useState("auto");
  const [detectedEngine, setDetectedEngine] = useState("claude");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("die-cut");
  const [outputMode, setOutputMode] = useState("sticker-pro");
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
        setDetectedEngine(r.ok ? "claude" : "pollinations");
      } catch { setDetectedEngine("pollinations"); }
    })();
  }, []);

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(""); setResult(null); setDlStatus(""); setImgLoading(false);

    console.log("Council Debate Active: Perfecting the masterpiece brief...");
    try {
      const optimizedPrompt = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() })
      }).then(r => r.json()).then(d => d.optimized || prompt.trim());

      const seed = Math.floor(Math.random() * 999999);
      const r = generateWithPollinations(optimizedPrompt, sel.img, seed, outputMode, "cinematic");
      const entry = { ...r, type: "image", prompt: prompt.trim(), style, outputMode, ts: Date.now(), imagePrompt: optimizedPrompt };
      
      setResult(entry);
      setImgLoading(true);
      setHistory(h => [entry, ...h].slice(0, 20));
    } catch (err) {
      setError(err.message || "Ensemble failed.");
      setLoading(false);
    }
  }, [prompt, style, loading, sel, outputMode]);

  const onImgLoad = useCallback(() => { setImgLoading(false); setLoading(false); }, []);
  const onImgError = useCallback(() => { setError("Image engine overloaded. Try again."); setLoading(false); setImgLoading(false); }, []);

  const selectHist = useCallback((item) => {
    setResult(item); setPrompt(item.prompt); setStyle(item.style);
    if (item.outputMode) setOutputMode(item.outputMode);
    setError(""); setDlStatus(""); setLoading(false); setImgLoading(false);
  }, []);

  const download = useCallback(async (hiRes) => {
    if (!result) return;
    setDlStatus("dl");
    try {
      if (result.type === "svg") {
        if (hiRes) {
          const png = await svgToPng(result.svg, 2048);
          dlLink(png, `sticker-2048.png`);
        } else { dlSvg(result.svg, `sticker.svg`); }
      } else {
        const url = hiRes ? pollinationsHiRes(result.imagePrompt, result.seed, result.pollModel, result.outputMode) : result.url;
        await fetchAsDownload(url, `sticker-${result.seed}.png`);
      }
      setDlStatus("done");
    } catch { setDlStatus("done"); }
    setTimeout(() => setDlStatus(""), 2500);
  }, [result]);

  const hasResult = result && (result.type==="svg" || (result.type==="image" && !imgLoading));

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
        *{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--t1);font-family:var(--body)}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        .P{background:var(--bg1);border:1px solid var(--bdr);border-radius:18px;padding:20px}
        .L{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:10px}
        .SC{transition:all .2s;cursor:pointer;user-select:none}.SC:hover{transform:translateY(-1px);background:var(--bgH)!important}
        .GB{transition:all .22s}.GB:not(:disabled):hover{transform:translateY(-2px);background:linear-gradient(135deg,#c93a1e,#e45c3a,#f0a030);box-shadow:0 8px 30px rgba(228,92,58,.35)}
        .AB{transition:all .18s;cursor:pointer}.AB:hover{background:var(--bgH)!important}
      `}</style>
      <div style={{position:"relative",maxWidth:1120,margin:"0 auto",padding:"40px 20px"}}>
        <header style={{textAlign:"center",marginBottom:40}}>
          <h1 style={{fontFamily: "var(--dsp)", fontSize: 42, fontWeight: 800}}>Sticker Studio Pro</h1>
          <p style={{color: "var(--t3)", fontFamily: "var(--mono)", fontSize: 11}}>Council of Agents Engine Active</p>
        </header>
        <div style={{display:"grid",gridTemplateColumns:"400px 1fr",gap:30}}>
          <div style={{display:"flex",flexDirection:"column",gap:15}}>
            <div className="P">
              <label className="L">Describe your sticker</label>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3} style={{width:"100%",background:"var(--bg2)",border:"1px solid var(--bdr)",borderRadius:12,padding:12,color:"#fff"}} />
            </div>
            <div className="P">
              <label className="L">Style</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {STYLES.map(s=>(
                  <div key={s.id} onClick={()=>setStyle(s.id)} className="SC" style={{padding:10,borderRadius:10,background:style===s.id?"var(--accentG)":"var(--bg2)",border:style===s.id?"1px solid var(--accent)":"1px solid var(--bdr)"}}>
                    {s.icon} {s.label}
                  </div>
                ))}
              </div>
            </div>
            <button className="GB" onClick={generate} disabled={loading} style={{padding:16,borderRadius:12,background:"var(--accent)",border:"none",color:"#fff",fontWeight:700}}>
              {loading ? "Generating Masterpiece..." : "✦ Generate Sticker"}
            </button>
          </div>
          <div className="P" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:500}}>
            {loading && !result && <div style={{animation:"spin 1s linear infinite",width:40,height:40,border:"4px solid var(--accent)",borderTopColor:"transparent",borderRadius:"50%"}} />}
            {result?.type === "image" && <ImgMockup src={result.url} onLoad={onImgLoad} onError={onImgError} loading={imgLoading} />}
            {result?.type === "svg" && <SvgMockup svg={result.svg} />}
            {hasResult && (
              <div style={{display:"flex",gap:10,marginTop:20}}>
                <button className="AB" onClick={()=>download(true)} style={{padding:"10px 20px",borderRadius:10,background:"var(--ok)",color:"#000",fontWeight:700}}>Download 2K PNG</button>
                <button className="AB" onClick={()=>download(false)} style={{padding:"10px 20px",borderRadius:10,background:"var(--bg2)",color:"#fff"}}>Standard PNG</button>
              </div>
            )}
          </div>
        </div>
        <div style={{marginTop:40}}>
           <label className="L">History</label>
           <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:10}}>
             {history.map((h,i)=>(
               <div key={i} onClick={()=>selectHist(h)} style={{width:60,height:60,borderRadius:10,overflow:"hidden",background:"#fff",cursor:"pointer",flexShrink:0}}>
                 <img src={h.url} style={{width:"100%",height:"100%",objectFit:"cover"}} />
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}