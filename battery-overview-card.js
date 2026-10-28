{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * Battery Overview Card (FR)
 * Carte Home Assistant qui regroupe les niveaux de batterie de tes capteurs : tri du plus faible au plus fort, barres
 * colorées, alertes sous un seuil, appareils hors ligne signalés. Détection automatique possible. Style verre,
 * thème clair/sombre automatique, éditeur visuel, textes en français.
 */
const CARD_VERSION = "1.1.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

const DEFAULTS = {
  title: "Batteries",
  theme: "auto", nuance: "theme", intensite: 1,
  low_threshold: 20,
  critical_threshold: 10,
  sort: "level", // level | manual | name
  only_low: false,
  auto_discover: false,
  exclude: "", // mots à exclure (séparés par des virgules) en détection automatique
  entities: [],
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const gone = (st) => !st || st.state === "unavailable" || st.state === "unknown" || st.state === "";
const battIcon = (v) => (v === null ? "mdi:battery-unknown" : v >= 95 ? "mdi:battery" : v < 5 ? "mdi:battery-outline" : `mdi:battery-${Math.floor(v / 10) * 10}`);

class BatteryOverviewCard extends HTMLElement {
  static getConfigElement() { return document.createElement("battery-overview-card-editor"); }
  static getStubConfig() { return { ...DEFAULTS, auto_discover: true }; }

  constructor() { super(); this.attachShadow({ mode: "open" }); this._sig = ""; }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config, entities: (config.entities || []).map((e) => (typeof e === "string" ? { entity: e } : { ...e })) };
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const ids = this._ids();
    const sig = ids.map((e) => { const s = hass.states[e]; return s ? s.state : "x"; }).join("|") + (this._isDark() ? "d" : "l") + ids.length;
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  getCardSize() { return 3 + Math.ceil(this._ids().length * 0.45); }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    return typeof dm === "boolean" ? dm : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  _lang() { return (this._hass && this._hass.locale && this._hass.locale.language) || "fr"; }
  _more(id) { if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: id } })); }

  _items() {
    const c = this._config, h = this._hass;
    const list = c.entities.filter((e) => e.entity).map((e) => ({ ...e }));
    if (c.auto_discover && h) {
      const have = new Set(list.map((e) => e.entity));
      const ex = String(c.exclude || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
      for (const [id, st] of Object.entries(h.states)) {
        if (have.has(id) || !/^(sensor|binary_sensor)\./.test(id) || st.attributes.device_class !== "battery") continue;
        if (ex.some((w) => id.toLowerCase().includes(w) || String(st.attributes.friendly_name || "").toLowerCase().includes(w))) continue;
        list.push({ entity: id });
      }
    }
    return list;
  }
  _ids() { return this._items().map((e) => e.entity); }

  _render() {
    const c = this._config, h = this._hass;
    if (!c || !h) return;
    const dark = this._isDark();
    const low = Number(c.low_threshold) || 20, crit = Number(c.critical_threshold) || 10;
    const items = this._items().map((e, idx) => {
      const st = h.states[e.entity];
      let name = e.name || (st && st.attributes.friendly_name) || e.entity;
      name = String(name).replace(/\s+(batterie|battery)\s*$/i, "");
      let v = null, flag = null; // flag : "low" | "ok" pour les capteurs binaires
      if (!gone(st)) {
        if (st.state === "on" || st.state === "off") flag = st.state === "on" ? "low" : "ok";
        else if (!isNaN(Number(st.state))) v = Math.max(0, Math.min(100, Number(st.state)));
      }
      const off = gone(st);
      const lvl = flag === "low" ? "crit" : flag === "ok" ? "ok" : v === null ? "na" : v < crit ? "crit" : v < low ? "low" : v < 40 ? "mid" : "ok";
      return { id: e.entity, name, v, flag, off, lvl, idx };
    });
    const cmp = c.sort === "name" ? (a, b) => a.name.localeCompare(b.name, this._lang())
      : c.sort === "manual" ? (a, b) => a.idx - b.idx
      : (a, b) => (a.off - b.off) || ((a.v ?? (a.flag === "low" ? -1 : 101)) - (b.v ?? (b.flag === "low" ? -1 : 101))) || a.idx - b.idx;
    let rows = [...items].sort(cmp);
    const nLow = items.filter((i) => i.lvl === "crit" || i.lvl === "low").length, nOff = items.filter((i) => i.off).length;
    const vals = items.filter((i) => i.v !== null).map((i) => i.v);
    const avg = vals.length ? vals.reduce((t, x) => t + x, 0) / vals.length : null;
    if (c.only_low) rows = rows.filter((i) => i.lvl === "crit" || i.lvl === "low" || i.off);

    const status = nLow || nOff ? "warn" : "ok";
    const sum = `<div class="sum glass ${status}"><ha-icon icon="${nLow ? "mdi:battery-alert-variant-outline" : nOff ? "mdi:battery-unknown" : "mdi:battery-check-outline"}"></ha-icon>
      <div class="st"><div class="s1">${nLow ? `${nLow} batterie${nLow > 1 ? "s" : ""} faible${nLow > 1 ? "s" : ""}` : "Toutes les batteries sont bonnes"}</div>
      <div class="s2">${items.length} appareil${items.length > 1 ? "s" : ""}${avg !== null ? ` · moyenne ${Math.round(avg)} %` : ""}${nOff ? ` · ${nOff} hors ligne` : ""}</div></div></div>`;

    const list = rows.map((i) => `<button class="row ${i.lvl}" data-more="${esc(i.id)}"><ha-icon icon="${i.flag === "low" ? "mdi:battery-alert" : i.flag === "ok" ? "mdi:battery" : battIcon(i.v)}"></ha-icon>
      <span class="nm">${esc(i.name)}<i class="bar"><u style="width:${i.v !== null ? i.v : i.flag === "ok" ? 100 : i.flag === "low" ? 8 : 0}%"></u></i></span>
      <b class="vl">${i.off ? "Hors ligne" : i.v !== null ? Math.round(i.v) + " %" : i.flag === "low" ? "Faible" : "OK"}</b></button>`).join("");

    this.shadowRoot.innerHTML = `<style>
      * { box-sizing:border-box; }
      ha-card.dark { --bt-text:#f4f6fb; --bt-muted:#a9afc0; --bt-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%)); --bt-border:rgba(255,255,255,.14); --bt-shadow:0 .6em 2em rgba(0,0,0,.35);
        --bt-glass:rgba(255,255,255,.07); --bt-glass-b:rgba(255,255,255,.13); --bt-ok:#3ddc84; --bt-mid:#9be15d; --bt-low:#ffb86b; --bt-crit:#ff5a5f; --bt-track:rgba(255,255,255,.12); }
      ha-card.light { --bt-text:#1c2030; --bt-muted:#5d6477; --bt-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%)); --bt-border:rgba(20,24,40,.12); --bt-shadow:0 .4em 1.4em rgba(20,24,40,.12);
        --bt-glass:rgba(255,255,255,.7); --bt-glass-b:rgba(20,24,40,.1); --bt-ok:#1a9d55; --bt-mid:#5a9d1a; --bt-low:#c77a14; --bt-crit:#d32f35; --bt-track:rgba(20,24,40,.1); }
      ha-card { container-type:inline-size; display:flex; flex-direction:column; gap:12px; padding:16px; color:var(--bt-text); border-radius:24px; border:1px solid var(--bt-border); background:var(--bt-bg); box-shadow:var(--bt-shadow); overflow:hidden; }
      ha-icon { --mdc-icon-size:1.35em; flex:none; }
      button { font:inherit; color:inherit; background:none; border:0; padding:0; text-align:left; cursor:pointer; -webkit-tap-highlight-color:transparent; }
      .t { font-weight:700; font-size:1.05em; }
      .glass { background:var(--bt-glass); border:1px solid var(--bt-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
      .sum { display:flex; align-items:center; gap:.8em; padding:12px 14px; border-radius:20px; } .sum ha-icon { --mdc-icon-size:2.1em; color:var(--bt-ok); } .sum.warn ha-icon { color:var(--bt-low); }
      .s1 { font-weight:700; } .s2 { font-size:.82em; color:var(--bt-muted); }
      .list { display:grid; grid-template-columns:1fr; border-radius:18px; padding:2px 12px; column-gap:22px; }
      @container (min-width: 560px) { .list { grid-template-columns:1fr 1fr; } }
      .row { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.7em; padding:.6em 0; border-top:1px solid var(--bt-glass-b); }
      .row:first-child { border-top:0; } @container (min-width: 560px) { .row:nth-child(2) { border-top:0; } }
      .nm { display:flex; flex-direction:column; gap:.35em; min-width:0; font-size:.9em; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .bar { display:block; height:.34em; border-radius:.3em; background:var(--bt-track); overflow:hidden; } .bar u { display:block; height:100%; border-radius:inherit; text-decoration:none; background:var(--bt-ok); transition:width .4s; }
      .vl { font-variant-numeric:tabular-nums; min-width:3.2em; text-align:right; font-size:.9em; }
      .row.ok ha-icon, .row.ok .vl { color:var(--bt-ok); } .row.mid ha-icon, .row.mid .vl { color:var(--bt-mid); } .row.mid .bar u { background:var(--bt-mid); }
      .row.low ha-icon, .row.low .vl { color:var(--bt-low); } .row.low .bar u { background:var(--bt-low); }
      .row.crit ha-icon, .row.crit .vl { color:var(--bt-crit); } .row.crit .bar u { background:var(--bt-crit); }
      .row.na { opacity:.6; } .row.na ha-icon, .row.na .vl { color:var(--bt-muted); } .row.na .vl { font-size:.78em; }
      .empty { text-align:center; color:var(--bt-muted); padding:1.2em; font-size:.9em; }
    </style>
    <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(this._config, dark)}">
      ${c.title ? `<div class="t">${esc(c.title)}</div>` : ""}${items.length ? sum : ""}
      ${rows.length ? `<div class="list glass">${list}</div>` : `<div class="empty">${items.length ? "Aucune batterie faible." : "Ajoute des capteurs ou active la détection automatique dans l'éditeur."}</div>`}
    </ha-card>`;
    this.shadowRoot.querySelectorAll("[data-more]").forEach((el) => el.addEventListener("click", () => this._more(el.dataset.more)));
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = { ...GV_LABELS, title: "Titre", theme: "Thème", low_threshold: "Seuil « faible » (%)", critical_threshold: "Seuil « critique » (%)", sort: "Tri", only_low: "Afficher seulement les batteries faibles",
  auto_discover: "Détecter automatiquement les capteurs de batterie", exclude: "Mots à exclure (séparés par des virgules)", entity: "Capteur de batterie", name: "Nom (facultatif)" };
const MAIN = [
  { type: "grid", name: "", schema: [{ name: "title", selector: { text: {} } },
    { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }] } } }, ...GV_FIELDS] },
  { type: "grid", name: "", schema: [{ name: "low_threshold", selector: { number: { min: 1, max: 100, mode: "box" } } }, { name: "critical_threshold", selector: { number: { min: 1, max: 100, mode: "box" } } }] },
  { name: "sort", selector: { select: { mode: "dropdown", options: [{ value: "level", label: "Du plus faible au plus fort" }, { value: "name", label: "Par nom" }, { value: "manual", label: "Ordre de la liste" }] } } },
  { name: "only_low", selector: { boolean: {} } },
  { name: "auto_discover", selector: { boolean: {} } },
  { name: "exclude", selector: { text: {} } },
];
const ENT = [{ name: "entity", selector: { entity: {} } }, { name: "name", selector: { text: {} } }];

