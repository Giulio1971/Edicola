// Lista dei feed RSS che vuoi seguire
const feeds = [
  { name: "Livorno Today", url: "https://www.livornotoday.it/rss" },
  { name: "LivornoPress", url: "https://www.livornopress.it/feed/" },
  { name: "Qui Livorno", url: "https://www.quilivorno.it/feed/" },
  { name: "Comune", url: "https://www.comune.livorno.it/it/news/feed/" }
];

const container = document.getElementById("news");

// Creo un unico <ul> che conterrà tutte le notizie
const list = document.createElement("ul");
container.appendChild(list);

feeds.forEach(feed => {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;

  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      data.items.slice(0, 10).forEach(item => {
        const li = document.createElement("li");
        // li.innerHTML = `<a href="${item.link}" target="_blank">${item.title}</a>`;
        list.appendChild(li);
      });
    })
    .catch(err => {
      console.error("Errore nel caricare", feed.name, err);
    });
});
