/* Atlas Brief — article feed loader
 * Reads /data/articles.json and hydrates front-feed + archive-feed-list
 * Articles are already ordered newest-first in the JSON.
 */
(function () {
  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function renderFront(host, articles) {
    if (!host || !articles.length) return;
    var lead = articles[0];
    var rail = articles.slice(1, 4); // next 3

    var leadBadge = '';
    if (lead.status === 'Sold') leadBadge = '<span class="badge badge-sold">Sold</span>';
    else if (lead.status === 'For Sale') leadBadge = '<span class="badge badge-forsale">For Sale</span>';

    var leadHtml =
      '<a href="' + esc(lead.url) + '" class="lead-card">' +
        (lead.hero ? '<img class="lead-img" src="' + esc(lead.hero) + '" alt="' + esc(lead.hero_alt || '') + '" loading="eager">' : '') +
        '<div class="lead-kicker">' +
          leadBadge +
          '<span>' + esc(lead.desk) + ' · Entry № ' + esc(lead.entry) + '</span>' +
        '</div>' +
        '<h3 class="lead-title">' + esc(lead.title) + '</h3>' +
        '<p class="lead-deck">' + esc(lead.deck) + '</p>' +
        '<div class="lead-meta">' +
          '<span><b>D. Safai</b></span>' +
          '<span>' + esc(lead.date_display) + '</span>' +
          '<span>' + esc(lead.read) + '</span>' +
        '</div>' +
      '</a>';

    var railHtml = '<div class="rail">' +
      '<div class="rail-head">Also This Issue</div>' +
      rail.map(function (a) {
        return '<a href="' + esc(a.url) + '" class="rail-item">' +
          (a.hero ? '<img src="' + esc(a.hero) + '" alt="' + esc(a.hero_alt || '') + '" loading="lazy">' : '<div style="width:72px;height:72px;background:var(--bg-alt);border:1px solid var(--rule)"></div>') +
          '<div>' +
            '<div class="r-kicker">' + esc(a.desk) + ' · № ' + esc(a.entry) + '</div>' +
            '<div class="r-title">' + esc(a.title) + '</div>' +
            '<p class="r-deck">' + esc(a.deck.slice(0, 130)) + (a.deck.length > 130 ? '…' : '') + '</p>' +
          '</div>' +
        '</a>';
      }).join('') +
    '</div>';

    host.innerHTML = leadHtml + railHtml;

    var countEl = document.getElementById('feed-count');
    if (countEl) countEl.textContent = articles.length + ' entries live · Issue 001';
  }

  function renderArchive(host, articles) {
    if (!host) return;
    host.innerHTML = articles.map(function (a) {
      return '<a href="' + esc(a.url) + '" class="arc-row">' +
        '<div class="arc-num">№ ' + esc(a.entry) + '</div>' +
        '<div class="arc-kicker">' + esc(a.desk) + (a.status ? ' · ' + esc(a.status) : '') + '</div>' +
        '<div>' +
          '<h3 class="arc-title">' + esc(a.title) + '</h3>' +
          '<p class="arc-deck">' + esc(a.deck) + '</p>' +
        '</div>' +
        '<div class="arc-date">' + esc(a.date_display) + '</div>' +
      '</a>';
    }).join('');

    var meta = document.getElementById('archive-meta');
    if (meta) meta.textContent = articles.length + ' entries · No paywall';
  }

  function mount() {
    var front = document.getElementById('front-feed');
    var arc = document.getElementById('archive-feed-list');
    if (!front && !arc) return;

    fetch('/data/articles.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.articles)) return;
        if (front) renderFront(front, data.articles);
        if (arc) renderArchive(arc, data.articles);
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
