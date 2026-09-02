/**
 * HTTP-клиент к основному серверу Fides.
 * CORS: сервер отдаёт Access-Control-Allow-Origin: * — браузерные запросы с file:// /
 * localhost работают. Для админ-операций нужен заголовок x-admin-token.
 */
(function (global) {
  'use strict';

  function base() {
    return (global.AdminConfig && global.AdminConfig.API_BASE) || '';
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
    return fetch(base() + path, {
      method: 'GET',
      headers: headers(opts.headers, false),
      mode: 'cors',
      credentials: 'omit',
    }).then(parse);
  }

  function send(method, path, body, opts) {
    opts = opts || {};
    return fetch(base() + path, {
      method: method,
      headers: headers(opts.headers, true),
      mode: 'cors',
      credentials: 'omit',
      body: body == null ? undefined : JSON.stringify(body),
    }).then(parse);
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

  /** Batch upsert архива (нужен ADMIN_TOKEN) */
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

  global.AdminApi = {
    base: base,
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
    createNews: createNews,
    updateNews: updateNews,
    deleteNews: deleteNews,
    health: health,
  };
})(window);
