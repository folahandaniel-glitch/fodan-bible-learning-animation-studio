"use client";
import { useState } from "react";

/** Schematic map of Bible lands. Coastlines are simplified and every place and route is approximate or reconstructed; this is not a survey map. */
interface Place { id: string; name: string; lat: number; lon: number; note: string; certainty: "known" | "approximate" | "uncertain" }
const PLACES: Place[] = [
  { id: "jerusalem", name: "Jerusalem", lat: 31.77, lon: 35.21, note: "City of David and the temple; Jesus was crucified and raised near here.", certainty: "known" },
  { id: "bethlehem", name: "Bethlehem", lat: 31.7, lon: 35.2, note: "Birthplace of David and of Jesus (Micah 5:2; Luke 2).", certainty: "known" },
  { id: "nazareth", name: "Nazareth", lat: 32.7, lon: 35.3, note: "Where Jesus grew up (Luke 2:39-40).", certainty: "known" },
  { id: "capernaum", name: "Capernaum", lat: 32.88, lon: 35.57, note: "Centre of Jesus' ministry in Galilee (Mark 2:1).", certainty: "known" },
  { id: "jericho", name: "Jericho", lat: 31.87, lon: 35.44, note: "First city entered by Israel (Joshua 6).", certainty: "known" },
  { id: "damascus", name: "Damascus", lat: 33.51, lon: 36.29, note: "Where Saul met the risen Jesus (Acts 9).", certainty: "known" },
  { id: "egypt", name: "Egypt (Nile delta)", lat: 30.8, lon: 31.2, note: "Where Israel was enslaved (Exodus 1). Exact sites are debated.", certainty: "approximate" },
  { id: "sinai", name: "Mount Sinai (traditional)", lat: 28.54, lon: 33.97, note: "Traditional location. Several sites are proposed; the location is uncertain.", certainty: "uncertain" },
  { id: "babylon", name: "Babylon", lat: 32.54, lon: 44.42, note: "Capital of the empire that took Judah into exile (2 Kings 25).", certainty: "known" },
  { id: "nineveh", name: "Nineveh", lat: 36.36, lon: 43.15, note: "Assyrian capital to which Jonah was sent.", certainty: "known" },
  { id: "ur", name: "Ur", lat: 30.96, lon: 46.1, note: "Abraham's early home (Genesis 11:31). Identification as Ur of the Chaldeans is usual but debated.", certainty: "approximate" },
  { id: "haran", name: "Haran", lat: 36.87, lon: 39.03, note: "Where Abraham's family settled (Genesis 11:31).", certainty: "approximate" },
  { id: "antioch", name: "Antioch (Syria)", lat: 36.2, lon: 36.16, note: "Sending church of Paul and Barnabas (Acts 13:1-3).", certainty: "known" },
  { id: "tarsus", name: "Tarsus", lat: 36.92, lon: 34.89, note: "Paul's home city (Acts 22:3).", certainty: "known" },
  { id: "salamis", name: "Salamis (Cyprus)", lat: 35.18, lon: 33.9, note: "First stop on Paul's first journey (Acts 13:5).", certainty: "known" },
  { id: "pisidian", name: "Antioch (Pisidia)", lat: 38.31, lon: 31.19, note: "Paul preached here (Acts 13:14).", certainty: "approximate" },
  { id: "iconium", name: "Iconium", lat: 37.87, lon: 32.49, note: "Acts 14:1.", certainty: "known" },
  { id: "lystra", name: "Lystra", lat: 37.58, lon: 32.45, note: "Acts 14:8. Location approximate.", certainty: "approximate" },
  { id: "ephesus", name: "Ephesus", lat: 37.94, lon: 27.34, note: "Paul spent about three years here (Acts 19).", certainty: "known" },
  { id: "philippi", name: "Philippi", lat: 41.01, lon: 24.29, note: "First church in Europe (Acts 16).", certainty: "known" },
  { id: "thessalonica", name: "Thessalonica", lat: 40.64, lon: 22.94, note: "Acts 17:1.", certainty: "known" },
  { id: "athens", name: "Athens", lat: 37.98, lon: 23.73, note: "Paul spoke at the Areopagus (Acts 17).", certainty: "known" },
  { id: "corinth", name: "Corinth", lat: 37.91, lon: 22.88, note: "Paul stayed eighteen months (Acts 18).", certainty: "known" },
  { id: "rome", name: "Rome", lat: 41.89, lon: 12.5, note: "Paul reached Rome as a prisoner (Acts 28).", certainty: "known" },
  { id: "patmos", name: "Patmos", lat: 37.31, lon: 26.55, note: "Where John received the visions of Revelation (Revelation 1:9).", certainty: "known" },
];
const JOURNEYS: Record<string, { label: string; ids: string[]; ref: string }> = {
  none: { label: "No route", ids: [], ref: "" },
  p1: { label: "Paul's first journey", ids: ["antioch", "salamis", "pisidian", "iconium", "lystra", "antioch"], ref: "Acts 13-14" },
  p2: { label: "Paul's second journey", ids: ["antioch", "tarsus", "lystra", "philippi", "thessalonica", "athens", "corinth", "ephesus", "antioch"], ref: "Acts 15:36-18:22" },
  p3: { label: "Paul's third journey", ids: ["antioch", "ephesus", "philippi", "corinth", "ephesus", "jerusalem"], ref: "Acts 18:23-21:17" },
  exile: { label: "Abraham's journey", ids: ["ur", "haran", "jerusalem", "egypt"], ref: "Genesis 11-12" },
};
// Rough outline of the Mediterranean water for orientation only.
const SEA: [number, number][] = [[10, 37.2], [11, 34], [15, 32.3], [20, 31.8], [25, 31.6], [29, 30.9], [31.5, 31.4], [34.2, 31.4], [34.9, 32.6], [35.5, 33.8], [35.9, 35.3], [36, 36.6], [34, 36.3], [32, 36.1], [30, 36.4], [28, 36.8], [27, 37.4], [26.5, 38.5], [26.1, 39.6], [26.2, 40.2], [25, 40.8], [24, 40.5], [23.6, 39.8], [22.9, 39.2], [24, 38], [23, 36.6], [21.8, 36.7], [21.3, 38], [19.8, 39.8], [18.5, 40.2], [17, 39.6], [16.6, 38.6], [15.8, 38], [15.6, 40], [14, 40.8], [12.5, 41.5], [11.2, 42.5], [10, 43]];
const W = 760, H = 420, LON0 = 9, LON1 = 48, LAT0 = 27, LAT1 = 44;
const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * W;
const py = (lat: number) => H - ((lat - LAT0) / (LAT1 - LAT0)) * H;

