import { useState, useCallback, useEffect, useRef } from "react";

/**
 * REDBUBBLE STICKER STUDIO — StickerForge Edition
 * MULTI-AGENT ORCHESTRATION + COMPREHENSIVE STYLE SYSTEM
 */

const STICKER_TYPES = [
  { id:"small", name:"Standard Sticker", w:1024, h:1024 },
  { id:"kiss-cut", name:"Kiss-Cut", w:1024, h:1024 },
  { id:"die-cut", name:"Die-Cut Pro", w:1400, h:1400 },
  { id:"bumper", name:"Bumper Wide", w:1400, h:420 },
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
  { id:"psychedelic", label:"Trippy Art", icon:"🌀", bg:"#6366f1" },
  { id:"graffiti", label:"Graffiti", icon:"🎨", bg:"#f59e0b" },
  { id:"minimalist", label:"Minimal", icon:"⚪", bg:"#71717a" },
];

function pollinationsImageUrl(promptText, opts) {
  const { width = 1024, height = 1024, seed, model = "flux" } = opts;
  const cleanPrompt = encodeURIComponent(promptText.slice(0, 320).replace(/\./g, ""));
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true`;
}

function ImgMockup({ src, onLoad, onError, loading, status }) {
  return (
    <div style={{ position:"relative", width:320, height:320, borderRadius:32, background:loading?"#1a1a24":"#fff", padding:12, boxShadow:"0 20px 60px rgba(0,0,0,.4)", overflow:"hidden", border:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {loading && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2, background:"rgba(12,12,18,.85)", backdropFilter:"blur(15px)" }}>
           <div style={{ width:48, height:48, borderRadius:"50%", border:"3px solid rgba(228,92,58,.1)", borderTopColor:"#e45c3a", animation:"spin .8s linear infinite" }} />
           <span style={{ fontSize:10, color:"#e45c3a", fontFamily:"monospace", marginTop:18, letterSpacing:3, fontWeight:800 }}>{status || "ORCHESTRATING..."}</span>
           <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", marginTop:8, fontFamily:"monospace" }}>COUNCIL OF AGENTS IN SESSION</div>
        </div>
      )}
      <img key={src} src={src} alt="sticker masterpiece" onLoad={onLoad} onError={onError} style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:22, opacity:loading?0:1, transition:"opacity .8s" }} />
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
      
      // Select model based on style DNA
      let model = "flux";
      if (style === "anime") model = "flux-anime";
      if (style === "3d") model = "flux-3d";
      
      const url = pollinationsImageUrl(optimizedPrompt, { seed, model, width:spec.w, height:spec.h });
      
      const entry = { type: "image", url, seed, prompt: prompt.trim(), imagePrompt: optimizedPrompt, style, stickerType: type, ts: Date.now(), retryCount: 0, pollModel:model };
      setResult(entry); setImgLoading(true); setHistory(h => [entry, ...h].slice(0, 20));
    } catch (err) { setError("Orchestration bottleneck. Try again."); setLoading(false); }
  }, [prompt, style, type, loading]);

  const onImgLoad = useCallback(() => { setImgLoading(false); setLoading(false); setStatus(""); }, []);
  const onImgError = useCallback(() => { 
    setResult(prev => {
      if (!prev || prev.retryCount >= 2) { setError("AI Overloaded. Try later."); setLoading(false); setImgLoading(false); return prev; }
      setStatus("REPAIRING...");
      const nextModel = prev.retryCount === 0 ? "turbo" : "zimage";
      const newUrl = pollinationsImageUrl(prev.imagePrompt, { seed: prev.seed + 1, model: nextModel });
      return { ...prev, url: newUrl, retryCount: prev.retryCount + 1, pollModel: nextModel };
    });
  }, []);

  const download = useCallback(async (hiRes) => {
    if (!result) return;
    setDlStatus("dl");
    const spec = STICKER_TYPES.find(t=>t.id===result.stickerType) || STICKER_TYPES[0];
    const url = hiRes ? pollinationsImageUrl(result.imagePrompt, { seed: result.seed, width:2048, height:Math.round(2048*(spec.h/spec.w)), model:result.pollModel }) : result.url;
    try {
      const fetchRes = await fetch(url); const blob = await fetchRes.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `sticker-${result.seed}.png`;
      document.body.appendChild(a); a.click();
    } catch { window.open(url, "_blank"); }
    setDlStatus("done"); setTimeout(() => setDlStatus(""), 2000);
  }, [result]);

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;700&display=swap');
        :root { --bg:#0c0c11; --acc:#e45c3a; --t1:#fff; --t2:rgba(255,255,255,.6); --t3:rgba(255,255,255,.25); }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); color:var(--t1); font-family:'DM Sans',sans-serif; overflow-x:hidden; }
        .P { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:24px; padding:24px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#222; border-radius:10px; }
      `}</style>
      
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"50px 20px" }}>
        <header style={{ textAlign:"center", marginBottom:40 }}>
          <h1 style={{ fontFamily:'Syne', fontSize:56, fontWeight:800, color:"var(--acc)", textShadow:"0 10px 30px rgba(228,92,58,.2)" }}>StickerForge AI</h1>
          <p style={{ color:"var(--t3)", fontFamily:"monospace", fontSize:11, letterSpacing:3, textTransform:"uppercase", marginTop:10 }}>Senior Orchestrator · Multi-Agent Intelligence</p>
        </header>

        <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:32, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="P">
              <label style={{ fontSize:9, color:"#666", textTransform:"uppercase", letterSpacing:2, marginBottom:10, display:"block" }}>✦ Create Masterpiece Brief</label>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A cute animal in a neon cyberpunk city..." rows={3} style={{ width:"100%", background:"#16161c", border:"1px solid #222", borderRadius:16, padding:18, color:"#fff", fontSize:15, resize:"none", outline:"none" }} />
            </div>

            <div className="P">
               <label style={{ fontSize:9, color:"#666", textTransform:"uppercase", letterSpacing:2, marginBottom:10, display:"block" }}>Sticker Specification</label>
               <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                 {STICKER_TYPES.map(t=>(
                   <div key={t.id} onClick={()=>setType(t.id)} style={{ padding:9, borderRadius:12, background:type===t.id?"rgba(228,92,58,.08)":"#111116", border:`1.5px solid ${type===t.id?"#e45c3a":"#222"}`, cursor:"pointer", textAlign:"center", fontSize:11, color:type===t.id?"#fff":"#777" }}>
                     {t.name}
                   </div>
                 ))}
               </div>
            </div>

            <div className="P">
               <label style={{ fontSize:9, color:"#666", textTransform:"uppercase", letterSpacing:2, marginBottom:10, display:"block" }}>Artistic DNA</label>
               <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                 {STYLES.map(s=>(
                   <div key={s.id} onClick={()=>setStyle(s.id)} style={{ padding:10, borderRadius:12, background:style===s.id?"rgba(228,92,58,.08)":"#111116", border:`1.5px solid ${style===s.id?"#e45c3a":"#222"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:12, color:style===s.id?"#fff":"#888" }}>
                     <span style={{ fontSize:15 }}>{s.icon}</span> {s.label}
                   </div>
                 ))}
               </div>
            </div>

            <button onClick={generate} disabled={loading} style={{ padding:22, borderRadius:20, background:loading?"#222":"linear-gradient(135deg,#c93a1e,#e45c3a)", border:"none", color:"#fff", fontWeight:800, cursor:"pointer", boxShadow:"0 12px 40px rgba(228,92,58,0.35)", fontSize:17 }}>
              {loading ? "BRUSHING MASTERPIECE..." : "✦  Generate Masterpiece"}
            </button>
            {error && <div style={{ fontSize:12, color:"#f87171", textAlign:"center", padding:12, background:"rgba(239,68,68,.05)", borderRadius:14 }}>⚠ {error}</div>}
          </div>

          <div className="P" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:600, position:"relative" }}>
             {!result && !loading && (
               <div style={{ textAlign:"center", opacity:.15 }}>
                 <div style={{ fontSize:92, marginBottom:20 }}>🎨</div>
                 <p style={{ fontFamily:"monospace", fontSize:12, letterSpacing:4 }}>PREVIEW ENGINE READY</p>
               </div>
             )}
             {(loading || result) && <ImgMockup src={result?.url} onLoad={onImgLoad} onError={onImgError} loading={imgLoading || loading} status={status} />}
             
             {result && !loading && !imgLoading && !error && (
               <div style={{ display:"flex", gap:12, marginTop:40 }}>
                 <button onClick={()=>download(true)} style={{ padding:"15px 32px", borderRadius:16, background:"var(--acc)", color:"#fff", border:"none", fontWeight:800, cursor:"pointer", boxShadow:"0 10px 35px rgba(228,92,58,0.25)" }}>{dlStatus==="dl"?"EXPORTING...":"SAVE 2K STICKER MASTER"}</button>
                 <button onClick={()=>download(false)} style={{ padding:"15px 32px", borderRadius:16, background:"#222", color:"#fff", border:"none", fontWeight:700, cursor:"pointer" }}>STILL PNG</button>
               </div>
             )}
          </div>
        </div>

        <div style={{ marginTop:60 }}>
           <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:2, display:"block", marginBottom:20 }}>Masterpiece Gallery</label>
           <div style={{ display:"flex", gap:16, overflowX:"auto", paddingBottom:20 }}>
             {history.map((h,i)=>(
               <div key={i} onClick={()=>selectHist(h)} style={{ minWidth:85, height:85, borderRadius:18, overflow:"hidden", border:`3px solid ${result?.ts===h.ts?"#e45c3a":"#222"}`, cursor:"pointer", background:"#fff" }}>
                 <img src={h.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}