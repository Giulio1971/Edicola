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

    li.innerHTML = `<a href="${item.link}" target="_blank" style="color:#000; text-decoration:none;">
                      ${item.title}
                    </a>
                    <span style="color:#555; font-size:14px; margin-left:8px;">
                      ${timeAgo(item.pubDate)}
                    </span>`;

    list.appendChild(li);
  });
  displayedCount += slice.length;
}

// --- Merge incrementale + ri-render ---
function mergeAndRender(newItems, notify = true) {
  if (!Array.isArray(newItems) || newItems.length === 0) return;

  const beforeLinks = new Set(allItems.map(n => n.link));
  const fresh = newItems.filter(n => n.link && !beforeLinks.has(n.link));
  if (fresh.length === 0) return;

  allItems = allItems.concat(fresh);
  allItems = dedupeByLink(allItems);

  // Ordinamento cronologico inverso
  allItems.sort((a, b) => b.pubDate - a.pubDate);

  // Reset lista e render
  list.innerHTML = "";
  displayedCount = 0;
  renderMoreNews();

  // Notifica incrementale
  if (notify && "Notification" in window && Notification.permission === "granted") {
    new Notification("Nuove notizie disponibili!", {
      body: `${fresh.length} nuovi articoli`,
      icon: "https://cdn-icons-png.flaticon.com/512/21/21601.png"
    });
  }

  // Aggiorna cache link visti
  lastSeenLinks = new Set(allItems.map(n => n.link));
}

