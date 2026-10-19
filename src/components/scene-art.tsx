/**
 * Original flat illustrations for stories, lessons and the timeline. `art` is "sky:ground:motif,motif".
 * These are artistic illustrations for learning, not historical reconstructions.
 */
const SKIES: Record<string, [string, string]> = { day: ["#9fd3ff", "#e9f6ff"], dawn: ["#ffd19a", "#fff1d6"], dusk: ["#7c6bb8", "#f7b27a"], night: ["#0b1f4b", "#2c4a8f"], storm: ["#3b4a63", "#7b8aa3"] };
const GROUNDS: Record<string, string> = { hills: "#6aa86b", desert: "#e0b872", sea: "#2e6fb5", river: "#4a90c9", city: "#c9a46a", garden: "#4f9a5a", road: "#c2a06b" };

function Motif({ name }: { name: string }) {
  switch (name) {
    case "sun": return <g><circle cx="270" cy="52" r="26" fill="#ffd34d" /><g stroke="#ffd34d" strokeWidth="4" strokeLinecap="round">{Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; return <line key={i} x1={270 + Math.cos(a) * 32} y1={52 + Math.sin(a) * 32} x2={270 + Math.cos(a) * 42} y2={52 + Math.sin(a) * 42} />; })}</g></g>;
    case "stars": return <g fill="#fff8c2">{[[40, 30], [90, 58], [150, 24], [210, 46], [300, 28], [330, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 2.2 : 3} />)}<circle cx="320" cy="40" r="14" fill="#f4eed0" /></g>;
    case "star": return <polygon points="200,18 207,40 230,40 211,54 218,76 200,62 182,76 189,54 170,40 193,40" fill="#ffe27a" stroke="#f0b73a" strokeWidth="2" />;
    case "tree": return <g><rect x="52" y="118" width="9" height="40" fill="#7a5230" /><circle cx="56" cy="108" r="26" fill="#3f8f4d" /><circle cx="42" cy="118" r="16" fill="#4ca35a" /></g>;
    case "palm": return <g><path d="M300 160 Q304 120 296 92" stroke="#7a5230" strokeWidth="7" fill="none" /><g fill="#3f8f4d"><path d="M296 92 Q270 78 252 94 Q276 90 296 92z" /><path d="M296 92 Q322 76 344 92 Q318 90 296 92z" /><path d="M296 92 Q286 66 296 52 Q304 70 296 92z" /></g></g>;
    case "tent": return <g><polygon points="60,160 110,100 160,160" fill="#d9b779" stroke="#a37c3a" strokeWidth="2" /><polygon points="110,100 98,160 122,160" fill="#8b6a2e" /></g>;
    case "well": return <g><rect x="170" y="128" width="50" height="30" rx="4" fill="#9a9a9a" /><rect x="176" y="100" width="4" height="30" fill="#6b4a2a" /><rect x="210" y="100" width="4" height="30" fill="#6b4a2a" /><rect x="172" y="96" width="46" height="6" fill="#6b4a2a" /></g>;
    case "coat": return <g><path d="M170 100 l18 -8 l12 10 l12 -10 l18 8 l-8 22 l-8 -3 l0 38 l-28 0 l0 -38 l-8 3z" fill="#e0533e" /><g fill="#2e6fb5"><rect x="190" y="112" width="8" height="46" /><rect x="206" y="112" width="8" height="46" /></g><g fill="#ffd34d"><rect x="198" y="112" width="8" height="46" /></g></g>;
    case "basket": return <g><path d="M170 140 q40 30 80 0 l-8 -30 h-64z" fill="#c89a4a" stroke="#9c7430" strokeWidth="2" /><path d="M176 122 h68 M180 132 h60" stroke="#9c7430" strokeWidth="2" /></g>;
    case "fire": case "flame": return <g><path d="M200 150 q-30 -20 -10 -52 q8 14 20 14 q-6 -24 12 -40 q6 30 18 42 q14 22 -4 36 q-18 12 -36 0z" fill="#ff8a1f" /><path d="M204 150 q-14 -10 -4 -28 q6 8 14 6 q4 14 0 24z" fill="#ffd34d" /></g>;
    case "wave": return <g fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".8"><path d="M20 150 q15 -12 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" /><path d="M10 170 q15 -12 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" /></g>;
    case "cloud": return <g fill="#ffffff" opacity=".95"><ellipse cx="90" cy="46" rx="34" ry="14" /><ellipse cx="116" cy="38" rx="22" ry="14" /><ellipse cx="70" cy="40" rx="20" ry="12" /></g>;
    case "boat": return <g><path d="M110 130 h110 l-18 28 h-74z" fill="#8b5a2b" /><rect x="162" y="78" width="4" height="52" fill="#5a3a1a" /><path d="M166 80 l40 40 h-40z" fill="#fff8e7" /></g>;
    case "rainbow": return <g fill="none" strokeWidth="8">{["#e0533e", "#f29a2e", "#ffd34d", "#4ca35a", "#2e6fb5", "#6a4fb5"].map((c, i) => <path key={c} d={`M${70 + i * 8} 160 A${130 - i * 8} ${110 - i * 8} 0 0 1 ${330 - i * 8} 160`} stroke={c} />)}</g>;
    case "dove": return <g><path d="M170 90 q20 -26 50 -8 q14 -14 34 -6 q-16 6 -20 18 q4 14 -10 24 q-22 8 -40 -6z" fill="#ffffff" stroke="#c9d6ee" strokeWidth="2" /><circle cx="248" cy="86" r="2" fill="#333" /></g>;
    case "tower": return <g><polygon points="150,160 160,50 240,50 250,160" fill="#c89a4a" stroke="#9c7430" strokeWidth="2" />{[70, 90, 110, 130].map((y) => <line key={y} x1="156" y1={y} x2="244" y2={y} stroke="#9c7430" />)}</g>;
    case "wall": return <g><rect x="40" y="100" width="320" height="60" fill="#b99a6b" stroke="#8d7345" strokeWidth="2" />{Array.from({ length: 16 }, (_, i) => <rect key={i} x={40 + i * 20} y="88" width="12" height="12" fill="#b99a6b" stroke="#8d7345" />)}</g>;
    case "tablet": return <g><rect x="150" y="60" width="52" height="82" rx="26" fill="#d8d2c0" stroke="#9a937c" strokeWidth="2" /><rect x="206" y="60" width="52" height="82" rx="26" fill="#d8d2c0" stroke="#9a937c" strokeWidth="2" /><g stroke="#9a937c" strokeWidth="2"><line x1="164" y1="86" x2="188" y2="86" /><line x1="164" y1="98" x2="188" y2="98" /><line x1="220" y1="86" x2="244" y2="86" /><line x1="220" y1="98" x2="244" y2="98" /></g></g>;
    case "bread": return <g><ellipse cx="170" cy="140" rx="30" ry="14" fill="#d9a35a" /><ellipse cx="230" cy="136" rx="30" ry="14" fill="#e0b068" /><path d="M262 140 q16 -10 32 0 q-16 12 -32 0z" fill="#7aa0c9" /><path d="M296 140 l8 -6 v12z" fill="#7aa0c9" /></g>;
    case "lamb": return <g><ellipse cx="200" cy="130" rx="34" ry="22" fill="#fffdf4" stroke="#d9d2b8" strokeWidth="2" /><circle cx="236" cy="120" r="12" fill="#fffdf4" stroke="#d9d2b8" strokeWidth="2" /><rect x="178" y="146" width="5" height="14" fill="#6b5a3a" /><rect x="214" y="146" width="5" height="14" fill="#6b5a3a" /><circle cx="239" cy="118" r="1.8" fill="#333" /></g>;
    case "trumpet": return <g><path d="M150 120 h70 l40 -24 v64 l-40 -24 h-70z" fill="#f0b73a" stroke="#c98a12" strokeWidth="2" /></g>;
    case "wheat": return <g stroke="#c9a03d" strokeWidth="3">{[160, 190, 220, 250].map((x) => <g key={x}><line x1={x} y1="160" x2={x} y2="104" /><ellipse cx={x} cy="100" rx="5" ry="12" fill="#e0b84a" /></g>)}</g>;
    case "lamp": return <g><path d="M170 140 q30 24 60 0 l8 -14 h-76z" fill="#e0b84a" stroke="#a8760d" strokeWidth="2" /><path d="M238 126 q16 0 18 -10" stroke="#a8760d" strokeWidth="3" fill="none" /><path d="M170 126 q-8 -16 6 -22" stroke="#ffb02e" strokeWidth="5" strokeLinecap="round" fill="none" /></g>;
    case "temple": return <g><rect x="130" y="100" width="140" height="60" fill="#efe3c4" stroke="#b99a6b" strokeWidth="2" /><polygon points="120,100 200,60 280,100" fill="#d8c08a" stroke="#b99a6b" strokeWidth="2" />{[146, 176, 206, 236].map((x) => <rect key={x} x={x} y="108" width="10" height="52" fill="#c9b27e" />)}</g>;
    case "sling": return <g><circle cx="200" cy="120" r="6" fill="#6b6b6b" /><path d="M200 120 q-30 -50 -64 -26 M200 120 q36 -46 70 -20" stroke="#8b5a2b" strokeWidth="3" fill="none" /></g>;
    case "crown": return <g><path d="M160 130 l10 -36 l22 22 l8 -30 l8 30 l22 -22 l10 36z" fill="#f0b73a" stroke="#c98a12" strokeWidth="2" /><circle cx="170" cy="92" r="4" fill="#e0533e" /><circle cx="208" cy="82" r="4" fill="#2e6fb5" /><circle cx="246" cy="92" r="4" fill="#e0533e" /></g>;
    case "harp": return <g><path d="M170 150 q-10 -70 50 -86 q-6 34 -6 86z" fill="none" stroke="#a8760d" strokeWidth="5" />{[184, 194, 204].map((x, i) => <line key={x} x1={x} y1={150 - i * 6} x2={x + 6 + i * 4} y2={96 + i * 6} stroke="#d4a017" strokeWidth="2" />)}</g>;
    case "oil": return <g><path d="M180 150 q-12 -26 12 -40 v-12 h16 v12 q24 14 12 40z" fill="#a8693a" stroke="#6b4a2a" strokeWidth="2" /></g>;
    case "fish": return <g><ellipse cx="200" cy="120" rx="46" ry="22" fill="#6aa0d4" stroke="#3b6fa6" strokeWidth="2" /><polygon points="246,120 280,100 280,140" fill="#6aa0d4" stroke="#3b6fa6" strokeWidth="2" /><circle cx="172" cy="114" r="4" fill="#fff" /><circle cx="171" cy="114" r="2" fill="#222" /></g>;
    case "lion": return <g><circle cx="200" cy="112" r="38" fill="#c9852e" /><circle cx="200" cy="114" r="26" fill="#e3a94d" /><circle cx="190" cy="108" r="3" fill="#222" /><circle cx="210" cy="108" r="3" fill="#222" /><path d="M192 124 q8 8 16 0" stroke="#7a4a12" strokeWidth="3" fill="none" /></g>;
    case "serpent": return <g><path d="M150 150 q30 -60 60 -20 t60 -40" stroke="#4a8a3a" strokeWidth="9" fill="none" strokeLinecap="round" /></g>;
    case "book": case "scroll": return <g><path d="M200 150 q-40 -14 -80 0 v-70 q40 -14 80 0z M200 150 q40 -14 80 0 v-70 q-40 -14 -80 0z" fill="#fffaf0" stroke="#0b1f4b" strokeWidth="3" /></g>;
    case "cross": return <g><rect x="194" y="40" width="12" height="110" fill="#5a3a1a" /><rect x="168" y="66" width="64" height="12" fill="#5a3a1a" /></g>;
    case "tomb": return <g><path d="M130 160 v-50 a70 56 0 0 1 140 0 v50z" fill="#8f8a7c" stroke="#6e695c" strokeWidth="2" /><ellipse cx="200" cy="136" rx="26" ry="24" fill="#2a2a2a" /><circle cx="262" cy="142" r="20" fill="#a7a293" stroke="#6e695c" strokeWidth="2" /></g>;
    case "manger": return <g><path d="M150 140 l16 -16 h68 l16 16z" fill="#a8693a" /><rect x="164" y="140" width="6" height="22" fill="#6b4a2a" /><rect x="230" y="140" width="6" height="22" fill="#6b4a2a" /><ellipse cx="200" cy="122" rx="30" ry="9" fill="#e9d9a6" /><circle cx="200" cy="114" r="9" fill="#f4d3b0" /></g>;
    case "donkey": return <g><ellipse cx="200" cy="128" rx="38" ry="22" fill="#8c8478" /><rect x="170" y="144" width="6" height="18" fill="#6e675d" /><rect x="222" y="144" width="6" height="18" fill="#6e675d" /><path d="M232 118 l14 -30 l8 4 l-4 32z" fill="#8c8478" /></g>;
    case "road": return <path d="M130 160 Q200 120 270 160" stroke="#d8c08a" strokeWidth="12" fill="none" />;
    case "net": return <g stroke="#7a5a2a" strokeWidth="2" fill="none"><path d="M150 100 q50 60 100 0" />{[160, 180, 200, 220, 240].map((x) => <line key={x} x1={x} y1="102" x2={200 + (x - 200) * 0.6} y2="142" />)}</g>;
    case "wine": return <g><path d="M184 100 h32 l-4 30 q-12 10 -24 0z" fill="#8a1f3d" stroke="#5a1228" strokeWidth="2" /><rect x="198" y="130" width="4" height="22" fill="#5a1228" /><rect x="186" y="152" width="28" height="4" fill="#5a1228" /></g>;
    case "roof": return <g><polygon points="130,110 200,70 270,110" fill="#b5651d" /><rect x="136" y="110" width="128" height="50" fill="#efe3c4" /><rect x="188" y="110" width="24" height="26" fill="#6b4a2a" /></g>;
    case "stone": return <g><ellipse cx="200" cy="140" rx="24" ry="16" fill="#8f8a7c" stroke="#6e695c" strokeWidth="2" /></g>;
    case "basin": return <g><path d="M160 130 q40 30 80 0 v-10 h-80z" fill="#c9d6ee" stroke="#6b84b5" strokeWidth="2" /><path d="M168 126 q32 10 64 0" stroke="#7ba7e0" strokeWidth="3" fill="none" /></g>;
    case "throne": return <g><rect x="170" y="70" width="60" height="70" rx="6" fill="#f0b73a" stroke="#c98a12" strokeWidth="2" /><rect x="160" y="130" width="80" height="22" fill="#c98a12" /><circle cx="200" cy="48" r="16" fill="#fff8c2" opacity=".9" /></g>;
    case "light": return <g><circle cx="200" cy="80" r="44" fill="#fff6c7" opacity=".6" /><circle cx="200" cy="80" r="26" fill="#fffbe0" /></g>;
    case "wind": return <g stroke="#e8f2ff" strokeWidth="4" strokeLinecap="round" fill="none"><path d="M120 80 h110 q20 0 20 -16" /><path d="M140 100 h100 q18 0 18 14" /></g>;
    case "family": return <g fill="#7a4a2a">{[150, 190, 230].map((x, i) => <g key={x}><circle cx={x} cy={104 - i * 4} r={8 - i} fill="#c68a5a" /><rect x={x - 9 + i} y={112 - i * 4} width={18 - i * 2} height={44 + i * 4} rx="8" fill={["#2e6fb5", "#e0533e", "#4ca35a"][i]} /></g>)}</g>;
    case "river": return <g />;
    default: return null;
  }
}

