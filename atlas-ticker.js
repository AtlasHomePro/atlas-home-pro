/* Atlas Brief — CNBC-style live ticker bar
 * Drops into any page that has <div id="atlas-ticker"></div>
 * Reads /data/market.json (updated daily by background cron)
 */
(function () {
  function render(host, data) {
    if (!data || !Array.isArray(data.tickers)) return;
    var items = data.tickers.map(function (t) {
      var cls = t.dir === 'up' ? 'up' : (t.dir === 'dn' ? 'dn' : 'flat');
      return '<span class="tk-item"><span class="tk-sym">' + t.sym + '</span>' +
             '<span class="tk-val">' + t.val + '</span>' +
             '<span class="tk-chg ' + cls + '">' + t.chg + '</span></span>';
    }).join('<span class="tk-sep"></span>');
    host.innerHTML =
      '<div class="tk-row">' +
        '<div class="tk-track">' +
          '<div class="tk-lane">' + items + '<span class="tk-sep"></span>' + items + '</div>' +
        '</div>' +
        '<div class="tk-meta">As of ' + (data.updated_display || '—') + '</div>' +
      '</div>';
  }

  function mount() {
    var host = document.getElementById('atlas-ticker');
    if (!host) return;
    fetch('/data/market.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) render(host, data); })
      .catch(function () { /* silent fail — bar stays hidden */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
