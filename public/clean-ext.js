// Aggressively remove browser extension injected attributes
(function() {
  var ATTRS = ['data-cur', 'data-cursorstyle', 'data-reactroot'];

  function clean() {
    document.querySelectorAll('*').forEach(function(el) {
      ATTRS.forEach(function(a) {
        if (el.hasAttribute(a)) el.removeAttribute(a);
      });
    });
  }

  // Run immediately
  clean();

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clean);
  }

  // Run on load
  window.addEventListener('load', clean);

  // Watch for dynamically injected attributes
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(clean).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ATTRS
    });
  }

  // Run repeatedly for the first 2 seconds to catch late injections
  var count = 0;
  var interval = setInterval(function() {
    clean();
    count++;
    if (count >= 10) clearInterval(interval);
  }, 200);
})();
