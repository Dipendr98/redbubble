import { useState, useCallback, useEffect, useRef } from "react";

/**
 * REDBUBLE STICKER STUDIO — Universal Edition
 * FOOLPROOF IMAGE LOADING & RECOVERY SYSTEM
 */

const STYLES = [
  { id:"die-cut", label:"Die-Cut Classic", icon:"✂️", bg:"#e45c3a", img:"die-cut sticker design, thick white border outline, isolated on white background, vinyl sticker" },
  { id:"kawaii", label:"Kawaii Cute", icon:"🌸", bg:"#e879a8", img:"kawaii cute sticker, big eyes, pastel colors, adorable, white border, white background" },
  { id:"3d", label:"3D Glossy", icon:"🔮", bg:"#7c5ce0", img:"3D puffy glossy sticker, reflections, thick white outline, white background" },
  { id:"retro", label:"Retro Badge", icon:"🎖️", bg:"#d97706", img:"vintage retro badge sticker, warm colors, concentric borders, white background" },
  { id:"watercolor", label:"Watercolor", icon:"🎨", bg:"#0ea5a0", img:"watercolor illustration sticker, soft washes, white border, white background" },
  { id:"neon", label:"Neon Glow", icon:"💡", bg:"#a855f7", img:"neon glow sticker, bright colors, glowing edges, die-cut" },
  { id:"pixel", label:"Pixel Art", icon:"👾", bg:"#3b82f6", img:"pixel art sticker, 16-bit retro, clean pixel, white border, white background" },
  { id:"holo", label:"Holographic", icon:"🌈", bg:"#ec4899", img:"holographic iridescent sticker, rainbow chrome, metallic foil, white border, white background" },
];

const IDEAS = [
  { icon:"🐱", label:"Cat", p:"a cute cat with big sparkly eyes" },
  { icon:"🦊", label:"Fox", p:"a sleepy fox in autumn leaves" },
  { icon:"🍄", label:"Mushroom", p:"a magical mushroom with fairy lights" },
  { icon:"💀", label:"Skull", p:"a sugar skull with neon flowers" },
  { icon:"🦋", label:"Butterfly", p:"a butterfly with ornate rainbow wings" },
  { icon:"🍕", label:"Pizza", p:"a cheerful pizza slice with a happy face" },
];

function pollinationsImageUrl(promptText, opts) {
  const { width = 1024, height = 1024, seed, model = "flux" } = opts;
  // Use a very robust, standard URL format. Limit prompt to prevent URL length issues.
  const cleanPrompt = encodeURIComponent(promptText.slice(0, 320).replace(/\./g, ""));
  return `https://pollinations.ai/p/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true`;
}

