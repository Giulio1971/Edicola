// Lista dei feed RSS che vuoi seguire
const feeds = [
  { name: "Livorno Today", url: "https://www.livornotoday.it/rss" },
  { name: "LivornoPress", url: "https://www.livornopress.it/feed/" },
  { name: "Qui Livorno", url: "https://www.quilivorno.it/feed/" },
  { name: "Comune", url: "https://www.comune.livorno.it/it/news/feed/" }
];

const container = document.getElementById("news");

// Create one <ul> for all news
const list = document.createElement("ul");
container.appendChild(list);

function loadNews() {
  // Clear the list before re-rendering
  list.innerHTML = "";

  // Fetch all feeds in parallel
  Promise.all(
    feeds.map(feed => {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      return fetch(apiUrl)
        .then(res => res.json())
        .then(data => data.items.map(item => ({
          title: item.title,
          link: item.link,
          pubDate: new Date(item.pubDate),
          source: feed.name
        })))
        .catch(err => {
          console.error("Errore nel caricare", feed.name, err);
          return [];
        });
    })
  ).then(results => {
    // Flatten all items into one array
    let allItems = results.flat();

    // --- STEP 1: prime 2 notizie per ogni fonte (nell’ordine delle fonti) ---
    let topPerSource = [];
    feeds.forEach(feed => {
      const fromSource = allItems
        .filter(i => i.source === feed.name)
        .sort((a, b) => b.pubDate - a.pubDate); // ordino per prendere le 2 più recenti
      topPerSource.push(...fromSource.slice(0, 2));
    });

    // --- STEP 2: le altre notizie ---
    let remaining = allItems.filter(item => !topPerSource.includes(item));
    remaining.sort((a, b) => b.pubDate - a.pubDate);

    // --- STEP 3: concatenare le due liste ---
    const finalList = [...topPerSource, ...remaining];

    // --- STEP 4: render in pagina ---
    finalList.forEach(item => {
      const li = document.createElement("li");

      const formattedDate = item.pubDate.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      li.innerHTML = `<a href="${item.link}" target="_blank">${item.title}</a>
                      <span style="color:#555; font-size:14px; margin-left:8px;">${formattedDate}</span>`;

      list.appendChild(li);
    });
  });
}

// Initial load
loadNews();

// Refresh every 5 minutes (300,000 ms)
setInterval(loadNews, 300000);
