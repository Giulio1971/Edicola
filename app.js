// Parole da escludere da tutte le fonti (case-insensitive)
const excludedWords = ["Oroscopo", "Basket", "Calcio", "Pielle", "Libertas", "Serie C", "partita", "Cecina", "lirica", "Capraia"];

// Lista dei feed RSS
const feeds = [
  { name: "Urban Livorno", url: "https://rss.app/feeds/SaDtFZa4zNsqgPXz.xml" },
  { name: "Livorno Today", url: "https://www.livornotoday.it/rss" },
  { name: "LivornoPress", url: "https://www.livornopress.it/feed/" },
  { name: "Qui Livorno", url: "https://www.quilivorno.it/feed/" },
  { name: "Comune", url: "https://www.comune.livorno.it/it/news/feed/" },
  { name: "Ansa", url: "https://www.ansa.it/toscana/notizie/toscana_rss.xml" },
  { name: "Toscana", url: "https://www.toscana-notizie.it/archivio/-/asset_publisher/Lyd2Is2gGDzu/rss" },
  { name: "Il Tirreno", url: "https://rss.app/feeds/0GUahjgFVeLkmFyL.xml" },
  { name: "Livorno24", url: "https://rss.app/feeds/XQ0dFyxv5w1Xlwno.xml" },
  { name: "Il Telegrafo", url: "https://rss.app/feeds/AqrxLQum6ReQrR3d.xml" }
];

const container = document.getElementById("news");
const list = document.createElement("ul");
container.appendChild(list);

// Colori delle testate
const sourceColors = {
  "Livorno Today": "#FDEED9",     
  "Il Tirreno": "#C9E2F8",        
  "Ansa": "#FCF9BE",              
  "Livorno24": "#D9F7D9",         
  "Qui Livorno": "#CFF5E7",       
  "Comune": "#EBEBEB",            
  "Il Telegrafo": "#D0F0F0",      
  "Urban Livorno": "#FFD1DC",     
  "LivornoPress": "#E6E6FA",      
  "Toscana": "#F4F0E4"            
};

let allItems = [];
const now = new Date();

// --- Rendering notizie ---
function renderMoreNews() {
  list.innerHTML = "";
  allItems.forEach(item => {
    const li = document.createElement("li");
    li.style.backgroundColor = sourceColors[item.source] || "#cceeff";
    li.style.padding = "12px";
    li.style.borderRadius = "8px";
    li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    li.style.display = "flex";
    li.style.flexDirection = "column";
    if (window.innerWidth >= 1024) li.style.justifyContent = "space-between";

    let title = item.title;
    if (item.source === "Il Tirreno") title = title.replace(/\s*Il Tirreno$/i, "");

    li.innerHTML = `<a href="${item.link}" target="_blank">${title}</a>
                    <div>${item.source}</div>`;

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

            // Filtri parole escluse (case-insensitive)
            for (const word of excludedWords) {
              const regex = new RegExp(word, "i");
              if (regex.test(title) || regex.test(description)) return false;
            }

            // Solo ultime 36 ore
            const pubDate = new Date(item.pubDate);
            if ((now - pubDate) / (1000 * 60 * 60) > 36) return false;

            // Filtro speciale per ANSA e Toscana: solo notizie con "Livorno"
            if (feed.name === "Ansa" || feed.name === "Toscana") {
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
    allItems = results.flat();
    allItems.sort((a, b) => b.pubDate - a.pubDate);
    renderMoreNews();
  });
}

// Caricamento iniziale
loadNews();

// Refresh ogni 5 minuti
setInterval(loadNews, 300000);

// Ricarica layout al resize per desktop/mobile
window.addEventListener("resize", renderMoreNews);
