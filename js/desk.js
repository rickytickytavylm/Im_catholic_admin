/**
 * Стол редакции: публикуем туда же, куда смотрит сайт.
 * Новости, статьи, афиша, аудио, видео, день Церкви.
 */
(function (global) {
  'use strict';

  var KEY = 'yak_desk';
  var PORTAL = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
  if (PORTAL.slice(-1) !== '/') PORTAL += '/';
  var seedPhotos = [];
  var seedLoaded = false;

  var BLOCKS = [
    { id: 'news', title: 'Новость', where: 'Новости', hint: 'Заголовок, лид, текст и обложка.', portal: 'archive.html?category=news' },
    { id: 'article', title: 'Статья', where: 'Статьи', hint: 'Заголовок, лид, текст и обложка.', portal: 'articles.html' },
    { id: 'event', title: 'Афиша', where: 'События', hint: 'Дата, организатор, фото и страница на сайте.', portal: 'events.html' },
    { id: 'audio', title: 'Аудио', where: 'Аудио', hint: 'Название, исполнитель и файл.', portal: 'audio.html' },
    { id: 'video', title: 'Видео', where: 'Видео', hint: 'Название, описание и ссылка.', portal: 'video.html' },
    { id: 'photo', title: 'Фото', where: 'Фотосток', hint: 'Снимок и теги.', portal: 'photostock.html' },
    { id: 'library', title: 'Книга', where: 'Библиотека', hint: 'Карточка, файл и текст на странице.', portal: 'library.html' },
    { id: 'church-day', title: 'День Церкви', where: 'Календарь', hint: 'Святой, чтение и молитва.', portal: 'calendar.html' },
  ];

  var NEWS_CATS = [
    { id: 'news', title: 'Новости' },
    { id: 'church-rus', title: 'Россия' },
    { id: 'sng', title: 'В мире' },
    { id: 'santa-sede', title: 'Святой Престол' },
  ];

  var ARTICLE_CATS = [
    { id: 'columns', title: 'Статьи' },
    { id: 'spirituality', title: 'Духовность' },
    { id: 'obraz-zhizni', title: 'Образ жизни' },
    { id: 'kultura', title: 'Культура' },
    { id: 'history', title: 'История' },
    { id: 'biografii', title: 'Биографии' },
    { id: 'saints', title: 'Святые' },
    { id: 'bible', title: 'Библеистика' },
    { id: 'liturgy', title: 'Литургика' },
    { id: 'music', title: 'Музыка' },
    { id: 'puteshestviya', title: 'Путешествия' },
  ];

  var VOICE_CATS = [
    { id: 'interview', title: 'Интервью' },
    { id: 'svidetelstva', title: 'Свидетельства' },
    { id: 'propovedi', title: 'Проповеди' },
  ];

  function articleCats() {
    var extra = listTopics().filter(function (t) {
      return t.slug && t.slug !== 'voices' && t.slug !== 'news' && t.slug !== 'digest';
    }).map(function (t) {
      return { id: t.slug, title: t.title };
    });
    var seen = {};
    ARTICLE_CATS.forEach(function (c) { seen[c.id] = 1; });
    VOICE_CATS.forEach(function (c) { seen[c.id] = 1; });
    return ARTICLE_CATS.concat(extra.filter(function (c) {
      if (seen[c.id]) return false;
      seen[c.id] = 1;
      return true;
    }));
  }

  var EVENT_CATS = [
    { id: 'concert', title: 'Концерт' },
    { id: 'meeting', title: 'Встреча' },
    { id: 'lecture', title: 'Лекция' },
    { id: 'pilgrimage', title: 'Паломничество' },
    { id: 'retreat', title: 'Реколлекции' },
    { id: 'charity', title: 'Благотворительность' },
  ];

  function emptyState() {
    return { articles: [], events: [], audio: [], video: [], churchDays: [], authors: [], organizers: [], hiddenSlugs: [], guides: [], authorLinks: [], photographers: [], videoChannels: [], cycles: [], topics: [], libraryItems: [], libraryRubrics: [], libraryThemes: [], podcasts: [], home: null, about: null };
  }

  var archiveCache = { news: [], article: [] };

  function numericIdOf(value) {
    var n = parseInt(value, 10);
    return String(n) === String(value) && n > 0 && n < 2147483647 ? n : 0;
  }

  function collapseArticles(list) {
    var byKey = {};
    var order = [];
    (list || []).forEach(function (a) {
      if (!a) return;
      var key = String(a.slug || a.id || '').toLowerCase();
      if (!key) return;
      if (!byKey[key]) {
        byKey[key] = a;
        order.push(key);
        return;
      }
      var prev = byKey[key];
      var newer = String(a.updatedAt || a.date || '') >= String(prev.updatedAt || prev.date || '') ? a : prev;
      var older = newer === a ? prev : a;
      var keepId = numericIdOf(newer.id) || numericIdOf(older.id) || newer.id;
      newer.id = keepId;
      if (!httpUrl(newer.cover || newer.image) && httpUrl(older.cover || older.image)) {
        newer.cover = older.cover || older.image;
        newer.image = newer.cover;
      }
      if (!newer.imageOriginal && older.imageOriginal) newer.imageOriginal = older.imageOriginal;
      byKey[key] = newer;
    });
    return order.map(function (k) { return byKey[k]; });
  }

  function httpUrl(value) {
    return value && /^https?:\/\//i.test(value) ? value : '';
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      data = Object.assign(emptyState(), data || {});
      if (data.articles && data.articles.length) data.articles = collapseArticles(data.articles);
      return data;
    } catch (e) {
      return emptyState();
    }
  }

  function isQuota(err) {
    return !!(err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22));
  }

  function stripHeavy(rec, hard) {
    if (!rec || typeof rec !== 'object') return;
    ['cover', 'image', 'photo'].forEach(function (f) {
      if (typeof rec[f] === 'string' && rec[f].indexOf('data:') === 0) rec[f] = '';
    });
    if (typeof rec.contentHtml === 'string') {
      rec.contentHtml = rec.contentHtml.replace(/\ssrc="data:[^"]+"/gi, '');
    }
    if (hard && typeof rec.body === 'string' && rec.body.length > 4000) rec.body = rec.body.slice(0, 4000);
  }

  function compactDesk(data, keepId, hard) {
    Object.keys(emptyState()).forEach(function (key) {
      var list = data[key];
      if (!Array.isArray(list)) return;
      list.forEach(function (rec) {
        if (!rec || typeof rec !== 'object') return;
        var keep = keepId && (String(rec.id) === String(keepId) || String(rec.slug || '') === String(keepId));
        if (keep && !hard) return;
        stripHeavy(rec, hard);
      });
    });
  }

  function deskBytes() {
    try { return (localStorage.getItem(KEY) || '').length; } catch (e) { return 0; }
  }

  function paintDeskBanner() {
    var el = document.getElementById('desk-banner');
    if (!el) return;
    el.hidden = deskBytes() < 3.5 * 1024 * 1024;
  }

  function write(data, keepId) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      paintDeskBanner();
      return;
    } catch (e) {
      if (!isQuota(e)) throw e;
    }
    compactDesk(data, keepId, false);
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      paintDeskBanner();
      return;
    } catch (e2) {
      if (!isQuota(e2)) throw e2;
    }
    compactDesk(data, keepId, true);
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      paintDeskBanner();
    } catch (e3) {
      paintDeskBanner();
      throw new Error('Браузер переполнен. Не очищайте сайт: сначала опубликуйте циклы с этого компьютера, чтобы они ушли на сервер.');
    }
  }

  function shrinkImage(dataUrl, maxSide, quality, done) {
    if (!dataUrl || dataUrl.indexOf('data:image') !== 0) {
      done(dataUrl);
      return;
    }
    var img = new Image();
    img.onload = function () {
      var w = img.width || 1;
      var h = img.height || 1;
      var scale = Math.min(1, (maxSide || 1200) / Math.max(w, h));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        done(canvas.toDataURL('image/jpeg', quality || 0.74));
      } catch (e) {
        done(dataUrl);
      }
    };
    img.onerror = function () { done(dataUrl); };
    img.src = dataUrl;
  }

  function uid(prefix) {
    return (prefix || 'desk') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function pubDate(value, fallback) {
    var s = String(value || '').trim();
    var iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
    var ru = s.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
    if (ru) return ru[3] + '-' + pad2(Number(ru[2])) + '-' + pad2(Number(ru[1]));
    return fallback || '';
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function mediaSrc(url) {
    if (!url) return '';
    if (/^(https?:|data:|blob:|\.\.\/|\/)/i.test(url)) return url;
    return PORTAL + url.replace(/^\//, '');
  }

  function portalHref(path) {
    return PORTAL + path;
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function builtinPhotos() {
    var out = [];
    for (var i = 1; i <= 95; i++) {
      if (i === 30) continue;
      var n = (i < 10 ? '0' : '') + i;
      out.push({
        id: 'seed_ps_' + i,
        url: 'assets/photostock/ps-' + n + '.jpg',
        thumb: 'assets/photostock/ps-' + n + '.jpg',
        tags: ['фотосток'],
        photographerName: 'Ольга Фотограф',
        status: 'approved',
        kind: 'image',
        title: 'Снимок ' + n,
      });
    }
    return out;
  }

  function loadSeed(done) {
    if (!seedPhotos.length) seedPhotos = builtinPhotos();
    if (seedLoaded) {
      if (done) done(seedPhotos);
      return;
    }
    seedLoaded = true;
    if (done) done(seedPhotos);
    fetch(PORTAL + 'assets/photostock/seed.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (seed) {
        if (!seed || !seed.photos || !seed.photos.length) return;
        seedPhotos = seed.photos.map(function (p) {
          return Object.assign({ kind: 'image', status: 'approved', title: (p.tags || []).slice(0, 2).join(', ') }, p);
        });
        if (done) done(seedPhotos);
      });
  }

  function allPhotos() {
    var local = (AdminStore.listPhotos() || []).filter(function (p) { return p.url; });
    var ids = {};
    local.forEach(function (p) { ids[p.id] = 1; });
    return seedPhotos.filter(function (p) { return !ids[p.id]; }).concat(local);
  }

  function blockById(id) {
    return BLOCKS.filter(function (b) { return b.id === id; })[0] || null;
  }

  function listOf(type) {
    var data = read();
    if (type === 'news') return data.articles.filter(function (a) { return a.kind === 'news'; });
    if (type === 'article') return data.articles.filter(function (a) { return a.kind !== 'news'; });
    if (type === 'event') return data.events;
    if (type === 'audio') return data.audio;
    if (type === 'video') return data.video;
    if (type === 'church-day') return data.churchDays;
    if (type === 'authors') return data.authors || [];
    if (type === 'organizer') return data.organizers || [];
    if (type === 'cycle') return data.cycles || [];
    return [];
  }

  function siteItems(type) {
    if (type === 'event' && window.YakAfisha) {
      return (YakAfisha.EVENTS || []).map(function (e) {
        return Object.assign({ status: 'published', source: 'site' }, e);
      });
    }
    if (type === 'video' && window.YakVideos) {
      return (YakVideos.items || []).map(function (v) {
        return Object.assign({ status: 'published', source: 'site' }, v);
      });
    }
    if (type === 'audio' && window.YakAudio) {
      return (YakAudio.tracks || []).map(function (t) {
        return Object.assign({ status: 'published', source: 'site', audioUrl: t.url || t.audioUrl }, t);
      });
    }
    if (type === 'church-day' && window.YakCalendar) {
      return (YakCalendar.DAYS || []).map(function (d) {
        return Object.assign({
          id: d.date,
          status: 'published',
          source: 'site',
          title: (d.liturgical && d.liturgical.title) || d.weekday || d.date,
        }, d);
      });
    }
    if (type === 'authors' && window.YakAuthors) {
      return (YakAuthors || []).map(function (a) {
        return Object.assign({ status: 'published', source: 'site', id: a.slug }, a);
      });
    }
    if (type === 'cycle') {
      return ((window.YakCycles && YakCycles.ALL) || []).map(function (c) {
        return Object.assign({ status: 'published', source: 'site' }, c);
      });
    }
    if (type === 'organizer' && window.YakAfisha) {
      return (YakAfisha.ORGANIZERS || []).map(function (o) {
        return Object.assign({ status: 'published', source: 'site' }, o);
      });
    }
    return [];
  }

  function authorWorkItems(q) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return [];
    var hidden = hiddenSlugSet();
    var out = [];
    (window.YakAuthors || []).forEach(function (a) {
      (a.recent || []).forEach(function (p) {
        if (!p || !p.slug) return;
        if (hidden[String(p.slug)]) return;
        var item = {
          id: p.slug,
          slug: p.slug,
          title: p.title || p.slug,
          excerpt: p.excerpt || '',
          date: p.date || '',
          author: a.name || '',
          authorSlug: a.slug,
          kind: 'article',
          status: 'published',
          source: 'author-work',
        };
        if (q) {
          var hay = ((item.title || '') + ' ' + (item.slug || '') + ' ' + (item.author || '') + ' ' + (item.excerpt || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return;
        }
        out.push(item);
      });
    });
    return out;
  }

  function hiddenSlugSet() {
    var set = {};
    (read().hiddenSlugs || []).forEach(function (s) {
      if (s) set[String(s)] = 1;
    });
    return set;
  }

  function mergedList(type, q) {
    q = String(q || '').trim().toLowerCase();
    var byId = {};
    var site = (type === 'news' || type === 'article') ? (archiveCache[type] || []) : siteItems(type);
    if (type === 'article') {
      authorWorkItems(q).forEach(function (x) {
        if (x && x.id != null && x.id !== '') byId[String(x.id)] = x;
      });
    }
    site.forEach(function (x) {
      if (x && x.id != null && x.id !== '') byId[String(x.id)] = x;
    });
    listOf(type).forEach(function (x) {
      if (!x || x.id == null) return;
      var cur = byId[String(x.id)] || (x.slug && byId[String(x.slug)]) || {};
      var merged = Object.assign({}, cur, x);
      byId[String(merged.id)] = merged;
      if (merged.slug) byId[String(merged.slug)] = merged;
    });
    var seen = {};
    return Object.keys(byId).map(function (k) { return byId[k]; }).filter(function (x) {
      var key = String(x.slug || x.id);
      if (seen[key]) return false;
      seen[key] = 1;
      if (q) {
        var hits = (type === 'news' || type === 'article') ? (archiveCache[type] || []) : [];
        var fromServer = hits.some(function (a) {
          return String(a.id) === String(x.id) || (x.slug && a.slug && a.slug === x.slug);
        });
        if (!fromServer) {
          var hay = ((x.title || '') + ' ' + (x.excerpt || '') + ' ' + (x.author || '') + ' ' + (x.slug || '') + ' ' + (x.id || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
      }
      return true;
    }).sort(function (a, b) {
      /* Только дата публикации — правки не должны поднимать материал наверх */
      var da = String(a.date || a.createdAt || '').slice(0, 10);
      var db = String(b.date || b.createdAt || '').slice(0, 10);
      return db.localeCompare(da);
    });
  }

  function deskRecord(type, id) {
    id = String(id || '');
    var list = listOf(type);
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if (String(x.id) === id || String(x.slug || '') === id || String(x.date || '') === id) return x;
    }
    return null;
  }

  function getItem(type, id) {
    id = String(id || '');
    var saved = deskRecord(type, id);
    if (saved) return saved;
    var list = mergedList(type);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id || list[i].date === id || list[i].slug === id) return list[i];
    }
    return null;
  }

  function mapArchive(a, type) {
    var slugs = (a.categorySlugs || []).slice();
    if (!slugs.length && a.categories && a.categories[0]) {
      var first = a.categories[0];
      slugs = [typeof first === 'string' ? first : (first.slug || '')];
    }
    slugs = slugs.filter(Boolean);
    var isPage = a.kind === 'page';
    if (!slugs.length) slugs = [type === 'news' ? 'news' : (isPage ? 'page' : 'columns')];
    return {
      id: String(a.id || a.slug || ''),
      slug: a.slug || '',
      kind: type === 'news' ? 'news' : (isPage ? 'page' : 'article'),
      title: a.title || '',
      excerpt: a.excerpt || '',
      excerptHtml: a.excerptHtml || (hasMarkup(a.excerpt) ? a.excerpt : ''),
      body: a.contentText || a.content || '',
      contentHtml: a.contentHtml || '',
      cover: a.image || a.cover || '',
      image: a.image || a.cover || '',
      date: pubDate(a.date, ''),
      author: a.author || '',
      authorSlug: a.authorSlug || '',
      authorSlugs: a.authorSlugs || (a.authorSlug ? [a.authorSlug] : []),
      category: slugs[0],
      rubrics: slugs,
      cycleSlug: a.cycleSlug || a.cycle_slug || '',
      cycleOrder: a.cycleOrder || a.cycle_order || 0,
      status: 'published',
      source: 'site',
    };
  }

  /* Архив на сервере отдаёт по 50 материалов за запрос. Держим постраничное
     состояние, чтобы в списке можно было дойти до самых старых публикаций. */
  var PAGE = 50;
  var archiveState = { news: null, article: null };

  function stateOf(type) {
    if (!archiveState[type]) archiveState[type] = { q: '', page: 0, total: null, loading: false, error: false };
    return archiveState[type];
  }

  function archiveInfo(type) {
    var st = stateOf(type);
    var loaded = (archiveCache[type] || []).length;
    return {
      q: st.q,
      loaded: loaded,
      total: st.total,
      loading: st.loading,
      error: st.error,
      hasMore: st.total == null ? loaded === 0 || loaded >= st.page * PAGE : loaded < st.total,
    };
  }

  function mergePacks(packs) {
    var items = [];
    var total = 0;
    (packs || []).forEach(function (pack) {
      items = items.concat((pack && pack.items) || []);
      total += Number((pack && pack.total) || 0) || 0;
    });
    return { items: items, total: total };
  }

  function fetchArchivePage(type, page, q) {
    q = String(q || '').trim();
    if (type === 'news') {
      return AdminApi.getArticles({ category: 'news', q: q, limit: PAGE, page: page });
    }
    if (q) {
      return AdminApi.getArticles({ q: q, limit: PAGE, page: page });
    }
    return AdminApi.getArticles({ category: 'desk', q: '', limit: PAGE, page: page }).then(function (pack) {
      if (pack && pack.items && pack.items.length) return pack;
      return Promise.all([
        AdminApi.getArticles({ category: 'columns', limit: PAGE, page: page }),
        AdminApi.getArticles({ category: 'voices', limit: PAGE, page: page }),
      ]).then(mergePacks);
    });
  }

  function mergeArchive(type, items) {
    var byId = {};
    (archiveCache[type] || []).forEach(function (x) { byId[String(x.id)] = x; });
    items.forEach(function (x) { byId[String(x.id)] = x; });
    archiveCache[type] = Object.keys(byId).map(function (k) { return byId[k]; });
  }

  /* opts.q — новый поиск (сброс), opts.more — следующая страница, opts.all — до конца. */
  function loadArchive(type, done, opts) {
    opts = opts || {};
    done = done || function () {};
    if (!window.AdminApi || !AdminApi.getArticles) {
      done([]);
      return;
    }
    var st = stateOf(type);
    st.waiters = st.waiters || [];
    st.seq = st.seq || 0;
    var q = opts.q != null ? String(opts.q).trim() : st.q;
    if (q !== st.q) {
      /* Новый поиск: сбрасываем кеш, ответ старого запроса будет проигнорирован */
      st.q = q;
      st.page = 0;
      st.total = null;
      st.seq++;
      st.loading = false;
      archiveCache[type] = [];
    }
    if (st.loading) {
      /* Запрос уже в пути — отрисуем всех, кто ждёт, когда он вернётся */
      st.waiters.push(done);
      return;
    }
    if (!opts.more && !opts.all && st.page > 0) {
      done(archiveCache[type]);
      return;
    }
    st.loading = true;
    st.error = false;
    var seq = st.seq;
    var nextPage = st.page + 1;
    function finish() {
      var list = archiveCache[type] || [];
      var w = st.waiters.splice(0);
      done(list);
      w.forEach(function (fn) { try { fn(list); } catch (e) { /* noop */ } });
    }
    var req = { q: st.q || '', limit: PAGE, page: nextPage, includeHidden: true };
    if (type === 'news') req.category = 'news';
    else if (st.q) req.category = '';
    else req.category = 'desk';
    function applyPack(pack) {
      if (seq !== st.seq) return;
      var items = ((pack && pack.items) || []).map(function (a) { return mapArchive(a, type); });
      if (type === 'article' && st.q) items = items.concat(authorWorkItems(st.q));
      st.page = nextPage;
      mergeArchive(type, items);
      var total = pack && pack.total != null ? Number(pack.total) : NaN;
      if (isFinite(total) && total >= 0) st.total = total;
        if (items.length < PAGE) st.total = archiveCache[type].length;
        st.loading = false;
        var more = items.length >= PAGE && (st.total == null || archiveCache[type].length < st.total);
      if (opts.all && more && nextPage < 200) {
        finish();
        loadArchive(type, done, { all: true });
        return;
      }
      finish();
    }
    function fetchDeskPack() {
      var arts = AdminApi.getArticles(req);
      if (type === 'article' && st.q && AdminApi.getPages) {
        arts = Promise.all([
          AdminApi.getArticles(req),
          AdminApi.getPages({ q: st.q, limit: PAGE, page: nextPage }).catch(function () { return { items: [] }; }),
        ]).then(function (pair) {
          var a = pair[0] || {};
          var p = pair[1] || {};
          var pageItems = (p.items || p.pages || []).map(function (x) {
            return Object.assign({}, x, { kind: 'page' });
          });
          return {
            items: (a.items || []).concat(pageItems),
            total: Number(a.total || 0) + Number(p.total || pageItems.length || 0),
          };
        });
      }
      var exact = !st.q ? Promise.resolve(null) : Promise.resolve()
        .then(function () { return AdminApi.getArticle(st.q); })
        .catch(function () { return AdminApi.getPage ? AdminApi.getPage(st.q) : null; })
        .catch(function () { return null; });
      return Promise.all([arts, exact]).then(function (pair) {
        var pack = pair[0] || {};
        var one = pair[1];
        if (one && (one.title || one.slug)) {
          pack = {
            items: [one].concat(pack.items || []),
            total: Number(pack.total || 0) + 1,
          };
        }
        var got = ((pack && pack.items) || []).length;
        if (type === 'article' && !st.q && req.category === 'desk' && nextPage === 1 && !got) {
          return Promise.all([
            AdminApi.getArticles({ category: 'columns', limit: PAGE, page: 1 }),
            AdminApi.getArticles({ category: 'voices', limit: PAGE, page: 1 }),
          ]).then(function (packs) {
            var items = [];
            var total = 0;
            packs.forEach(function (p) {
              items = items.concat((p && p.items) || []);
              total += Number((p && p.total) || 0) || 0;
            });
            return { items: items, total: total };
          });
        }
        return pack;
      });
    }
    fetchDeskPack()
      .then(function (pack) {
        if (seq !== st.seq) return;
        applyPack(pack);
      })
      .catch(function () {
        if (seq !== st.seq) return;
        st.loading = false;
        st.error = true;
        finish();
      });
  }

  function hideItem(type, id) {
    var item = getItem(type, id) || { id: id, slug: id };
    upsert(type, Object.assign({}, item, { status: 'hidden' }));
  }

  function upsert(type, item) {
    var data = read();
    var key = type === 'news' || type === 'article' ? 'articles'
      : type === 'event' ? 'events'
      : type === 'audio' ? 'audio'
      : type === 'video' ? 'video'
      : type === 'authors' ? 'authors'
      : type === 'organizer' ? 'organizers'
      : type === 'guides' ? 'guides'
      : type === 'cycle' ? 'cycles'
      : 'churchDays';
    var list = data[key] || [];
    item.updatedAt = new Date().toISOString();
    if (!item.createdAt) item.createdAt = item.updatedAt;
    var i = list.findIndex(function (x) {
      if (String(x.id) === String(item.id)) return true;
      if (item.slug && x.slug && String(x.slug) === String(item.slug) && (key === 'articles' || key === 'authors' || key === 'cycles' || key === 'organizers')) return true;
      return false;
    });
    list = list.filter(function (x, idx) {
      if (idx === i) return true;
      if (String(x.id) === String(item.id)) return false;
      if (item.slug && x.slug && String(x.slug) === String(item.slug) && (key === 'articles' || key === 'authors')) return false;
      if (item._prevDeskId && String(x.id) === String(item._prevDeskId)) return false;
      return true;
    });
    i = list.findIndex(function (x) { return String(x.id) === String(item.id) || (item.slug && x.slug && String(x.slug) === String(item.slug)); });
    if (i === -1) list.unshift(item);
    else list[i] = Object.assign({}, list[i], item);
    data[key] = list;
    write(data, item.id || item.slug);
    return item;
  }

  function remove(type, id) {
    var data = read();
    var key = type === 'news' || type === 'article' ? 'articles'
      : type === 'event' ? 'events'
      : type === 'audio' ? 'audio'
      : type === 'video' ? 'video'
      : type === 'authors' ? 'authors'
      : type === 'organizer' ? 'organizers'
      : type === 'guides' ? 'guides'
      : type === 'cycle' ? 'cycles'
      : 'churchDays';
    data[key] = (data[key] || []).filter(function (x) { return String(x.id) !== String(id); });
    write(data, id);
  }

  function renderHub(ctx) {
    if (window.AdminGod) AdminGod.paintHome(ctx);
    else ctx.viewEl.innerHTML = '<div class="panel"><div class="empty">Не удалось загрузить обзор.</div></div>';
  }

  function emptyRow(text) {
    return '<div class="empty">' + text + '</div>';
  }

  function statusBadge(status) {
    var on = status === 'published';
    return '<span class="badge ' + (on ? 'ok' : 'muted') + '">' + (on ? 'Опубликовано' : 'Черновик') + '</span>';
  }

  function renderList(type, ctx) {
    var viewEl = ctx.viewEl;
    var meta = {
      news: { title: 'Новости', add: 'Новость', route: 'news' },
      article: { title: 'Статьи', add: 'Статью', route: 'articles' },
      event: { title: 'Афиша', add: 'Событие', route: 'afisha' },
      audio: { title: 'Аудио', add: 'Аудио', route: 'audio' },
      video: { title: 'Видео', add: 'Видео', route: 'video' },
      'church-day': { title: 'День Церкви', add: 'День', route: 'church-day' },
    }[type];
    if (window.AdminGod) {
      AdminGod.paintSection(ctx, type, meta.title, '#' + meta.route + '/new');
      return;
    }
    ctx.viewEl.innerHTML = emptyRow('Не удалось загрузить раздел.');
  }

  function field(label, id, value, type, extra) {
    extra = extra || '';
    if (type === 'textarea') {
      return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
        '<textarea class="textarea" id="' + id + '" rows="6" ' + extra + '>' + esc(value || '') + '</textarea></div>';
    }
    if (type === 'select') {
      return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
        '<select class="select" id="' + id + '">' + extra + '</select></div>';
    }
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
      '<input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value || '') + '" ' + extra + ' /></div>';
  }

  function opts(list, selected) {
    return list.map(function (x) {
      return '<option value="' + esc(x.id) + '"' + (x.id === selected ? ' selected' : '') + '>' + esc(x.title) + '</option>';
    }).join('');
  }

  function composeShell(ctx, title, back, body, onSave, onPublish, onDelete, portal) {
    var viewEl = ctx.viewEl;
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(title) + '</h1></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost btn-back" href="#' + back + '">← Назад</a>' +
      (portal ? '<a class="btn btn-ghost" href="' + portalHref(portal) + '" target="_blank" rel="noopener">На портале</a>' : '') +
      (onDelete ? '<button type="button" class="btn btn-ghost" id="desk-del">Снять</button>' : '') +
      '<button type="button" class="btn btn-ghost" id="desk-draft">Сохранить</button>' +
      '<button type="button" class="btn btn-primary" id="desk-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="panel form-grid desk-form">' + body + '</div>';
    document.getElementById('desk-draft').onclick = function () {
      try { onSave('draft'); } catch (e) { ctx.toast(e.message || 'Не удалось сохранить', true); }
    };
    document.getElementById('desk-pub').onclick = function () {
      try { onPublish(); } catch (e) { ctx.toast(e.message || 'Не удалось опубликовать', true); }
    };
    if (onDelete) document.getElementById('desk-del').onclick = onDelete;
  }

  function articleHtml(item) {
    var html = item.contentHtml || '';
    if (html && /<[a-z][\s\S]*>/i.test(html)) return html;
    var text = item.body || html || '';
    if (!text) return '<p></p>';
    return String(text).split(/\n\n+/).map(function (p) {
      return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function htmlToText(html) {
    var n = document.createElement('div');
    n.innerHTML = html || '';
    return (n.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function hasMarkup(s) {
    return /<[a-z][\s\S]*>/i.test(String(s || ''));
  }

  function sanitizeLead(html) {
    var box = document.createElement('div');
    box.innerHTML = html || '';
    box.querySelectorAll('script,style,iframe,object,img,video,figure,svg').forEach(function (n) { n.remove(); });
    var allow = { a: 1, em: 1, i: 1, strong: 1, b: 1, u: 1, br: 1, p: 1, span: 1 };
    [].slice.call(box.querySelectorAll('*')).forEach(function (n) {
      var tag = n.tagName.toLowerCase();
      if (!allow[tag]) {
        while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
        n.parentNode.removeChild(n);
        return;
      }
      if (tag !== 'a') {
        [].slice.call(n.attributes).forEach(function (attr) { n.removeAttribute(attr.name); });
        return;
      }
      var href = n.getAttribute('href') || '';
      [].slice.call(n.attributes).forEach(function (attr) {
        if (attr.name !== 'href') n.removeAttribute(attr.name);
      });
      if (!href || /^\s*(javascript|data):/i.test(href)) n.removeAttribute('href');
      else {
        n.setAttribute('href', href);
        n.setAttribute('target', '_blank');
        n.setAttribute('rel', 'noopener noreferrer');
      }
    });
    return box.innerHTML;
  }

  function linkifyPlain(text) {
    return esc(text)
      .replace(/\n+/g, '<br>')
      .replace(/(https?:\/\/[^\s<&]+|www\.[^\s<&]+)/gi, function (raw) {
        var href = raw.indexOf('www.') === 0 ? 'https://' + raw : raw;
        return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + raw + '</a>';
      });
  }

  function excerptToEditorHtml(item) {
    var html = item.excerptHtml || '';
    if (!html && hasMarkup(item.excerpt)) html = item.excerpt;
    if (html) return sanitizeLead(html);
    return item.excerpt ? esc(item.excerpt) : '';
  }

  function leadHtml() {
    var el = document.getElementById('d-excerpt');
    return el ? sanitizeLead(el.innerHTML || '') : '';
  }

  function bioToEditorHtml(bio) {
    if (!bio) return '';
    if (hasMarkup(bio)) return sanitizeLead(bio);
    var parts = String(bio).split(/\n\s*\n/);
    if (parts.length === 1 && /\n/.test(bio)) parts = String(bio).split(/\n/);
    return parts.map(function (p) {
      var t = String(p || '').trim();
      return t ? '<p>' + linkifyPlain(t) + '</p>' : '';
    }).join('');
  }

  function bioHtml() {
    var el = document.getElementById('d-bio');
    if (!el) return '';
    var box = document.createElement('div');
    box.innerHTML = el.innerHTML || '';
    box.querySelectorAll('div').forEach(function (d) {
      var p = document.createElement('p');
      while (d.firstChild) p.appendChild(d.firstChild);
      d.parentNode.replaceChild(p, d);
    });
    return sanitizeLead(box.innerHTML);
  }

  function openArchiveForm(ctx, type, id, renderFn) {
    var desk = deskRecord(type, id);
    var cached = desk || getItem(type, id);
    var hasText = cached && (cached.body || cached.contentHtml);
    ctx.viewEl.innerHTML = '<div class="yak-loading yak-loading--page" role="status"><span class="yak-spin" aria-hidden="true"></span><span>Открываю материал…</span></div>';
    if (!window.AdminApi || !AdminApi.getArticle) {
      if (cached) renderFn(cached);
      else ctx.go(type === 'news' ? 'news' : 'articles');
      return;
    }
    var load = AdminApi.getArticle(id).catch(function () {
      return AdminApi.getPage ? AdminApi.getPage(id) : Promise.reject(new Error('empty'));
    });
    load.then(function (a) {
      if (!a || !a.title) throw new Error('empty');
      var mapped = mapArchive(a, type);
      if (desk) mapped = Object.assign({}, mapped, desk, { source: 'desk' });
      archiveCache[type] = (archiveCache[type] || []).filter(function (x) {
        return String(x.id) !== String(mapped.id);
      }).concat([mapped]);
      renderFn(mapped);
    }).catch(function () {
      if (hasText) {
        renderFn(desk || cached);
        return;
      }
      ctx.toast('Не удалось открыть материал', true);
      ctx.go(type === 'news' ? 'news' : 'articles');
    });
  }

  function renderNewsForm(ctx, id) {
    var isNew = !id || id === 'new';
    if (isNew) {
      paintPublicationForm(ctx, { id: uid('news'), kind: 'news', category: 'news', date: todayIso(), status: 'draft' }, true, 'news');
      return;
    }
    openArchiveForm(ctx, 'news', id, function (item) { paintPublicationForm(ctx, item, false, 'news'); });
  }

  function renderArticleForm(ctx, id) {
    var isNew = !id || id === 'new';
    if (isNew) {
      paintPublicationForm(ctx, { id: uid('art'), kind: 'article', category: 'columns', date: todayIso(), status: 'draft' }, true, 'article');
      return;
    }
    openArchiveForm(ctx, 'article', id, function (item) { paintPublicationForm(ctx, item, false, 'article'); });
  }

  function genitiveFirst(w) {
    if (/ий$/i.test(w)) return w.replace(/ий$/i, 'ия');
    if (/[аео]й$/i.test(w)) return w.replace(/й$/i, 'я');
    if (/а$/i.test(w)) return /[гкхжшщч]$/i.test(w.slice(0, -1)) ? w.slice(0, -1) + 'и' : w.slice(0, -1) + 'ы';
    if (/я$/i.test(w)) return w.slice(0, -1) + 'и';
    if (/ь$/i.test(w)) return w.slice(0, -1) + 'я';
    if (/[бвгджзклмнпрстфхцчшщ]$/i.test(w)) return w + 'а';
    return w;
  }

  function genitiveLast(w) {
    if (/ский$|цкий$/i.test(w)) return w.replace(/ий$/i, 'ого');
    if (/ой$|ый$|ий$/i.test(w)) return w.replace(/(ой|ый|ий)$/i, 'ого');
    if (/ова$|ева$|ина$|ына$/i.test(w)) return w.slice(0, -1) + 'ой';
    if (/ая$/i.test(w)) return w.replace(/ая$/i, 'ой');
    if (/[ое]в$|[иы]н$/i.test(w)) return w + 'а';
    return w;
  }

  function genitiveName(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return genitiveLast(parts[0]);
    return parts.map(function (w, i) {
      return i === parts.length - 1 ? genitiveLast(w) : genitiveFirst(w);
    }).join(' ');
  }

  function slugify(s) {
    if (window.AdminStore && AdminStore.slugify) return AdminStore.slugify(s);
    return String(s || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
  }

  function catalogAuthors() {
    var out = [];
    var seen = {};
    function add(a) {
      if (!a) return;
      var slug = a.slug || a.id;
      var name = a.name || '';
      if (!slug && !name) return;
      var key = String(slug || name).toLowerCase();
      if (seen[key]) {
        var i = seen[key] - 1;
        out[i] = Object.assign({}, out[i], a, { slug: out[i].slug || slug, name: out[i].name || name });
        return;
      }
      seen[key] = out.length + 1;
      out.push({ slug: slug, name: name, photo: a.photo || '', role: a.role || '' });
    }
    (window.YakAuthors || []).forEach(add);
    (read().authors || []).forEach(add);
    return out.sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name), 'ru');
    });
  }

  function findAuthor(tag) {
    tag = String(tag || '').trim().toLowerCase();
    if (!tag) return null;
    var list = catalogAuthors();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].slug).toLowerCase() === tag || String(list[i].name).toLowerCase() === tag) return list[i];
    }
    return null;
  }

  function selectedRubrics() {
    return [].map.call(document.querySelectorAll('.d-rubric:checked'), function (el) { return el.value; });
  }

  function rubricTitle(id) {
    var all = NEWS_CATS.concat(articleCats()).concat(VOICE_CATS);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].title;
    return id;
  }

  function ensureNumericId(item) {
    var n = numericIdOf(item.id) || numericIdOf(item.archiveId);
    if (n) {
      if (String(item.id) !== String(n)) item._prevDeskId = item.id;
      item.id = n;
      item.archiveId = n;
      return n;
    }
    var minted = 2000000000 + (Date.now() % 100000000);
    item._prevDeskId = item.id;
    item.id = minted;
    item.archiveId = minted;
    return minted;
  }

  function httpCover(item) {
    return httpUrl(item.cover) || httpUrl(item.image) || httpUrl(item.imageOriginal) || '';
  }

  function uploadDataUrl(dataUrl, folder) {
    if (!dataUrl || dataUrl.indexOf('data:') !== 0) return Promise.resolve(dataUrl || '');
    if (!window.AdminApi || !AdminApi.uploadMedia) {
      return Promise.reject(new Error('нет соединения с сервером — фото останется только в этом браузере'));
    }
    return AdminApi.uploadMedia({ dataUrl: dataUrl, folder: folder || 'covers' }).then(function (pack) {
      if (!pack || !pack.url) throw new Error('сервер не вернул ссылку на фото');
      return pack.url;
    });
  }

  function putFile(url, file, headers, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      Object.keys(headers || {}).forEach(function (k) {
        if (headers[k]) xhr.setRequestHeader(k, headers[k]);
      });
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('бакет не принял файл (' + xhr.status + ')'));
      };
      xhr.onerror = function () { reject(new Error('не удалось отправить файл в бакет')); };
      xhr.send(file);
    });
  }

  function uploadBlob(file, folder, onProgress) {
    if (!file) return Promise.reject(new Error('нет файла'));
    if (!window.AdminApi || !AdminApi.signMedia) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return AdminApi.signMedia({
      folder: folder || 'covers',
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    }).then(function (pack) {
      if (!pack || !pack.uploadUrl || !pack.url) throw new Error('сервер не дал адрес для записи');
      return putFile(pack.uploadUrl, file, pack.headers || {}, onProgress).then(function () {
        return { url: pack.url, key: pack.key };
      });
    });
  }

  function attachField(opts) {
    opts = opts || {};
    return (
      '<div class="field attach-field">' +
      '<label>' + esc(opts.label || 'Файл') + '</label>' +
      '<div class="attach-row">' +
      '<button type="button" class="btn btn-ghost" id="' + esc(opts.btnId) + '">' + esc(opts.button || 'Прикрепить') + '</button>' +
      '<input type="file" id="' + esc(opts.inputId) + '" accept="' + esc(opts.accept || '*/*') + '" hidden />' +
      '<span class="attach-name" id="' + esc(opts.nameId) + '">' + esc(opts.current || 'файл не выбран') + '</span>' +
      '</div>' +
      '<div class="attach-bar" id="' + esc(opts.barId) + '" hidden><i id="' + esc(opts.fillId) + '"></i></div>' +
      '<p class="hint-note">' + esc(opts.hint || 'Файл уйдёт в бакет. На сайте откроется по обычной ссылке.') + '</p>' +
      '</div>'
    );
  }

  function bindBucketFile(opts) {
    var btn = document.getElementById(opts.btnId);
    var input = document.getElementById(opts.inputId);
    var nameEl = document.getElementById(opts.nameId);
    var bar = document.getElementById(opts.barId);
    var fill = document.getElementById(opts.fillId);
    var urlEl = document.getElementById(opts.urlId);
    if (btn && input) btn.onclick = function () { input.click(); };
    if (!input) return;
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (nameEl) nameEl.textContent = file.name;
      if (bar) bar.hidden = false;
      if (fill) fill.style.width = '0%';
      if (opts.ctx) opts.ctx.toast('Загружаю в бакет…');
      uploadBlob(file, opts.folder, function (pct) {
        if (fill) fill.style.width = pct + '%';
      }).then(function (out) {
        if (urlEl) urlEl.value = out.url;
        if (fill) fill.style.width = '100%';
        if (opts.ctx) opts.ctx.toast('Файл в бакете');
        if (opts.onDone) opts.onDone(out, file);
      }).catch(function (err) {
        if (opts.ctx) opts.ctx.toast(err.message || 'Не удалось загрузить', true);
      });
    };
  }

  function fileLabel(url) {
    var s = String(url || '');
    if (!s) return 'файл не выбран';
    try { s = decodeURIComponent(s); } catch (e) {}
    var parts = s.split('/');
    return parts[parts.length - 1] || s;
  }

  function readMediaDuration(file, kind) {
    return new Promise(function (resolve) {
      if (!file) return resolve('');
      var el = document.createElement(kind === 'video' ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = function () {
        var sec = el.duration;
        URL.revokeObjectURL(el.src);
        if (!isFinite(sec) || sec <= 0) return resolve('');
        if (kind === 'video') return resolve(String(Math.round(sec)));
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        resolve(m + ':' + String(s).padStart(2, '0'));
      };
      el.onerror = function () { resolve(''); };
      el.src = URL.createObjectURL(file);
    });
  }

  function hoistHtmlImages(html, folder) {
    html = String(html || '');
    var found = [];
    html.replace(/src="(data:image[^"]+)"/g, function (_m, src) {
      if (found.indexOf(src) === -1) found.push(src);
      return _m;
    });
    if (!found.length) return Promise.resolve(html);
    var i = 0;
    function next() {
      if (i >= found.length) return Promise.resolve(html);
      var src = found[i++];
      return uploadDataUrl(src, folder).then(function (url) {
        html = html.split(src).join(url);
        return next();
      });
    }
    return next();
  }

  function publishToArchive(item, type) {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var slugs = (item.rubrics || []).slice().filter(function (s) { return s && s !== 'voices'; });
    var voices = { interview: 1, svidetelstva: 1, propovedi: 1 };
    var newsSlugs = { news: 1, digest: 1 };
    var isVoice = slugs.some(function (s) { return voices[s]; });
    if (type === 'news' && slugs.indexOf('news') === -1) slugs.unshift('news');
    if (slugs.indexOf('hidden') !== -1) {
      slugs = ['hidden'];
    } else if (isVoice) {
      slugs = slugs.filter(function (s) { return !newsSlugs[s] && s !== 'columns'; });
    } else if (type === 'article' && slugs.indexOf('columns') === -1) {
      slugs.push('columns');
    }
    if (type === 'news') {
      slugs = slugs.filter(function (s) { return !voices[s]; });
    }
    return AdminApi.upsertArchive({
      articles: [{
        id: ensureNumericId(item),
        slug: item.slug,
        title: item.title,
        date: item.date,
        modified: new Date().toISOString(),
        author: item.author || '',
        categories: slugs.map(rubricTitle),
        categorySlugs: slugs,
        excerpt: item.excerptHtml || item.excerpt || '',
        contentHtml: item.contentHtml || '',
        contentText: item.body || '',
        image: httpCover(item) || undefined,
        source: 'desk',
      }],
    });
  }

  function rubricChecks(cats, selected) {
    selected = selected || [];
    return (
      '<div class="rubric-pills">' +
      cats.map(function (c) {
        var on = selected.indexOf(c.id) !== -1;
        return '<label class="rubric-pill"><input type="checkbox" class="d-rubric" value="' + esc(c.id) + '"' +
          (on ? ' checked' : '') + ' /><span>' + esc(c.title) + '</span></label>';
      }).join('') +
      '</div>'
    );
  }

  function paintPublicationForm(ctx, item, isNew, type) {
    var isNews = type === 'news';
    var cats = isNews ? NEWS_CATS : articleCats();
    var back = isNews ? 'news' : 'articles';
    var portal = isNews ? 'archive.html?category=news' : 'articles.html';
    var cover = item.cover || item.image || '';
    var picked = (item.rubrics && item.rubrics.length) ? item.rubrics.slice()
      : (item.category ? [item.category] : []);
    var slug = item.slug || '';
    var currentAuthor = findAuthor(item.authorSlug || (item.authorSlugs && item.authorSlugs[0]) || item.author);

    ctx.viewEl.innerHTML =
      '<div class="post-editor">' +
      '<div class="post-editor-bar">' +
      '<a class="btn btn-ghost btn-back" href="#' + back + '">← Список</a>' +
      '<div class="post-editor-bar-actions">' +
      '<a class="btn btn-ghost" href="' + portalHref(portal) + '" target="_blank" rel="noopener">На сайте</a>' +
      (isNew ? '' : '<button type="button" class="btn btn-ghost" id="desk-del">Снять</button>') +
      '<button type="button" class="btn btn-ghost" id="desk-draft">Черновик</button>' +
      '<button type="button" class="btn btn-primary" id="desk-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="pub-layout">' +
      '<div class="post-main panel">' +
      '<input class="editor-title" id="d-title" value="' + esc(item.title || '') + '" placeholder="' + (isNews ? 'Заголовок новости' : 'Заголовок статьи') + '" />' +
      '<div class="slug-quiet"><span>Адрес</span><span class="slug-path">/<input id="d-slug" value="' + esc(slug) + '" spellcheck="false" /></span></div>' +
      '<div class="pub-rubrics">' +
      (isNews
        ? rubricChecks(cats, picked)
        : '<div class="rubric-group"><strong>Статьи</strong>' + rubricChecks(articleCats(), picked) + '</div>' +
          '<div class="rubric-group"><strong>Голоса</strong>' + rubricChecks(VOICE_CATS, picked) +
          '<p class="hint-note">Интервью, проповедь и свидетельство живут в «Голосах», не в новостях.</p></div>') +
      '</div>' +
      '<div class="pub-meta">' +
      '<div class="pub-cover">' +
      '<div class="cover-frame' + (cover ? '' : ' is-empty') + '" id="d-cover-frame">' +
      (cover ? '<img src="' + esc(mediaSrc(cover)) + '" alt="" />' : '<span>Обложка</span>') +
      '</div>' +
      '<input type="hidden" id="d-cover" value="' + esc(cover) + '" />' +
      '<button type="button" class="btn btn-ghost" id="d-cover-up">Фото</button>' +
      '<input type="file" id="d-file" accept="image/*" hidden /></div>' +
      '<div class="pub-meta-col">' +
      (isNews ? '' :
        '<input type="hidden" id="d-author-slug" value="' + esc((currentAuthor && currentAuthor.slug) || item.authorSlug || '') + '" />' +
        '<div id="d-author-chip" class="author-chip-wrap"></div>' +
        '<div class="author-search" id="d-author-search">' +
        '<input class="input" id="d-author-q" placeholder="Автор — найти по имени" autocomplete="off" />' +
        '<div class="author-suggest" id="d-author-suggest" hidden></div></div>' +
        '<input type="hidden" id="d-cycle-slug" value="' + esc(item.cycleSlug || item.cycleId || '') + '" />' +
        '<div id="d-cycle-chip" class="author-chip-wrap"></div>' +
        '<div class="author-search" id="d-cycle-search">' +
        '<input class="input" id="d-cycle-q" placeholder="Цикл — не обязательно" autocomplete="off" />' +
        '<div class="author-suggest" id="d-cycle-suggest" hidden></div></div>' +
        '<input class="input" id="d-cycle-order" type="number" min="1" placeholder="Номер в цикле" value="' + esc(item.cycleOrder || '') + '" />') +
      '<input class="input" id="d-date" type="date" value="' + esc(pubDate(item.date, todayIso())) + '" />' +
      '</div></div>' +
      '<div class="rte lead-rte">' +
      '<div class="rte-bar" id="d-lead-bar">' +
      '<button type="button" data-cmd="bold" title="Жирный">Ж</button>' +
      '<button type="button" data-cmd="italic" title="Курсив">К</button>' +
      '<button type="button" data-act="link" title="Ссылка">Ссылка</button>' +
      '</div>' +
      '<div class="rte-body excerpt-input" id="d-excerpt" contenteditable="true" data-placeholder="Лид — коротко, со ссылками если нужно"></div>' +
      '</div>' +
      '<div class="rte">' +
      '<div class="rte-bar" id="d-rte-bar">' +
      '<button type="button" data-cmd="bold" title="Жирный">Ж</button>' +
      '<button type="button" data-cmd="italic" title="Курсив">К</button>' +
      '<button type="button" data-block="h2" title="Заголовок">H2</button>' +
      '<button type="button" data-block="quote" title="Цитата">« »</button>' +
      '<button type="button" data-cmd="insertUnorderedList" title="Список">•</button>' +
      '<button type="button" data-act="link" title="Ссылка">Ссылка</button>' +
      '<span class="rte-sep"></span>' +
      '<button type="button" data-act="image" title="Фото в текст">Фото</button>' +
      '<button type="button" data-act="caption" title="Подпись к фото">Подпись</button>' +
      '</div>' +
      '<div class="rte-body" id="d-body" contenteditable="true" data-placeholder="Текст"></div>' +
      '<input type="file" id="d-inline-file" accept="image/*" hidden />' +
      '</div></div>' +
      '<aside class="day-preview-wrap"><div class="day-preview-sticky">' +
      '<p class="day-preview-label">Предпросмотр — как на сайте</p>' +
      '<div id="d-preview" class="day-preview guide-live"></div></div></aside></div></div>';

    var bodyEl = document.getElementById('d-body');
    bodyEl.innerHTML = articleHtml(item);
    var leadEl = document.getElementById('d-excerpt');
    if (leadEl) leadEl.innerHTML = excerptToEditorHtml(item);
    mountDeskRTE(bodyEl, function () { drawPubPreview(); });
    mountLeadRTE(leadEl, function () { drawPubPreview(); });
    bindCoverFile(function () { drawPubPreview(); });
    bindSlugField(!!slug);
    if (!isNews) {
      bindAuthorChip(currentAuthor);
      bindCycleChip(item.cycleSlug || item.cycleId || '');
    }
    ['d-title', 'd-date'].forEach(function (fid) {
      var el = document.getElementById(fid);
      if (el) el.addEventListener('input', drawPubPreview);
    });
    ctx.viewEl.querySelectorAll('.d-rubric').forEach(function (box) {
      box.addEventListener('change', drawPubPreview);
    });
    drawPubPreview();

    document.getElementById('desk-draft').onclick = function () {
      try { saveArticle(ctx, item, type, 'draft'); } catch (e) { ctx.toast(e.message || 'Не удалось сохранить', true); }
    };
    document.getElementById('desk-pub').onclick = function () {
      try { saveArticle(ctx, item, type, 'published'); } catch (e) { ctx.toast(e.message || 'Не удалось опубликовать', true); }
    };
    var delBtn = document.getElementById('desk-del');
    if (delBtn) delBtn.onclick = function () {
      if (confirm(isNews ? 'Снять новость с публикации?' : 'Снять статью с публикации? Она пропадёт с сайта и со страниц авторов.')) {
        hidePublication(ctx, type, item, back);
      }
    };
  }

  function hidePublication(ctx, type, item, back) {
    var slug = item.slug || item.id;
    hideItem(type, item.id || slug);
    var data = read();
    data.hiddenSlugs = data.hiddenSlugs || [];
    if (slug && data.hiddenSlugs.indexOf(String(slug)) === -1) data.hiddenSlugs.push(String(slug));
    write(data);
    (window.YakAuthors || []).forEach(function (a) {
      if (!a || !a.slug) return;
      if ((a.recent || []).some(function (p) { return p && String(p.slug) === String(slug); })) {
        unlinkAuthor(a.slug, slug);
      }
    });
    ctx.toast('Снимаем с сайта…');
    var tasks = [publishAuthors().catch(function () {})];
    if (item.source !== 'author-work' || item.contentHtml || item.body) {
      var hidden = Object.assign({}, item, {
        slug: slug,
        title: item.title || slug,
        date: item.date || todayIso(),
        rubrics: ['hidden'],
        excerpt: item.excerpt || '',
        contentHtml: item.contentHtml || '',
        body: item.body || '',
      });
      tasks.push(publishToArchive(hidden, type).catch(function () {}));
    }
    Promise.all(tasks).then(function () {
      ctx.toast('Снято с публикации');
      ctx.go(back);
    }).catch(function (err) {
      ctx.toast((err && err.message) || 'Снято локально', true);
      ctx.go(back);
    });
  }

  function bindSlugField(locked) {
    var title = document.getElementById('d-title');
    var slug = document.getElementById('d-slug');
    if (!title || !slug) return;
    if (locked || slug.value) slug.dataset.locked = '1';
    title.addEventListener('input', function () {
      if (!slug.dataset.locked) slug.value = slugify(title.value);
      drawPubPreview();
    });
    slug.addEventListener('input', function () { slug.dataset.locked = '1'; });
    if (!slug.value) slug.value = slugify(title.value);
  }

  function authorAvaHtml(author) {
    var photo = author && author.photo ? mediaSrc(author.photo) : '';
    if (photo) return '<span class="author-chip-ava" style="background-image:url(\'' + esc(photo).replace(/'/g, '%27') + '\')"></span>';
    return '<span class="author-chip-ava is-empty">' + esc(String((author && author.name) || '?').charAt(0)) + '</span>';
  }

  function paintAuthorChip(author) {
    var box = document.getElementById('d-author-chip');
    var hidden = document.getElementById('d-author-slug');
    var search = document.getElementById('d-author-search');
    var suggest = document.getElementById('d-author-suggest');
    if (!box) return;
    if (hidden) hidden.value = author ? (author.slug || '') : '';
    if (suggest) { suggest.hidden = true; suggest.innerHTML = ''; }
    if (!author) {
      box.innerHTML = '';
      if (search) search.hidden = false;
      drawPubPreview();
      return;
    }
    if (search) search.hidden = true;
    box.innerHTML =
      '<div class="author-chip">' +
      authorAvaHtml(author) +
      '<span class="author-chip-name"><strong>' + esc(author.name) + '</strong>' +
      (author.role ? '<small>' + esc(author.role) + '</small>' : '') + '</span>' +
      '<button type="button" class="author-chip-x" id="d-author-clear" aria-label="Сменить автора">Сменить</button></div>';
    var clear = document.getElementById('d-author-clear');
    if (clear) clear.onclick = function () {
      var q = document.getElementById('d-author-q');
      if (q) { q.value = ''; q.focus(); }
      paintAuthorChip(null);
    };
    drawPubPreview();
  }

  function bindAuthorChip(initial) {
    var q = document.getElementById('d-author-q');
    var suggest = document.getElementById('d-author-suggest');
    if (!q || !suggest) return;
    if (initial) paintAuthorChip(initial);
    function show(list) {
      if (!list.length) {
        suggest.hidden = true;
        suggest.innerHTML = '';
        return;
      }
      suggest.hidden = false;
      suggest.innerHTML = list.map(function (a) {
        return '<button type="button" class="author-suggest-item" data-slug="' + esc(a.slug) + '">' +
          authorAvaHtml(a) + '<span>' + esc(a.name) + '</span></button>';
      }).join('');
      suggest.querySelectorAll('[data-slug]').forEach(function (btn) {
        btn.onclick = function () {
          paintAuthorChip(findAuthor(btn.getAttribute('data-slug')));
          drawPubPreview();
        };
      });
    }
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase();
      if (!t) { show(catalogAuthors().slice(0, 8)); return; }
      show(catalogAuthors().filter(function (a) {
        return (a.name || '').toLowerCase().indexOf(t) !== -1 || (a.slug || '').toLowerCase().indexOf(t) !== -1;
      }).slice(0, 8));
    });
    q.addEventListener('focus', function () {
      if (!val('d-author-slug')) show(catalogAuthors().slice(0, 8));
    });
  }

  function catalogCycles() {
    var byId = {};
    ((window.YakCycles && YakCycles.ALL) || []).forEach(function (c) {
      if (c && c.id) byId[c.id] = Object.assign({ status: 'published', source: 'site' }, c);
    });
    (read().cycles || []).forEach(function (c) {
      if (!c || !c.id) return;
      var prev = byId[c.id] || {};
      var next = Object.assign({}, prev, c);
      if (!next.authorSlug && prev.authorSlug) next.authorSlug = prev.authorSlug;
      if ((!next.authorSlugs || !next.authorSlugs.length) && prev.authorSlugs && prev.authorSlugs.length) {
        next.authorSlugs = prev.authorSlugs;
      }
      if ((prev.items || []).length > (next.items || []).length) next.items = prev.items;
      byId[c.id] = next;
    });
    return Object.keys(byId).map(function (k) { return byId[k]; }).filter(function (c) {
      return !c.status || c.status === 'published';
    });
  }

  function findCycle(id) {
    id = String(id || '').trim().toLowerCase();
    if (!id) return null;
    var list = catalogCycles();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id).toLowerCase() === id || String(list[i].slug || '').toLowerCase() === id) return list[i];
    }
    return null;
  }

  function paintCycleChip(cycle) {
    var box = document.getElementById('d-cycle-chip');
    var hidden = document.getElementById('d-cycle-slug');
    var search = document.getElementById('d-cycle-search');
    var suggest = document.getElementById('d-cycle-suggest');
    var order = document.getElementById('d-cycle-order');
    if (!box) return;
    if (hidden) hidden.value = cycle ? (cycle.id || '') : '';
    if (suggest) { suggest.hidden = true; suggest.innerHTML = ''; }
    if (order) order.hidden = !cycle;
    if (!cycle) {
      box.innerHTML = '';
      if (search) search.hidden = false;
      return;
    }
    if (search) search.hidden = true;
    box.innerHTML =
      '<div class="author-chip">' +
      '<span class="author-chip-name"><strong>' + esc(cycle.title) + '</strong>' +
      '<small>Цикл' + ((cycle.items || []).length ? ' · ' + (cycle.items || []).length : '') + '</small></span>' +
      '<button type="button" class="author-chip-x" id="d-cycle-clear">Снять</button></div>';
    var clear = document.getElementById('d-cycle-clear');
    if (clear) clear.onclick = function () {
      var q = document.getElementById('d-cycle-q');
      if (q) { q.value = ''; q.focus(); }
      paintCycleChip(null);
    };
  }

  function bindCycleChip(initialId) {
    var q = document.getElementById('d-cycle-q');
    var suggest = document.getElementById('d-cycle-suggest');
    if (!q || !suggest) return;
    if (initialId) paintCycleChip(findCycle(initialId));
    else paintCycleChip(null);
    function show(list) {
      if (!list.length) {
        suggest.hidden = true;
        suggest.innerHTML = '';
        return;
      }
      suggest.hidden = false;
      suggest.innerHTML = list.map(function (c) {
        return '<button type="button" class="author-suggest-item" data-id="' + esc(c.id) + '">' +
          '<span>' + esc(c.title) + '</span></button>';
      }).join('');
      suggest.querySelectorAll('[data-id]').forEach(function (btn) {
        btn.onclick = function () { paintCycleChip(findCycle(btn.getAttribute('data-id'))); };
      });
    }
    q.addEventListener('input', function () {
      var t = q.value.trim().toLowerCase();
      var all = catalogCycles();
      if (!t) { show(all.slice(0, 8)); return; }
      show(all.filter(function (c) {
        return (c.title || '').toLowerCase().indexOf(t) !== -1 || String(c.id).toLowerCase().indexOf(t) !== -1;
      }).slice(0, 8));
    });
    q.addEventListener('focus', function () {
      if (!val('d-cycle-slug')) show(catalogCycles().slice(0, 8));
    });
  }

  function drawPubPreview() {
    var el = document.getElementById('d-preview');
    if (!el) return;
    var cover = val('d-cover');
    var body = document.getElementById('d-body');
    var author = findAuthor(val('d-author-slug'));
    var rubs = selectedRubrics().map(function (id) {
      var all = NEWS_CATS.concat(articleCats()).concat(VOICE_CATS);
      for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].title;
      return id;
    }).filter(Boolean);
    var authorHtml = '';
    if (author) {
      authorHtml =
        '<a class="author-chip preview-author" href="' + portalHref('author.html?slug=' + encodeURIComponent(author.slug)) + '" target="_blank" rel="noopener">' +
        authorAvaHtml(author) +
        '<span>' + esc(author.name) + '</span></a>';
    }
    var lead = leadHtml();
    el.innerHTML =
      (cover ? '<img src="' + esc(mediaSrc(cover)) + '" alt="" />' : '') +
      (rubs.length ? '<p class="dp-date">' + esc(rubs.join(' · ')) + '</p>' : '') +
      '<p class="dp-date">' + esc(val('d-date')) + (val('d-slug') ? ' · /' + esc(val('d-slug')) : '') + '</p>' +
      authorHtml +
      '<h3 class="dp-title">' + (esc(val('d-title')) || '<em class="dp-empty">Заголовок</em>') + '</h3>' +
      (lead ? '<div class="guide-lead">' + lead + '</div>' : '') +
      '<div class="guide-body">' + ((body && body.innerHTML) || '') + '</div>';
  }

  function mountLeadRTE(el, onChange, barId) {
    if (!el) return;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      var box = document.createElement('div');
      if (hasMarkup(html)) box.innerHTML = html;
      else box.innerHTML = linkifyPlain(html);
      box.querySelectorAll('script,style,img,figure,iframe,video').forEach(function (n) { n.remove(); });
      document.execCommand('insertHTML', false, sanitizeLead(box.innerHTML));
      if (onChange) onChange();
    });
    el.addEventListener('input', function () { if (onChange) onChange(); });
    var bar = document.getElementById(barId || 'd-lead-bar');
    if (!bar) return;
    bar.onclick = function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      el.focus();
      var cmd = btn.getAttribute('data-cmd');
      var act = btn.getAttribute('data-act');
      if (cmd) document.execCommand(cmd, false, null);
      if (act === 'link') {
        var sel = window.getSelection && window.getSelection();
        var picked = sel && String(sel) ? String(sel).trim() : '';
        var hint = /^https?:\/\//i.test(picked) ? picked : 'https://';
        var href = prompt('Ссылка', hint);
        if (href) document.execCommand('createLink', false, href);
      }
      if (onChange) onChange();
    };
  }

  function figureHtml(src, caption) {
    return (
      '<figure class="rte-figure">' +
      '<img src="' + esc(src) + '" alt="' + esc(caption || '') + '" />' +
      '<figcaption class="rte-caption" data-placeholder="Подпись к фото">' + esc(caption || '') + '</figcaption>' +
      '</figure>'
    );
  }

  function ensureFigures(root) {
    if (!root) return;
    [].forEach.call(root.querySelectorAll('img'), function (img) {
      var fig = img.closest('figure');
      if (!fig) {
        fig = document.createElement('figure');
        fig.className = 'rte-figure';
        img.parentNode.insertBefore(fig, img);
        fig.appendChild(img);
      }
      if (!fig.querySelector('figcaption')) {
        var cap = document.createElement('figcaption');
        cap.className = 'rte-caption';
        cap.setAttribute('data-placeholder', 'Подпись к фото');
        cap.textContent = img.getAttribute('alt') || '';
        fig.appendChild(cap);
      }
    });
  }

  function captionOfSelection(root) {
    var fig = null;
    var sel = window.getSelection && window.getSelection();
    if (sel && sel.anchorNode) {
      var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentNode;
      if (node && root.contains(node)) fig = node.closest && node.closest('figure');
    }
    if (!fig) fig = root.querySelector('figure:focus-within') || root.querySelector('figure');
    return fig ? fig.querySelector('figcaption') : null;
  }

  function mountDeskRTE(el, onChange) {
    ensureFigures(el);
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      var box = document.createElement('div');
      if (/<[a-z][\s\S]*>/i.test(html)) box.innerHTML = html;
      else box.innerHTML = '<p>' + esc(html).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      box.querySelectorAll('script,style').forEach(function (n) { n.remove(); });
      document.execCommand('insertHTML', false, box.innerHTML);
      ensureFigures(el);
      if (onChange) onChange();
    });
    el.addEventListener('input', function () { if (onChange) onChange(); });
    el.addEventListener('keydown', function (e) {
      var cap = e.target.closest && e.target.closest('figcaption');
      if (cap && e.key === 'Enter') {
        e.preventDefault();
        var fig = cap.closest('figure');
        var p = document.createElement('p');
        p.innerHTML = '<br>';
        if (fig && fig.parentNode) fig.parentNode.insertBefore(p, fig.nextSibling);
        var range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        var sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      }
    });
    var bar = document.getElementById('d-rte-bar');
    if (!bar) return;
    bar.onclick = function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      el.focus();
      var cmd = btn.getAttribute('data-cmd');
      var block = btn.getAttribute('data-block');
      var act = btn.getAttribute('data-act');
      if (cmd) document.execCommand(cmd, false, null);
      if (block === 'p' || block === 'h2') document.execCommand('formatBlock', false, block);
      if (block === 'quote') document.execCommand('formatBlock', false, 'blockquote');
      if (act === 'link') {
        var href = prompt('Ссылка', 'https://');
        if (href) document.execCommand('createLink', false, href);
      }
      if (act === 'caption') {
        ensureFigures(el);
        var capEl = captionOfSelection(el);
        if (!capEl) { if (onChange) onChange(); return; }
        var next = prompt('Подпись к фото', capEl.textContent || '');
        if (next != null) {
          capEl.textContent = next;
          var img = capEl.parentNode && capEl.parentNode.querySelector('img');
          if (img) img.setAttribute('alt', next);
        }
      }
      if (act === 'image') {
        var input = document.getElementById('d-inline-file');
        if (!input) return;
        input.onchange = function () {
          var f = input.files && input.files[0];
          if (!f) return;
          var reader = new FileReader();
        reader.onload = function () {
          shrinkImage(reader.result, 1400, 0.76, function (src) {
            var caption = prompt('Подпись к фото — можно оставить пустой', '') || '';
            document.execCommand('insertHTML', false, figureHtml(src, caption));
            ensureFigures(el);
            if (onChange) onChange();
          });
        };
        reader.readAsDataURL(f);
          input.value = '';
        };
        input.click();
      }
      if (onChange) onChange();
    };
  }

  function bindCoverFile(onChange) {
    var file = document.getElementById('d-file');
    var btn = document.getElementById('d-cover-up');
    if (btn && file) btn.onclick = function () { file.click(); };
    if (!file) return;
    file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        shrinkImage(reader.result, 1400, 0.76, function (src) {
          var cover = document.getElementById('d-cover');
          if (cover) cover.value = src;
          var frame = document.getElementById('d-cover-frame');
          if (frame) {
            frame.classList.remove('is-empty');
            frame.innerHTML = '<img src="' + src + '" alt="" />';
          }
          if (onChange) onChange();
        });
      };
      reader.readAsDataURL(f);
    };
  }

  function saveArticle(ctx, item, type, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите заголовок', true); return; }
    var rubrics = selectedRubrics();
    if (!rubrics.length) { ctx.toast('Отметьте хотя бы одну рубрику', true); return; }
    var bodyEl = document.getElementById('d-body');
    var html = bodyEl ? bodyEl.innerHTML : '';
    var lead = leadHtml();
    var author = type === 'article' ? findAuthor(val('d-author-slug') || val('d-author-q')) : null;
    var slug = val('d-slug') || slugify(title);
    var coverNow = val('d-cover');

    var ready = Promise.resolve({ cover: coverNow, html: html, lead: lead });
    if (status === 'published' && (String(coverNow).indexOf('data:') === 0 || /src="data:image/.test(html + lead))) {
      ctx.toast('Сохраняем фото на сервер…');
      ready = uploadDataUrl(coverNow, 'covers')
        .then(function (cover) {
          return hoistHtmlImages(html, 'inline').then(function (h) {
            return hoistHtmlImages(lead, 'inline').then(function (l) {
              return { cover: cover, html: h, lead: l };
            });
          });
        });
    }

    ready.then(function (pack) {
      html = pack.html;
      lead = pack.lead;
      if (pack.cover && document.getElementById('d-cover')) document.getElementById('d-cover').value = pack.cover;
      if (bodyEl) bodyEl.innerHTML = html;
      var excerptPlain = htmlToText(lead);
      var next = Object.assign({}, item, {
        kind: type === 'news' ? 'news' : 'article',
        title: title,
        slug: slug,
        category: rubrics[0],
        rubrics: rubrics,
        date: pubDate(val('d-date'), pubDate(item.date, item.id && item.id !== 'new' ? '' : todayIso())) || todayIso(),
        excerpt: excerptPlain || htmlToText(html).slice(0, 220),
        excerptHtml: lead,
        body: htmlToText(html),
        contentHtml: html,
        cover: pack.cover,
        image: pack.cover,
        imageOriginal: httpUrl(pack.cover) || item.imageOriginal || '',
        author: author ? author.name : (val('d-author') || (ctx.session && ctx.session.name) || ''),
        authorSlug: author ? author.slug : '',
        authorSlugs: author ? [author.slug] : [],
        cycleSlug: type === 'article' ? (val('d-cycle-slug') || '') : '',
        cycleOrder: type === 'article' ? (parseInt(val('d-cycle-order'), 10) || 0) : 0,
        status: status,
        source: 'desk',
      });
      if (status === 'published') ensureNumericId(next);
      upsert(type, next);
      if (type === 'article') syncArticleToCycle(next);
      if (author && status === 'published') {
        linkAuthor(author.slug, {
          slug: slug,
          title: title,
          date: next.date,
          excerpt: next.excerpt,
        });
      }
      if (status !== 'published') {
        ctx.toast('Черновик сохранён');
        ctx.go(type === 'news' ? 'news' : 'articles');
        return;
      }
      ctx.toast('Отправляем на сайт…');
      return publishToArchive(next, type).then(function () {
        upsert(type, next);
        if (type === 'article' && next.cycleSlug) return publishCycles().catch(function () {});
      }).then(function () {
        ctx.toast('Опубликовано на сайте');
        ctx.go(type === 'news' ? 'news' : 'articles');
      });
    }).catch(function (e) {
      ctx.toast(e.message || 'Не удалось сохранить', true);
    });
  }

  function matchOrganizerId(name) {
    var n = String(name || '').trim().toLowerCase();
    if (!n || !window.YakAfisha) return '';
    var orgs = YakAfisha.ORGANIZERS || [];
    for (var i = 0; i < orgs.length; i++) {
      var o = orgs[i];
      if (o.id === n || String(o.name || '').toLowerCase() === n || String(o.short || '').toLowerCase() === n) return o.id;
    }
    return '';
  }

  function uniqueEventSlug(base, keepId) {
    var slug = slugify(base);
    var used = {};
    mergedList('event').forEach(function (e) {
      if (!e || e.status === 'hidden') return;
      if (e.id && e.id !== keepId) used[e.id] = true;
      if (e.slug && e.slug !== keepId) used[e.slug] = true;
    });
    if (!used[slug]) return slug;
    var n = 2;
    while (used[slug + '-' + n]) n += 1;
    return slug + '-' + n;
  }

  function cleanEventPack(e) {
    var copy = Object.assign({}, e);
    delete copy.source;
    delete copy._slugLocked;
    delete copy._prevDeskId;
    return copy;
  }

  function publishEvents() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return pullRemotePack(EVENTS_PAGE_SLUG).then(function (remote) {
      absorbEventsPack(remote);
      var by = {};
      mergedList('event').forEach(function (e) {
        if (!e || !e.id) return;
        if (e.status && e.status !== 'published') return;
        by[e.id] = cleanEventPack(e);
      });
      (read().events || []).forEach(function (e) {
        if (e && e.status === 'hidden' && e.id) by[e.id] = { id: e.id, slug: e.slug || e.id, status: 'hidden' };
      });
      var items = Object.keys(by).map(function (k) { return by[k]; });
      return AdminApi.upsertArchive({
        articles: [{
          id: EVENTS_PAGE_ID,
          slug: EVENTS_PAGE_SLUG,
          title: 'Афиша редакции',
          date: todayIso(),
          modified: new Date().toISOString(),
          author: '',
          categories: [],
          categorySlugs: ['day-by-day'],
          excerpt: '',
          contentHtml: '<p></p>',
          contentText: JSON.stringify({ items: items, organizers: publishedOrganizers() }),
          source: 'desk-events',
        }],
      });
    });
  }

  function renderEventForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew
      ? { id: '', date: todayIso(), category: 'meeting', cost: 'free', registration: 'none', city: 'Москва', status: 'published' }
      : getItem('event', id);
    if (!item) { ctx.toast('Событие не найдено', true); ctx.go('afisha'); return; }
    var orgName = item.organizer || (window.YakAfisha && YakAfisha.organizerName && YakAfisha.organizerName(item)) || item.venue || '';
    var costVal = item.cost === 'donation' ? 'paid' : (item.cost || 'free');
    var cover = item.cover || '';
    var slug = item.slug || item.id || '';
    composeShell(
      ctx, isNew ? 'Новое событие' : 'Событие', 'afisha',
      field('Название', 'd-title', item.title) +
      '<div class="field slug-row"><label>Адрес</label>' +
      '<span class="slug-prefix">event.html?id=</span>' +
      '<input class="input" id="d-slug" value="' + esc(slug) + '" placeholder="letniy-kontsert" autocomplete="off" /></div>' +
      field('Тип', 'd-cat', item.category, 'select', opts(EVENT_CATS, item.category || 'meeting')) +
      field('Дата', 'd-date', item.date, 'date') +
      field('Дата окончания', 'd-end', item.endDate || '', 'date') +
      field('Время', 'd-time', item.time, 'text', 'placeholder="19:00"') +
      field('Город', 'd-city', item.city) +
      '<div class="field"><label>Организатор</label>' +
      '<select class="input" id="d-org-id">' +
      '<option value="">— выбрать —</option>' +
      mergedList('organizer').map(function (o) {
        var sel = (item.organizerId && o.id === item.organizerId) || (orgName && (o.name === orgName || o.short === orgName));
        return '<option value="' + esc(o.id) + '"' + (sel ? ' selected' : '') + '>' + esc(o.name) + (o.city ? ' · ' + esc(o.city) : '') + '</option>';
      }).join('') +
      '</select>' +
      '<input class="input" id="d-org" value="' + esc(orgName) + '" placeholder="или вписать название" /></div>' +
      field('Адрес', 'd-place', item.place) +
      field('Стоимость', 'd-cost', costVal, 'select', opts(
        [{ id: 'free', title: 'Бесплатно' }, { id: 'paid', title: 'Платно' }],
        costVal
      )) +
      field('Регистрация', 'd-reg', item.registration || 'none', 'select', opts(
        [{ id: 'none', title: 'Не требуется' }, { id: 'required', title: 'Требуется' }],
        item.registration || 'none'
      )) +
      field('Описание', 'd-desc', item.desc, 'textarea') +
      field('Ссылка на сайт организатора', 'd-href', item.href, 'text', 'placeholder="https://"') +
      '<div class="field"><label>Фото</label>' +
      '<div class="cover-frame' + (cover ? '' : ' is-empty') + '" id="d-cover-frame">' +
      (cover ? '<img src="' + esc(mediaSrc(cover)) + '" alt="" />' : '<span>Нет фото</span>') +
      '</div>' +
      '<input class="input" id="d-cover" value="' + esc(cover) + '" placeholder="URL фото" />' +
      '<button type="button" class="btn btn-ghost" id="d-cover-up">Загрузить фото</button>' +
      '<input type="file" id="d-cover-file" accept="image/*" hidden /></div>',
      function (status) { saveEvent(ctx, item, isNew, status); },
      function () { saveEvent(ctx, item, isNew, 'published'); },
      isNew ? null : function () {
        if (!confirm('Снять событие с публикации?')) return;
        hideItem('event', item.id);
        ctx.toast('Снимаем с сайта…');
        publishEvents().then(function () {
          ctx.toast('Снято с публикации');
          ctx.go('afisha');
        }).catch(function (err) {
          ctx.toast((err && err.message) || 'Снято локально', true);
          ctx.go('afisha');
        });
      },
      slug ? ('event.html?id=' + encodeURIComponent(slug)) : 'events.html'
    );
    bindSlugField(!isNew && !!slug);
    var coverInp = document.getElementById('d-cover');
    var frame = document.getElementById('d-cover-frame');
    if (coverInp && frame) {
      coverInp.oninput = function () {
        if (coverInp.value) {
          frame.classList.remove('is-empty');
          frame.innerHTML = '<img src="' + esc(mediaSrc(coverInp.value)) + '" alt="" />';
        }
      };
    }
    var up = document.getElementById('d-cover-up');
    var file = document.getElementById('d-cover-file');
    if (up && file) {
      up.onclick = function () { file.click(); };
      file.onchange = function () {
        var f = file.files && file.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          if (coverInp) coverInp.value = reader.result;
          if (frame) {
            frame.classList.remove('is-empty');
            frame.innerHTML = '<img src="' + esc(reader.result) + '" alt="" />';
          }
        };
        reader.readAsDataURL(f);
      };
    }
  }

  function saveEvent(ctx, item, isNew, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название', true); return; }
    var rawSlug = val('d-slug');
    var nextId;
    if (!isNew && item.id && (!rawSlug || rawSlug === item.id || rawSlug === item.slug)) {
      nextId = item.id;
    } else {
      nextId = uniqueEventSlug(rawSlug || title, item.id);
    }
    var organizer = val('d-org');
    var organizerId = val('d-org-id') || matchOrganizerId(organizer) || item.organizerId || '';
    if (organizerId && !organizer) {
      var picked = mergedList('organizer').filter(function (o) { return o.id === organizerId; })[0];
      if (picked) organizer = picked.name;
    }
    var coverNow = val('d-cover');
    var next = Object.assign({}, item, {
      id: nextId,
      slug: nextId,
      title: title,
      category: val('d-cat'),
      date: val('d-date') || todayIso(),
      endDate: val('d-end'),
      time: val('d-time'),
      city: val('d-city'),
      organizer: organizer,
      organizerId: organizerId,
      venue: organizer,
      place: val('d-place'),
      cost: val('d-cost') || 'free',
      registration: val('d-reg') || 'none',
      desc: val('d-desc'),
      href: val('d-href'),
      cover: coverNow,
      status: status,
    });
    var ready = (coverNow && coverNow.indexOf('data:') === 0)
      ? (ctx.toast('Сохраняем фото…'), uploadDataUrl(coverNow, 'covers').then(function (url) { next.cover = url; }))
      : Promise.resolve();
    ctx.toast(status === 'published' ? 'Публикуем…' : 'Сохраняем…');
    ready.then(function () {
      if (item.id && item.id !== next.id) hideItem('event', item.id);
      upsert('event', next);
      if (status === 'published') return publishEvents();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён');
      ctx.go('afisha');
    }).catch(function (e) {
      ctx.toast(e.message || 'Не удалось сохранить', true);
    });
  }

  function publishAudio() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var tracks = (read().audio || []).filter(function (t) {
      return t && t.id && (!t.status || t.status === 'published');
    }).map(function (t) {
      var copy = Object.assign({}, t);
      delete copy.source;
      return copy;
    });
    return AdminApi.upsertArchive({
      articles: [{
        id: AUDIO_PAGE_ID,
        slug: AUDIO_PAGE_SLUG,
        title: 'Аудио редакции',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify({ tracks: tracks }),
        source: 'desk-audio',
      }],
    });
  }

  function publishVideo() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var items = (read().video || []).filter(function (v) {
      return v && v.id && (!v.status || v.status === 'published');
    }).map(function (v) {
      var copy = Object.assign({}, v);
      delete copy.source;
      return copy;
    });
    var channels = (read().videoChannels || []).filter(function (c) {
      return c && c.id && (!c.status || c.status === 'published');
    });
    return AdminApi.upsertArchive({
      articles: [{
        id: VIDEO_PAGE_ID,
        slug: VIDEO_PAGE_SLUG,
        title: 'Видео редакции',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify({ items: items, channels: channels }),
        source: 'desk-video',
      }],
    });
  }

  function renderAudioForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew ? { id: uid('au'), date: todayIso(), artist: '', status: 'published' } : getItem('audio', id);
    if (!item) { ctx.toast('Аудио не найдено', true); ctx.go('audio'); return; }
    var fileUrl = item.audioUrl || item.url || '';
    composeShell(
      ctx, isNew ? 'Новое аудио' : 'Аудио', 'audio',
      field('Название', 'd-title', item.title) +
      field('Исполнитель', 'd-artist', item.artist) +
      field('Дата', 'd-date', item.date, 'date') +
      field('Длительность', 'd-dur', item.duration, 'text', 'placeholder="12:40"') +
      attachField({
        label: 'Аудиофайл',
        btnId: 'd-audio-btn',
        inputId: 'd-audio-file',
        nameId: 'd-audio-name',
        barId: 'd-audio-bar',
        fillId: 'd-audio-fill',
        accept: 'audio/*',
        button: 'Прикрепить аудио',
        current: fileLabel(fileUrl),
        hint: 'Файл уйдёт в бакет. На сайте плеер откроет обычную ссылку.',
      }) +
      field('Ссылка на файл', 'd-url', fileUrl) +
      field('Обложка', 'd-cover', item.cover) +
      '<div class="field"><label>Файл обложки</label><input class="input" type="file" id="d-file" accept="image/*" /></div>',
      function (status) { saveAudio(ctx, item, status); },
      function () { saveAudio(ctx, item, 'published'); },
      isNew ? null : function () {
        if (!confirm('Снять аудио с публикации?')) return;
        hideItem('audio', item.id);
        publishAudio().then(function () {
          ctx.toast('Снято с публикации');
          ctx.go('audio');
        }).catch(function (e) { ctx.toast(e.message || 'Не удалось снять', true); });
      },
      'audio.html'
    );
    bindBucketFile({
      ctx: ctx,
      folder: 'audio',
      btnId: 'd-audio-btn',
      inputId: 'd-audio-file',
      nameId: 'd-audio-name',
      barId: 'd-audio-bar',
      fillId: 'd-audio-fill',
      urlId: 'd-url',
      onDone: function (_out, file) {
        if (!val('d-title')) document.getElementById('d-title').value = file.name.replace(/\.[^.]+$/, '');
        readMediaDuration(file, 'audio').then(function (dur) {
          if (dur && !val('d-dur')) document.getElementById('d-dur').value = dur;
        });
      },
    });
    var cover = document.getElementById('d-file');
    if (cover) cover.onchange = function () {
      var f = cover.files && cover.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        shrinkImage(reader.result, 1400, 0.76, function (src) {
          var el = document.getElementById('d-cover');
          if (el) el.value = src;
        });
      };
      reader.readAsDataURL(f);
    };
  }

  function saveAudio(ctx, item, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название', true); return; }
    var url = val('d-url');
    if (!url) { ctx.toast('Прикрепите файл или укажите ссылку', true); return; }
    if (url.indexOf('data:') === 0) { ctx.toast('Сначала дождитесь загрузки файла в бакет', true); return; }
    var coverNow = val('d-cover');
    var next = Object.assign({}, item, {
      title: title,
      artist: val('d-artist'),
      date: val('d-date') || todayIso(),
      duration: val('d-dur'),
      audioUrl: url,
      url: url,
      cover: coverNow,
      status: status,
    });
    var ready = (coverNow && coverNow.indexOf('data:') === 0)
      ? (ctx.toast('Сохраняем обложку…'), uploadDataUrl(coverNow, 'covers').then(function (u) { next.cover = u; }))
      : Promise.resolve();
    ctx.toast(status === 'published' ? 'Публикуем…' : 'Сохраняем…');
    ready.then(function () {
      upsert('audio', next);
      if (status === 'published') return publishAudio();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён');
      ctx.go('audio');
    }).catch(function (e) {
      ctx.toast(e.message || 'Не удалось сохранить', true);
    });
  }

  function renderVideoForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew ? { id: uid('vid'), type: 'long', status: 'published' } : getItem('video', id);
    if (!item) { ctx.toast('Видео не найдено', true); ctx.go('video'); return; }
    composeShell(
      ctx, isNew ? 'Новое видео' : 'Видео', 'video',
      field('Название', 'd-title', item.title) +
      field('Формат', 'd-type', item.type, 'select', opts([{ id: 'long', title: 'Полнометражное' }, { id: 'short', title: 'Shorts' }], item.type || 'long')) +
      field('Спикер', 'd-speaker', item.speaker) +
      field('Канал партнёра', 'd-channel', item.channelId) +
      field('Цикл', 'd-cycle', item.cycle) +
      field('Описание', 'd-desc', item.description, 'textarea') +
      attachField({
        label: 'Видеофайл',
        btnId: 'd-video-btn',
        inputId: 'd-video-file',
        nameId: 'd-video-name',
        barId: 'd-video-bar',
        fillId: 'd-video-fill',
        accept: 'video/*',
        button: 'Прикрепить видео',
        current: fileLabel(item.videoUrl),
        hint: 'Файл уйдёт в бакет. На сайте откроется по обычной ссылке. Для ролика с VK/RuTube оставьте поле пустым и укажите внешнюю ссылку.',
      }) +
      field('Ссылка на видео', 'd-url', item.videoUrl) +
      field('Внешняя ссылка (VK, RuTube)', 'd-ext', item.externalUrl) +
      field('Превью', 'd-thumb', item.thumb) +
      '<div class="field"><label>Файл превью</label><input class="input" type="file" id="d-file" accept="image/*" /></div>' +
      field('Длительность, сек.', 'd-dur', item.duration, 'number'),
      function (status) { saveVideo(ctx, item, status); },
      function () { saveVideo(ctx, item, 'published'); },
      isNew ? null : function () {
        if (!confirm('Снять видео с публикации?')) return;
        hideItem('video', item.id);
        publishVideo().then(function () {
          ctx.toast('Снято с публикации');
          ctx.go('video');
        }).catch(function (e) { ctx.toast(e.message || 'Не удалось снять', true); });
      },
      'video.html'
    );
    bindBucketFile({
      ctx: ctx,
      folder: 'video',
      btnId: 'd-video-btn',
      inputId: 'd-video-file',
      nameId: 'd-video-name',
      barId: 'd-video-bar',
      fillId: 'd-video-fill',
      urlId: 'd-url',
      onDone: function (_out, file) {
        if (!val('d-title')) document.getElementById('d-title').value = file.name.replace(/\.[^.]+$/, '');
        readMediaDuration(file, 'video').then(function (dur) {
          if (dur && !val('d-dur')) document.getElementById('d-dur').value = dur;
        });
      },
    });
    var file = document.getElementById('d-file');
    if (file) file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        shrinkImage(reader.result, 1400, 0.76, function (src) {
          var thumb = document.getElementById('d-thumb');
          if (thumb) thumb.value = src;
        });
      };
      reader.readAsDataURL(f);
    };
  }

  function saveVideo(ctx, item, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название', true); return; }
    var url = val('d-url');
    var ext = val('d-ext');
    if (!url && !ext) { ctx.toast('Прикрепите файл или укажите ссылку', true); return; }
    if (url.indexOf('data:') === 0) { ctx.toast('Сначала дождитесь загрузки файла в бакет', true); return; }
    var thumbNow = val('d-thumb');
    var next = Object.assign({}, item, {
      title: title,
      type: val('d-type') || 'long',
      speaker: val('d-speaker'),
      channelId: val('d-channel'),
      cycle: val('d-cycle'),
      description: val('d-desc'),
      videoUrl: url,
      externalUrl: ext,
      thumb: thumbNow,
      duration: Number(val('d-dur')) || 0,
      status: status,
    });
    var ready = (thumbNow && thumbNow.indexOf('data:') === 0)
      ? (ctx.toast('Сохраняем превью…'), uploadDataUrl(thumbNow, 'covers').then(function (u) { next.thumb = u; }))
      : Promise.resolve();
    ctx.toast(status === 'published' ? 'Публикуем…' : 'Сохраняем…');
    ready.then(function () {
      upsert('video', next);
      if (status === 'published') return publishVideo();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён');
      ctx.go('video');
    }).catch(function (e) {
      ctx.toast(e.message || 'Не удалось сохранить', true);
    });
  }

  function weekdayName(iso) {
    var names = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    var d = iso ? new Date(iso + 'T12:00:00') : new Date();
    return names[d.getDay()];
  }

  var DAY_CATS = [
    { id: 'будний', title: 'Будний день' },
    { id: 'воскресный', title: 'Воскресенье' },
    { id: 'праздник', title: 'Праздник' },
    { id: 'торжество', title: 'Торжество' },
  ];
  var DAY_COLORS = [
    { id: '', title: '— не указан —' },
    { id: 'зелёный', title: 'Зелёный' },
    { id: 'белый', title: 'Белый' },
    { id: 'красный', title: 'Красный' },
    { id: 'фиолетовый', title: 'Фиолетовый' },
    { id: 'розовый', title: 'Розовый' },
    { id: 'чёрный', title: 'Чёрный' },
  ];

  function catClass(cat) {
    if (cat === 'торжество') return 'solemn';
    if (cat === 'праздник') return 'feast';
    if (cat === 'воскресный' || cat === 'воскресенье') return 'sun';
    return 'feria';
  }

  function fmtLongRu(iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    var months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    if (p.length < 3) return iso;
    return Number(p[2]) + ' ' + (months[Number(p[1]) - 1] || '') + ' ' + p[0];
  }

  function renderChurchForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew
      ? { id: uid('day'), date: todayIso(), weekday: weekdayName(todayIso()), status: 'published', liturgical: {} }
      : getItem('church-day', id);
    if (!item) { ctx.toast('День не найден', true); ctx.go('church-day'); return; }
    var lit = item.liturgical || {};
    var defaultCat = weekdayName(item.date) === 'Воскресенье' ? 'воскресный' : 'будний';

    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>День Церкви</h1><p>Литургический день: святой, чтение, молитва и цитата.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost btn-back" href="#church-day">← Назад</a>' +
      '<a class="btn btn-ghost" href="' + portalHref('calendar.html') + '" target="_blank" rel="noopener">На портале</a>' +
      (isNew ? '' : '<button type="button" class="btn btn-ghost" id="desk-del">Снять</button>') +
      '<button type="button" class="btn btn-ghost" id="desk-draft">Сохранить черновик</button>' +
      '<button type="button" class="btn btn-primary" id="desk-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="day-editor">' +
      '<div class="panel form-grid desk-form">' +
      '<div class="field"><label for="d-date">Дата</label>' +
      '<input class="input" id="d-date" type="date" value="' + esc(item.date) + '" />' +
      '<p class="hint-note" id="d-weekday">' + esc(item.weekday || weekdayName(item.date)) + '</p></div>' +
      field('Категория', 'd-cat', lit.category || defaultCat, 'select', opts(DAY_CATS, lit.category || defaultCat)) +
      field('Литургический цвет', 'd-color', lit.color || '', 'select', opts(DAY_COLORS, lit.color || '')) +
      field('Название дня', 'd-title', lit.title, 'text', 'placeholder="Пятница XVIII обычной недели"') +
      '<div class="field"><label>Святой дня</label>' +
      '<div class="rte">' +
      '<div class="rte-bar" id="d-saint-bar">' +
      '<button type="button" data-cmd="bold">Жирный</button>' +
      '<button type="button" data-cmd="italic">Курсив</button>' +
      '<button type="button" data-act="link">Ссылка</button>' +
      '</div>' +
      '<div class="rte-body" id="d-saint" contenteditable="true" data-placeholder="2–3 святых, у каждого своя ссылка"></div></div>' +
      '<p class="hint-note">Форматирование и ссылки внутри поля. Отдельная «ссылка на святого» больше не нужна.</p></div>' +
      field('Чтение дня', 'd-reading', lit.reading, 'textarea') +
      field('Молитва дня', 'd-prayer', lit.prayer, 'textarea') +
      field('Цитата дня', 'd-quote', lit.quote, 'textarea') +
      '</div>' +
      '<aside class="day-preview-wrap"><div class="day-preview-sticky">' +
      '<p class="day-preview-label">Предпросмотр — как увидит читатель</p>' +
      '<div id="d-preview" class="day-preview"></div></div></aside>' +
      '</div>';

    var dateEl = document.getElementById('d-date');
    function syncWeekday() {
      var wd = document.getElementById('d-weekday');
      if (wd) wd.textContent = weekdayName(val('d-date')) || '';
    }
    var saintEl = document.getElementById('d-saint');
    if (saintEl) {
      saintEl.innerHTML = (lit.saint && (lit.saint.html || lit.saint.name)) || '';
      if (lit.saint && !lit.saint.html && lit.saint.name && lit.saint.href) {
        saintEl.innerHTML = '<a href="' + esc(lit.saint.href) + '">' + esc(lit.saint.name) + '</a>';
      } else if (lit.saint && lit.saint.html) {
        saintEl.innerHTML = lit.saint.html;
      } else if (lit.saint && lit.saint.name) {
        saintEl.textContent = lit.saint.name;
      }
    }
    var saintBar = document.getElementById('d-saint-bar');
    if (saintBar && saintEl) {
      saintBar.onclick = function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        saintEl.focus();
        var cmd = btn.getAttribute('data-cmd');
        var act = btn.getAttribute('data-act');
        if (cmd) document.execCommand(cmd, false, null);
        if (act === 'link') {
          var href = prompt('Ссылка на святого', 'https://');
          if (href) document.execCommand('createLink', false, href);
        }
        drawPreview();
      };
      saintEl.addEventListener('input', drawPreview);
    }

    function saintHtml() {
      return saintEl ? saintEl.innerHTML : '';
    }
    function saintName() {
      if (!saintEl) return '';
      return (saintEl.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function drawPreview() {
      var cat = val('d-cat') || defaultCat;
      var el = document.getElementById('d-preview');
      if (!el) return;
      function blk(label, body) {
        if (!body) return '';
        return '<div class="dp-block"><h4>' + esc(label) + '</h4>' + body + '</div>';
      }
      el.innerHTML =
        '<p class="dp-date">' + esc(weekdayName(val('d-date'))) + ' · ' + esc(fmtLongRu(val('d-date'))) + '</p>' +
        '<span class="cal-rank cal-rank-' + catClass(cat) + '">' + esc(cat) + '</span>' +
        '<h3 class="dp-title">' + (esc(val('d-title')) || '<em class="dp-empty">Название дня</em>') + '</h3>' +
        (val('d-color') ? '<p class="dp-color">Литургический цвет: <b>' + esc(val('d-color')) + '</b></p>' : '') +
        blk('Святой дня', saintHtml()) +
        blk('Чтение дня', val('d-reading') ? '<p>' + esc(val('d-reading')) + '</p>' : '') +
        blk('Молитва дня', val('d-prayer') ? '<p>' + esc(val('d-prayer')) + '</p>' : '') +
        blk('Цитата дня', val('d-quote') ? '<p class="dp-quote">' + esc(val('d-quote')) + '</p>' : '');
    }
    if (dateEl) dateEl.addEventListener('change', function () { syncWeekday(); drawPreview(); });
    ['d-cat', 'd-color', 'd-title', 'd-reading', 'd-prayer', 'd-quote'].forEach(function (fid) {
      var el = document.getElementById(fid);
      if (el) el.addEventListener('input', drawPreview);
      if (el && el.tagName === 'SELECT') el.addEventListener('change', drawPreview);
    });
    drawPreview();

    document.getElementById('desk-draft').onclick = function () { saveChurch(ctx, item, 'draft'); };
    document.getElementById('desk-pub').onclick = function () { saveChurch(ctx, item, 'published'); };
    var delBtn = document.getElementById('desk-del');
    if (delBtn) delBtn.onclick = function () {
      if (!confirm('Снять день с публикации?')) return;
      hideItem('church-day', item.id);
      ctx.toast('Снимаем с сайта…');
      publishChurchDays().then(function () {
        ctx.toast('Снято с публикации');
        ctx.go('church-day');
      }).catch(function (err) {
        ctx.toast((err && err.message) || 'Снято локально', true);
        ctx.go('church-day');
      });
    };
  }

  var CALENDAR_PAGE_ID = 1900000007;
  var CALENDAR_PAGE_SLUG = 'yak-calendar-data';

  function publishChurchDays() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var items = (read().churchDays || []).filter(function (d) {
      return d && d.date && (!d.status || d.status === 'published');
    });
    return AdminApi.upsertArchive({
      articles: [{
        id: CALENDAR_PAGE_ID,
        slug: CALENDAR_PAGE_SLUG,
        title: 'Дни Церкви',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify({ days: items }),
        source: 'desk-calendar',
      }],
    });
  }

  function saveChurch(ctx, item, status) {
    var date = val('d-date') || todayIso();
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название дня', true); return; }
    var saintBox = document.getElementById('d-saint');
    var saintHtml = saintBox ? saintBox.innerHTML : '';
    var saintName = saintBox ? (saintBox.textContent || '').replace(/\s+/g, ' ').trim() : '';
    upsert('church-day', Object.assign({}, item, {
      date: date,
      weekday: weekdayName(date),
      title: title,
      status: status,
      liturgical: {
        title: title,
        category: val('d-cat') || (weekdayName(date) === 'Воскресенье' ? 'воскресный' : 'будний'),
        color: val('d-color'),
        saint: { name: saintName, html: saintHtml },
        reading: val('d-reading'),
        prayer: val('d-prayer'),
        quote: val('d-quote'),
      },
    }));
    if (status !== 'published' && status !== 'draft') {
      ctx.toast('Черновик сохранён');
      ctx.go('church-day');
      return;
    }
    ctx.toast(status === 'published' ? 'Отправляем на сайт…' : 'Сохраняем…');
    publishChurchDays().then(function () {
      ctx.toast(status === 'published' ? 'День на сайте' : 'Черновик сохранён');
      ctx.go('church-day');
    }).catch(function (err) {
      ctx.toast((err && err.message) || 'Сохранено только в этом браузере', true);
      ctx.go('church-day');
    });
  }

  function catalogPubs() {
    var seen = {};
    var out = [];
    function add(p) {
      if (!p || !p.slug || seen[p.slug]) return;
      seen[p.slug] = 1;
      out.push({
        slug: p.slug,
        title: p.title || p.slug,
        date: (p.date || '').slice(0, 10),
        excerpt: p.excerpt || '',
      });
    }
    (window.YakAuthors || []).forEach(function (a) {
      (a.recent || []).forEach(add);
    });
    mergedList('article').concat(mergedList('news')).forEach(function (a) {
      add({ slug: a.slug || a.id, title: a.title, date: a.date, excerpt: a.excerpt });
    });
    if (window.AdminStore && AdminStore.listMaterials) {
      AdminStore.listMaterials().forEach(function (m) {
        add({ slug: m.slug || m.id, title: m.title, date: m.date || m.updatedAt, excerpt: m.excerpt });
      });
    }
    return out;
  }

  function linkAuthor(authorSlug, pub) {
    if (!authorSlug || !pub || !pub.slug) return;
    var data = read();
    data.authorLinks = (data.authorLinks || []).filter(function (x) {
      return !(x.authorSlug === authorSlug && x.slug === pub.slug);
    });
    data.authorLinks.unshift({
      authorSlug: authorSlug,
      slug: pub.slug,
      title: pub.title || pub.slug,
      date: pub.date || '',
      excerpt: pub.excerpt || '',
    });
    write(data);
    var author = getItem('authors', authorSlug) || { id: authorSlug, slug: authorSlug, recent: [] };
    author.recent = author.recent || [];
    if (!author.recent.some(function (p) { return p.slug === pub.slug; })) {
      author.recent.unshift({ slug: pub.slug, title: pub.title || pub.slug, date: pub.date || '', excerpt: pub.excerpt || '' });
    }
    author.status = author.status || 'published';
    upsert('authors', author);
  }

  function unlinkAuthor(authorSlug, slug) {
    var data = read();
    data.authorLinks = (data.authorLinks || []).filter(function (x) {
      return !(x.authorSlug === authorSlug && x.slug === slug);
    });
    write(data);
    var author = getItem('authors', authorSlug);
    if (author && author.recent) {
      author.recent = author.recent.filter(function (p) { return p.slug !== slug; });
      upsert('authors', author);
    }
  }

  function uniqueAuthorSlug(base, except) {
    var slug = slugify(base) || 'author';
    var exceptKey = String(except || '').toLowerCase();
    var list = catalogAuthors();
    function taken(s) {
      var key = String(s || '').toLowerCase();
      return list.some(function (a) {
        var as = String(a.slug || a.id || '').toLowerCase();
        return as === key && as !== exceptKey;
      });
    }
    if (!taken(slug)) return slug;
    var n = 2;
    while (taken(slug + '-' + n)) n += 1;
    return slug + '-' + n;
  }

  function renderAuthors(ctx, id) {
    var isNew = id === 'new';
    if (id) {
      var baked = isNew ? {} : ((window.YakAuthors || []).filter(function (a) { return a.slug === id || a.id === id; })[0] || {});
      var item = isNew
        ? { id: '', slug: '', name: '', role: '', bio: '', photo: '', recent: [], status: 'draft' }
        : Object.assign({}, baked, getItem('authors', id) || { id: id, slug: id });
      var linked = (item.recent || []).slice();
      (read().authorLinks || []).forEach(function (l) {
        if (l.authorSlug === item.slug && !linked.some(function (p) { return p.slug === l.slug; })) linked.unshift(l);
      });
      composeShell(
        ctx, isNew ? 'Новый автор' : (item.name || 'Автор'), 'authors',
        field('Имя', 'd-title', item.name) +
        field('Адрес карточки', 'd-slug', item.slug, 'text', isNew ? 'placeholder="появится из имени"' : '') +
        field('Роль', 'd-role', item.role) +
        '<div class="field"><label>Описание</label>' +
        '<div class="rte lead-rte">' +
        '<div class="rte-bar" id="d-bio-bar">' +
        '<button type="button" data-cmd="bold" title="Жирный">Ж</button>' +
        '<button type="button" data-cmd="italic" title="Курсив">К</button>' +
        '<button type="button" data-act="link" title="Ссылка">Ссылка</button>' +
        '</div>' +
        '<div class="rte-body excerpt-input" id="d-bio" contenteditable="true" data-placeholder="Абзацы и ссылки сохранятся"></div>' +
        '</div>' +
        '<p class="hint-note">Enter — новый абзац. Выделите текст и нажмите «Ссылка».</p></div>' +
        '<div class="field"><label>Фото</label><input class="input" type="file" id="d-photo" accept="image/*" />' +
        '<input type="hidden" id="d-photo-url" value="' + esc(item.photo || '') + '" />' +
        (item.photo ? '<img src="' + esc(item.photo) + '" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-top:8px" />' : '') +
        '</div>' +
        '<div class="field"><label>Привязать старую публикацию</label>' +
        '<input class="input" id="d-pub-q" list="d-pub-list" placeholder="Название или slug статьи" />' +
        '<datalist id="d-pub-list"></datalist>' +
        '<button type="button" class="btn btn-ghost" id="d-pub-add" style="margin-top:8px">Добавить к автору</button>' +
        '<p class="hint-note">У старых материалов автора часто нет. Найдите публикацию и привяжите — она появится на карточке автора и в ленте.</p>' +
        '<div id="d-pub-linked"></div></div>',
        function (status) { saveAuthor(ctx, item, status); },
        function () { saveAuthor(ctx, item, 'published'); },
        null,
        item.slug ? 'author.html?slug=' + encodeURIComponent(item.slug) : ''
      );
      var bioEl = document.getElementById('d-bio');
      if (bioEl) {
        bioEl.innerHTML = bioToEditorHtml(item.bio);
        mountLeadRTE(bioEl, null, 'd-bio-bar');
      }
      var titleEl = document.getElementById('d-title');
      var slugEl = document.getElementById('d-slug');
      if (isNew && titleEl && slugEl) {
        titleEl.addEventListener('input', function () {
          if (!slugEl.dataset.touched) slugEl.value = slugify(titleEl.value);
          item.slug = slugEl.value;
          item.id = item.slug;
        });
        slugEl.addEventListener('input', function () {
          slugEl.dataset.touched = '1';
          item.slug = slugEl.value;
          item.id = item.slug;
        });
      }
      var pubs = catalogPubs();
      document.getElementById('d-pub-list').innerHTML = pubs.slice(0, 400).map(function (p) {
        return '<option value="' + esc(p.slug) + '">' + esc(p.title) + '</option>';
      }).join('');
      var photo = document.getElementById('d-photo');
      if (photo) photo.onchange = function () {
        var f = photo.files && photo.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          shrinkImage(reader.result, 640, 0.78, function (src) {
            var hidden = document.getElementById('d-photo-url');
            if (hidden) hidden.value = src;
          });
        };
        reader.readAsDataURL(f);
      };
      function paintLinked() {
        var box = document.getElementById('d-pub-linked');
        if (!box) return;
        box.innerHTML = linked.length
          ? '<ul class="cycle-list">' + linked.map(function (p) {
            return '<li class="cycle-row"><span>' + esc(p.title || p.slug) + '</span>' +
              '<button type="button" class="btn btn-ghost" data-un="' + esc(p.slug) + '">Снять</button></li>';
          }).join('') + '</ul>'
          : '<p class="hint-note">Пока нет привязанных публикаций.</p>';
        box.querySelectorAll('[data-un]').forEach(function (btn) {
          btn.onclick = function () {
            unlinkAuthor(item.slug, btn.getAttribute('data-un'));
            linked = linked.filter(function (p) { return p.slug !== btn.getAttribute('data-un'); });
            paintLinked();
            ctx.toast('Снято');
          };
        });
      }
      paintLinked();
      document.getElementById('d-pub-add').onclick = function () {
        var q = val('d-pub-q');
        if (!q) { ctx.toast('Укажите slug или название', true); return; }
        var hit = pubs.filter(function (p) {
          return p.slug === q || String(p.title || '').toLowerCase() === q.toLowerCase();
        })[0] || { slug: q, title: q };
        linkAuthor(item.slug, hit);
        if (!linked.some(function (p) { return p.slug === hit.slug; })) linked.unshift(hit);
        document.getElementById('d-pub-q').value = '';
        paintLinked();
        ctx.toast('Публикация привязана');
      };
      return;
    }
    var items = mergedList('authors');
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Авторы</h1><p>Карточки, описания и привязка публикаций.</p></div>' +
      '<div class="topbar-actions"><a class="btn btn-primary" href="#authors/new">Добавить автора</a></div></div>' +
      '<div class="panel">' +
      (items.length
        ? '<div class="list-stack">' + items.map(function (a) {
          return (
            '<a class="list-item" href="#authors/' + esc(a.slug || a.id) + '"><div>' +
            '<strong>' + esc(a.name || 'Без имени') + '</strong>' +
            '<small>' + esc(a.role || '') + (a.count != null ? ' · ' + a.count + ' материалов' : '') + '</small>' +
            '</div></a>'
          );
        }).join('') + '</div>'
        : emptyRow('Не удалось загрузить авторов.')) +
      '</div>';
  }

  function saveAuthor(ctx, item, status) {
    var name = val('d-title');
    if (!name) { ctx.toast('Укажите имя', true); return; }
    var slug = uniqueAuthorSlug(val('d-slug') || slugify(name), item.slug || item.id);
    var photo = val('d-photo-url') || item.photo || '';
    var ready = status === 'published' && String(photo).indexOf('data:') === 0
      ? (ctx.toast('Сохраняем фото на сервер…'), uploadDataUrl(photo, 'authors'))
      : Promise.resolve(photo);
    ready.then(function (url) {
      if (url && document.getElementById('d-photo-url')) document.getElementById('d-photo-url').value = url;
      upsert('authors', Object.assign({}, item, {
        id: slug,
        slug: slug,
        name: name,
        role: val('d-role'),
        bio: bioHtml() || val('d-bio'),
        photo: url,
        status: status,
      }));
      if (status !== 'published') {
        ctx.toast('Черновик сохранён');
        ctx.go('authors');
        return;
      }
      return publishAuthors().then(function () {
        ctx.toast('Автор сохранён на сайте');
        ctx.go('authors');
      });
    }).catch(function (e) {
      ctx.toast(e.message || 'Не удалось сохранить автора', true);
    });
  }

  var CYCLES_PAGE_ID = 1900000001;
  var CYCLES_PAGE_SLUG = 'yak-cycles-data';
  var AUTHORS_PAGE_ID = 1900000002;
  var AUTHORS_PAGE_SLUG = 'yak-authors-data';
  var PHOTO_PAGE_ID = 1900000003;
  var PHOTO_PAGE_SLUG = 'yak-photostock-data';
  var TOPICS_PAGE_ID = 1900000004;
  var TOPICS_PAGE_SLUG = 'yak-topics-data';
  var EVENTS_PAGE_ID = 1900000006;
  var AUDIO_PAGE_ID = 1900000010;
  var AUDIO_PAGE_SLUG = 'yak-audio-data';
  var VIDEO_PAGE_ID = 1900000011;
  var VIDEO_PAGE_SLUG = 'yak-video-data';
  var EVENTS_PAGE_SLUG = 'yak-events-data';

  function parseArchivePack(art) {
    var raw = (art && (art.contentText || art.content || '')) || '';
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function pullRemotePack(slug) {
    if (!window.AdminApi || !AdminApi.getArticle) return Promise.resolve(null);
    return AdminApi.getArticle(slug).then(parseArchivePack).catch(function () { return null; });
  }

  function recKey(rec) {
    return String((rec && (rec.id || rec.slug)) || '').toLowerCase();
  }

  function mergeRecordLists(local, remote, opts) {
    opts = opts || {};
    var by = {};
    var order = [];
    function put(rec) {
      if (!rec) return;
      var key = recKey(rec);
      if (!key) return;
      if (!by[key]) {
        by[key] = rec;
        order.push(key);
        return;
      }
      var cur = by[key];
      if (opts.preferRicherItems) {
        var a = (cur.items || []).length;
        var b = (rec.items || []).length;
        if (b > a) by[key] = Object.assign({}, cur, rec);
        else if (a > b) by[key] = Object.assign({}, rec, cur);
        else {
          var ct = String(cur.updatedAt || cur.modified || '');
          var rt = String(rec.updatedAt || rec.modified || '');
          by[key] = rt > ct ? Object.assign({}, cur, rec) : Object.assign({}, rec, cur);
        }
        return;
      }
      by[key] = Object.assign({}, cur, rec);
    }
    (remote || []).forEach(put);
    (local || []).forEach(put);
    return order.map(function (k) { return by[k]; });
  }

  function absorbCycles(list) {
    if (!Array.isArray(list) || !list.length) return;
    var data = read();
    data.cycles = mergeRecordLists(data.cycles || [], list, { preferRicherItems: true });
    write(data);
  }

  function absorbAuthorsPack(pack) {
    if (!pack) return;
    var list = Array.isArray(pack) ? pack : (pack.authors || []);
    var hidden = Array.isArray(pack) ? [] : (pack.hiddenSlugs || []);
    var data = read();
    data.authors = mergeRecordLists(data.authors || [], list, {});
    var have = {};
    (data.hiddenSlugs || []).forEach(function (s) { have[String(s)] = 1; });
    hidden.forEach(function (s) {
      if (s && !have[String(s)]) {
        data.hiddenSlugs.push(String(s));
        have[String(s)] = 1;
      }
    });
    write(data);
  }

  function absorbEventsPack(pack) {
    if (!pack) return;
    var items = Array.isArray(pack) ? pack : (pack.items || pack.events || []);
    var orgs = Array.isArray(pack) ? [] : (pack.organizers || []);
    var data = read();
    if (items.length) data.events = mergeRecordLists(data.events || [], items, {});
    if (orgs.length) data.organizers = mergeRecordLists(data.organizers || [], orgs, {});
    write(data);
  }

  var remoteHydrated = false;
  function hydrateRemote(done) {
    var finish = function (ok) {
      if (ok) remoteHydrated = true;
      paintDeskBanner();
      if (done) done();
    };
    if (remoteHydrated) { finish(true); return Promise.resolve(); }
    return Promise.all([
      pullRemotePack(CYCLES_PAGE_SLUG).then(function (p) { if (Array.isArray(p)) absorbCycles(p); }),
      pullRemotePack(AUTHORS_PAGE_SLUG).then(absorbAuthorsPack),
      pullRemotePack(EVENTS_PAGE_SLUG).then(absorbEventsPack),
    ]).then(function () { finish(true); }).catch(function () { finish(false); });
  }

  function publishedAuthorsPack() {
    var by = {};
    function put(a, replaceRecent) {
      if (!a) return;
      var slug = a.slug || a.id;
      if (!slug) return;
      var key = String(slug).toLowerCase();
      if (a.status && a.status !== 'published') {
        if (a.status === 'hidden') delete by[key];
        return;
      }
      var prev = by[key] || {};
      by[key] = {
        slug: slug,
        name: a.name || prev.name || '',
        role: a.role != null && a.role !== '' ? a.role : (prev.role || ''),
        bio: a.bio || prev.bio || '',
        photo: httpUrl(a.photo) ? a.photo : (prev.photo || ''),
        recent: replaceRecent && a.recent
          ? a.recent
          : ((a.recent && a.recent.length >= (prev.recent || []).length) ? a.recent : (prev.recent || a.recent || [])),
      };
    }
    (window.YakAuthors || []).forEach(function (a) { put(a, false); });
    (read().authors || []).forEach(function (a) { put(a, true); });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  function publishAuthors() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return pullRemotePack(AUTHORS_PAGE_SLUG).then(function (remote) {
      absorbAuthorsPack(remote);
      var list = publishedAuthorsPack();
      return AdminApi.upsertArchive({
        articles: [{
          id: AUTHORS_PAGE_ID,
          slug: AUTHORS_PAGE_SLUG,
          title: 'Авторы редакции',
          date: todayIso(),
          modified: new Date().toISOString(),
          author: '',
          categories: [],
          categorySlugs: ['day-by-day'],
          excerpt: '',
          contentHtml: '<p></p>',
          contentText: JSON.stringify({ authors: list, hiddenSlugs: read().hiddenSlugs || [] }),
          source: 'desk-authors',
        }],
      });
    });
  }

  function publishedOrganizers() {
    var by = {};
    mergedList('organizer').forEach(function (o) {
      if (!o || !o.id) return;
      if (o.status && o.status !== 'published') return;
      by[o.id] = {
        id: o.id,
        name: o.name || '',
        short: o.short || o.name || '',
        city: o.city || '',
        blurb: o.blurb || o.desc || '',
        website: o.website || '',
        logo: httpUrl(o.logo) ? o.logo : '',
        coverTone: o.coverTone || '#5c5346',
        partnerTitle: o.partnerTitle || '',
      };
    });
    (read().organizers || []).forEach(function (o) {
      if (o && o.status === 'hidden' && o.id) by[o.id] = { id: o.id, status: 'hidden' };
    });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  function uniqueOrganizerSlug(base, keepId) {
    var slug = slugify(base) || 'organizer';
    var used = {};
    mergedList('organizer').forEach(function (o) {
      if (!o || o.status === 'hidden') return;
      if (o.id && o.id !== keepId) used[o.id] = true;
    });
    if (!used[slug]) return slug;
    var n = 2;
    while (used[slug + '-' + n]) n += 1;
    return slug + '-' + n;
  }

  function orgTone(name) {
    var tones = ['#5c5346', '#6b2d3c', '#2f5d8c', '#3d6b4f', '#8a5a2b', '#4a3f6b'];
    var h = 0;
    String(name || '').split('').forEach(function (ch) { h = (h + ch.charCodeAt(0)) % tones.length; });
    return tones[h];
  }

  function renderOrganizers(ctx, id) {
    if (id) {
      renderOrganizerForm(ctx, id);
      return;
    }
    if (window.AdminGod) {
      AdminGod.paintSection(ctx, 'organizer', 'Организаторы', '#organizers/new');
      return;
    }
    var items = mergedList('organizer');
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Организаторы</h1><p>Карточки в афише: название, город, сайт, текст и логотип-кружок.</p></div>' +
      '<div class="topbar-actions"><a class="btn btn-primary" href="#organizers/new">Добавить</a></div></div>' +
      '<div class="panel">' +
      (items.length
        ? '<div class="list-stack">' + items.map(function (o) {
          return '<a class="list-item" href="#organizers/' + esc(o.id) + '"><div><strong>' + esc(o.name) + '</strong><small>' + esc(o.city || '') + '</small></div></a>';
        }).join('') + '</div>'
        : emptyRow('Пока нет организаторов.')) +
      '</div>';
  }

  function renderOrganizerForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew
      ? { id: '', name: '', city: '', website: '', blurb: '', logo: '', coverTone: '#5c5346', status: 'published' }
      : getItem('organizer', id);
    if (!item) { ctx.toast('Организатор не найден', true); ctx.go('organizers'); return; }
    var logo = item.logo || '';
    composeShell(
      ctx, isNew ? 'Новый организатор' : 'Организатор', 'organizers',
      field('Название', 'd-title', item.name) +
      '<div class="field slug-row"><label>Адрес</label>' +
      '<span class="slug-prefix">organizer.html?id=</span>' +
      '<input class="input" id="d-slug" value="' + esc(item.id || '') + '" placeholder="iskusstvo-dobra" autocomplete="off" /></div>' +
      field('Город', 'd-city', item.city) +
      field('Сайт', 'd-href', item.website || '', 'text', 'placeholder="https://"') +
      field('Описание', 'd-desc', item.blurb || item.desc || '', 'textarea') +
      '<div class="field"><label>Логотип — на сайте цветным кружком</label>' +
      '<div class="cover-frame' + (logo ? '' : ' is-empty') + '" id="d-cover-frame" style="width:88px;height:88px;border-radius:50%;overflow:hidden">' +
      (logo ? '<img src="' + esc(mediaSrc(logo)) + '" alt="" />' : '<span>Кружок</span>') +
      '</div>' +
      '<input type="hidden" id="d-cover" value="' + esc(logo) + '" />' +
      '<button type="button" class="btn btn-ghost" id="d-cover-up">Загрузить логотип</button>' +
      '<input type="file" id="d-cover-file" accept="image/*" hidden /></div>',
      function (status) { saveOrganizer(ctx, item, isNew, status); },
      function () { saveOrganizer(ctx, item, isNew, 'published'); },
      isNew ? null : function () {
        if (!confirm('Снять организатора с афиши?')) return;
        hideItem('organizer', item.id);
        ctx.toast('Снимаем…');
        publishEvents().then(function () {
          ctx.toast('Снято');
          ctx.go('organizers');
        }).catch(function (err) {
          ctx.toast((err && err.message) || 'Снято локально', true);
          ctx.go('organizers');
        });
      },
      item.id ? ('organizer.html?id=' + encodeURIComponent(item.id)) : 'events.html'
    );
    bindSlugField(!isNew && !!item.id);
    var coverInp = document.getElementById('d-cover');
    var frame = document.getElementById('d-cover-frame');
    var up = document.getElementById('d-cover-up');
    var file = document.getElementById('d-cover-file');
    if (up && file) {
      up.onclick = function () { file.click(); };
      file.onchange = function () {
        var f = file.files && file.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          shrinkImage(reader.result, 640, 0.86, function (src) {
            if (coverInp) coverInp.value = src;
            if (frame) {
              frame.classList.remove('is-empty');
              frame.innerHTML = '<img src="' + esc(src) + '" alt="" />';
            }
          });
        };
        reader.readAsDataURL(f);
      };
    }
  }

  function saveOrganizer(ctx, item, isNew, status) {
    var name = val('d-title');
    if (!name) { ctx.toast('Укажите название', true); return; }
    var nextId = (!isNew && item.id && (!val('d-slug') || val('d-slug') === item.id))
      ? item.id
      : uniqueOrganizerSlug(val('d-slug') || name, item.id);
    var logoNow = val('d-cover');
    var next = Object.assign({}, item, {
      id: nextId,
      slug: nextId,
      name: name,
      short: item.short || name,
      city: val('d-city'),
      website: val('d-href'),
      blurb: val('d-desc'),
      logo: logoNow,
      coverTone: item.coverTone || orgTone(name),
      status: status,
    });
    var ready = (logoNow && logoNow.indexOf('data:') === 0)
      ? (ctx.toast('Сохраняем логотип…'), uploadDataUrl(logoNow, 'covers').then(function (url) { next.logo = url; }))
      : Promise.resolve();
    ctx.toast(status === 'published' ? 'Публикуем…' : 'Сохраняем…');
    ready.then(function () {
      if (item.id && item.id !== next.id) hideItem('organizer', item.id);
      upsert('organizer', next);
      if (status === 'published') return publishEvents();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён');
      ctx.go('organizers');
    }).catch(function (e) {
      ctx.toast(e.message || 'Не удалось сохранить', true);
    });
  }

  function listTopics() {
    return (read().topics || []).filter(function (t) { return t && t.title; });
  }

  function upsertTopic(topic) {
    var data = read();
    data.topics = data.topics || [];
    var i = data.topics.findIndex(function (t) {
      return t && (String(t.id) === String(topic.id) || (topic.slug && t.slug === topic.slug));
    });
    topic.id = topic.id || uid('topic');
    topic.slug = topic.slug || (topic.q ? '' : slugify(topic.title));
    if (i === -1) data.topics.unshift(topic);
    else data.topics[i] = Object.assign({}, data.topics[i], topic);
    write(data);
    return topic;
  }

  function deleteTopic(id) {
    var data = read();
    data.topics = (data.topics || []).filter(function (t) { return String(t.id) !== String(id); });
    write(data);
  }

  function publishTopics() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var list = listTopics().map(function (t) {
      return {
        title: t.title,
        slug: t.slug || '',
        q: t.q || '',
        note: t.note || '',
      };
    });
    return AdminApi.upsertArchive({
      articles: [{
        id: TOPICS_PAGE_ID,
        slug: TOPICS_PAGE_SLUG,
        title: 'Темы раздела Статьи',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify(list),
        source: 'desk-topics',
      }],
    });
  }

  function slimPhoto(p) {
    if (!p || !p.id) return null;
    var url = p.url || p.thumb || '';
    if (!url || String(url).indexOf('data:') === 0) return null;
    if (p.status && p.status !== 'approved') return null;
    return {
      id: p.id,
      url: url,
      thumb: p.thumb || url,
      title: p.title || '',
      tags: p.tags || [],
      photographerId: p.photographerId || '',
      photographerSlug: p.photographerSlug || '',
      photographerName: p.photographerName || p.ownerName || '',
      photographerTag: p.photographerTag || '',
      status: 'approved',
      createdAt: p.createdAt || p.updatedAt || '',
      license: p.license || 'CC BY 4.0',
    };
  }

  function slimPhotographer(p) {
    if (!p || !(p.id || p.slug)) return null;
    var photo = httpUrl(p.photo) || (p.photo && String(p.photo).indexOf('data:') !== 0 ? p.photo : '');
    return {
      id: p.id || p.slug,
      name: p.name || '',
      slug: p.slug || '',
      email: p.email || '',
      photo: photo || '',
      bio: p.bio || '',
      social: p.social || {},
      tagSlug: p.tagSlug || ((p.slug || '') + '-photos'),
      createdAt: p.createdAt || '',
      updatedAt: p.updatedAt || '',
    };
  }

  function publishPhotostock() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var photos = ((window.AdminStore && AdminStore.listPhotos()) || []).map(slimPhoto).filter(Boolean);
    var photographers = ((window.AdminStore && AdminStore.listPhotographers()) || []).map(slimPhotographer).filter(Boolean);
    return AdminApi.upsertArchive({
      articles: [{
        id: PHOTO_PAGE_ID,
        slug: PHOTO_PAGE_SLUG,
        title: 'Фотосток редакции',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify({ photographers: photographers, photos: photos }),
        source: 'desk-photostock',
      }],
    });
  }

  function syncArticleToCycle(article) {
    if (!article || !article.slug) return;
    var want = String(article.cycleSlug || '').trim();
    var order = parseInt(article.cycleOrder, 10) || 0;
    catalogCycles().forEach(function (c) {
      var items = (c.items || []).filter(function (it) { return it && String(it.slug) !== String(article.slug); });
      if (want && (String(c.id) === want || String(c.slug || '') === want)) {
        items.push({ slug: article.slug, title: article.title, order: order || items.length + 1 });
        items.sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
      }
      var changed = items.length !== (c.items || []).length ||
        (want && (String(c.id) === want || String(c.slug || '') === want));
      if (changed) upsert('cycle', Object.assign({}, c, { items: items, status: c.status || 'published' }));
    });
  }

  function publishCycles() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return pullRemotePack(CYCLES_PAGE_SLUG).then(function (remote) {
      if (Array.isArray(remote)) absorbCycles(remote);
      return AdminApi.upsertArchive({
        articles: [{
          id: CYCLES_PAGE_ID,
          slug: CYCLES_PAGE_SLUG,
          title: 'Циклы редакции',
          date: todayIso(),
          modified: new Date().toISOString(),
          author: '',
          categories: [],
          categorySlugs: ['day-by-day'],
          excerpt: '',
          contentHtml: '<p></p>',
          contentText: JSON.stringify(catalogCycles()),
          source: 'desk-cycles',
        }],
      });
    });
  }

  function loadPortalCycles(done) {
    if (window.YakCycles) { done(); return; }
    var s = document.createElement('script');
    s.src = PORTAL + 'js/cycles-data.js?v=' + (window.YAK_BUILD || Date.now());
    s.onload = function () { done(); };
    s.onerror = function () { done(); };
    document.head.appendChild(s);
  }

  function renderCycleForm(ctx, id) {
    loadPortalCycles(function () { paintCycleForm(ctx, id); });
  }

  function paintCycleForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew
      ? { id: '', title: '', slug: '', authorSlug: '', cover: '', intro: '', introHtml: '', items: [], status: 'draft' }
      : (getItem('cycle', id) || findCycle(id));
    if (!item) { ctx.toast('Цикл не найден', true); ctx.go('cycles'); return; }
    var currentAuthor = findAuthor(item.authorSlug || (item.authorSlugs && item.authorSlugs[0]));
    var cover = item.cover || item.image || '';
    var items = (item.items || []).map(function (it, i) {
      return { slug: it.slug, title: it.title || it.slug, order: it.order || (i + 1) };
    });

    ctx.viewEl.innerHTML =
      '<div class="post-editor">' +
      '<div class="post-editor-bar">' +
      '<a class="btn btn-ghost btn-back" href="#cycles">← Список</a>' +
      '<div class="post-editor-bar-actions">' +
      '<a class="btn btn-ghost" href="' + portalHref('cycle.html?id=' + encodeURIComponent(item.id || 'new')) + '" target="_blank" rel="noopener">На сайте</a>' +
      (isNew ? '' : '<button type="button" class="btn btn-ghost" id="desk-del">Снять</button>') +
      '<button type="button" class="btn btn-ghost" id="desk-draft">Черновик</button>' +
      '<button type="button" class="btn btn-primary" id="desk-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="pub-layout">' +
      '<div class="post-main panel">' +
      '<input class="editor-title" id="d-title" value="' + esc(item.title || '') + '" placeholder="Название цикла" />' +
      '<div class="slug-quiet"><span>Адрес</span><span class="slug-path">/<input id="d-slug" value="' + esc(item.id || item.slug || '') + '" spellcheck="false" /></span></div>' +
      '<div class="pub-meta">' +
      '<div class="pub-cover">' +
      '<div class="cover-frame' + (cover ? '' : ' is-empty') + '" id="d-cover-frame">' +
      (cover ? '<img src="' + esc(mediaSrc(cover)) + '" alt="" />' : '<span>Обложка</span>') +
      '</div>' +
      '<input type="hidden" id="d-cover" value="' + esc(cover) + '" />' +
      '<button type="button" class="btn btn-ghost" id="d-cover-up">Фото</button>' +
      '<input type="file" id="d-file" accept="image/*" hidden /></div>' +
      '<div class="pub-meta-col">' +
      '<input type="hidden" id="d-author-slug" value="' + esc((currentAuthor && currentAuthor.slug) || item.authorSlug || '') + '" />' +
      '<div id="d-author-chip" class="author-chip-wrap"></div>' +
      '<div class="author-search" id="d-author-search">' +
      '<input class="input" id="d-author-q" placeholder="Автор цикла" autocomplete="off" />' +
      '<div class="author-suggest" id="d-author-suggest" hidden></div></div>' +
      '</div></div>' +
      '<div class="rte">' +
      '<div class="rte-bar" id="d-rte-bar">' +
      '<button type="button" data-cmd="bold">Ж</button>' +
      '<button type="button" data-cmd="italic">К</button>' +
      '<button type="button" data-block="h2">H2</button>' +
      '<button type="button" data-block="quote">« »</button>' +
      '<button type="button" data-act="link">Ссылка</button>' +
      '<span class="rte-sep"></span>' +
      '<button type="button" data-act="image">Фото</button>' +
      '<button type="button" data-act="caption">Подпись</button>' +
      '</div>' +
      '<div class="rte-body" id="d-body" contenteditable="true" data-placeholder="Вступительное слово цикла"></div>' +
      '<input type="file" id="d-inline-file" accept="image/*" hidden />' +
      '</div>' +
      '<div class="cycle-arts panel" style="margin-top:16px">' +
      '<h3>Материалы цикла</h3>' +
      '<div class="author-search">' +
      '<input class="input" id="d-art-q" placeholder="Статья, интервью, проповедь, свидетельство" autocomplete="off" />' +
      '<div class="author-suggest" id="d-art-suggest" hidden></div></div>' +
      '<div id="d-art-list" class="cycle-art-list"></div>' +
      '</div></div></div></div>';

    var bodyEl = document.getElementById('d-body');
    bodyEl.innerHTML = item.introHtml || (item.intro ? '<p>' + esc(item.intro) + '</p>' : '');
    mountDeskRTE(bodyEl, function () {});
    bindCoverFile(function () {});
    bindSlugField(!!(item.id || item.slug));
    bindAuthorChip(currentAuthor);

    function drawItems() {
      var box = document.getElementById('d-art-list');
      if (!box) return;
      if (!items.length) {
        box.innerHTML = '<p class="hint-note">Пока пусто — найдите материал сверху: статью, интервью, проповедь или свидетельство.</p>';
        return;
      }
      items.sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
      box.innerHTML = items.map(function (it, i) {
        return '<div class="cycle-art-row" data-i="' + i + '">' +
          '<input class="input cycle-art-num" type="number" min="1" value="' + esc(it.order || (i + 1)) + '" />' +
          '<span>' + esc(it.title) + '<small> /' + esc(it.slug) + '</small></span>' +
          '<button type="button" class="btn btn-ghost cycle-art-x">Убрать</button></div>';
      }).join('');
      box.querySelectorAll('.cycle-art-num').forEach(function (inp) {
        inp.onchange = function () {
          var i = parseInt(inp.closest('.cycle-art-row').getAttribute('data-i'), 10);
          items[i].order = parseInt(inp.value, 10) || (i + 1);
        };
      });
      box.querySelectorAll('.cycle-art-x').forEach(function (btn) {
        btn.onclick = function () {
          var i = parseInt(btn.closest('.cycle-art-row').getAttribute('data-i'), 10);
          items.splice(i, 1);
          drawItems();
        };
      });
    }
    drawItems();

    /* Цикл-хаб без сохранённого состава: берём ссылки из страницы цикла в нашей базе */
    if (!items.length && item.hubSlug && window.YakCycles && YakCycles.hydrate) {
      var hubBox = document.getElementById('d-art-list');
      if (hubBox) hubBox.innerHTML = '<p class="hint-note">Загружаем состав цикла со страницы-хаба…</p>';
      YakCycles.hydrate(item).then(function () {
        if (items.length) return;
        (item.items || []).forEach(function (it, i) {
          items.push({ slug: it.slug, title: it.title || it.slug, order: it.order || (i + 1) });
        });
        drawItems();
      });
    }

    var aq = document.getElementById('d-art-q');
    var asg = document.getElementById('d-art-suggest');
    function showArts(list) {
      if (!asg) return;
      if (!list.length) { asg.hidden = true; asg.innerHTML = ''; return; }
      asg.hidden = false;
      asg.innerHTML = list.map(function (a) {
        return '<button type="button" class="author-suggest-item" data-slug="' + esc(a.slug || a.id) + '" data-title="' + esc(a.title || '') + '">' +
          '<span>' + esc(a.title) + '</span></button>';
      }).join('');
      asg.querySelectorAll('[data-slug]').forEach(function (btn) {
        btn.onclick = function () {
          var slug = btn.getAttribute('data-slug');
          if (items.some(function (x) { return String(x.slug) === slug; })) return;
          items.push({ slug: slug, title: btn.getAttribute('data-title') || slug, order: items.length + 1 });
          aq.value = '';
          asg.hidden = true;
          drawItems();
        };
      });
    }
    function searchArts(q) {
      var local = mergedList('article', q).slice(0, 8);
      if (!q || !window.AdminApi || !AdminApi.getArticles) { showArts(local); return; }
      AdminApi.getArticles({ q: q, limit: 20, page: 1 }).then(function (pack) {
        var extra = ((pack && pack.items) || []).map(function (a) {
          return { slug: a.slug || String(a.id), title: a.title };
        });
        var seen = {};
        var out = [];
        local.concat(extra).forEach(function (a) {
          var k = String(a.slug || '');
          if (!k || seen[k]) return;
          seen[k] = 1;
          out.push(a);
        });
        showArts(out.slice(0, 8));
      }).catch(function () { showArts(local); });
    }
    if (aq) {
      var timer = null;
      aq.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { searchArts(aq.value.trim()); }, 250);
      });
      aq.addEventListener('focus', function () { searchArts(aq.value.trim()); });
    }

    function collect(status) {
      var title = val('d-title');
      if (!title) { ctx.toast('Укажите название цикла', true); return null; }
      var slug = val('d-slug') || slugify(title);
      var author = findAuthor(val('d-author-slug') || val('d-author-q'));
      var html = bodyEl ? bodyEl.innerHTML : '';
      items.forEach(function (it, i) { it.order = it.order || (i + 1); });
      items.sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
      return {
        id: slug,
        slug: slug,
        title: title,
        subtitle: author ? ('Авторский цикл ' + genitiveName(author.name)) : (item.subtitle || 'Авторский цикл'),
        authorSlug: author ? author.slug : (item.authorSlug || ''),
        authorSlugs: author ? [author.slug] : (item.authorSlugs || []),
        cover: val('d-cover'),
        image: val('d-cover'),
        intro: htmlToText(html).slice(0, 400),
        introHtml: html,
        hubUrl: item.hubUrl || '',
        hubSlug: item.hubSlug || '',
        items: items.map(function (it) { return { slug: it.slug, title: it.title, order: it.order }; }),
        status: status,
        source: 'desk',
      };
    }

    document.getElementById('desk-draft').onclick = function () {
      var next = collect('draft');
      if (!next) return;
      try { upsert('cycle', next); ctx.toast('Черновик сохранён'); ctx.go('cycles'); }
      catch (e) { ctx.toast(e.message || 'Не удалось сохранить', true); }
    };
    document.getElementById('desk-pub').onclick = function () {
      var next = collect('published');
      if (!next) return;
      var afterCover = String(next.cover || '').indexOf('data:') === 0
        ? (ctx.toast('Сохраняем фото на сервер…'), uploadDataUrl(next.cover, 'cycles'))
        : Promise.resolve(next.cover);
      afterCover.then(function (url) {
        next.cover = url;
        next.image = url;
        upsert('cycle', next);
        next.items.forEach(function (it, i) {
          var art = getItem('article', it.slug);
          if (art) {
            art.cycleSlug = next.id;
            art.cycleOrder = it.order || (i + 1);
            upsert('article', art);
          }
        });
        ctx.toast('Отправляем на сайт…');
        return publishCycles();
      }).then(function () {
        ctx.toast('Цикл опубликован');
        ctx.go('cycles');
      }).catch(function (e) {
        ctx.toast(e.message || 'Не удалось сохранить', true);
      });
    };
    var delBtn = document.getElementById('desk-del');
    if (delBtn) delBtn.onclick = function () {
      if (!confirm('Снять цикл с публикации? Статьи останутся.')) return;
      upsert('cycle', Object.assign({}, item, { status: 'hidden', id: item.id || item.slug }));
      ctx.toast('Снимаем…');
      publishCycles().then(function () {
        ctx.toast('Снято');
        ctx.go('cycles');
      }).catch(function (err) {
        ctx.toast((err && err.message) || 'Снято локально', true);
        ctx.go('cycles');
      });
    };
  }

  var LIST_MAP = { news: 'news', articles: 'article', afisha: 'event', audio: 'audio', video: 'video', 'church-day': 'church-day', cycles: 'cycle' };
  var FORM_MAP = {
    news: renderNewsForm,
    articles: renderArticleForm,
    cycles: renderCycleForm,
    afisha: renderEventForm,
    audio: renderAudioForm,
    video: renderVideoForm,
    'church-day': renderChurchForm,
  };

  function upsertGuide(item) {
    var data = read();
    var list = data.guides || [];
    item.updatedAt = new Date().toISOString();
    if (!item.createdAt) item.createdAt = item.updatedAt;
    var i = list.findIndex(function (x) {
      if (String(x.id) === String(item.id)) return true;
      if (item.nodeId && x.nodeId === item.nodeId && x.section === item.section) return true;
      return false;
    });
    if (i === -1) list.unshift(item);
    else list[i] = Object.assign({}, list[i], item);
    data.guides = list;
    write(data, item.id || item.nodeId);
    return item;
  }

  function exportDesk() {
    var data = read();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'yak-desk-' + todayIso() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importDesk(ctx, mode) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var incoming;
        try { incoming = JSON.parse(reader.result); } catch (e) { if (ctx) ctx.toast('Файл повреждён', true); return; }
        if (!incoming || typeof incoming !== 'object') { if (ctx) ctx.toast('Неверный формат', true); return; }
        if (mode === 'replace') {
          write(Object.assign(emptyState(), incoming));
        } else {
          var cur = read();
          Object.keys(emptyState()).forEach(function (key) {
            var inc = incoming[key];
            if (inc == null) return;
            if (key === 'hiddenSlugs' && Array.isArray(inc)) {
              var have = {};
              (cur[key] || []).forEach(function (s) { have[String(s)] = 1; });
              inc.forEach(function (s) {
                if (s && !have[String(s)]) {
                  cur[key] = cur[key] || [];
                  cur[key].push(String(s));
                  have[String(s)] = 1;
                }
              });
              return;
            }
            if (!Array.isArray(inc)) {
              if (inc && typeof inc === 'object') cur[key] = Object.assign({}, cur[key] || {}, inc);
              return;
            }
            if (!inc.length) return;
            var list = Array.isArray(cur[key]) ? cur[key] : [];
            inc.forEach(function (rec) {
              if (!rec) return;
              var i = list.findIndex(function (x) {
                return x && rec && (
                  (rec.id && String(x.id) === String(rec.id)) ||
                  (rec.slug && String(x.slug || '') === String(rec.slug)) ||
                  (rec.date && String(x.date) === String(rec.date))
                );
              });
              if (i === -1) list.unshift(rec);
              else list[i] = Object.assign({}, list[i], rec);
            });
            cur[key] = list;
          });
          write(cur);
        }
        if (ctx) { ctx.toast('Контент загружен'); if (ctx.go) ctx.go('church-day'); }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  function renderRoute(name, id, ctx) {
    if (name === 'publish' || name === 'dashboard') {
      renderHub(ctx);
      return true;
    }
    if (name === 'media' || name === 'photostock') {
      return false;
    }
    if (name === 'church' || name === 'spirit') {
      if (window.AdminGuides) {
        if (id) AdminGuides.renderEditor(ctx, name, decodeURIComponent(id));
        else AdminGuides.renderList(ctx, name);
        return true;
      }
      if (id && window.AdminGod) AdminGod.paintGuideEdit(ctx, window.YakGuides && YakGuides[name], decodeURIComponent(id), name);
      else if (window.AdminGod) AdminGod.paintSection(ctx, name, name === 'church' ? 'О Церкви' : 'Духовная жизнь', '');
      return true;
    }
    if (name === 'authors') {
      if (!id && window.AdminGod) AdminGod.paintSection(ctx, 'authors', 'Авторы', '#authors/new');
      else renderAuthors(ctx, id);
      return true;
    }
    if (name === 'organizers') {
      renderOrganizers(ctx, id);
      return true;
    }
    if (name === 'cycles') {
      if (!id && window.AdminGod) {
        loadPortalCycles(function () { AdminGod.paintSection(ctx, 'cycle', 'Циклы', '#cycles/new'); });
      } else renderCycleForm(ctx, id);
      return true;
    }
    if (LIST_MAP[name]) {
      if (id) FORM_MAP[name](ctx, id);
      else renderList(LIST_MAP[name], ctx);
      return true;
    }
    return false;
  }

  global.AdminDesk = {
    BLOCKS: BLOCKS,
    renderRoute: renderRoute,
    renderHub: renderHub,
    mediaSrc: mediaSrc,
    loadSeed: loadSeed,
    loadArchive: loadArchive,
    archiveInfo: archiveInfo,
    mergedList: mergedList,
    allPhotos: allPhotos,
    uploadDataUrl: uploadDataUrl,
    uploadBlob: uploadBlob,
    attachField: attachField,
    bindBucketFile: bindBucketFile,
    fileLabel: fileLabel,
    readMediaDuration: readMediaDuration,
    publishAudio: publishAudio,
    publishVideo: publishVideo,
    publishPhotostock: publishPhotostock,
    listTopics: listTopics,
    upsertTopic: upsertTopic,
    deleteTopic: deleteTopic,
    publishTopics: publishTopics,
    portalHref: portalHref,
    read: read,
    write: write,
    upsertGuide: upsertGuide,
    linkAuthor: linkAuthor,
    exportDesk: exportDesk,
    importDesk: importDesk,
    hydrateRemote: hydrateRemote,
  };

  try {
    loadSeed(function () {});
    loadArchive('news', function () {});
    loadArchive('article', function () {});
    hydrateRemote();
  } catch (e) {}
})(window);
