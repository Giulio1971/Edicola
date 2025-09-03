const excludedWords = [
  "Oroscopo","Basket","Calcio","Pielle","Libertas","Serie C","partita",
  "Capraia","Piombino","Cecina","lirica"
];

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

const sourceColors = {
  "Livorno Today": "#FDEED9",
  "Il Tirreno": "#CFF5E7",
  "Ansa": "#FCF9BE",
  "Livorno24": "#D9F7D9",
  "Qui Livorno": "#C9E2F8",
  "Comune": "#EBEBEB",
  "Il Telegrafo": "#D0F0F0",
  "Urban Livorno": "#FFD1DC",
  "LivornoPress": "#E6E6FA",
  "Toscana": "#F4F0E4"
};

const sourceOrder = [
  "Ansa","Il Tirreno","Il Telegrafo","Livorno Today","Qui Livorno",
  "Livorno24","LivornoPress","Urban Livorno","Toscana","Comune"
];

const container = document.getElementById("news-container");
let allItems = [];

function renderAllNews() {
  container.innerHTML = "";
  const grouped = {};
  allItems.forEach(item => {
    if (!grouped[item.source]) grouped[item.source] = [];
    grouped[item.source].push(item);
  });

  sourceOrder.forEach(source => {
    if (!grouped[source]) return;
    const block = document.createElement("div");
    block.className = "source-block";

    const news = grouped[source];
    news.forEach(item => {
      const div = document.createElement("div");
      div.className = "news-card";
      div.style.backgroundColor = sourceColors[item.source] || "#ffffff";
      div.innerHTML = `
        <a href="${item.link}" target="_blank">${item.title}</a>
        <div class="source-footer">${item.source}</div>
      `;
      block.appendChild(div);
    });

    // Celle vuote desktop
    const remainder = news.length % 5;
    if (remainder !== 0) {
      for (let i = remainder; i < 5; i++) {
        const empty = document.createElement("div");
        empty.className = "news-card empty-cell";
        block.appendChild(empty);
      }
    }
    container.appendChild(block);
  });
}

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
              if (new RegExp(word,"i").test(title) || new RegExp(word,"i").test(description)) return false;
            }
            if(feed.name==="Ansa" || feed.name==="Toscana") {
              return /livorno/i.test(title) || /livorno/i.test(description);
            }
            return true;
          })
          .map(item => {
            const pubDate = new Date(item.pubDate);
            pubDate.setHours(pubDate.getHours()-2);
            return {
              title: item.title.replace(/Il Tirreno\s*$/i,""),
              link: item.link,
              pubDate: pubDate,
              source: feed.name
            };
          })
        )
        .catch(err => { console.error("Errore nel caricare",feed.name,err); return []; });
    })
  ).then(results => {
    allItems = results.flat();
    const now = new Date();
    allItems = allItems.filter(n => (now - n.pubDate) <= 48*60*60*1000);
    allItems.sort((a,b)=>{
      const idxA = sourceOrder.indexOf(a.source);
      const idxB = sourceOrder.indexOf(b.source);
      if(idxA===idxB) return b.pubDate - a.pubDate;
      return idxA - idxB;
    });
    renderAllNews();
  });
}

loadNews();
setInterval(loadNews,300000);
