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

const OUTPUT_MODES = [
  { id: "sticker-pro", label: "Sticker Pro", hint: "Best for Redbubble sticker listing" },
  { id: "hero-real", label: "Hero Real", hint: "Photoreal product-hero style image" },
];

function pollinationsImageUrl(promptText, opts) {
  const { width = 1024, height = 1024, seed, model = "flux" } = opts;
  const q = new URLSearchParams();
  q.set("model", model);
  q.set("seed", String(seed));
  q.set("width", String(width));
  q.set("height", String(height));
  q.set("enhance", "true"); 
  q.set("nologo", "true");  
  // Use the ultra-stable Image API endpoint
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?${q.toString()}`;
}

const SVG_SYS = `You are a Senior Vector Architect. Raw <svg> only. Root tag: <svg viewBox="-250 -250 500 500">. Fully centered.`;

async function generateWithStreaming(prompt, styleSvgPrompt, outputMode, onChunk) {
  let url = "https://gen.pollinations.ai/v1/chat/completions";
  let body = {
    model: "openai", 
    messages: [
      { role: "system", content: SVG_SYS },
      { role: "user", content: `Generate SVG for: ${prompt} in style ${styleSvgPrompt}` }
    ],
    stream: true
  };
  try {
    let res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') break;
          try {
            const data = JSON.parse(dataStr);
            fullContent += data.choices[0]?.delta?.content || "";
            if (onChunk) onChunk(fullContent);
          } catch (e) {}
        }
      }
    }
    const match = fullContent.match(/<svg[\s\S]*?<\/svg>/i);
    return { type: "svg", svg: match?.[0] };
  } catch (err) { throw err; }
}

function dlLink(url, name) {
  const a = document.createElement("a"); a.href = url; a.download = name; a.target="_blank";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function dlSvg(svgStr, name) {
  const b = new Blob([svgStr], { type:"image/svg+xml;charset=utf-8" });
  const u = URL.createObjectURL(b); dlLink(u, name);
}
async function svgToPng(svgStr, size) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width=size; c.height=size;
      c.getContext("2d").drawImage(img, 0, 0, size, size);
      res(c.toDataURL("image/png"));
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  });
}
async function fetchAsDownload(imgUrl, name) {
  try {
    const r = await fetch(imgUrl); const b = await r.blob();
    const u = URL.createObjectURL(b); dlLink(u, name);
  } catch { window.open(imgUrl, "_blank"); }
}

function SvgMockup({ svg }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current || !svg) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (svgEl) {
      svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svgEl.setAttribute("width", "100%"); svgEl.setAttribute("height", "100%");
    }
  }, [svg]);
  return (
    <div style={{ width:270, height:270, borderRadius:28, background:"#fff", padding:11, boxShadow:"0 10px 40px rgba(0,0,0,.16)", position:"relative" }}>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: svg }} style={{ width:"100%", height:"100%", borderRadius:19 }} />
    </div>
  );
}

function ImgMockup({ src, onLoad, onError, loading }) {
  return (
    <div style={{ position:"relative", width:270, height:270, borderRadius:28, background:loading?"rgba(255,255,255,.05)":"#fff", padding:11, boxShadow:"0 10px 40px rgba(0,0,0,.2)", overflow:"hidden" }}>
      {loading && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2, background:"rgba(0,0,0,.4)", backdropFilter:"blur(5px)" }}>
           <div style={{ width:32, height:32, border:"3px solid rgba(228,92,58,.2)", borderTopColor:"#e45c3a", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
           <span style={{ fontSize:10, color:"#e45c3a", fontFamily:"monospace", marginTop:10, letterSpacing:2 }}>BRUSHING...</span>
        </div>
      )}
      <img src={src} alt="sticker" onLoad={onLoad} onError={onError} style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:19, opacity:loading?0:1, transition:"opacity .8s" }} />
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("die-cut");
  const [outputMode, setOutputMode] = useState("sticker-pro");
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [dlStatus, setDlStatus] = useState("");

  const sel = STYLES.find(s => s.id === style) || STYLES[0];

  const onImgLoad = useCallback(() => { setImgLoading(false); setLoading(false); }, []);
  
  const onImgError = useCallback(() => { 
    setResult(prev => {
      if (!prev || prev.retryCount >= 2) {
        setError("AI Service completely overloaded. Please try again in 1 minute.");
        setLoading(false); setImgLoading(false);
        return prev;
      }
      
      const nextModel = prev.retryCount === 0 ? "turbo" : "zimage";
      console.warn(`Flux overloaded. Falling back to recovery model: ${nextModel}`);
      
      const newUrl = pollinationsImageUrl(prev.imagePrompt, { 
        seed: prev.seed + 1, 
        model: nextModel 
      });
      
      return { ...prev, url: newUrl, retryCount: (prev.retryCount || 0) + 1, pollModel: nextModel };
    });
  }, []);

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(""); setResult(null); setImgLoading(false);
    try {
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() })
      });
      const data = await response.json();
      const optimizedPrompt = data.optimized || prompt.trim();

      const seed = Math.floor(Math.random() * 999999);
      const url = pollinationsImageUrl(optimizedPrompt, { seed, model: "flux" });
      const entry = { type: "image", url, seed, prompt: prompt.trim(), imagePrompt: optimizedPrompt, style, outputMode, ts: Date.now(), retryCount: 0, pollModel: "flux" };
      setResult(entry); setImgLoading(true); setHistory(h => [entry, ...h].slice(0, 15));
    } catch (err) { setError("Orchestration failed."); setLoading(false); }
  }, [prompt, style, loading, outputMode]);

  const selectHist = useCallback((item) => {
    setResult(item); setPrompt(item.prompt); setStyle(item.style);
    setError(""); setImgLoading(false); setLoading(false);
  }, []);

  const download = useCallback(async (hiRes) => {
    if (!result) return;
    setDlStatus("dl");
    if (result.type === "svg") {
      if (hiRes) { const png = await svgToPng(result.svg, 2048); dlLink(png, "sticker.png"); }
      else dlSvg(result.svg, "sticker.svg");
    } else {
      const url = hiRes ? pollinationsImageUrl(result.imagePrompt, { seed: result.seed, width:2048, height:2048, model:"flux" }) : result.url;
      await fetchAsDownload(url, "sticker.png");
    }
    setDlStatus("done"); setTimeout(() => setDlStatus(""), 2000);
  }, [result]);

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;700&display=swap');
        :root { --bg:#0c0c11; --acc:#e45c3a; --t1:#fff; --t2:rgba(255,255,255,.6); --t3:rgba(255,255,255,.2); --bgH:rgba(255,255,255,.05); }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); color:var(--t1); font-family:'DM Sans',sans-serif; }
        .P { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); border-radius:18px; padding:20px; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:40 }}>
        <header style={{ textAlign:"center", marginBottom:40 }}>
          <h1 style={{ fontFamily:'Syne', fontSize:48, fontWeight:800, color: "var(--acc)" }}>Sticker Studio Pro</h1>
          <p style={{ color:"var(--t3)", fontFamily:"monospace", fontSize:11, letterSpacing:2 }}>ORCHESTRATOR: GPT-4o · ARTIST: Pollinations Flux</p>
        </header>
        <div style={{ display:"grid", gridTemplateColumns:"400px 1fr", gap:30 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:15 }}>
            <div className="P">
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A cute kitty..." rows={3} style={{ width:"100%", background:"#16161c", border:"1px solid #222", borderRadius:12, padding:15, color:"#fff", fontSize:14 }} />
            </div>
            <div className="P">
              <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1 }}>Mode</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
                {OUTPUT_MODES.map(m=>(
                  <div key={m.id} onClick={()=>setOutputMode(m.id)} style={{ padding:10, borderRadius:10, background:outputMode===m.id?"rgba(228,92,58,.1)":"transparent", border:`1px solid ${outputMode===m.id?"#e45c3a":"#222"}`, cursor:"pointer", textAlign:"center", fontSize:12 }}>
                    {m.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="P">
               <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                 {STYLES.map(s=>(
                   <div key={s.id} onClick={()=>setStyle(s.id)} style={{ padding:8, borderRadius:8, background:style===s.id?"#222":"transparent", border:`1px solid ${style===s.id?s.bg:"#111"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                     <span>{s.icon}</span> {s.label}
                   </div>
                 ))}
               </div>
            </div>
            <button onClick={generate} disabled={loading} style={{ padding:18, borderRadius:15, background:"var(--acc)", border:"none", color:"#fff", fontWeight:700, cursor:"pointer", boxShadow:"0 8px 30px rgba(228,92,58,.3)" }}>
              {loading ? "BRUSHING MASTERPIECE..." : "✦  Generate Masterpiece"}
            </button>
            {error && <div style={{ fontSize:12, color:"#f87171", textAlign:"center" }}>{error}</div>}
          </div>
          <div className="P" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:500 }}>
             {loading && !result && <div style={{ width:40, height:40, border:"4px solid #222", borderTopColor:"#e45c3a", borderRadius:"50%", animation:"spin 1s linear infinite" }} />}
             {result?.type === "image" && <ImgMockup src={result.url} onLoad={onImgLoad} onError={onImgError} loading={imgLoading} />}
             {result?.type === "svg" && <SvgMockup svg={result.svg} />}
             {result && !loading && !imgLoading && !error && (
               <div style={{ display:"flex", gap:10, marginTop:30 }}>
                 <button onClick={()=>download(true)} style={{ padding:"12px 24px", borderRadius:12, background:"#e45c3a", color:"#fff", border:"none", fontWeight:700, cursor:"pointer" }}>{dlStatus==="dl"?"Saving...":"Download 2K PNG"}</button>
                 <button onClick={()=>download(false)} style={{ padding:"12px 24px", borderRadius:12, background:"#222", color:"#fff", border:"none", cursor:"pointer" }}>Standard PNG</button>
               </div>
             )}
          </div>
        </div>
        <div style={{ marginTop:40 }}>
           <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:15 }}>Masterpiece History</label>
           <div style={{ display:"flex", gap:12, overflowX:"auto" }}>
             {history.map((h,i)=>(
               <div key={i} onClick={()=>selectHist(h)} style={{ width:70, height:70, borderRadius:12, overflow:"hidden", border:"2px solid #222", cursor:"pointer" }}>
                 <img src={h.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}