export function SceneArt({ art, className = "", label }: { art?: string | null; className?: string; label?: string }) {
  const [sky = "day", ground = "hills", motifs = ""] = (art ?? "day:hills:sun").split(":");
  const [top, bottom] = SKIES[sky] ?? SKIES.day;
  const gid = `g${Math.abs([...(art ?? "x")].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))}`;
  const gc = GROUNDS[ground] ?? GROUNDS.hills;
  return (
    <svg viewBox="0 0 400 200" role={label ? "img" : "presentation"} aria-label={label} aria-hidden={label ? undefined : true} className={className} preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
      <rect width="400" height="200" fill={`url(#${gid})`} />
      {(sky === "night" || sky === "dusk") && <g fill="#fff" opacity=".7">{[[30, 20], [120, 14], [330, 22], [370, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" />)}</g>}
      {sky === "day" && !motifs.includes("cloud") && <Motif name="cloud" />}
      {ground === "sea" || ground === "river" ? <><rect y="140" width="400" height="60" fill={gc} /><Motif name="wave" /></> : ground === "city" ? <><rect y="150" width="400" height="50" fill={gc} /><g fill="#b99a6b" stroke="#8d7345">{[20, 70, 120, 280, 330].map((x, i) => <rect key={x} x={x} y={118 - (i % 3) * 14} width="42" height={42 + (i % 3) * 14} />)}</g></> : <><path d={ground === "desert" ? "M0 170 Q100 140 200 165 T400 160 V200 H0z" : "M0 160 Q80 110 170 150 T320 140 T400 150 V200 H0z"} fill={gc} /><path d="M0 182 Q120 160 240 180 T400 176 V200 H0z" fill="#000" opacity=".08" /></>}
      {motifs.split(",").filter(Boolean).map((m) => <Motif key={m} name={m} />)}
    </svg>
  );
}
