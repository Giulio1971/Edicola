// Lista dei feed RSS che vuoi seguire
const feeds = [
  { name: "Il Tirreno", url: "https://il-tirreno.webnode.it/rss/all.xml" },
  { name: "Livorno Today", url: "https://www.livornotoday.it/rss" },
  { name: "Qui Livorno", url: "https://www.quilivorno.it/feed/" },
  { name: "LivornoPress", url: "https://www.livornopress.it/feed/" },
  { name: "Il Telegrafo (Livorno)", url: "https://iltirreno.gelocal.it/telegrafo/rss.xml" }
];

const container = document.getElementById("news");

feeds.forEach(feed => {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
  
  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      const section = document.createElement("section");
      section.innerHTML = `<h2>${feed.name}</h2><ul></ul>`;
      const list = section.querySelector("ul");

      data.items.slice(0, 5).forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="${item.link}" target="_blank">${item.title}</a>`;
        list.appendChild(li);
      });

      container.appendChild(section);
    })
    .catch(err => {
      console.error("Errore nel caricare", feed.name, err);
    });
});