class BatteryOverviewCardEditor extends HTMLElement {
  setConfig(config) {
    const next = { ...DEFAULTS, ...config, entities: (config.entities || []).map((e) => (typeof e === "string" ? { entity: e } : { ...e })) };
    const same = this._config && this._built && next.entities.length === this._config.entities.length;
    this._config = next;
    if (!same) return this._build();
    this._forms.forEach((f) => { f.el.data = f.get(this._config); });
  }
  set hass(h) { this._hass = h; (this._forms || []).forEach((f) => (f.el.hass = h)); }
  _emit() { this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); }
  _form(schema, get, set, parent) {
    const el = document.createElement("ha-form");
    el.hass = this._hass; el.data = get(this._config); el.schema = schema; el.computeLabel = (s) => LABELS[s.name] || s.name;
    el.addEventListener("value-changed", (ev) => { ev.stopPropagation(); set(this._config, ev.detail.value); this._emit(); });
    this._forms.push({ el, get }); parent.appendChild(el);
  }
  _build() {
    this._built = true; this._forms = []; this.innerHTML = "";
    const st = document.createElement("style");
    st.textContent = `.bx{border:1px solid var(--divider-color);border-radius:12px;padding:10px;margin:10px 0}.h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:600}
      button{cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:8px;padding:6px 10px}.add{width:100%;margin:4px 0}`;
    this.appendChild(st);
    this._form(MAIN, (c) => c, (c, v) => { const keep = c.entities; Object.assign(c, v); c.entities = keep; }, this);
    const t = document.createElement("h3"); t.textContent = "Capteurs ajoutés à la main"; this.appendChild(t);
    this._config.entities.forEach((e, i) => {
      const box = document.createElement("div"); box.className = "bx";
      box.innerHTML = `<div class="h"><span>Capteur ${i + 1}</span><span><button data-a="up" data-i="${i}">↑</button> <button data-a="down" data-i="${i}">↓</button> <button data-a="del" data-i="${i}">✕</button></span></div>`;
      this._form(ENT, (c) => c.entities[i], (c, v) => { c.entities[i] = { ...v }; }, box); this.appendChild(box);
    });
    const add = document.createElement("button"); add.className = "add"; add.textContent = "+ Ajouter un capteur"; add.dataset.a = "add"; this.appendChild(add);
    this.querySelectorAll("button[data-a]").forEach((b) => b.addEventListener("click", () => this._click(b)));
  }
  _click(b) {
    const d = b.dataset, arr = this._config.entities, i = Number(d.i);
    if (d.a === "add") arr.push({ entity: "" });
    else if (d.a === "del") arr.splice(i, 1);
    else { const j = i + (d.a === "up" ? -1 : 1); if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; }
    this._emit(); this._build();
  }
}

customElements.define("battery-overview-card", BatteryOverviewCard);
customElements.define("battery-overview-card-editor", BatteryOverviewCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "battery-overview-card", name: "Battery Overview Card (FR)", description: "Batteries : tri du plus faible au plus fort, alertes, appareils hors ligne, détection automatique.", preview: true });
console.info(`%c BATTERY-OVERVIEW-CARD %c v${CARD_VERSION} `, "color:#fff;background:#1a9d55;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px", "color:#1a9d55;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px");
}
