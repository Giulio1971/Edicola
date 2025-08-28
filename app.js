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
  // Clear the list before re-rendering
  list.innerHTML = "";

  // Fetch all feeds in parallel
  Promise.all(
    feeds.map(feed => {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      return fetch(apiUrl)
        .then(res => res.json())
        .then(data => data.items
          .filter(item => {
            const title = item.title || "";
            const description = item.description || "";

            // Escludi sempre "Oroscopo"
            if (/oroscopo/i.test(title) || /oroscopo/i.test(description)) {
              return false;
            }

            // Per ANSA, tieni solo le notizie con "Livorno"
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
    // Flatten all items into one array
    let allItems = results.flat();

    // --- STEP 1: prime 2 notizie per ogni fonte (ordine delle fonti) ---
    let topPerSource = [];
    feeds.forEach(feed => {
      const fromSource = allItems
        .filter(i => i.source === feed.name)
        .sort((a, b) => b.pubDate - a.pubDate);
      topPerSource.push(...fromSource.slice(0, 2));
    });

    // --- STEP 2: le altre notizie ---
    let remaining = allItems.filter(item => !topPerSource.includes(item));
    remaining.sort((a, b) => b.pubDate - a.pubDate);

    // --- STEP 3: concatenare e limitare a 50 ---
    const finalList = [...topPerSource, ...remaining].slice(0, 50);

    // --- STEP 4: render in pagina ---
    finalList.forEach(item => {
      const days = [
        "Domenica", "Lunedì", "Martedì",
        "Mercoledì", "Giovedì", "Venerdì", "Sabato"
      ];
      const dayName = days[item.pubDate.getDay()];

      const hours = item.pubDate.getHours().toString().padStart(2, "0");
      const minutes = item.pubDate.getMinutes().toString().padStart(2, "0");

      const formattedDate = `${dayName} alle ${hours}:${minutes}`;

      // --- CARD stile Material ---
      const li = document.createElement("li");
      li.style.backgroundColor = sourceColors[item.source] || "#ffffff";
      li.style.padding = "12px";
      li.style.borderRadius = "8px";
      li.style.marginBottom = "8px";
      li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; // ombra leggera stile material

      li.innerHTML = `<a href="${item.link}" target="_blank" style="font-weight:bold; color:#000; text-decoration:none;">
                        ${item.title}
                      </a>
                      <span style="color:#555; font-size:14px; margin-left:8px;">
                        ${formattedDate}
                      </span>`;

      list.appendChild(li);
    });
  });
}

// Initial load
loadNews();

// Refresh every 5 minutes (300,000 ms)
setInterval(loadNews, 300000);
