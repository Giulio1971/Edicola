// Parole da escludere da tutte le fonti (case insensitive)
const excludedWords = [
  "Oroscopo",
  "Basket",
  "Calcio",
  "Pielle",
  "Libertas",
  "Serie C",
  "partita"
];

// Lista dei feed RSS da seguire
const feeds = [
  { name: "Livorno Today", url: "https://www.livornotoday.it/rss" },
  { name: "LivornoPress", url: "https://www.livornopress.it/feed/" },
  { name: "Qui Livorno", url: "https://www.quilivorno.it/feed/" },
  { name: "Comune", url: "https://www.comune.livorno.it/it/news/feed/" },
  { name: "Ansa", url: "https://www.ansa.it/toscana/notizie/toscana_rss.xml" },
  { name: "Toscana", url: "https://www.toscana-notizie.it/archivio/-/asset_publisher/Lyd2Is2gGDzu/rss" },
  { name: "Il Tirreno", url: "https://rss.app/feeds/0GUahjgFVeLkmFyL.xml" },
  { name: "Livorno24", url: "https://rss.app/feeds/XQ0dFyxv5w1Xlwno.xml" },
  { name: "Urban Livorno", url: "https://rss.app/feeds/SaDtFZa4zNsqgPXz.xml" },
  { name: "Il Telegrafo", url: "https://rss.app/feeds/AqrxLQum6ReQrR3d.xml" }
];

const container = document.getElementById("news");
const list = document.createElement("ul");
container.appendChild(list);

// Colori fonti
const sourceColors = {
  "Ansa": "#ffffcc",
  "Toscana": "#ffffcc",
  "Comune": "#dddddd",
  "Il Tirreno": "#99ccff" // celeste più scuro
};
const defaultColor = "#cceeff"; // celeste chiaro per le altre

let allItems = [];
let displayedCount = 0;
const pageSize = 20;
let lastSeenLinks = new Set();

// --- Rendering notizie ---
function renderMoreNews() {
  const slice = allItems.slice(displayedCount, displayedCount + pageSize);
  slice.forEach(item => {
    const li = document.createElement("li");
    li.style.backgroundColor = sourceColors[item.source] || defaultColor;

    li.innerHTML = `<a href="${item.link}" target="_blank" style="color:#000; text-decoration:none;">
                      ${item.title}
                    </a>
                    <div style="color:#000; font-size:14px; margin-top:4px;">
                      <i>${item.source}</i>
                    </div>`;

    list.appendChild(li);
  });
  displayedCount += slice.length;
}

// --- Caricamento notizie ---
function loadNews() {
  Promise.all(
    feeds.map(feed => {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      return fetch(apiUrl)
        .then(res => res.json())
        .then(data => data.items
          .filter(item => {
            const title = item.title || "";
            const description = item.description || "";

            for (const word of excludedWords) {
              const regex = new RegExp(word, "i");
              if (regex.test(title) || regex.test(description)) return false;
            }

            // Solo notizie con "Livorno" per ANSA e Toscana
            if (feed.name === "Ansa" || feed.name === "Toscana") {
              return /livorno/i.test(title) || /livorno/i.test(description);
            }

            return true;
          })
          .map(item => {
            let title = item.title;

            // Pulizia titolo per Il Tirreno
            if (feed.name === "Il Tirreno") {
              title = title.replace(/\s*[-–—]?\s*Il Tirreno\s*$/i, "");
            }

            return {
              title: title,
              link: item.link,
              pubDate: new Date(item.pubDate),
              source: feed.name
            };
          })
          // Solo notizie delle ultime 24 ore
          .filter(item => {
            const now = new Date();
            const diffHours = (now - item.pubDate) / (1000 * 60 * 60);
            return diffHours <= 24;
          })
        )
        .catch(err => {
          console.error("Errore nel caricare", feed.name, err);
          return [];
        });
    })
  ).then(results => {
    allItems = results.flat();
    allItems.sort((a, b) => b.pubDate - a.pubDate);
    list.innerHTML = "";
    displayedCount = 0;
    renderMoreNews();

    // Notifiche nuove notizie
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

// Infinite Scroll
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    renderMoreNews();
  }
});

// Richiesta permesso notifiche
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

// Caricamento iniziale
loadNews();
setInterval(loadNews, 300000);
