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

/* ─── SVG SYSTEM PROMPT ──────────────────────────────────── */
const SVG_SYS = `You are an expert SVG sticker artist creating commercial artwork for Redbubble print-on-demand.

ABSOLUTE RULES:
1. ORCHESTRATION: You MUST first write a <thinking>...</thinking> block to carefully plan your drawing. Inside this block:
   - Outline the exact 500x500 coordinate grid layout.
   - Plan every layer, from back to front (die-cut border → background → body → details → shines).
   - Calculate precise cubic bezier curve paths (C or Q) for organic human/character shapes instead of just stacking circles.
2. After thinking, output ONLY a single <svg>...</svg> element.
3. Root: <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"> — NO width/height attributes.
4. Create RICH DETAILED artwork using complex <path> elements. Do NOT just stack primitive circles and ellipses. Draw real organic shapes.
5. Use <defs> for: linearGradient, radialGradient, filter (feDropShadow, feGaussianBlur), clipPath.
5. Build 5+ visual layers:
   - Layer 1: White (#ffffff) rounded-rect border shape behind everything (the die-cut edge)
   - Layer 2: Background fill/pattern inside the border
   - Layer 3: Main subject with detailed sub-shapes (NOT a single path — break it into body parts, features, sections)
   - Layer 4: Shading and highlights (gradient overlays, specular gloss ellipses)
   - Layer 5: Decorative details (sparkles as 4-point star shapes, small circles, hearts, accent dots)
6. Subject occupies 70-85% of canvas. Centered. 20px safe margins.
7. Use VIVID SATURATED colors. Sticker art must POP in thumbnails.
8. For characters: expressive face with eyes (include white highlight circles in eyes), clear mouth/expression, distinct body pose.
9. For objects: add personality — tiny face, sparkle effects, action lines.
10. Stroke-width >= 1.5px for all visible outlines. 
11. NO <image> tags, NO external references, NO xlink:href to outside. Everything inline.
12. NO copyrighted characters or logos.
13. Make it look like a REAL professional sticker people would buy on Redbubble.`;

/* ─── API ENGINE (GPT-4o Proxy) ─────────────────────────── */
async function generateWithAnthropic(prompt, styleSvgPrompt) {
  const userMsg = `Create a die-cut sticker design of: "${prompt}"\n\n${styleSvgPrompt}\n\nRemember: ONLY output the <svg>...</svg> code. Make it detailed with 25+ elements, colorful, expressive, and commercially attractive. Include sparkle decorations and a white die-cut border shape.`;

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SVG_SYS },
        { role: "user", content: userMsg }
      ]
    }),
  });

  if (!res.ok) {
    let errText = `API ${res.status}`;
    try {
      const errJSON = await res.json();
      if (errJSON?.error?.message) errText += ` - ${errJSON.error.message}`;
    } catch {}
    throw new Error(errText);
  }
  const textData = await res.text();
  let text = textData;
  try {
     const data = JSON.parse(textData);
     if (data.choices && data.choices[0] && data.choices[0].message) {
         text = data.choices[0].message.content;
     }
  } catch(e) {}

  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) throw new Error("No SVG in response");
  return { type: "svg", svg: match[0] };
}