export function BibleMap() {
  const [sel, setSel] = useState<Place | null>(PLACES[0]);
  const [route, setRoute] = useState("none");
  const r = JOURNEYS[route];
  const pts = r.ids.map((id) => PLACES.find((p) => p.id === id)!);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Show a route">{Object.entries(JOURNEYS).map(([k, v]) => <button key={k} type="button" aria-pressed={route === k} onClick={() => setRoute(k)} className={`btn btn-sm ${route === k ? "btn-navy" : "btn-ghost"}`}>{v.label}</button>)}</div>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematic map of the Bible lands around the eastern Mediterranean" className="w-full rounded-2xl border border-line bg-[#e9dcb3]">
          <polygon points={SEA.map(([lo, la]) => `${px(lo)},${py(la)}`).join(" ")} fill="#9ec7ea" stroke="#7fb0d9" />
          <text x={px(20)} y={py(34.2)} fill="#3d6a99" fontSize="14" fontStyle="italic" textAnchor="middle">Mediterranean Sea</text>
          {pts.length > 1 && <polyline points={pts.map((p) => `${px(p.lon)},${py(p.lat)}`).join(" ")} fill="none" stroke="#b42318" strokeWidth="2.5" strokeDasharray="6 4" />}
          {PLACES.map((p) => (
            <g key={p.id} tabIndex={0} role="button" aria-label={`${p.name}: ${p.certainty}`} onClick={() => setSel(p)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSel(p); }} style={{ cursor: "pointer" }}>
              <circle cx={px(p.lon)} cy={py(p.lat)} r={sel?.id === p.id ? 8 : 5.5} fill={p.certainty === "known" ? "#0b1f4b" : p.certainty === "approximate" ? "#c98a12" : "#b42318"} stroke="#fff" strokeWidth="2" />
              <text x={px(p.lon) + 8} y={py(p.lat) + 4} fontSize="10.5" fill="#1b2540" stroke="#fff8e7" strokeWidth="3" paintOrder="stroke">{p.name.replace(/ \(.*/, "")}</text>
            </g>
          ))}
        </svg>
        <p className="mt-2 text-xs text-mist">Schematic map: coastlines are simplified. <span className="inline-block h-2.5 w-2.5 rounded-full bg-navy align-middle" /> known · <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#c98a12] align-middle" /> approximate · <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger align-middle" /> uncertain. Dashed routes are reconstructions from the biblical text.</p>
      </div>
      <aside className="card card-pad" aria-live="polite">
        {sel && <><h3 className="text-xl font-bold">{sel.name}</h3><span className={`badge ${sel.certainty === "known" ? "badge-ok" : sel.certainty === "approximate" ? "badge-warn" : "badge-bad"}`}>{sel.certainty} location</span><p className="mt-2">{sel.note}</p></>}
        {route !== "none" && <p className="mt-4 border-t border-line pt-3 text-sm"><strong>{r.label}</strong> ({r.ref}): reconstructed route; exact paths and some dates are debated.</p>}
      </aside>
    </div>
  );
}
