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
  "Ansa": "#ffffcc"             // giallo chiaro
};

function loadNews() {
  list.innerHTML = "";

  Promise.all(
    feeds.map(feed => {
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
    })
  ).then(results => {
    let allItems = results.flat();

    // --- Ordinamento per data (cronologico inverso) ---
    allItems.sort((a, b) => b.pubDate - a.pubDate);

    // --- Lista finale limitata a 50 ---
    const finalList = allItems.slice(0, 50);

    finalList.forEach(item => {
      const days = [
        "Domenica", "Lunedì", "Martedì",
        "Mercoledì", "Giovedì", "Venerdì", "Sabato"
      ];
      const dayName = days[item.pubDate.getDay()];

      const hours = item.pubDate.getHours().toString().padStart(2, "0");
      const minutes = item.pubDate.getMinutes().toString().padStart(2, "0");

      const formattedDate = `${dayName} alle ${hours}:${minutes}`;

      // --- CARD stile Material senza grassetto ---
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
                        ${formattedDate}
                      </span>`;

      list.appendChild(li);
    });
  });
}

// Caricamento iniziale
loadNews();

// Refresh ogni 5 minuti (300,000 ms)
setInterval(loadNews, 300000);
