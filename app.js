// Parole da escludere (case-insensitive)
const excludedWords = [
  "Oroscopo", "Basket", "Calcio", "Pielle",
  "Libertas", "Serie C", "partita",
  "Piombino", "Cecina", "Capraia", "lirica",
  "Tomei", "Football", "Rugby", "Karate",
  "Tennis"
];

// Lista dei feed RSS
const feeds = [
  { name: "Rai News", url: "https://www.rainews.it/rss/tutti" }, // nuovo feed in cima
  { name: "Urban Livorno", url: "https://politepol.com/fd/aTWhyA7ES6MO.xml" },
  { name: "Livorno Today", url: "https://www.livornotoday.it/rss" },
  { name: "LivornoPress", url: "https://www.livornopress.it/feed/" },
  { name: "Qui Livorno", url: "https://www.quilivorno.it/feed/" },
  { name: "Comune", url: "https://www.comune.livorno.it/it/news/feed/" },
  { name: "Ansa", url: "https://www.ansa.it/toscana/notizie/toscana_rss.xml" },
  { name: "Toscana", url: "https://www.toscana-notizie.it/archivio/-/asset_publisher/Lyd2Is2gGDzu/rss" },
  { name: "Il Tirreno", url: "https://politepol.com/fd/XZs73GuQOEsI.xml" },
  { name: "Livorno24", url: "https://politepol.com/fd/QXTvGCTWZdav.xml" },
  { name: "Il Telegrafo", url: "https://politepol.com/fd/6zOKXzQRl1ZM.xml" },
  { name: "Livorno Sera", url: "https://politepol.com/fd/1woLPi7mKwX8.xml" } 
];

// Colori testate
const sourceColors = {
  "Rai News": "#FCF9BE",          // stesso giallo di Ansa
  "Livorno Today": "#FDEED9",     // Rosa pesca chiaro
  "Il Tirreno": "#C9E2F8",        // Azzurro cielo sereno
  "Ansa": "#FCF9BE",              // Giallo crema
  "Livorno24": "#D9F7D9",         // Verde menta pallido
  "Qui Livorno": "#CFF5E7",       // Celeste polvere
  "Comune": "#EBEBEB",            // Grigio perla
  "Il Telegrafo": "#D0F0F0",      // Acquamarina tenue
  "Urban Livorno": "#FFD1DC",     // Rosa cipria
  "Livorno Sera": "#EBD8ED",      // Rosa 
  "LivornoPress": "#E6E6FA",      // Lilla lavanda
  "Toscana": "#F4F0E4"            // Beige sabbia
};

// Ordine fisso delle testate
const sourceOrder = [
  "Rai News",  // posizionato in cima come Ansa
  "Ansa",
  "Il Tirreno",
  "Il Telegrafo",
  "Qui Livorno",
  "Livorno24",
  "LivornoPress",
  "Livorno Today",
  "Urban Livorno",
  "Livorno Sera",
  "Toscana",
  "Comune"
];

const container = document.getElementById("news");
const list = document.createElement("ul");
container.appendChild(list);

let allItems = [];

// --- Rendering notizie ---
function renderAllNews() {
  list.innerHTML = "";
  allItems.forEach(item => {
    const li = document.createElement("li");
    li.style.backgroundColor = sourceColors[item.source] || "#ffffff";

    li.innerHTML = `
      <a href="${item.link}" target="_blank">${item.title}</a>
      <div>${item.source}</div>
    `;

    list.appendChild(li);
  });
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

            // Esclusione parole
            for (const word of excludedWords) {
              const regex = new RegExp(word, "i");
              if (regex.test(title) || regex.test(description)) {
                return false;
              }
            }

            // Filtro speciale per ANSA, Toscana e Rai News: solo notizie con "Livorno"
            if (feed.name === "Ansa" || feed.name === "Toscana" || feed.name === "Rai News") {
              return /livorno/i.test(title) || /livorno/i.test(description);
            }

            return true;
          })
          .map(item => {
            // Correggi fuso orario (-2h)
            const pubDate = new Date(item.pubDate);
            pubDate.setHours(pubDate.getHours() - 2);

            return {
              title: item.title.replace(/Il Tirreno\s*$/i, ""), // rimuovi "Il Tirreno" dai titoli
              link: item.link,
              pubDate: pubDate,
              source: feed.name
            };
          })
        )
        .catch(err => {
          console.error("Errore nel caricare", feed.name, err);
          return [];
        });
    })
  ).then(results => {
    allItems = results.flat();

    // Filtra notizie entro 48 ore
    const now = new Date();
    allItems = allItems.filter(n => (now - n.pubDate) <= 48 * 60 * 60 * 1000);

    // Ordina per testata, poi per data decrescente
    allItems.sort((a, b) => {
      const idxA = sourceOrder.indexOf(a.source);
      const idxB = sourceOrder.indexOf(b.source);
      if (idxA === idxB) {
        return b.pubDate - a.pubDate;
      }
      return idxA - idxB;
    });

    renderAllNews();
  });
}

// Caricamento iniziale
loadNews();

// Refresh ogni 5 minuti
setInterval(loadNews, 300000);
