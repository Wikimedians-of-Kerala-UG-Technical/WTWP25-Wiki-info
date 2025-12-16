/* =========================
   AUTOCOMPLETE SUGGESTIONS
========================= */
async function showSuggestions() {
  const query = document.getElementById("search").value.trim();
  const list = document.getElementById("suggestions");

  if (!query) {
    list.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${query}&limit=8&format=json&origin=*`
    );
    const data = await res.json();

    list.innerHTML = "";
    data[1].forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      li.onclick = () => {
        document.getElementById("search").value = item;
        list.innerHTML = "";
        searchWiki();
      };
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Suggestion error", err);
  }
}

/* =========================
   MAIN SEARCH FUNCTION
========================= */
async function searchWiki() {
  const input = document.getElementById("search").value.trim();
  if (!input) return;

  const search = encodeURIComponent(input);

  // Clear previous results
  document.getElementById("summary").innerHTML = "Loading...";
  document.getElementById("meta").innerHTML = "";
  document.getElementById("wikidata").innerHTML = "";
  document.getElementById("history").innerHTML = "";
  document.getElementById("images").innerHTML = "";
  document.getElementById("suggestions").innerHTML = "";

  try {
    /* ===== STEP 1: SEARCH ===== */
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${search}&format=json&origin=*`
    );
    const searchData = await searchRes.json();

    if (!searchData.query.search.length) {
      document.getElementById("summary").innerHTML =
        "<p>❌ No result found.</p>";
      return;
    }

    const title = searchData.query.search[0].title;

    /* ===== STEP 2: SUMMARY ===== */
    const sumRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        title
      )}&prop=extracts|pageprops&exintro=true&explaintext=true&exsentences=6&format=json&origin=*`
    );
    const sumData = await sumRes.json();
    const page = Object.values(sumData.query.pages)[0];

    document.getElementById("summary").innerHTML = `
      <h3>${page.title}</h3>
      <p>${page.extract}</p>
    `;

    /* ===== STEP 3: METADATA ===== */
    const metaRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        title
      )}&prop=info&inprop=editcount&format=json&origin=*`
    ); 
    const metaData = await metaRes.json();
    const metaPage = Object.values(metaData.query.pages)[0];

    document.getElementById("meta").innerHTML = `
      <h4> Metadata</h4>
      <ul>
        <li><b>Page ID:</b> ${metaPage.pageid}</li>
        <li><b>Total Edits:</b> ${metaPage.editcount || "N/A"}</li>
        <li><b>Page Size:</b> ${metaPage.length} bytes</li>
      </ul>
    `;

    /* ===== STEP 4: WIKIDATA FACTS ===== */
    if (page.pageprops?.wikibase_item) {
      const wdId = page.pageprops.wikibase_item;

      const wdRes = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${wdId}.json`
      );
      const wdData = await wdRes.json();
      const entity = wdData.entities[wdId];

      document.getElementById("wikidata").innerHTML = `
        <h4> Wikidata Facts</h4>
        <ul>
          <li><b>ID:</b> ${wdId}</li>
          <li><b>Title:</b> ${entity.labels.en?.value || "N/A"}</li>
          <li><b>Description:</b> ${entity.descriptions.en?.value || "N/A"}</li>
        </ul>
      `;
    }

    /* ===== STEP 5: EDIT HISTORY ===== */
    const histRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        title
      )}&prop=revisions&rvlimit=50&rvprop=user|timestamp&format=json&origin=*`
    );
    const histData = await histRes.json();
    const revisions = Object.values(histData.query.pages)[0].revisions || [];
    const contributors = new Set(revisions.map(r => r.user));

    document.getElementById("history").innerHTML = `
      <h4> Edit History</h4>
      <ul>
        <li><b>Total edits analyzed:</b> ${revisions.length}</li>
        <li><b>Unique contributors:</b> ${contributors.size}</li>
      </ul>
    `;

    /* ===== STEP 6: WIKIMEDIA COMMONS IMAGES ===== */
    const imgRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        title
      )}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&format=json&origin=*`
    );

    const imgData = await imgRes.json();
    const pages = imgData.query?.pages || {};
    const images = Object.values(pages).filter(p => p.imageinfo);

    if (images.length > 0) {
      document.getElementById("images").innerHTML = `
        <h4>🖼 Wikimedia Commons Images</h4>
        <div class="img-grid"></div>
      `;

      images.forEach(img => {
        document.querySelector(".img-grid").innerHTML +=
          `<img src="${img.imageinfo[0].url}" alt="Wikimedia image">`;
      });
    } else {
      document.getElementById("images").innerHTML = `
        <h4>🖼 Wikimedia Commons Images</h4>
        <p>No images available for this topic.</p>
      `;
    }

  } catch (error) {
    console.error(error);
    document.getElementById("summary").innerHTML =
      "<p>❌ Something went wrong.</p>";
  }
}