/* ─── POLLINATIONS ENGINE (Fallback) ─────────────────────── */
function generateWithPollinations(prompt, styleImgPrompt, seed) {
  const full = [prompt.trim(), styleImgPrompt,
    "high quality, detailed, professional sticker artwork, centered composition, clean silhouette, marketplace ready, print ready, single main subject"
  ].join(", ");
  const neg = "blurry,low quality,watermark,signature,text,words,letters,logo,brand,copyright,nsfw,ugly,deformed,noisy,grainy,cropped";
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1024&height=1024&seed=${seed}&nologo=true&negative=${encodeURIComponent(neg)}&model=flux`;
  return { type: "image", url, seed };
}

function pollinationsHiRes(prompt, styleImgPrompt, seed) {
  const full = [prompt.trim(), styleImgPrompt,
    "high quality, detailed, professional sticker artwork, centered composition, clean silhouette, marketplace ready, print ready, single main subject"
  ].join(", ");
  const neg = "blurry,low quality,watermark,signature,text,words,letters,logo,brand,copyright,nsfw,ugly,deformed,noisy,grainy,cropped";
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=2048&height=2048&seed=${seed}&nologo=true&negative=${encodeURIComponent(neg)}&model=flux`;
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
          <img src={src} alt="sticker" onLoad={onLoad} onError={onError}
            style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:19, display:"block", opacity:loading?0:1, transition:"opacity .4s" }} />
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
  const [engine, setEngine] = useState("anthropic");
  const [detectedEngine, setDetectedEngine] = useState("anthropic");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("die-cut");
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
        const r = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 10,
            messages: [{ role: "user", content: "Reply with just: ok" }],
          }),
        });
        if (r.ok || r.status === 400) {
          setDetectedEngine("anthropic");
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
    const eng = engine === "auto" ? (detectedEngine || "pollinations") : engine;
    setLoading(true); setError(""); setResult(null); setDlStatus(""); setImgLoading(false);

    try {
      if (eng === "anthropic") {
        const r = await generateWithAnthropic(prompt.trim(), sel.svg);
        const entry = { ...r, prompt: prompt.trim(), style, ts: Date.now() };
        setResult(entry);
        setHistory(h => [entry, ...h].slice(0, 14));
      } else {
        const seed = Math.floor(Math.random() * 999999);
        const r = generateWithPollinations(prompt.trim(), sel.img, seed);
        const entry = { ...r, prompt: prompt.trim(), style, ts: Date.now() };
        setResult(entry);
        setImgLoading(true);
      }
    } catch (err) {
      setError(err.message || "Generation failed. Try again.");
      setLoading(false);
      return;
    }
    if (eng === "anthropic") setLoading(false);
  }, [prompt, style, loading, engine, detectedEngine, sel]);

  const onImgLoad = useCallback(() => {
    setImgLoading(false); setLoading(false);
    setResult(prev => {
      if (prev) setHistory(h => { if (h.some(x => x.ts===prev.ts)) return h; return [prev,...h].slice(0,14); });
      return prev;
    });
  }, []);

  const onImgError = useCallback(() => {
    setImgLoading(false); setLoading(false);
    setError("Image failed to load. Pollinations may be busy — try again.");
  }, []);

  const selectHist = useCallback((item) => {
    setResult(item); setPrompt(item.prompt); setStyle(item.style);
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
        if (hiRes) {
          const u = pollinationsHiRes(result.prompt, STYLES.find(s=>s.id===result.style)?.img||"", result.seed);
          await fetchAsDownload(u, `sticker-HQ-${result.seed}.png`);
        } else {
          await fetchAsDownload(result.url, `sticker-${result.seed}.png`);
        }
      }
      setDlStatus("done");
    } catch { setDlStatus("done"); }
    setTimeout(() => setDlStatus(""), 2500);
  }, [result]);

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
            AI sticker generator · Redbubble-ready · {activeEngine === "anthropic" ? "GPT-4o SVG Engine" : activeEngine === "pollinations" ? "Pollinations image engine" : "detecting engine..."}
          </p>
        </header>
        <div style={{display:"grid",gridTemplateColumns:"420px 1fr",gap:20,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:13,animation:"fadeSlide .55s ease"}}>
            <div className="P" style={{padding:"14px 16px"}}>
              <div style={{display:"flex",gap:5,background:"var(--bg2)",borderRadius:11,padding:3}}>
                {[
                  {id:"auto",label:"Auto",desc:"Smart detection"},
                  {id:"anthropic",label:"GPT-4o SVG",desc:"Vector art"},
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
                {engine==="auto" && `Auto-detected: ${detectedEngine==="anthropic"?"GPT-4o SVG Engine":detectedEngine==="pollinations"?"Pollinations (fallback mode)":"detecting..."}`}
                {engine==="anthropic" && "GPT-4o generates high-quality vector SVG stickers via the secure backend proxy"}
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
                    engine: {activeEngine==="anthropic"?"GPT-4o SVG Engine":activeEngine==="pollinations"?"Pollinations AI":"auto-detecting..."}
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
                    {activeEngine==="anthropic"?"GPT-4o is drawing your sticker...":"generating sticker image..."}
                  </p>
                </div>
              )}
              {result?.type==="svg" && !loading && (
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
            GPT-4o API (via Proxy) → Vector SVG · Fallback → Pollinations AI PNG
          </p>
        </div>
      </div>
    </div>
  );
}