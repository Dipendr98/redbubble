import { useState, useCallback, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   REDBUBBLE STICKER STUDIO
   Uses Anthropic API (Claude Sonnet) to generate SVG stickers
   directly inside the artifact — no external image loading.
   ═══════════════════════════════════════════════════════════ */

const STYLES = [
  {
    id: "die-cut",
    label: "Die-Cut Classic",
    icon: "✂️",
    bg: "#e45c3a",
    prompt: `Style: clean die-cut vinyl sticker. Use bold flat colors with subtle gradients. Add a 4px white border/outline around the entire design for the die-cut edge. Keep shapes clean and print-friendly. Use drop shadows sparingly for depth.`,
  },
  {
    id: "kawaii",
    label: "Kawaii Cute",
    icon: "🌸",
    bg: "#e879a8",
    prompt: `Style: kawaii/chibi Japanese cute style. Use soft pastel colors (pinks, lavenders, baby blues, mint). Give characters oversized heads, tiny bodies, big sparkly eyes with highlights, rosy blush circles on cheeks. Add sparkle stars and small hearts. Round all edges. White border outline.`,
  },
  {
    id: "3d-glossy",
    label: "3D Glossy",
    icon: "🔮",
    bg: "#7c5ce0",
    prompt: `Style: 3D glossy puffy sticker look. Use rich saturated colors with strong highlights and shadows. Add white specular gloss reflections (ellipses/strokes) for shine. Use layered gradients for 3D depth. Bold drop shadows. Thick white outline border. Make it look like a real puffy sticker.`,
  },
  {
    id: "retro",
    label: "Retro Badge",
    icon: "🎖️",
    bg: "#d97706",
    prompt: `Style: vintage retro badge/emblem. Use a warm color palette (amber, cream, rust, navy). Create concentric border rings/shapes. Centered symmetric composition. Vintage typography feel if text is needed. Distressed/worn texture feel using subtle pattern overlays.`,
  },
  {
    id: "watercolor",
    label: "Watercolor",
    icon: "🎨",
    bg: "#0ea5a0",
    prompt: `Style: delicate watercolor illustration. Use soft, translucent color washes with visible brush-edge effects. Colors should blend softly. Keep the overall palette harmonious with 3-4 colors. Organic flowing shapes. White border outline. Gentle and artistic.`,
  },
  {
    id: "neon",
    label: "Neon Glow",
    icon: "💡",
    bg: "#a855f7",
    prompt: `Style: neon glow on dark background. Use a near-black (#0a0a1a) background shape. Draw the subject with bright neon-colored strokes (cyan, magenta, electric green, hot pink). Add glow effects using feGaussianBlur filters with bright colors. Make it look like a neon sign sticker.`,
  },
  {
    id: "pixel",
    label: "Pixel Art",
    icon: "👾",
    bg: "#3b82f6",
    prompt: `Style: 16-bit pixel art. Use small rectangles (4x4 or 5x5 px) as pixels. Limited color palette (8-12 colors max). Sharp edges, no anti-aliasing. Retro video game aesthetic. White border outline. Nostalgic 90s game cartridge energy.`,
  },
  {
    id: "holo",
    label: "Holographic",
    icon: "🌈",
    bg: "#ec4899",
    prompt: `Style: holographic/iridescent chrome. Use rainbow gradient fills cycling through the spectrum. Metallic/chrome look with multiple linearGradients using spectral colors. Prismatic light effects. Reflective shiny surfaces. Bold thick white outline border.`,
  },
];

const QUICK_IDEAS = [
  { icon: "🐱", label: "Cat", prompt: "a cute cat with big sparkly eyes" },
  { icon: "🐸", label: "Frog", prompt: "a happy frog wearing a tiny crown" },
  { icon: "🍕", label: "Pizza", prompt: "a cheerful pizza slice with a smiling face" },
  { icon: "☕", label: "Coffee", prompt: "a cozy coffee cup with steam hearts" },
  { icon: "🌵", label: "Cactus", prompt: "a cute cactus in a decorated pot" },
  { icon: "🚀", label: "Rocket", prompt: "a colorful rocket ship blasting off" },
  { icon: "🎸", label: "Guitar", prompt: "an electric guitar with lightning bolts" },
  { icon: "🦊", label: "Fox", prompt: "a sleepy fox curled up in autumn leaves" },
  { icon: "🍄", label: "Mushroom", prompt: "a magical spotted mushroom with fairy lights" },
  { icon: "💀", label: "Skull", prompt: "a sugar skull with flowers and patterns" },
  { icon: "🦋", label: "Butterfly", prompt: "a decorative butterfly with ornate wing patterns" },
  { icon: "🐙", label: "Octopus", prompt: "a playful octopus holding various objects" },
];

const SVG_SYSTEM_PROMPT = `You are an expert SVG sticker designer creating artwork for Redbubble print-on-demand.

ABSOLUTE RULES — follow every single one:
1. Output ONLY raw SVG code. No markdown, no backticks, no explanation, no prose. Start with <svg and end with </svg>.
2. Root element: <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
   Do NOT set width or height attributes.
3. COMPLEXITY: Create DETAILED, RICH artwork with minimum 15-30 SVG elements. This is professional commercial artwork, not a simple icon.
4. Use <defs> extensively: linearGradient, radialGradient, clipPath, filter (feDropShadow, feGaussianBlur), pattern.
5. Build multiple visual layers: background shape → base colors → main subject details → shading/highlights → decorative elements → gloss/shine overlay.
6. The main subject must occupy 70-85% of the canvas, centered.
7. Keep a 20px safe margin from edges.
8. Include a white (#ffffff) border/outline shape behind the design for the die-cut edge effect.
9. No copyrighted characters, logos, or brands.
10. All elements self-contained — NO external references, NO <image> tags, NO xlink:href to outside resources.
11. Use vivid, saturated colors. Commercial sticker art must POP visually.
12. Add small decorative details: sparkles (star shapes), small circles, accent shapes around the main subject.
13. For any character/creature: give it expressive features (eyes with highlights, smile/expression, distinctive pose).
14. Clean shapes with stroke-width >= 1.5px for all visible strokes.
15. Make the design look PROFESSIONAL and COMMERCIALLY APPEALING — this is going on a real marketplace.`;

async function generateStickerSVG(prompt, stylePrompt, onChunk) {
  const fullPrompt = `Create a sticker design of: "${prompt}"

${stylePrompt}

Remember: Output ONLY the SVG code. Make it detailed, colorful, expressive, and commercially attractive. Minimum 20+ SVG elements for visual richness.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      stream: true,
      messages: [{ role: "user", content: fullPrompt }],
      system: SVG_SYSTEM_PROMPT,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            fullText += parsed.delta.text;
            if (onChunk) onChunk(fullText);
          }
        } catch {}
      }
    }
  }

  // Extract SVG
  const svgMatch = fullText.match(/<svg[\s\S]*?<\/svg>/i);
  if (!svgMatch) throw new Error("No valid SVG generated. Try again.");
  return svgMatch[0];
}

function svgToPngDataUrl(svgString, size = 2048) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render SVG to image"));
    };
    img.src = url;
  });
}

function downloadFile(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadSvg(svgString, filename) {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ═══ UI COMPONENTS ═══════════════════════════════════════ */

function StickerMockup({ svg, size = 270 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* Main sticker */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            bottom: -12,
            left: "15%",
            right: "15%",
            height: 30,
            background:
              "radial-gradient(ellipse, rgba(0,0,0,0.28) 0%, transparent 72%)",
            filter: "blur(10px)",
          }}
        />
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 30,
            background: "#fff",
            padding: 12,
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 8px 30px rgba(0,0,0,0.15), 0 20px 60px rgba(0,0,0,0.12)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ width: "100%", height: "100%", borderRadius: 20 }}
          />
          {/* Gloss */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: "45%",
              bottom: "55%",
              borderRadius: "20px 20px 60% 0",
              background:
                "linear-gradient(158deg, rgba(255,255,255,0.32) 0%, transparent 100%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Size variants */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          animation: "fadeSlide 0.4s ease 0.2s both",
        }}
      >
        {[56, 42, 30].map((sz, i) => (
          <div
            key={i}
            style={{
              width: sz,
              height: sz,
              borderRadius: sz * 0.2,
              background: "#fff",
              padding: 3,
              boxShadow: "0 3px 12px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: svg }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: sz * 0.13,
              }}
            />
          </div>
        ))}
        <span
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
            marginLeft: 4,
          }}
        >
          size variants
        </span>
      </div>
    </div>
  );
}

function StreamingPreview({ partialSvg }) {
  const svgMatch = partialSvg?.match(/<svg[\s\S]*/i);
  if (!svgMatch) return null;
  let svgStr = svgMatch[0];
  if (!svgStr.includes("</svg>")) svgStr += "</svg>";
  return (
    <div
      style={{
        width: 200,
        height: 200,
        borderRadius: 20,
        overflow: "hidden",
        opacity: 0.45,
        filter: "blur(1px)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: svgStr }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

/* ═══ MAIN APP ═══════════════════════════════════════════ */

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("die-cut");
  const [loading, setLoading] = useState(false);
  const [svg, setSvg] = useState(null);
  const [partialSvg, setPartialSvg] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [dlStatus, setDlStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const textareaRef = useRef(null);

  const selectedStyle = STYLES.find((s) => s.id === style) || STYLES[0];

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setSvg(null);
    setPartialSvg("");
    setDlStatus("");

    try {
      const result = await generateStickerSVG(
        prompt.trim(),
        selectedStyle.prompt,
        (chunk) => setPartialSvg(chunk)
      );
      setSvg(result);
      setHistory((prev) =>
        [
          { svg: result, prompt: prompt.trim(), style, ts: Date.now() },
          ...prev,
        ].slice(0, 12)
      );
    } catch (err) {
      setError(err.message || "Generation failed. Please try again.");
    }
    setLoading(false);
  }, [prompt, style, loading, selectedStyle]);

  const handleExportPng = useCallback(
    async (size) => {
      if (!svg || exporting) return;
      setExporting(true);
      setDlStatus("exporting");
      try {
        const dataUrl = await svgToPngDataUrl(svg, size);
        downloadFile(dataUrl, `sticker-${size}px-${Date.now()}.png`);
        setDlStatus("done");
        setTimeout(() => setDlStatus(""), 2500);
      } catch {
        // Fallback: download SVG
        downloadSvg(svg, `sticker-${Date.now()}.svg`);
        setDlStatus("done");
        setTimeout(() => setDlStatus(""), 2500);
      }
      setExporting(false);
    },
    [svg, exporting]
  );

  const handleExportSvg = useCallback(() => {
    if (!svg) return;
    downloadSvg(svg, `sticker-${Date.now()}.svg`);
    setDlStatus("done");
    setTimeout(() => setDlStatus(""), 2500);
  }, [svg]);

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --bg-0: #0c0c11;
          --bg-1: rgba(255,255,255,0.025);
          --bg-2: rgba(255,255,255,0.04);
          --bg-hover: rgba(255,255,255,0.07);
          --border: rgba(255,255,255,0.06);
          --border-active: rgba(228,92,58,0.4);
          --accent: #e45c3a;
          --accent-glow: rgba(228,92,58,0.15);
          --accent-2: #f0a030;
          --text-1: #edeef2;
          --text-2: rgba(255,255,255,0.55);
          --text-3: rgba(255,255,255,0.25);
          --text-4: rgba(255,255,255,0.12);
          --success: #34d399;
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
          --font-mono: 'DM Mono', monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-0); }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }

        .app-root {
          min-height: 100vh;
          background: var(--bg-0);
          font-family: var(--font-body);
          color: var(--text-1);
        }

        textarea:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }

        .panel {
          background: var(--bg-1);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 20px;
        }

        .label {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-3);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          display: block;
          margin-bottom: 10px;
        }

        .style-chip {
          transition: all 0.2s;
          cursor: pointer;
          user-select: none;
        }
        .style-chip:hover {
          transform: translateY(-1px);
          background: var(--bg-hover) !important;
        }

        .idea-pill {
          transition: all 0.15s;
          cursor: pointer;
          user-select: none;
        }
        .idea-pill:hover {
          background: var(--bg-hover) !important;
          transform: scale(1.04);
        }

        .gen-btn {
          transition: all 0.22s;
        }
        .gen-btn:not(:disabled):hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
          box-shadow: 0 8px 30px rgba(228,92,58,0.35) !important;
        }
        .gen-btn:not(:disabled):active {
          transform: translateY(1px);
        }

        .act-btn {
          transition: all 0.18s;
          cursor: pointer;
        }
        .act-btn:hover {
          background: var(--bg-hover) !important;
          transform: translateY(-1px);
        }

        .hist-thumb {
          transition: all 0.18s;
          cursor: pointer;
        }
        .hist-thumb:hover {
          transform: scale(1.1);
          border-color: var(--border-active) !important;
        }
      `}</style>

      {/* ── BG EFFECTS ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-12%",
            left: "-6%",
            width: 600,
            height: 600,
            background:
              "radial-gradient(circle, rgba(228,92,58,0.06) 0%, transparent 55%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-8%",
            right: "-4%",
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(240,160,48,0.04) 0%, transparent 55%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.018,
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1120,
          margin: "0 auto",
          padding: "28px 20px 70px",
        }}
      >
        {/* ── HEADER ── */}
        <header
          style={{
            textAlign: "center",
            marginBottom: 32,
            animation: "fadeSlide 0.5s ease",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent-glow)",
              border: "1px solid rgba(228,92,58,0.22)",
              borderRadius: 99,
              padding: "5px 16px",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
                animation: "pulse 2s ease infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--accent)",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Sticker Studio
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(30px, 5vw, 50px)",
              fontWeight: 800,
              lineHeight: 1.08,
              marginBottom: 8,
              background:
                "linear-gradient(135deg, #fff 20%, var(--accent) 55%, var(--accent-2) 90%)",
              backgroundSize: "250% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 6s linear infinite",
            }}
          >
            Design. Preview. Sell.
          </h1>
          <p
            style={{
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
          >
            AI-powered sticker art · SVG + PNG export · Redbubble-ready
          </p>
        </header>

        {/* ── MAIN GRID ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "420px 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* ═══ LEFT COLUMN ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              animation: "fadeSlide 0.55s ease",
            }}
          >
            {/* Prompt */}
            <div className="panel">
              <label className="label">✦ Describe your sticker</label>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                }}
                placeholder="e.g. a cute frog wearing a wizard hat, sitting on a mushroom..."
                rows={3}
                style={{
                  width: "100%",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 13,
                  padding: "12px 14px",
                  color: "var(--text-1)",
                  fontSize: 14,
                  resize: "none",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.55,
                  transition: "border 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--border-active)";
                  e.target.style.boxShadow =
                    "0 0 0 3px var(--accent-glow)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text-4)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ⌘+Enter to generate
                </span>
              </div>
            </div>

            {/* Quick ideas */}
            <div className="panel">
              <label className="label">Quick ideas</label>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {QUICK_IDEAS.map((idea) => (
                  <div
                    key={idea.label}
                    className="idea-pill"
                    onClick={() => setPrompt(idea.prompt)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: 20,
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      fontSize: 12,
                      color: "var(--text-2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{idea.icon}</span>
                    {idea.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Style picker */}
            <div className="panel">
              <label className="label">Sticker style</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                {STYLES.map((s) => (
                  <div
                    key={s.id}
                    className="style-chip"
                    onClick={() => setStyle(s.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background:
                        style === s.id
                          ? `linear-gradient(135deg, ${s.bg}18, ${s.bg}0a)`
                          : "var(--bg-2)",
                      border: `1.5px solid ${style === s.id ? s.bg + "55" : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 17, flexShrink: 0 }}>{s.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: style === s.id ? "var(--text-1)" : "var(--text-2)",
                      }}
                    >
                      {s.label}
                    </span>
                    {style === s.id && (
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: s.bg,
                          boxShadow: `0 0 10px ${s.bg}`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              className="gen-btn"
              onClick={generate}
              disabled={loading || !prompt.trim()}
              style={{
                padding: "15px 0",
                borderRadius: 15,
                border: "none",
                cursor:
                  loading || !prompt.trim() ? "not-allowed" : "pointer",
                background:
                  loading || !prompt.trim()
                    ? "rgba(228,92,58,0.12)"
                    : "linear-gradient(135deg, #c93a1e, #e45c3a, #f0a030)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                letterSpacing: 0.5,
                boxShadow: loading
                  ? "none"
                  : "0 6px 28px rgba(228,92,58,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.25)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Generating...
                </>
              ) : (
                "✦  Generate Sticker"
              )}
            </button>

            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 13,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#f87171",
                }}
              >
                ⚠ {error}
              </div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              animation: "fadeSlide 0.65s ease",
            }}
          >
            {/* Preview canvas */}
            <div
              className="panel"
              style={{
                padding: 28,
                minHeight: 450,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Empty state */}
              {!svg && !loading && (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 52,
                      opacity: 0.1,
                      marginBottom: 12,
                    }}
                  >
                    ✂️
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-3)",
                    }}
                  >
                    your sticker preview appears here
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "var(--text-4)",
                      marginTop: 4,
                    }}
                  >
                    powered by Claude Sonnet · SVG + PNG export
                  </p>
                </div>
              )}

              {/* Loading state with live preview */}
              {loading && !svg && (
                <div
                  style={{
                    textAlign: "center",
                    animation: "fadeSlide 0.3s ease",
                  }}
                >
                  {partialSvg ? (
                    <StreamingPreview partialSvg={partialSvg} />
                  ) : (
                    <div
                      style={{
                        position: "relative",
                        width: 60,
                        height: 60,
                        margin: "0 auto",
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: "50%",
                          border: "3px solid var(--border)",
                          borderTopColor: "var(--accent)",
                          animation: "spin 0.9s linear infinite",
                        }}
                      />
                    </div>
                  )}
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-2)",
                      marginTop: 14,
                      animation: "pulse 1.5s ease infinite",
                    }}
                  >
                    crafting your sticker...
                  </p>
                </div>
              )}

              {/* Result */}
              {svg && !loading && (
                <div style={{ animation: "fadeSlide 0.4s ease" }}>
                  <StickerMockup svg={svg} />
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: 14,
                      animation: "fadeSlide 0.4s ease 0.15s both",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "var(--accent-glow)",
                        border: "1px solid rgba(228,92,58,0.2)",
                        borderRadius: 10,
                        padding: "4px 13px",
                        fontSize: 10,
                        color: "var(--accent)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      ⬟ Die-cut · {selectedStyle.label}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {svg && !loading && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  animation: "fadeSlide 0.3s ease",
                }}
              >
                <button
                  className="act-btn"
                  onClick={() => handleExportPng(2048)}
                  disabled={exporting}
                  style={{
                    flex: 3,
                    padding: "13px 0",
                    borderRadius: 13,
                    border: "1px solid rgba(52,211,153,0.25)",
                    background:
                      dlStatus === "done"
                        ? "rgba(52,211,153,0.1)"
                        : "rgba(52,211,153,0.08)",
                    color: "var(--success)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  {dlStatus === "done"
                    ? "✓ Saved!"
                    : dlStatus === "exporting"
                      ? "Exporting..."
                      : "🔥  Download PNG (2048px)"}
                </button>
                <button
                  className="act-btn"
                  onClick={handleExportSvg}
                  style={{
                    flex: 2,
                    padding: "13px 0",
                    borderRadius: 13,
                    border: "1px solid var(--border)",
                    background: "var(--bg-2)",
                    color: "var(--text-2)",
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "var(--font-body)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  ⬇ SVG
                </button>
                <button
                  className="act-btn"
                  onClick={generate}
                  title="Regenerate"
                  style={{
                    width: 48,
                    borderRadius: 13,
                    border: "1px solid var(--border)",
                    background: "var(--bg-2)",
                    color: "var(--text-2)",
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ↺
                </button>
              </div>
            )}

            {/* Redbubble upload guide */}
            {svg && !loading && (
              <div
                style={{
                  background: "rgba(52,211,153,0.03)",
                  border: "1px solid rgba(52,211,153,0.1)",
                  borderRadius: 15,
                  padding: "12px 16px",
                  animation: "fadeSlide 0.4s ease 0.1s both",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--success)",
                    marginBottom: 5,
                  }}
                >
                  📤 Upload to Redbubble
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1.8,
                  }}
                >
                  1. Download PNG 2048px (best for print) or SVG
                  <br />
                  2. redbubble.com → Add New Work → Upload
                  <br />
                  3. Enable "Stickers" product → Set markup → Publish 🚀
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="panel" style={{ padding: 16 }}>
                <label className="label" style={{ marginBottom: 8 }}>
                  History ({history.length})
                </label>
                <div
                  style={{ display: "flex", gap: 7, flexWrap: "wrap" }}
                >
                  {history.map((item, i) => (
                    <div
                      key={item.ts + "-" + i}
                      className="hist-thumb"
                      onClick={() => {
                        setSvg(item.svg);
                        setPrompt(item.prompt);
                        setStyle(item.style);
                        setError("");
                        setDlStatus("");
                      }}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 11,
                        overflow: "hidden",
                        background: "#fff",
                        padding: 3,
                        flexShrink: 0,
                        border: `2px solid ${svg === item.svg ? "var(--border-active)" : "var(--border)"}`,
                      }}
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: item.svg }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 7,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 40,
            padding: "16px 0",
            borderTop: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-4)",
            }}
          >
            Powered by Claude Sonnet · No external API keys needed · SVG
            + PNG export
          </p>
        </div>
      </div>
    </div>
  );
}