function ImgMockup({ src, onLoad, onError, loading, status }) {
  return (
    <div style={{ position:"relative", width:300, height:300, borderRadius:32, background:loading?"#1a1a24":"#fff", padding:12, boxShadow:"0 20px 60px rgba(0,0,0,.3)", overflow:"hidden", border:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {loading && (
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2, background:"rgba(12,12,18,.7)", backdropFilter:"blur(12px)" }}>
           <div style={{ width:42, height:42, borderRadius:"50%", border:"3px solid rgba(228,92,58,.1)", borderTopColor:"#e45c3a", animation:"spin .8s linear infinite" }} />
           <span style={{ fontSize:10, color:"#e45c3a", fontFamily:"monospace", marginTop:16, letterSpacing:2, fontWeight:700 }}>{status || "ORCHESTRATING..."}</span>
        </div>
      )}
      <img 
        key={src} // FORCE RE-MOUNT ON URL CHANGE
        src={src} 
        alt="sticker masterpiece" 
        onLoad={onLoad} 
        onError={onError} 
        style={{ width:"100%", height:"100%", objectFit:"contain", borderRadius:22, opacity:loading?0:1, transition:"opacity .8s" }} 
      />
    </div>
  );
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("die-cut");
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dlStatus, setDlStatus] = useState("");

  const sel = STYLES.find(s => s.id === style) || STYLES[0];

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError(""); setResult(null); setImgLoading(false);
    setStatus("DEBATING...");

    try {
      const response = await fetch("/api/optimize-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() })
      });
      const data = await response.json();
      const optimizedPrompt = data.optimized || prompt.trim();

      setStatus("PAINTING...");
      const seed = Math.floor(Math.random() * 999999);
      const url = pollinationsImageUrl(optimizedPrompt, { seed, model: "flux" });
      
      const entry = { type: "image", url, seed, prompt: prompt.trim(), imagePrompt: optimizedPrompt, style, ts: Date.now(), retryCount: 0, pollModel:"flux" };
      setResult(entry); setImgLoading(true); setHistory(h => [entry, ...h].slice(0, 15));
    } catch (err) { setError("The Council is busy. Try again."); setLoading(false); }
  }, [prompt, style, loading]);

  const onImgLoad = useCallback(() => { 
    setImgLoading(false); setLoading(false); setStatus(""); 
  }, []);
  
  const onImgError = useCallback(() => { 
    setResult(prev => {
      if (!prev || prev.retryCount >= 2) {
        setError("Network error. Try a shorter prompt.");
        setLoading(false); setImgLoading(false);
        return prev;
      }
      
      const nextModel = prev.retryCount === 0 ? "turbo" : "zimage";
      setStatus(`REPAIRING (${nextModel})...`);
      
      const newUrl = pollinationsImageUrl(prev.imagePrompt, { 
        seed: prev.seed + 1, 
        model: nextModel 
      });
      
      return { ...prev, url: newUrl, retryCount: prev.retryCount + 1, pollModel: nextModel };
    });
  }, []);

  const download = useCallback(async (hiRes) => {
    if (!result) return;
    setDlStatus("dl");
    const url = hiRes ? pollinationsImageUrl(result.imagePrompt, { seed: result.seed, width:2048, height:2048, model:result.pollModel }) : result.url;
    try {
      const r = await fetch(url); const b = await r.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `sticker-${result.seed}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { window.open(url, "_blank"); }
    setDlStatus("done"); setTimeout(() => setDlStatus(""), 2000);
  }, [result]);

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;700&display=swap');
        :root { --bg:#0c0c11; --acc:#e45c3a; --t1:#fff; --t2:rgba(255,255,255,.6); --t3:rgba(255,255,255,.2); }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:var(--bg); color:var(--t1); font-family:'DM Sans',sans-serif; overflow-x:hidden; }
        .P { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:24px; padding:24px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#222; border-radius:10px; }
      `}</style>
      
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"60px 20px" }}>
        <header style={{ textAlign:"center", marginBottom:50 }}>
          <h1 style={{ fontFamily:'Syne', fontSize:52, fontWeight:800, color:"var(--acc)", letterSpacing:-1 }}>Sticker Studio Pro</h1>
          <p style={{ color:"var(--t3)", fontFamily:"monospace", fontSize:11, letterSpacing:2, marginTop:8 }}>COUNCIL OF AGENTS ACTIVE · HIGH-FIDELITY ENGINE</p>
        </header>

        <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:30, alignItems:"start" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div className="P">
              <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:2, marginBottom:12, display:"block" }}>✦ Idea brief</label>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A cute kitty in a neon space suit..." rows={3} style={{ width:"100%", background:"#16161c", border:"1px solid #222", borderRadius:16, padding:18, color:"#fff", fontSize:15, resize:"none", outline:"none", borderFocus:"1px solid var(--acc)" }} />
            </div>
            
            <div className="P">
              <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:2, marginBottom:12, display:"block" }}>Quick Inspiration</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {IDEAS.map(i=>(
                   <div key={i.label} onClick={()=>setPrompt(i.p)} style={{ padding:"6px 12px", borderRadius:20, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.05)", cursor:"pointer", fontSize:12, color:"#999" }}>
                     {i.icon} {i.label}
                   </div>
                ))}
              </div>
            </div>

            <div className="P">
               <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:2, marginBottom:12, display:"block" }}>Artistic Style</label>
               <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                 {STYLES.map(s=>(
                   <div key={s.id} onClick={()=>setStyle(s.id)} style={{ padding:10, borderRadius:12, background:style===s.id?"rgba(228,92,58,.08)":"#111116", border:`1.5px solid ${style===s.id?"#e45c3a":"#222"}`, cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:12, color:style===s.id?"#fff":"#888" }}>
                     <span style={{ fontSize:16 }}>{s.icon}</span> {s.label}
                   </div>
                 ))}
               </div>
            </div>

            <button onClick={generate} disabled={loading} style={{ padding:20, borderRadius:18, background:loading?"#222":"linear-gradient(135deg,#c93a1e,#e45c3a)", border:"none", color:"#fff", fontWeight:800, cursor:"pointer", boxShadow:"0 10px 40px rgba(228,92,58,.3)", fontSize:16, letterSpacing:1 }}>
              {loading ? "BRUSHING MASTERPIECE..." : "✦  Generate Masterpiece"}
            </button>
            {error && <div style={{ fontSize:12, color:"#f87171", textAlign:"center", padding:10, background:"rgba(239,68,68,.05)", borderRadius:12 }}>⚠ {error}</div>}
          </div>

          <div className="P" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:550, position:"relative" }}>
             {!result && !loading && (
               <div style={{ textAlign:"center", opacity:.2 }}>
                 <div style={{ fontSize:82, marginBottom:20 }}>🎨</div>
                 <p style={{ fontFamily:"monospace", fontSize:12 }}>PREVIEW AREA READY</p>
               </div>
             )}
             {(loading || result) && <ImgMockup src={result?.url} onLoad={onImgLoad} onError={onImgError} loading={imgLoading || loading} status={status} />}
             
             {result && !loading && !imgLoading && !error && (
               <div style={{ display:"flex", gap:12, marginTop:40, animation:"fadeUp .5s ease" }}>
                 <button onClick={()=>download(true)} style={{ padding:"14px 28px", borderRadius:14, background:"#e45c3a", color:"#fff", border:"none", fontWeight:800, cursor:"pointer", boxShadow:"0 8px 30px rgba(228,92,58,.2)" }}>{dlStatus==="dl"?"EXPORTING...":"SAVE 2K STICKER"}</button>
                 <button onClick={()=>download(false)} style={{ padding:"14px 28px", borderRadius:14, background:"#222", color:"#fff", border:"none", fontWeight:700, cursor:"pointer" }}>STANDARD PNG</button>
               </div>
             )}
          </div>
        </div>

        <div style={{ marginTop:60 }}>
           <label style={{ fontSize:10, color:"#555", textTransform:"uppercase", letterSpacing:2, display:"block", marginBottom:20 }}>Studio History</label>
           <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:20 }}>
             {history.map((h,i)=>(
               <div key={i} onClick={()=>selectHist(h)} style={{ minWidth:80, height:80, borderRadius:16, overflow:"hidden", border:`3px solid ${result?.ts===h.ts?"#e45c3a":"#222"}`, cursor:"pointer", background:"#fff" }}>
                 <img src={h.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}