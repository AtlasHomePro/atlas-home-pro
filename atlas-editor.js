/* ============================================================================
   Atlas Universal Editor
   Activates on ANY page when ?edit=1 is appended to the URL.
   Makes all text editable in place, auto-saves to localStorage, and
   exports a clean patch file (or full HTML) for server-side application.
   ============================================================================ */
(function () {
  "use strict";

  // Only activate when the URL contains ?edit=1
  var params = new URLSearchParams(window.location.search);
  if (params.get("edit") !== "1") return;

  // One-time CSS injection
  var css = document.createElement("style");
  css.textContent = [
    "html { scroll-padding-top: 56px }",
    "body { padding-top: 48px !important }",
    "#ae-bar { position: fixed; top: 0; left: 0; right: 0; height: 48px; z-index: 99999;",
    "  background: #1A1A1A; color: #FAFAF8; display: flex; align-items: center; gap: 16px;",
    "  padding: 0 20px; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;",
    "  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;",
    "  border-bottom: 2px solid #9A6B3F; box-shadow: 0 2px 16px rgba(0,0,0,0.2); }",
    "#ae-bar .ae-brand { color: #9A6B3F; font-weight: 600 }",
    "#ae-bar .ae-path { color: #9A9A95; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; letter-spacing: 0.1em; text-transform: none }",
    "#ae-bar .ae-status { color: #9A9A95; font-size: 10px; letter-spacing: 0.12em }",
    "#ae-bar .ae-status.unsaved { color: #E5A04F }",
    "#ae-bar .ae-status.saved { color: #7FB77E }",
    "#ae-bar button { background: transparent; color: #FAFAF8; border: 1px solid #3A3A3A;",
    "  padding: 6px 12px; font: inherit; letter-spacing: 0.14em; cursor: pointer;",
    "  transition: all 0.15s ease; font-size: 10px }",
    "#ae-bar button:hover { background: #9A6B3F; border-color: #9A6B3F }",
    "#ae-bar button.primary { background: #9A6B3F; border-color: #9A6B3F }",
    "#ae-bar button.primary:hover { background: #7C5530 }",
    "#ae-bar button.danger:hover { background: #7A2E2E; border-color: #7A2E2E }",
    "[data-ae-edit] { outline: none; border: 1px dashed transparent;",
    "  transition: border-color 0.15s, background 0.15s; border-radius: 2px;",
    "  padding: 1px 3px; margin: -1px -3px }",
    "[data-ae-edit]:hover { border-color: rgba(154,107,63,0.35) }",
    "[data-ae-edit]:focus { border-color: #9A6B3F; background: rgba(154,107,63,0.05);",
    "  box-shadow: 0 0 0 2px rgba(154,107,63,0.1) }",
    ".ae-nav-disabled { pointer-events: none !important; cursor: text !important }",
    "#ae-panel { position: fixed; right: 20px; top: 60px; width: 340px; max-height: 70vh;",
    "  background: #FAFAF8; border: 1px solid #1A1A1A; z-index: 99998; display: none;",
    "  flex-direction: column; font-family: 'JetBrains Mono', monospace; font-size: 11px;",
    "  box-shadow: 0 10px 40px rgba(0,0,0,0.15) }",
    "#ae-panel.open { display: flex }",
    "#ae-panel h3 { margin: 0; padding: 14px 16px; border-bottom: 1px solid #1A1A1A;",
    "  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #9A6B3F }",
    "#ae-panel .ae-panel-body { padding: 16px; overflow-y: auto; flex: 1 }",
    "#ae-panel p { margin: 0 0 10px; font-size: 11px; line-height: 1.5; color: #2A2A28;",
    "  font-family: 'Newsreader', Georgia, serif }",
    "#ae-panel textarea { width: 100%; min-height: 200px; padding: 10px; font-family: inherit;",
    "  font-size: 10px; border: 1px solid #D9D7D0; resize: vertical; background: #FAFAF8; color: #1A1A1A }",
    "#ae-panel button { margin-top: 10px; width: 100%; background: #1A1A1A; color: #FAFAF8;",
    "  padding: 10px; border: 0; cursor: pointer; font: inherit; letter-spacing: 0.14em;",
    "  text-transform: uppercase; font-size: 10px }",
    "#ae-panel button:hover { background: #9A6B3F }",
    "#ae-panel .kbd { display: inline-block; padding: 2px 6px; background: #E5E3DE;",
    "  border: 1px solid #D9D7D0; border-radius: 2px; font-size: 10px; color: #1A1A1A }",
    "#ae-hint { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);",
    "  background: #1A1A1A; color: #FAFAF8; padding: 10px 18px; font-family: 'JetBrains Mono', monospace;",
    "  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; z-index: 99997;",
    "  border: 1px solid #9A6B3F; opacity: 0; transition: opacity 0.3s ease; pointer-events: none }",
    "#ae-hint.show { opacity: 1 }",
    // Block any position: fixed or sticky from covering the bar
    ".nav, [class*='nav'], [class*='Nav'] { top: 48px !important }",
    ".cat-bar { top: 116px !important }",
    ""
  ].join("\n");
  document.head.appendChild(css);

  // Path key for localStorage segregation (per-URL drafts)
  var pathKey = "ae:" + window.location.pathname;
  var hasChanges = false;
  var saveTimer = null;

  // Decide which elements are editable
  // - Any heading (h1-h6)
  // - Any paragraph
  // - Any list item
  // - Any span/div that contains only text (no children other than inline styling)
  // - Table cells (td, th)
  // - Figcaptions, blockquotes, cite
  // - Anchors whose only child is text
  function isTextOnly(el) {
    if (el.childNodes.length === 0) return false;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 1) {
        // Allow inline elements like b, i, em, strong, span, br, a (small set)
        var tag = n.tagName.toLowerCase();
        if (["b","i","em","strong","span","br","a","u","small","sup","sub","cite","abbr","time","mark","code","kbd"].indexOf(tag) === -1) {
          return false;
        }
      }
    }
    return true;
  }

  var EDITABLE_TAGS = ["H1","H2","H3","H4","H5","H6","P","LI","FIGCAPTION","BLOCKQUOTE","CITE","TD","TH"];
  var SKIP_SELECTORS = "script, style, #ae-bar, #ae-bar *, #ae-panel, #ae-panel *, #ae-hint, nav *, .nav *, .nav-logo *, .nav-links *, .nav-right *, .mobile-menu *, footer .footer-logo, footer .footer-legal, .editor-bar, .editor-bar *";

  function activateEditables() {
    var all = document.querySelectorAll(EDITABLE_TAGS.join(","));
    var count = 0;
    all.forEach(function (el) {
      if (el.closest(SKIP_SELECTORS)) return;
      // Skip if entirely empty
      if (!el.textContent || !el.textContent.trim()) return;
      if (!isTextOnly(el)) return;
      el.setAttribute("contenteditable", "true");
      el.setAttribute("data-ae-edit", "1");
      el.setAttribute("spellcheck", "true");
      count++;
    });

    // Also handle divs that look like editable text (class names with known text-holding patterns)
    var maybeDivs = document.querySelectorAll("div.deck, div.dek, div.cap, div.note, div.cat-dek, div.ft-note, div.plate-note, div.le-note, div.lead-deck, div.deal-stats .v, div.deal-stats .k, div.deal-stats .s, span.deck, span.dv, span.dk, span.addr-main, span.addr-sub");
    maybeDivs.forEach(function (el) {
      if (el.closest(SKIP_SELECTORS)) return;
      if (!el.textContent || !el.textContent.trim()) return;
      if (!isTextOnly(el)) return;
      el.setAttribute("contenteditable", "true");
      el.setAttribute("data-ae-edit", "1");
      el.setAttribute("spellcheck", "true");
      count++;
    });

    // Disable all anchor navigation within article/section body so typing in a link doesn't navigate
    document.querySelectorAll("a[href]").forEach(function (a) {
      if (a.closest("#ae-bar") || a.closest("#ae-panel")) return;
      a.classList.add("ae-nav-disabled");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    return count;
  }

  // Build toolbar
  var bar = document.createElement("div");
  bar.id = "ae-bar";
  bar.innerHTML = [
    '<span class="ae-brand">ATLAS EDIT</span>',
    '<span class="ae-path">' + window.location.pathname + '</span>',
    '<span class="ae-status saved" id="ae-status">\u2713 Ready</span>',
    '<button id="ae-export" class="primary">\u2193 EXPORT</button>',
    '<button id="ae-preview">PREVIEW</button>',
    '<button id="ae-reset" class="danger">DISCARD</button>',
    '<button id="ae-exit">\u2715 EXIT</button>'
  ].join(" ");
  document.body.appendChild(bar);

  // Build export panel
  var panel = document.createElement("div");
  panel.id = "ae-panel";
  panel.innerHTML = [
    '<h3>Export your edits</h3>',
    '<div class="ae-panel-body">',
    '<p>This is the full edited HTML. Copy it and send back to your engineer (or Computer), who will deploy it to <span class="kbd">' + window.location.pathname + '</span>.</p>',
    '<textarea id="ae-export-text" readonly></textarea>',
    '<button onclick="document.getElementById(\'ae-export-text\').select();document.execCommand(\'copy\');this.textContent=\'\u2713 COPIED\u2014paste into chat\';setTimeout(function(){document.querySelector(\'#ae-panel button\').textContent=\'COPY TO CLIPBOARD\'},2200)">COPY TO CLIPBOARD</button>',
    '<button onclick="window.__aeDownload()">\u2193 OR DOWNLOAD AS FILE</button>',
    '</div>'
  ].join("");
  document.body.appendChild(panel);

  // Build hint toast
  var hint = document.createElement("div");
  hint.id = "ae-hint";
  document.body.appendChild(hint);

  function showHint(msg, ms) {
    hint.textContent = msg;
    hint.classList.add("show");
    setTimeout(function () { hint.classList.remove("show"); }, ms || 2000);
  }

  var status = document.getElementById("ae-status");
  function setStatus(text, cls) {
    status.textContent = text;
    status.className = "ae-status " + (cls || "");
  }

  function captureFullHTML() {
    // Remove editor chrome before serializing
    var clone = document.documentElement.cloneNode(true);
    var toRemove = clone.querySelectorAll("#ae-bar, #ae-panel, #ae-hint, style[data-ae-style]");
    toRemove.forEach(function (n) { n.remove(); });
    // Strip editor-only attributes
    clone.querySelectorAll("[data-ae-edit]").forEach(function (el) {
      el.removeAttribute("contenteditable");
      el.removeAttribute("data-ae-edit");
      el.removeAttribute("spellcheck");
    });
    // Restore link navigation
    clone.querySelectorAll("a.ae-nav-disabled").forEach(function (a) {
      a.classList.remove("ae-nav-disabled");
      if (a.classList.length === 0) a.removeAttribute("class");
    });
    // Remove our injected CSS
    var ourCSS = clone.querySelector("style");
    // Find our CSS block (starts with the ae-bar selector we added)
    var allStyles = clone.querySelectorAll("style");
    allStyles.forEach(function (s) {
      if (s.textContent && s.textContent.indexOf("#ae-bar") !== -1 && s.textContent.indexOf(".ae-nav-disabled") !== -1) {
        s.remove();
      }
    });
    return "<!DOCTYPE html>\n<html" + (clone.getAttribute("lang") ? ' lang="' + clone.getAttribute("lang") + '"' : "") + ">\n" + clone.innerHTML + "\n</html>";
  }

  function autoSave() {
    try {
      localStorage.setItem(pathKey, document.documentElement.outerHTML);
      localStorage.setItem(pathKey + ":time", new Date().toISOString());
      setStatus("\u2713 Saved " + new Date().toLocaleTimeString(), "saved");
      hasChanges = false;
    } catch (e) {
      setStatus("\u26A0 Save failed: " + e.message, "unsaved");
    }
  }

  // Events
  document.body.addEventListener("input", function (e) {
    if (!e.target.closest("[data-ae-edit]")) return;
    hasChanges = true;
    setStatus("\u25CF Unsaved", "unsaved");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(autoSave, 1500);
  });

  window.addEventListener("beforeunload", function (e) {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = "You have unsaved edits to this page.";
    }
  });

  document.getElementById("ae-export").addEventListener("click", function () {
    autoSave();
    var html = captureFullHTML();
    document.getElementById("ae-export-text").value = html;
    panel.classList.add("open");
  });

  document.getElementById("ae-preview").addEventListener("click", function () {
    var html = captureFullHTML();
    var w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  });

  document.getElementById("ae-reset").addEventListener("click", function () {
    if (confirm("Discard all your edits to this page and reload?")) {
      localStorage.removeItem(pathKey);
      localStorage.removeItem(pathKey + ":time");
      window.location.href = window.location.pathname;
    }
  });

  document.getElementById("ae-exit").addEventListener("click", function () {
    if (hasChanges && !confirm("You have unsaved changes. Leave anyway?")) return;
    window.location.href = window.location.pathname;
  });

  window.__aeDownload = function () {
    var html = captureFullHTML();
    var blob = new Blob([html], { type: "text/html" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    var slug = window.location.pathname.replace(/\//g, "_").replace(/^_|_$/g, "") || "homepage";
    a.download = "atlas-edit-" + slug + "-" + new Date().toISOString().slice(0, 10) + ".html";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Restore draft on load
  window.addEventListener("DOMContentLoaded", function () {
    // Activate editables first so they exist when we restore
    var count = activateEditables();

    var saved = localStorage.getItem(pathKey);
    var savedTime = localStorage.getItem(pathKey + ":time");
    if (saved && savedTime) {
      var age = Math.round((Date.now() - new Date(savedTime).getTime()) / 60000);
      if (confirm("Restore draft from " + age + " minutes ago?\n\n(Cancel = start fresh)")) {
        // Replace body contents with saved version, keeping current scripts
        var parser = new DOMParser();
        var doc = parser.parseFromString(saved, "text/html");
        // Merge body
        document.body.innerHTML = doc.body.innerHTML;
        // Re-append our chrome
        document.body.appendChild(bar);
        document.body.appendChild(panel);
        document.body.appendChild(hint);
        // Rewire event listeners on the restored elements
        activateEditables();
        setStatus("\u2713 Restored draft", "saved");
      }
    }

    showHint("Edit mode active \u00b7 " + count + " editable blocks \u00b7 Auto-save on", 3500);
  });

  // Fallback in case DOMContentLoaded already fired
  if (document.readyState !== "loading") {
    var count = activateEditables();
    showHint("Edit mode active \u00b7 " + count + " editable blocks", 3500);
  }

  console.log("[Atlas Editor] Active on " + window.location.pathname);
})();