// --- Parsing: Il Tirreno (robusto) ---
function parseIlTirreno(html) {
  const base = "https://www.iltirreno.it";
  const doc = new DOMParser().parseFromString(html, "text/html");

  // 1) prova con selettori "normali"
  let anchors = Array.from(
    doc.querySelectorAll("h2 a, h3 a, article a")
  );

  // 2) fallback: regex su link
  if (anchors.length === 0) {
    const hrefs = (html.match(/href="([^"]+)"/g) || [])
      .map(m => m.replace(/^href="|"+$/g, ""));
    anchors = hrefs.map(h => {
      const a = doc.createElement("a");
      a.setAttribute("href", h);
      a.textContent = "";
      return a;
    });
  }

  const items = [];
  anchors.forEach(a => {
    const hrefRaw = a.getAttribute("href") || "";
    if (!hrefRaw) return;

    const hrefAbs = hrefRaw.startsWith("http") ? hrefRaw :
      (hrefRaw.startsWith("/") ? base + hrefRaw : base + "/" + hrefRaw);

    // Tieni solo articoli di Livorno, escludi gallery/video/podcast/tag/search/sport
    if (!/iltirreno\.it/i.test(hrefAbs)) return;
    if (!/\/livorno\//i.test(hrefAbs)) return;
    if (/video|foto|podcast|galleria|gallery|tag\/|search|\/sport\//i.test(hrefAbs)) return;

    // Titolo
    const title = (a.textContent || "").trim();
    if (!title || isExcluded(title)) return;

    items.push({
      title,
      link: hrefAbs,
      pubDate: new Date(),
      source: "Il Tirreno"
    });
  });

  // Se i <a> non hanno testo (capita con r.jina.ai), prova a risalire al testo vicino
  if (items.length === 0) {
    const regex = /<a[^>]+href="([^"]+)"[^>]*>([^<]{10,120})<\/a>/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
      let hrefAbs = m[1];
      const txt = m[2].trim();
      if (!hrefAbs) continue;
      hrefAbs = hrefAbs.startsWith("http") ? hrefAbs :
        (hrefAbs.startsWith("/") ? base + hrefAbs : base + "/" + hrefAbs);
      if (!/iltirreno\.it/i.test(hrefAbs)) continue;
      if (!/\/livorno\//i.test(hrefAbs)) continue;
      if (/video|foto|podcast|galleria|gallery|tag\/|search|\/sport\//i.test(hrefAbs)) continue;
      if (!txt || isExcluded(txt)) continue;

      items.push({
        title: txt,
        link: hrefAbs,
        pubDate: new Date(),
        source: "Il Tirreno"
      });
    }
  }

  return dedupeByLink(items);
}

// --- Parsing: Livorno24 (Ultimi Articoli) ---
function parseLivorno24(html) {
  const base = "https://www.livorno24.com";
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Selettori del tema TagDiv (più comuni)
  let anchors = Array.from(
    doc.querySelectorAll(".td-module-title a, h3.entry-title a, .td-big-grid a + a")
  );

  // Fallback: regex su link WordPress /YYYY/MM/DD
  if (anchors.length === 0) {
    const hrefs = (html.match(/href="([^"]+)"/g) || [])
      .map(m => m.replace(/^href="|"+$/g, ""))
      .filter(h => /livorno24\.com/i.test(h) || /\/\d{4}\/\d{2}\//.test(h));
    anchors = hrefs.map(h => {
      const a = doc.createElement("a");
      a.setAttribute("href", h);
      a.textContent = "";
      return a;
    });
  }

  const items = [];
  anchors.forEach(a => {
    const hrefRaw = a.getAttribute("href") || "";
    if (!hrefRaw) return;
    const hrefAbs = hrefRaw.startsWith("http") ? hrefRaw :
      (hrefRaw.startsWith("/") ? base + hrefRaw : base + "/" + hrefRaw);

    // Tieni solo articoli (escludi categorie, tag, pagine)
    if (!/livorno24\.com/i.test(hrefAbs)) return;
    if (/\/category\/|\/tag\/|\/author\/|\/page\//i.test(hrefAbs)) return;

    const title = (a.textContent || "").trim();
    if (!title || isExcluded(title)) return;

    items.push({
      title,
      link: hrefAbs,
      pubDate: new Date(),
      source: "Livorno24"
    });
  });

  return dedupeByLink(items);
}

// --- Scraping non bloccante: Il Tirreno ---
async function loadTirrenoNews() {
  try {
    const html = await getHTMLViaProxies("https://www.iltirreno.it/livorno/cronaca");
    const items = parseIlTirreno(html);
    if (DEBUG) console.log("Tirreno items:", items);
    mergeAndRender(items);
  } catch (err) {
    console.error("Errore nel caricare Il Tirreno:", err);
  }
}

// --- Scraping non bloccante: Livorno24 ---
async function loadLivorno24News() {
  try {
    const html = await getHTMLViaProxies("https://www.livorno24.com/");
    const items = parseLivorno24(html);
    if (DEBUG) console.log("Livorno24 items:", items);
    mergeAndRender(items);
  } catch (err) {
    console.error("Errore nel caricare Livorno24:", err);
  }
}

// --- Caricamento RSS (veloce) ---
function loadRSSFeeds() {
  return Promise.all(
    feeds.map(feed => {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      // Timeout anche per RSS (non bloccare)
      return fetchWithTimeout(apiUrl, { timeout: 3500, responseType: "json" })
        .then(data => {
          const items = (data.items || [])
            .filter(item => {
              const title = item.title || "";
              const description = item.description || "";
              for (const word of excludedWords) {
                const regex = new RegExp(word, "i");
                if (regex.test(title) || regex.test(description)) return false;
              }
              if (feed.name === "Ansa") {
                return /livorno/i.test(title) || /livorno/i.test(description);
              }
              return true;
            })
            .map(item => ({
              title: item.title,
              link: item.link,
              pubDate: new Date(item.pubDate),
              source: feed.name
            }));
          return items;
        })
        .catch(err => {
          console.error("Errore nel caricare", feed.name, err);
          return [];
        });
    })
  ).then(results => results.flat());
}

// --- Caricamento notizie orchestrato ---
// 1) carica RSS e mostra subito
// 2) avvia in parallelo scraping Tirreno + Livorno24 (non blocca)
async function loadNews() {
  try {
    const rssItems = await loadRSSFeeds();
    if (DEBUG) console.log("RSS items:", rssItems);
    allItems = dedupeByLink(rssItems);
    allItems.sort((a, b) => b.pubDate - a.pubDate);

    // Reset lista e render
    list.innerHTML = "";
    displayedCount = 0;
    renderMoreNews();

    // Notifiche base
    const newLinks = allItems.map(n => n.link);
    const unseen = newLinks.filter(link => !lastSeenLinks.has(link));
    if (unseen.length > 0 && "Notification" in window && Notification.permission === "granted") {
      new Notification("Nuove notizie disponibili!", {
        body: `${unseen.length} nuovi articoli`,
        icon: "https://cdn-icons-png.flaticon.com/512/21/21601.png"
      });
    }
    lastSeenLinks = new Set(newLinks);

    // Avvia scraping extra senza bloccare
    loadTirrenoNews();
    loadLivorno24News();
  } catch (e) {
    console.error("Errore loadNews:", e);
  }
}

// --- Infinite Scroll ---
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    renderMoreNews();
  }
});

// --- Richiesta permesso notifiche ---
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

// --- Avvio: non bloccare il first paint ---
function start() {
  loadNews();
  // Refresh ogni 5 minuti (300,000 ms)
  setInterval(loadNews, 300000);
}

if ("requestIdleCallback" in window) {
  requestIdleCallback(start, { timeout: 120 });
} else {
  setTimeout(start, 0);
}
