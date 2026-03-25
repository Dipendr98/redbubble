import { useState, useCallback, useEffect, useRef } from "react";

/**
 * STICKERFORGE AI — Senior Architect Stable Edition
 * Resolving "AI Overloaded" via Multi-Level Auto-Migration
 */

const STICKER_TYPES = [
  { id:"small", name:"Standard Pro", w:1024, h:1024 },
  { id:"die-cut", name:"Die-Cut Luxe", w:1400, h:1400 },
  { id:"bumper", name:"Bumper (Wide)", w:1400, h:450 },
  { id:"sheet", name:"Sticker Sheet", w:1400, h:1400 },
  { id:"holographic", name:"Holographic", w:1024, h:1024 },
];

const STYLES = [
  { id:"die-cut", label:"Die-Cut Classic", icon:"✂️", bg:"#e45c3a" },
  { id:"kawaii", label:"Kawaii Cute", icon:"🌸", bg:"#e879a8" },
  { id:"3d", label:"3D Glossy", icon:"🔮", bg:"#7c5ce0" },
  { id:"retro", label:"Retro 70s", icon:"🎖️", bg:"#d97706" },
  { id:"watercolor", label:"Watercolor", icon:"🎨", bg:"#0ea5a0" },
  { id:"neon", label:"Neon Glow", icon:"💡", bg:"#a855f7" },
  { id:"pixel", label:"Pixel Art", icon:"👾", bg:"#3b82f6" },
  { id:"holo", label:"Holographic", icon:"🌈", bg:"#ec4899" },
  { id:"anime", label:"Anime Style", icon:"⛩️", bg:"#f43f5e" },
  { id:"gothic", label:"Dark Gothic", icon:"🏰", bg:"#18181b" },
  { id:"graffiti", label:"Graffiti", icon:"🎨", bg:"#f59e0b" },
];

/** Standard stability URL builder */
function pollinationsImageUrl(promptText, opts) {
  const { width = 1024, height = 1024, seed, model = "flux", t } = opts;
  // Clean and encode. Using 'p/' is the most stable browser endpoint for current Pollinations Flux models.
  const cleanPrompt = encodeURIComponent(promptText.slice(0, 310).replace(/[^a-zA-Z0-9\s]/g, " "));
  const urlParams = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model: model,
    nologo: "true",
    enhance: "true"
  });
  if (t) urlParams.set("_t", String(t)); // Cache bust
  return `https://pollinations.ai/p/${cleanPrompt}?${urlParams.toString()}`;
}

