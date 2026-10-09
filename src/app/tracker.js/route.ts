const tracker = `(function () {
  var script = document.currentScript;
  var key = script && script.getAttribute('data-site-key');
  var endpoint = script && script.getAttribute('data-endpoint');
  if (!endpoint && script && script.src) endpoint = new URL('/api/collect', script.src).href;
  endpoint = endpoint || '/api/collect';
  var visitorKey = 'visitoring-visitor-id';
  var sessionKey = 'visitoring-session-id';
  var visitorId;
  var sessionId;
  function id() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  function optedOut() {
    return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
  }
  function stored(which, name) {
    try {
      var storage = which === 'local' ? window.localStorage : window.sessionStorage;
      var value = storage.getItem(name);
      if (value) return value;
      var next = id();
      storage.setItem(name, next);
      return next;
    }
    catch (_) { return id(); }
  }
  function referrerHost() {
    try { return document.referrer ? new URL(document.referrer).hostname : undefined; }
    catch (_) { return undefined; }
  }
  function send(name, properties) {
    if (optedOut()) return;
    var payload = { visitorId: visitorId, sessionId: sessionId, eventName: name,
      path: window.location.pathname, properties: properties || {} };
    var referrer = referrerHost();
    if (referrer) payload.referrerHost = referrer;
    var body;
    try { body = JSON.stringify(payload); } catch (_) { return; }
    if (!body || body.length > 16000) return;
    var url = endpoint + (endpoint.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(key);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch (_) { /* Use fetch when Beacon is unavailable. */ }
    try { fetch(url, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body, keepalive: true }).catch(function () {}); }
    catch (_) { /* Analytics must not block the page. */ }
  }
  window.Visitoring = window.Visitoring || {};
  window.Visitoring.track = function (name, properties) {
    if (!key || !/^vk_[A-Za-z0-9_-]+$/.test(key) || optedOut() || !visitorId || !sessionId) return;
    if (typeof name !== 'string' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(name)) return;
    send(name, properties && typeof properties === 'object' && !Array.isArray(properties) ? properties : {});
  };
  if (!key || !/^vk_[A-Za-z0-9_-]+$/.test(key) || optedOut()) return;
  visitorId = stored('local', visitorKey);
  sessionId = stored('session', sessionKey);
  var lastPath = null;
  function pageView() {
    var path = window.location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    send('page_view', {});
  }
  pageView();
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      pageView();
      return result;
    };
  });
  window.addEventListener('popstate', pageView);
})();`;

export function GET(): Response {
  return new Response(tracker, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
