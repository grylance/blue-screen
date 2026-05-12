(function () {
  let loading = false;

  function getNextPageUrl() {
    return document.querySelector('a[rel="next"]')?.href ||
           document.querySelector('.pagination__next a')?.href ||
           null;
  }

  function getGrid() {
    return document.querySelector('.grid');
  }

  function getItemsFromHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelectorAll('.grid > *');
  }

  window.addEventListener('scroll', async () => {
    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 800;

    if (!nearBottom || loading) return;

    const nextUrl = getNextPageUrl();
    const grid = getGrid();

    if (!nextUrl || !grid) return;

    loading = true;

    try {
      const res = await fetch(nextUrl);
      const html = await res.text();

      const items = getItemsFromHTML(html);
      items.forEach(item => grid.appendChild(item));

      loading = false;
    } catch (e) {
      console.error('Infinite scroll error:', e);
      loading = false;
    }
  });
})();