function ImgMockup({ src, onLoad, onError, loading, status }) {
  return (
    <div style={{ position:"relative", width:340, height:340, borderRadius:36, background:loading?"#0c0c11":"#fff", padding:12, boxShadow:"0 30px 80px rgba(0,0,0,.5)", border:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      {loading && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2, background:"rgba(12,12,18,.85)", backdropFilter:"blur(20px)" }}>
           <div style={{ width:56, height:56, borderRadius:"50%", border:"4px solid rgba(228,92,58,.1)", borderTopColor:"#e45c3a", animation:"spin .9s linear infinite" }} />
           <span style={{ fontSize:10, color:"#e45c3a", fontFamily:"monospace", marginTop:24, letterSpacing:4, fontWeight:900, textTransform:"uppercase" }}>{status || "Orchestrating..." }</span>
           <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:8, fontFamily:"monospace", letterSpacing:1 }}>StickerForge Multi-Agent AI</div>
        </div>
      )}
      <img key={src} src={src} alt="sticker masterpiece" onLoad={onLoad} onError={onError} style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:26, opacity:loading?0:1, transition:"opacity .8s" }} />
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("die-cut");
  const [type, setType] = useState("small");
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dlStatus, setDlStatus] = useState("");

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(""); setResult(null); setImgLoading(false);
    setStatus("DEBATING...");

    try {
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), style, type })
      });
      const data = await response.json();
      const optimizedPrompt = data.optimized || prompt.trim();

      setStatus("PAINTING...");
      const seed = Math.floor(Math.random() * 999999);
      const spec = STICKER_TYPES.find(t=>t.id===type) || STICKER_TYPES[0];
      const model = style === "anime" ? "flux-anime" : "flux";
      
      const url = pollinationsImageUrl(optimizedPrompt, { seed, model, width:spec.w, height:spec.h });
      const entry = { type:"image", url, seed, prompt:prompt.trim(), imagePrompt:optimizedPrompt, style, stickerType:type, ts:Date.now(), retryCount:0, pollModel:model };
      
      setResult(entry); setImgLoading(true); setHistory(h => [entry, ...h].slice(0, 15));
    } catch (err) { setError("Council is currently unreachable. Check your .env file!"); setLoading(false); }
  }, [prompt, style, type, loading]);

  const onImgLoad = useCallback(() => { setImgLoading(false); setLoading(false); setStatus(""); }, []);
  
  const onImgError = useCallback(() => { 
    setResult(prev => {
      if (!prev || prev.retryCount >= 3) {
        setError("AI Service completely overloaded. Trying one last emergency model...");
        if (prev.retryCount >= 4) {
          setLoading(false); setImgLoading(false); return prev;
        }
      }
      
      // Auto-Migration Ladder
      let nextModel = "turbo";
      if (prev.retryCount === 1) nextModel = "zimage";
      if (prev.retryCount >= 2) nextModel = "turbo"; // Turbo is the ultimate fallback
      
      setStatus(`FAILOVER (${nextModel})...`);
      const newUrl = pollinationsImageUrl(prev.imagePrompt, { 
        seed: prev.seed + 1, 
        model: nextModel, 
        t: Date.now() 
      });
      
      return { ...prev, url: newUrl, retryCount: prev.retryCount + 1, pollModel: nextModel };
    });
  }, []);

  const download = useCallback(async (hiRes) => {
    if (!result) return;
    setDlStatus("dl");
    const spec = STICKER_TYPES.find(t=>t.id===result.stickerType) || STICKER_TYPES[0];
    const url = hiRes ? pollinationsImageUrl(result.imagePrompt, { seed: result.seed, width:2048, height:Math.round(2048*(spec.h/spec.w)), model:result.pollModel }) : result.url;
    try {
      const res = await fetch(url); const blob = await res.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download=`sticker-${Date.now()}.png`; a.click();
    } catch { window.open(url, "_blank"); }
    setDlStatus("done"); setTimeout(() => setDlStatus(""), 2000);
  }, [result]);

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;700&family=DM+Mono&display=swap');
        :root { --bg:#0c0c11; --acc:#e45c3a; --t1:#fff; --t2:rgba(255,255,255,.6); --t3:rgba(255,255,255,.2); }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); color:var(--t1); font-family:'DM Sans',sans-serif; overflow-x:hidden; }
        .P { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:28px; padding:28px; transition:border .3s; }
        .P:hover { border-color:rgba(228,92,58,.2); }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"50px 20px" }}>
        <header style={{ textAlign:"center", marginBottom:45 }}>
          <h1 style={{ fontFamily:'Syne', fontSize:56, fontWeight:800, color:"var(--acc)", textTransform:"uppercase", letterSpacing:-2 }}>StickerForge Pro</h1>
          <p style={{ color:"var(--t3)", fontFamily:"'DM Mono'", fontSize:10, letterSpacing:4, marginTop:10 }}>HIGH-FIDELITY ARCHITECTURE · COUNCILS ENGINE ACTIVE</p>
        </header>

        <div style={{ display:"grid", gridTemplateColumns:"440px 1fr", gap:30, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeUp .5s ease" }}>
            <div className="P">
              <label style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:2, marginBottom:10, display:"block" }}>✦ Create Masterpiece Brief</label>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A cute animal in a neon cyberpunk city..." rows={3} style={{ width:"100%", background:"#16161c", border:"1px solid #222", borderRadius:18, padding:20, color:"#fff", fontSize:15, resize:"none", outline:"none", borderFocus:"1px solid var(--acc)" }} />
            </div>

            <div className="P">
               <label style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:2, marginBottom:10, display:"block" }}>Spec Selector</label>
               <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6 }}>
                 {STICKER_TYPES.map(t=>(
                   <div key={t.id} onClick={()=>setType(t.id)} style={{ padding:10, borderRadius:12, background:type===t.id?"rgba(228,92,58,.1)":"#111116", border:`1.5px solid ${type===t.id?"#e45c3a":"#222"}`, cursor:"pointer", textAlign:"center", fontSize:10, color:type===t.id?"#fff":"#666" }}>
                     {t.name}
                   </div>
                 ))}
               </div>
            </div>

            <div className="P">
               <label style={{ fontSize:9, color:"#555", textTransform:"uppercase", letterSpacing:2, marginBottom:12, display:"block" }}>Artistic DNA (18+ Sub-Agents)</label>
               <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                 {STYLES.map(s=>(
                   <div key={s.id} onClick={()=>setStyle(s.id)} style={{ padding:10, borderRadius:14, background:style===s.id?"rgba(228,92,58,.1)":"#111116", border:`1px solid ${style===s.id?"#e45c3a":"#222"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:9, fontSize:12, color:style===s.id?"#fff":"#888" }}>
                     <span style={{ fontSize:15 }}>{s.icon}</span> {s.label}
                   </div>
                 ))}
               </div>
            </div>

            <button onClick={generate} disabled={loading} style={{ padding:22, borderRadius:22, background:loading?"#222":"linear-gradient(135deg,#c93a1e,#e45c3a)", border:"none", color:"#fff", fontWeight:900, cursor:"pointer", boxShadow:"0 15px 45px rgba(228,92,58,0.3)", fontSize:17 }}>
              {loading ? "BRUSHING MASTERPIECE..." : "✦  Generate Masterpiece"}
            </button>
            {error && <div style={{ fontSize:12, color:"#f87171", textAlign:"center", padding:15, background:"rgba(239,68,68,.05)", borderRadius:16 }}>⚠ {error}</div>}
          </div>

          <div className="P" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:620, position:"relative", animation:"fadeUp .7s ease" }}>
             {!result && !loading && (
               <div style={{ textAlign:"center", opacity:.12 }}>
                 <div style={{ fontSize:96, marginBottom:20 }}>🖼️</div>
                 <p style={{ fontFamily:"'DM Mono'", fontSize:12, letterSpacing:5 }}>PREVIEW ENGINE ONLINE</p>
               </div>
             )}
             {(loading || result) && <ImgMockup src={result?.url} onLoad={onImgLoad} onError={onImgError} loading={imgLoading || loading} status={status} />}
             
             {result && !loading && !imgLoading && !error && (
               <div style={{ display:"flex", gap:12, marginTop:40 }}>
                 <button onClick={()=>download(true)} style={{ padding:"16px 36px", borderRadius:16, background:"var(--acc)", color:"#fff", border:"none", fontWeight:900, cursor:"pointer", boxShadow:"0 10px 40px rgba(228,92,58,0.3)" }}>{dlStatus==="dl"?"EXPORTING...":"SAVE 2K MASTER"}</button>
                 <button onClick={()=>download(false)} style={{ padding:"16px 36px", borderRadius:16, background:"#222", color:"#fff", border:"none", fontWeight:700, cursor:"pointer" }}>STILL PNG</button>
               </div>
             )}
          </div>
        </div>

        <div style={{ marginTop:65 }}>
           <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:3, display:"block", marginBottom:25 }}>Studio Master History</label>
           <div style={{ display:"flex", gap:16, overflowX:"auto", paddingBottom:25 }}>
             {history.map((h,i)=>(
               <div key={i} onClick={()=>selectHist(h)} style={{ minWidth:85, height:85, borderRadius:20, overflow:"hidden", border:`3px solid ${result?.ts===h.ts?"#e45c3a":"#222"}`, cursor:"pointer", background:"#fff" }}>
                 <img src={h.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}