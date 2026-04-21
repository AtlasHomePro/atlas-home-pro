/* Atlas Brief — universal signup bar
 * Renders a slim subscribe strip just above every footer.
 * Skips pages that already have #dispatch or #subscribe (homepage, brief).
 */
(function () {
  // Skip if there's already a dispatch or subscribe block on the page
  if (document.getElementById('dispatch') || document.getElementById('subscribe')) return;

  function buildBar() {
    var bar = document.createElement('section');
    bar.id = 'universal-signup';
    bar.innerHTML = [
      '<div class="us-inner">',
        '<div class="us-copy">',
          '<div class="us-eyebrow">The Atlas Dispatch</div>',
          '<div class="us-headline">Real LA real estate, in your inbox.</div>',
          '<div class="us-sub">Weekly. Deal notes, construction costs, policy. No fluff.</div>',
        '</div>',
        '<form class="us-form" name="atlas-dispatch" method="POST" data-netlify="true" action="/thanks/" onsubmit="return window.atlasUnivSub(this, event)">',
          '<input type="hidden" name="form-name" value="atlas-dispatch" />',
          '<input type="email" name="email" required placeholder="you@yourdomain.com" autocomplete="email" aria-label="Email address" />',
          '<button type="submit">Subscribe</button>',
        '</form>',
        '<div class="us-success">',
          '<span>You are on the list. First dispatch lands Monday.</span>',
        '</div>',
      '</div>'
    ].join('');

    // Insert just before the first <footer> on page
    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(bar, footer);
    } else {
      document.body.appendChild(bar);
    }
  }

  window.atlasUnivSub = function (form, ev) {
    ev.preventDefault();
    var fd = new FormData(form);
    fetch('/', {
      method: 'POST',
      headers: { 'Accept': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fd).toString()
    }).then(function () {
      var bar = document.getElementById('universal-signup');
      if (bar) bar.classList.add('sent');
    }).catch(function () {
      var bar = document.getElementById('universal-signup');
      if (bar) bar.classList.add('sent');
    });
    return false;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildBar);
  } else {
    buildBar();
  }
})();
