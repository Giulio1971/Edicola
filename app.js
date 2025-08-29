// Parole da escludere da tutte le fonti
const excludedWords = ["Oroscopo", "Basket", "Calcio"];

// Lista dei feed RSS che vuoi seguire
const feeds = [
  { name: "Livorno Today", url: "https://www.livornotoday.it/rss" },
  { name: "LivornoPress", url: "https://www.livornopress.it/feed/" },
  { name: "Qui Livorno", url: "https://www.quilivorno.it/feed/" },
  { name: "Comune", url: "https://www.comune.livorno.it/it/news/feed/" },
  { name: "Ansa", url: "https://www.ansa.it/toscana/notizie/toscana_rss.xml" }
];

const container = document.getElementById("news");

// Create one <ul> for all news
const list = document.createElement("ul");
container.appendChild(list);

// Mappa fonte → colore di sfondo
const sourceColors = {
  "Livorno Today": "#ffcccc",   // rosso chiaro
  "LivornoPress": "#ccffcc",    // verde chiaro
  "Qui Livorno": "#cceeff",     // celeste chiaro
  "Comune": "#dddddd",          // grigio chiaro
  "Ansa": "#ffffcc",            // giallo chiaro
  "Il Tirreno": "#ffe0cc",      // arancione chiaro
  "Livorno24": "#e5ccff"        // viola chiaro
};

let allItems = [];      // tutte le notizie scaricate
let displayedCount = 0; // quante ne sono state mostrate
const pageSize = 20;    // quante notizie mostrare per volta
let lastSeenLinks = new Set(); // per notifiche
const DEBUG = false;    // metti true se vuoi log dettagliati

// --- Utilità: timeout per fetch ---
function fetchWithTimeout(url, { timeout = 2500, responseType = "text" } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return responseType === "json" ? res.json() : res.text();
    })
    .finally(() => clearTimeout(id));
}

// --- Utilità: prendi HTML via più proxy, il primo che risponde ---
async function getHTMLViaProxies(targetUrl) {
  const enc = encodeURIComponent(targetUrl);
  // 1) r.jina.ai (veloce, restituisce HTML "leggibile")
  const jina = `https://r.jina.ai/http://${targetUrl.replace(/^https?:\/\//, "")}`;
  // 2) allorigins RAW (HTML puro)
  const allorigins = `https://api.allorigins.win/raw?url=${enc}`;
  const candidates = [jina, allorigins];

  for (const proxy of candidates) {
    try {
      const html = await fetchWithTimeout(proxy, { timeout: 3000, responseType: "text" });
      if (html && html.length > 2000) return html; // soglia minima per evitare pagine vuote/consent
    } catch (e) {
      if (DEBUG) console.warn("Proxy fallito:", proxy, e);
    }
  }
  throw new Error("Tutti i proxy hanno fallito");
}

// --- Utilità: filtro parole escluse ---
function isExcluded(title) {
  return excludedWords.some(w => new RegExp(w, "i").test(title || ""));
}

// --- Utilità: deduplica su link ---
function dedupeByLink(items) {
  const seen = new Set();
  return items.filter(it => {
    if (!it.link) return false;
    const key = it.link.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Rendering "tempo fa" ---
function timeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Pochi secondi fa";
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHour < 24) return `${diffHour} h fa`;
  if (diffDay === 1) return "Ieri";
  return `${diffDay} giorni fa`;
}

// --- Rendering notizie (paginato) ---
function renderMoreNews() {
  const slice = allItems.slice(displayedCount, displayedCount + pageSize);
  slice.forEach(item => {
    const li = document.createElement("li");
    li.style.backgroundColor = sourceColors[item.source] || "#ffffff";
    li.style.padding = "12px";
    li.style.borderRadius = "8px";
    li.style.marginBottom = "8px";
    li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";

    li.innerHTML = `<a
