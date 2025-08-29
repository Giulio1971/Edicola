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

// --- Funzione per formattare il tempo in "X min fa" ---
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

// --- Rendering notizie ---
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

// --- Funzione per caricare notizie da Il Tirreno ---
function loadTirrenoNews() {
  const url = "https://www.iltirreno.it/livorno/cronaca";
  const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  return fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      const doc = new DOMParser().parseFromString(data.contents, "text/html");

      // Selettori aggiornati e robusti
      const articles = doc.querySelectorAll("h2 a, h3 a, .css-an39el a, .css-1pnfxdh a");

      const results = [];
      articles.forEach(a => {
        const title = a.textContent.trim();
        const href = a.getAttribute("href");
        const link = href && href.startsWith("http")
          ? href
          : (href ? "https://www.iltirreno.it" + href : null);

        if (!link || !title) return;

        // Filtro parole escluse
        if (excludedWords.some(w => new RegExp(w, "i").test(title))) return;

        results.push({
          title,
          link,
          pubDate: new Date(), // data non disponibile → uso ora attuale
          source: "Il Tirreno"
        });
      });

      return results;
    })
    .catch(err => {
      console.error("Errore nel caricare Il Tirreno:", err);
      return [];
    });
}

// --- Funzione per caricare notizie da Livorno24 (Ultimi Articoli) ---
function loadLivorno24News() {
  const url = "https://www.livorno24.com/";
  const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  return fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      const doc = new DOMParser().parseFromString(data.contents, "text/html");

      // Sezione "Ultimi Articoli"
      const articles = doc.querySelectorAll(".td-block-span6 .td-module-title a");

      const results = [];
      articles.forEach(a => {
        const title = a.textContent.trim();
        const href = a.getAttribute("href");
        const link = href && href.startsWith("http")
          ? href
          : (href ? "https://www.livorno24.com" + href : null);

        if (!link || !title) return;

        // Filtro parole escluse
        if (excludedWords.some(w => new RegExp(w, "i").test(title))) return;

        results.push({
          title,
          link,
          pubDate: new Date(), // non c'è data → ora attuale
          source: "Livorno24"
        });
      });

      return results;
    })
    .catch(err => {
      console.error("Errore nel caricare Livorno24:", err);
      return [];
    });
}

// --- Caricamento notizie ---
function loadNews() {
  Promise.all([
    // Feed RSS standard
    ...feeds.map(feed => {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      return fetch(apiUrl)
        .then(res => res.json())
        .then(data => data.items
          .filter(item => {
            const title = item.title || "";
            const description = item.description || "";

            // --- Filtri esclusione comuni ---
            for (const word of excludedWords) {
              const regex = new RegExp(word, "i");
              if (regex.test(title) || regex.test(description)) {
                return false;
              }
            }

            // --- Filtro speciale per ANSA: solo notizie con "Livorno" ---
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
          }))
        )
        .catch(err => {
          console.error("Errore nel caricare", feed.name, err);
          return [];
        });
    }),
    // Notizie da Il Tirreno
    loadTirrenoNews(),
    // Notizie da Livorno24
    loadLivorno24News()
  ])
  .then(results => {
    allItems = results.flat();

    // Ordinamento cronologico inverso
    allItems.sort((a, b) => b.pubDate - a.pubDate);

    // Reset lista
    list.innerHTML = "";
    displayedCount = 0;
    renderMoreNews();

    // --- Notifiche nuove notizie ---
    const newLinks = allItems.map(n => n.link);
    const unseen = newLinks.filter(link => !lastSeenLinks.has(link));

    if (unseen.length > 0 && Notification.permission === "granted") {
      new Notification("Nuove notizie disponibili!", {
        body: `${unseen.length} nuovi articoli`,
        icon: "https://cdn-icons-png.flaticon.com/512/21/21601.png"
      });
    }
    lastSeenLinks = new Set(newLinks);
  });
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

// Caricamento iniziale
loadNews();

// Refresh ogni 5 minuti (300,000 ms)
setInterval(loadNews, 300000);
