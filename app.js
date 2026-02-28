const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");
const suggestionsBox = document.getElementById("suggestions");

const summaryDiv = document.getElementById("summary");
const metaDiv = document.getElementById("metadata");
const imagesDiv = document.getElementById("images");

let suggestions = [];
let activeIndex = -1;
let pageDescription = "Not available";
searchInput.addEventListener("input", async () => {
  const q = searchInput.value.trim();
  activeIndex = -1;

  if (!q) {
    suggestionsBox.classList.remove("show");
    return;
  }

  const r = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&format=json&origin=*`
  );
  const d = await r.json();

  suggestions = d[1];
  suggestionsBox.innerHTML = "";

  suggestions.forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.onclick = () => selectSuggestion(i);
    suggestionsBox.appendChild(li);
  });

  if (suggestions.length) suggestionsBox.classList.add("show");
});

searchInput.addEventListener("keydown", e => {
  if (suggestions.length) {
    if (e.key === "ArrowDown") {
      activeIndex = (activeIndex + 1) % suggestions.length;
    }

    if (e.key === "ArrowUp") {
      activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
    }

    [...suggestionsBox.children].forEach((li, i) =>
      li.classList.toggle("active", i === activeIndex)
    );
  }
  if (e.key === "Enter") {
    e.preventDefault();

    if (suggestions.length && activeIndex >= 0) {
      selectSuggestion(activeIndex);
    } 
    else if (searchInput.value.trim()) {
      loadPage(searchInput.value.trim());
    }
  }
});

function selectSuggestion(i) {
  if (i < 0) return;
  const v = suggestions[i];
  searchInput.value = v;
  suggestionsBox.classList.remove("show");
  loadPage(v);
}

searchBtn.onclick = () => {
  if (searchInput.value.trim()) loadPage(searchInput.value.trim());
};
async function loadPage(q) {
  document.getElementById("intro")?.remove();
  suggestionsBox.classList.remove("show");
  searchBtn.classList.add("loading");

  summaryDiv.innerHTML = "";
  metaDiv.innerHTML = "";
  imagesDiv.innerHTML = "";

  await loadSummary(q);
  await loadMetadata(q);
  await loadImages(q);

  searchBtn.classList.remove("loading");
}async function loadSummary(q) {
  const r = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`
  );
  const d = await r.json();
  if (!d.extract) return;

  pageDescription =
    d.description ||
    d.extract.split(".")[0] ||
    "Not available";

  summaryDiv.innerHTML = `
    <h2>${d.title}</h2>
    <p>${d.extract}</p>
  `;
}async function loadMetadata(q) {
  const r = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=info|revisions&rvprop=user|timestamp&rvlimit=50&format=json&origin=*&titles=${encodeURIComponent(q)}`
  );
  const d = await r.json();
  const p = Object.values(d.query.pages)[0];
  const users = new Set((p.revisions || []).map(r => r.user));

  metaDiv.innerHTML = `
    <h2>Metadata</h2>
    <div class="meta-grid">
      <div class="meta-card"><span>ID</span><b>${p.pageid}</b></div>
      <div class="meta-card"><span>Title</span><b>${p.title}</b></div>
      <div class="meta-card wide"><span>Description</span><b>${pageDescription}</b></div>
      <div class="meta-card"><span>Page Size</span><b>${p.length} bytes</b></div>
      <div class="meta-card"><span>Total Edits</span><b>${p.revisions?.length || 0}</b></div>
      <div class="meta-card"><span>Contributors</span><b>${users.size}</b></div>
      <div class="meta-card wide"><span>Last Edited</span><b>${new Date(p.revisions?.[0]?.timestamp).toLocaleString()}</b></div>
    </div>
  `;
}
async function loadImages(q) {
  const r = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original&generator=search&gsrsearch=${encodeURIComponent(
      q
    )}&gsrlimit=40&format=json&origin=*`
  );
  const d = await r.json();
  if (!d.query) {
    imagesDiv.style.display = "none";
    return;
  }

  imagesDiv.style.display = "block";
  imagesDiv.innerHTML = `<h2>Images</h2><div class="img-grid"></div>`;
  const grid = imagesDiv.querySelector(".img-grid");
  const seen = new Set();

  Object.values(d.query.pages).forEach(p => {
    const src = p.original?.source;
    if (!src || seen.has(src)) return;
    seen.add(src);

    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.onerror = () => img.remove();

    img.onclick = () => openImage(src);
    grid.appendChild(img);
  });
  if (!grid.children.length) {
    imagesDiv.style.display = "none";
  }
}
function openImage(src) {
  const modal = document.createElement("div");
  modal.className = "image-modal";

  const img = document.createElement("img");
  img.src = src;

  modal.appendChild(img);
  document.body.appendChild(modal);

  modal.onclick = () => modal.remove();
  document.onkeydown = e => {
    if (e.key === "Escape") modal.remove();
  };
}function quickSearch(q) {
  searchInput.value = q;
  loadPage(q);
}

