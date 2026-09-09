/**
 * Снос SW/Cache API + сверка с build.json.
 * Старый HTML на телефоне иначе месяцами тянет прошлые ?v= скрипты.
 */
(function () {
  'use strict';
  var EMBEDDED = (window.YAK_BUILD || '').toString();
  var KEY = 'yak_build_id';

  function nukeSw() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.getRegistrations) {
      return Promise.resolve();
    }
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
    }).catch(function () {});
  }

  function nukeCaches() {
    if (!window.caches || !caches.keys) return Promise.resolve();
    return caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }).catch(function () {});
  }

  function stampBuild(id) {
    if (!id || document.getElementById('yak-build-stamp')) return;
    var host =
      document.querySelector('.portal-footer .wrap') ||
      document.querySelector('.site-footer') ||
      document.querySelector('.side-user') ||
      null;
    if (!host) return;
    var el = document.createElement('p');
    el.id = 'yak-build-stamp';
    el.textContent = 'Сборка ' + id;
    el.className = 'build-stamp';
    host.appendChild(el);
  }

  function stampWhenReady(id) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { stampBuild(id); }, { once: true });
      return;
    }
    stampBuild(id);
  }

  function buildUrl() {
    try {
      return new URL('build.json', document.baseURI || location.href).href;
    } catch (e) {
      return 'build.json';
    }
  }

  function checkRemote() {
    var base = buildUrl();
    return fetch(base + (base.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var remote = j && j.id ? String(j.id) : '';
        if (!remote || remote === EMBEDDED) return;
        var flag = 'yak_reloaded_' + remote;
        try {
          if (sessionStorage.getItem(flag)) return;
          sessionStorage.setItem(flag, '1');
        } catch (e) {}
        try {
          var u = new URL(location.href);
          u.searchParams.set('v', remote);
          location.replace(u.toString());
        } catch (err) {
          location.replace(location.pathname + '?v=' + encodeURIComponent(remote) + location.hash);
        }
      })
      .catch(function () {});
  }

  Promise.all([nukeSw(), nukeCaches()]).then(function () {
    stampWhenReady(EMBEDDED);
    try { if (EMBEDDED) localStorage.setItem(KEY, EMBEDDED); } catch (e) {}
    return checkRemote();
  });
})();
