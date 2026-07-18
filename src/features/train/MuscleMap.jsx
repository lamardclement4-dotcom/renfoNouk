import React from 'react'

export function muscleGroups(ex) {
  var s = (ex && ex.muscles || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  var out = /* @__PURE__ */ new Set();
  var add = function(k) {
    out.add(k);
  };
  if (/ischio/.test(s)) add("ischios");
  if (/mollet|gastrocn|solea|jumeau/.test(s)) add("mollets");
  if (/cheville/.test(s)) add("mollets");
  if (/adducteur/.test(s)) add("adducteurs");
  if (/fessier|piriforme|glute/.test(s)) add("fessiers");
  if (/quadriceps|\bquad/.test(s)) add("quadriceps");
  if (/flechisseur|psoas/.test(s)) add("quadriceps");
  if (/abdo|gainage|transverse|oblique|\bcore\b/.test(s)) add("abdominaux");
  if (/lombaire|bas du dos/.test(s)) add("lombaires");
  if (/pector/.test(s)) add("pectoraux");
  if (/dorsal|colonne|thoraci|rachis|grand dos|\bdos\b/.test(s)) add("dos");
  if (/coiffe/.test(s)) add("epaules");
  if (/rotateur/.test(s)) {
    if (/hanche/.test(s)) add("fessiers");
    else add("epaules");
  }
  if (/epaule|deltoid/.test(s)) add("epaules");
  if (/trapeze|nuque|cervic/.test(s)) add("trapezes");
  if (/biceps/.test(s)) add("biceps");
  if (/triceps/.test(s)) add("triceps");
  if (/avant-?bras|poignet/.test(s)) add("avantbras");
  if (/plante|fascia|voute/.test(s)) add("mollets");
  if (/hanche/.test(s) && !/flechisseur|psoas/.test(s)) add("fessiers");
  return out;
}
export function MuscleMap({ groups, accent = "C.primary", size = 300, style }) {
  const g = groups instanceof Set ? groups : new Set(groups || []);
  const gid = "mm" + Math.random().toString(36).slice(2, 7);
  const f = (k) => g.has(k) ? "url(#" + gid + "a)" : "url(#" + gid + "m)";
  const skin = "color-mix(in srgb, C.ink 7%, C.surface)";
  const edge = "color-mix(in srgb, C.ink 16%, C.surface)";
  const sep = "rgba(255,255,255,.5)";
  const mStroke = "color-mix(in srgb, C.ink 13%, transparent)";
  const aStroke = `color-mix(in srgb, ${accent} 75%, #000)`;
  const sk = (k) => g.has(k) ? aStroke : mStroke;
  const sw = (k) => g.has(k) ? 1.8 : 0.7;
  const Mirror = ({ children }) => /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, children);
  const Sym = ({ d, k }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d, fill: f(k), stroke: sk(k), strokeWidth: sw(k) }), /* @__PURE__ */ React.createElement(Mirror, null, /* @__PURE__ */ React.createElement("path", { d, fill: f(k), stroke: sk(k), strokeWidth: sw(k) })));
  const Mid = ({ d, k }) => /* @__PURE__ */ React.createElement("path", { d, fill: f(k), stroke: sk(k), strokeWidth: sw(k) });
  const baseBody = /* @__PURE__ */ React.createElement("g", { fill: skin, stroke: edge, strokeWidth: "1.3", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("ellipse", { cx: "50", cy: "18", rx: "12", ry: "14" }), /* @__PURE__ */ React.createElement("path", { d: "M45 30 h10 v8 h-10 z" }), /* @__PURE__ */ React.createElement("path", { d: "M31 45 Q50 39 69 45 L64 122 Q50 130 36 122 Z" }), /* @__PURE__ */ React.createElement("path", { d: "M36 120 L64 120 L60 152 Q50 160 40 152 Z" }), /* @__PURE__ */ React.createElement("path", { d: "M31 46 Q20 49 17 62 L13 120 Q12 132 16 150 L24 150 Q27 132 27 118 L33 70 Z" }), /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, /* @__PURE__ */ React.createElement("path", { d: "M31 46 Q20 49 17 62 L13 120 Q12 132 16 150 L24 150 Q27 132 27 118 L33 70 Z" })), /* @__PURE__ */ React.createElement("ellipse", { cx: "19", cy: "154", rx: "6", ry: "7" }), /* @__PURE__ */ React.createElement("ellipse", { cx: "81", cy: "154", rx: "6", ry: "7" }), /* @__PURE__ */ React.createElement("path", { d: "M40 150 Q34 152 35 176 L38 214 Q39 240 43 250 L49 250 L49 156 Z" }), /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, /* @__PURE__ */ React.createElement("path", { d: "M40 150 Q34 152 35 176 L38 214 Q39 240 43 250 L49 250 L49 156 Z" })), /* @__PURE__ */ React.createElement("path", { d: "M40 250 L49 250 L49 258 Q44 260 39 258 Z" }), /* @__PURE__ */ React.createElement("path", { d: "M51 250 L60 250 L61 258 Q56 260 51 258 Z" }));
  const front = /* @__PURE__ */ React.createElement("g", { transform: "translate(6,8)" }, baseBody, /* @__PURE__ */ React.createElement("g", { stroke: mStroke, strokeWidth: ".7", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement(Sym, { k: "epaules", d: "M31 46 Q19 47 16 60 Q24 66 33 60 Q34 51 31 46 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "biceps", d: "M31 62 Q24 64 22 80 L21 96 Q26 99 31 95 L33 78 Q34 67 31 62 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "avantbras", d: "M22 98 Q19 110 22 126 Q26 130 30 126 L31 100 Q26 96 22 98 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "pectoraux", d: "M49 60 Q37 58 33 65 Q33 75 43 79 Q50 77 49 67 Z" }), /* @__PURE__ */ React.createElement(Mid, { k: "abdominaux", d: "M43 80 Q50 78 57 80 L56 122 Q50 128 44 122 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "quadriceps", d: "M40 152 Q33 155 35 178 Q37 200 42 212 Q47 210 47 196 L47 158 Q45 152 40 152 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "adducteurs", d: "M47 158 L49 158 L49 204 Q48 208 47 204 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "mollets", d: "M40 214 Q37 226 39 246 Q43 251 47 246 L47 218 Q45 213 40 214 Z" })), /* @__PURE__ */ React.createElement("g", { stroke: sep, strokeWidth: ".9", fill: "none", strokeLinecap: "round", opacity: ".75" }, /* @__PURE__ */ React.createElement("path", { d: "M50 84 V120" }), /* @__PURE__ */ React.createElement("path", { d: "M44 93 H56" }), /* @__PURE__ */ React.createElement("path", { d: "M44 102 H56" }), /* @__PURE__ */ React.createElement("path", { d: "M44 111 H56" }), /* @__PURE__ */ React.createElement("path", { d: "M33 59 Q41 63 43 78" }), /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, /* @__PURE__ */ React.createElement("path", { d: "M33 59 Q41 63 43 78" })), /* @__PURE__ */ React.createElement("path", { d: "M40 156 Q45 182 42 210" }), /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, /* @__PURE__ */ React.createElement("path", { d: "M40 156 Q45 182 42 210" })), /* @__PURE__ */ React.createElement("path", { d: "M40 216 Q43 230 42 244" }), /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, /* @__PURE__ */ React.createElement("path", { d: "M40 216 Q43 230 42 244" }))));
  const back = /* @__PURE__ */ React.createElement("g", { transform: "translate(124,8)" }, baseBody, /* @__PURE__ */ React.createElement("g", { stroke: mStroke, strokeWidth: ".7", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement(Sym, { k: "epaules", d: "M31 46 Q19 47 16 60 Q24 66 33 60 Q34 51 31 46 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "triceps", d: "M31 62 Q24 64 22 80 L21 96 Q26 99 31 95 L33 78 Q34 67 31 62 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "avantbras", d: "M22 98 Q19 110 22 126 Q26 130 30 126 L31 100 Q26 96 22 98 Z" }), /* @__PURE__ */ React.createElement(Mid, { k: "trapezes", d: "M50 40 Q40 44 34 50 Q44 56 50 53 Q56 56 66 50 Q60 44 50 40 Z" }), /* @__PURE__ */ React.createElement(Mid, { k: "dos", d: "M37 60 Q50 56 63 60 L57 116 Q50 121 43 116 Z" }), /* @__PURE__ */ React.createElement(Mid, { k: "lombaires", d: "M44 116 Q50 113 56 116 L54 135 Q50 139 46 135 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "fessiers", d: "M49 138 Q38 137 36 150 Q37 163 48 163 Q50 158 49 148 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "ischios", d: "M40 163 Q34 167 35 186 Q37 205 42 213 Q47 211 47 198 L47 166 Q45 163 40 163 Z" }), /* @__PURE__ */ React.createElement(Sym, { k: "mollets", d: "M40 214 Q35 222 38 238 Q41 248 45 248 Q47 245 47 233 Q47 220 44 214 Q42 213 40 214 Z" })), /* @__PURE__ */ React.createElement("g", { stroke: sep, strokeWidth: ".9", fill: "none", strokeLinecap: "round", opacity: ".7" }, /* @__PURE__ */ React.createElement("path", { d: "M50 56 V135" }), /* @__PURE__ */ React.createElement("path", { d: "M37 62 Q50 69 63 62" }), /* @__PURE__ */ React.createElement("path", { d: "M40 80 Q50 85 60 80" }), /* @__PURE__ */ React.createElement("path", { d: "M38 140 Q50 149 62 140" }), /* @__PURE__ */ React.createElement("path", { d: "M40 168 Q45 191 42 211" }), /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, /* @__PURE__ */ React.createElement("path", { d: "M40 168 Q45 191 42 211" })), /* @__PURE__ */ React.createElement("path", { d: "M40 218 Q43 232 43 244" }), /* @__PURE__ */ React.createElement("g", { transform: "matrix(-1 0 0 1 100 0)" }, /* @__PURE__ */ React.createElement("path", { d: "M40 218 Q43 232 43 244" }))));
  return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 230 282", style: { width: "100%", maxWidth: size, height: "auto", display: "block", margin: "0 auto", ...style }, xmlns: "http://www.w3.org/2000/svg" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: gid + "a", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: `color-mix(in srgb, ${accent} 85%, #fff)` }), /* @__PURE__ */ React.createElement("stop", { offset: ".5", stopColor: accent }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: `color-mix(in srgb, ${accent} 90%, #000)` })), /* @__PURE__ */ React.createElement("linearGradient", { id: gid + "m", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: "color-mix(in srgb, C.ink 9%, C.surface)" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: "color-mix(in srgb, C.ink 17%, C.surface)" }))), front, back, /* @__PURE__ */ React.createElement("text", { x: "56", y: "278", textAnchor: "middle", fontSize: "11", fontWeight: "700", fill: "C.ink3", fontFamily: "C.font" }, "Face"), /* @__PURE__ */ React.createElement("text", { x: "174", y: "278", textAnchor: "middle", fontSize: "11", fontWeight: "700", fill: "C.ink3", fontFamily: "C.font" }, "Dos"));
}
