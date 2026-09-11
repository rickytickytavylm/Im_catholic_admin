/**
 * HTTP-клиент к основному серверу Fides.
 * CORS: сервер отдаёт Access-Control-Allow-Origin: * — браузерные запросы с file:// /
 * localhost работают. На время тестов сервер принимает запись без ключа.
 */
(function (global) {
  'use strict';

  function base() {
    return (global.AdminConfig && global.AdminConfig.API_BASE) || '';
  }

  function setBase(url) {
    url = String(url || '').replace(/\/$/, '');
    if (!url || !global.AdminConfig) return;
    global.AdminConfig.API_BASE = url;
    try { localStorage.setItem('yak_admin_api_override', url); } catch (e) {}
  }

  function candidates() {
    var list = [];
    var seen = {};
    function add(u) {
      u = String(u || '').replace(/\/$/, '');
      if (!u || seen[u]) return;
      seen[u] = 1;
      list.push(u);
    }
    add(base());
    ((global.AdminConfig && global.AdminConfig.API_FALLBACKS) || []).forEach(add);
    return list;
  }

  function probe(url) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 5000);
    return fetch(url + '/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      mode: 'cors',
      credentials: 'omit',
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return url;
    }).catch(function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  function showNetBanner(on) {
    var el = document.getElementById('net-banner');
    if (!el) return;
    el.hidden = !on;
    document.body.classList.toggle('net-down', !!on);
  }

  function connect() {
    if (connect._p) return connect._p;
    var list = candidates();
    connect._p = (function next(i) {
      if (i >= list.length) {
        connect.ok = false;
        showNetBanner(true);
        return Promise.resolve(base());
      }
      return probe(list[i]).then(function (url) {
        setBase(url);
        connect.ok = true;
        showNetBanner(false);
        return url;
      }).catch(function () {
        return next(i + 1);
      });
    })(0);
    return connect._p;
  }

  function ready() {
    return connect();
  }

  function token() {
    return (global.AdminConfig && global.AdminConfig.ADMIN_TOKEN) || '';
  }

  function headers(extra, asJson) {
    var h = Object.assign({ Accept: 'application/json' }, extra || {});
    if (asJson !== false) h['Content-Type'] = 'application/json';
    var t = token();
    if (t) h['x-admin-token'] = t;
    return h;
  }

  function parse(res) {
    return res.text().then(function (text) {
      var data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        data = { raw: text };
      }
      if (!res.ok) {
        var err = new Error((data && (data.error || data.message)) || 'HTTP ' + res.status);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    });
  }

  function get(path, opts) {
    opts = opts || {};
    return ready().then(function () {
      return fetch(base() + path, {
        method: 'GET',
        headers: headers(opts.headers, false),
        mode: 'cors',
        credentials: 'omit',
      }).then(parse);
    });
  }

  function send(method, path, body, opts) {
    opts = opts || {};
    return ready().then(function () {
      return fetch(base() + path, {
        method: method,
        headers: headers(opts.headers, true),
        mode: 'cors',
        credentials: 'omit',
        body: body == null ? undefined : JSON.stringify(body),
      }).then(parse);
    });
  }

  /** Публичные чтения архива (без токена тоже ок) */
  function getArticles(params) {
    params = params || {};
    var q = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(Math.min(params.limit || 20, 50)),
    });
    if (params.category) q.set('category', params.category);
    if (params.q) q.set('q', params.q);
    if (params.includeHidden) q.set('includeHidden', '1');
    return get('/api/archive/ruscatholic/articles?' + q);
  }

  function getArticle(id) {
    return get('/api/archive/ruscatholic/articles/' + encodeURIComponent(id)).then(function (pack) {
      return pack.article || pack;
    });
  }

  function getPages(params) {
    params = params || {};
    var q = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(Math.min(params.limit || 100, 100)),
    });
    if (params.q) q.set('q', params.q);
    return get('/api/archive/ruscatholic/pages?' + q);
  }

  function getPage(id) {
    return get('/api/archive/ruscatholic/pages/' + encodeURIComponent(id)).then(function (pack) {
      return pack.page || pack.article || pack;
    });
  }

  function getArchiveStats() {
    return get('/api/archive/ruscatholic/stats');
  }

  function getCategories() {
    return get('/api/archive/ruscatholic/categories');
  }

  function getContentNews() {
    return get('/api/content/news');
  }

  function getContentVideos() {
    return get('/api/content/videos');
  }

  function getAdminAnalytics() {
    return get('/api/admin/analytics/stats');
  }

  function getAdminEvents(params) {
    params = params || {};
    var q = new URLSearchParams({
      days: String(params.days || 7),
      limit: String(params.limit || 50),
    });
    if (params.type) q.set('type', params.type);
    return get('/api/admin/analytics/events?' + q);
  }

  function getAdminUsers(params) {
    params = params || {};
    var q = new URLSearchParams({
      limit: String(params.limit || 50),
      offset: String(params.offset || 0),
    });
    if (params.search) q.set('search', params.search);
    if (params.blocked != null) q.set('blocked', String(params.blocked));
    return get('/api/admin/users?' + q);
  }

  /** Batch upsert архива */
  function upsertArchive(payload) {
    return send('POST', '/api/admin/archive/ruscatholic/upsert', payload);
  }

  function createNews(payload) {
    return send('POST', '/api/admin/news', payload);
  }

  function updateNews(id, payload) {
    return send('PUT', '/api/admin/news/' + encodeURIComponent(id), payload);
  }

  function deleteNews(id) {
    return send('DELETE', '/api/admin/news/' + encodeURIComponent(id));
  }

  function health() {
    return get('/health').catch(function () {
      return get('/');
    });
  }

  connect();

  global.AdminApi = {
    base: base,
    setBase: setBase,
    connect: connect,
    token: token,
    get: get,
    post: function (p, b) { return send('POST', p, b); },
    put: function (p, b) { return send('PUT', p, b); },
    del: function (p) { return send('DELETE', p); },
    getArticles: getArticles,
    getArticle: getArticle,
    getPages: getPages,
    getPage: getPage,
    getArchiveStats: getArchiveStats,
    getCategories: getCategories,
    getContentNews: getContentNews,
    getContentVideos: getContentVideos,
    getAdminAnalytics: getAdminAnalytics,
    getAdminEvents: getAdminEvents,
    getAdminUsers: getAdminUsers,
    upsertArchive: upsertArchive,
    uploadMedia: function (body) { return send('POST', '/api/admin/media/upload', body); },
    createNews: createNews,
    updateNews: updateNews,
    deleteNews: deleteNews,
    health: health,
  };
})(window);
