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
    { id: 'ask-priest', title: 'Вопросы священнику' },
    { id: 'psiholog', title: 'Вопросы психологу' },
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
    { id: 'theatre', title: 'Спектакль' },
    { id: 'service', title: 'Богослужение' },
  ];

  function emptyState() {
    return { articles: [], events: [], audio: [], video: [], churchDays: [], authors: [], organizers: [], hiddenSlugs: [], guides: [], authorLinks: [], photographers: [], videoChannels: [], cycles: [], topics: [], libraryItems: [], libraryRubrics: [], libraryThemes: [], podcasts: [], home: null, about: null };
  }

  var archiveCache = { news: [], article: [] };
  var remoteCache = { cycles: null, authors: null, events: null, guides: null, video: null, photostock: null, home: null, about: null, calendar: null, topics: null, audio: null, library: null, podcasts: null };
  /* Время последней записи каждого пакета на сервере (slug → ISO). */
  var packStamp = {};

  function authorsFromPack(pack) {
    if (!pack) return [];
    return Array.isArray(pack) ? pack : (pack.authors || []);
  }

  function eventsFromPack(pack) {
    if (!pack) return [];
    return Array.isArray(pack) ? pack : (pack.items || pack.events || []);
  }

  function orgsFromPack(pack) {
    if (!pack || Array.isArray(pack)) return [];
    return pack.organizers || [];
  }

  function listFromPack(pack, key) {
    if (!pack) return [];
    if (Array.isArray(pack)) return pack;
    return Array.isArray(pack[key]) ? pack[key] : [];
  }

  function remoteItems(type) {
    if (type === 'cycle') return listFromPack(remoteCache.cycles, 'cycles');
    if (type === 'authors') return authorsFromPack(remoteCache.authors);
    if (type === 'event') return eventsFromPack(remoteCache.events);
    if (type === 'organizer') return orgsFromPack(remoteCache.events);
    if (type === 'video') return listFromPack(remoteCache.video, 'items');
    if (type === 'video-channel') return listFromPack(remoteCache.video, 'channels');
    if (type === 'audio') return listFromPack(remoteCache.audio, 'tracks');
    if (type === 'church-day') return listFromPack(remoteCache.calendar, 'days').map(function (d) {
      return d && d.date ? Object.assign({ id: d.date }, d) : d;
    });
    return [];
  }

  function packSlugOf(type) {
    if (type === 'event' || type === 'organizer') return EVENTS_PAGE_SLUG;
    if (type === 'video' || type === 'video-channel') return VIDEO_PAGE_SLUG;
    if (type === 'audio') return AUDIO_PAGE_SLUG;
    if (type === 'church-day') return CALENDAR_PAGE_SLUG;
    if (type === 'authors') return AUTHORS_PAGE_SLUG;
    if (type === 'cycle') return CYCLES_PAGE_SLUG;
    return '';
  }

  /* Время правки серверной записи. У старых записей своего времени нет —
     берём время записи пакета: раньше него запись точно не менялась. */
  function remoteTime(rec, type) {
    return String((rec && (rec.updatedAt || rec.modified)) || packStamp[packSlugOf(type)] || '');
  }

  /* На проде афиша и партнёры видео целиком берутся из пакета: вшитые карточки
     показываем, только пока пакет не загружен. */
  function packReplacesSite(type) {
    if (type === 'event' || type === 'organizer') return !!remoteCache.events;
    if (type === 'video-channel') return !!(remoteCache.video && Array.isArray(remoteCache.video.channels));
    return false;
  }

  function authorKey(a) {
    return String((a && (a.slug || a.id)) || '').toLowerCase();
  }

  function dayKey(d) {
    return String((d && (d.date || d.id)) || '');
  }

  function keyFnOf(type) {
    if (type === 'authors') return authorKey;
    if (type === 'church-day') return dayKey;
    return recKey;
  }

  /* Новая правка всегда новее той серверной версии, с которой начали,
     даже если часы другого компьютера спешат. */
  function freshStamp(type, item) {
    var now = new Date().toISOString();
    var keyOf = keyFnOf(type);
    var k = keyOf(item);
    if (!k) return now;
    var rem = remoteItems(type).filter(function (r) { return r && keyOf(r) === k; })[0];
    var rt = rem ? remoteTime(rem, type) : String((item && (item._serverModified || item.modified)) || '');
    if (rt && rt >= now) {
      var t = Date.parse(rt);
      if (!isNaN(t)) return new Date(t + 1).toISOString();
    }
    return now;
  }

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

  /* Копии в столе, которые уже есть на сервере в той же или более свежей версии,
     больше не нужны: список и форма берут серверную. Черновики не трогаем. */
  function pruneRemoteCopies(data) {
    var changed = false;
    function slim(key, type) {
      var remoteList = remoteItems(type);
      if (!Array.isArray(data[key]) || !data[key].length || !remoteList.length) return;
      var keyOf = keyFnOf(type);
      var remoteBy = {};
      remoteList.forEach(function (rec) {
        var k = keyOf(rec);
        if (k) remoteBy[k] = rec;
      });
      var kept = data[key].filter(function (rec) {
        if (!rec) return false;
        var rem = remoteBy[keyOf(rec)];
        if (!rem || rec.status === 'draft') return true;
        return String(rec.updatedAt || '') > remoteTime(rem, type);
      });
      if (kept.length !== data[key].length) {
        data[key] = kept;
        changed = true;
      }
    }
    slim('cycles', 'cycle');
    slim('authors', 'authors');
    slim('events', 'event');
    slim('organizers', 'organizer');
    slim('audio', 'audio');
    slim('video', 'video');
    slim('videoChannels', 'video-channel');
    slim('churchDays', 'church-day');
    /* Статьи: опубликованная копия не нужна, если на сервере та же или более свежая версия. */
    var served = {};
    ['news', 'article'].forEach(function (t) {
      (archiveCache[t] || []).forEach(function (x) {
        if (!x || !x.modified) return;
        if (x.id) served['id:' + x.id] = String(x.modified);
        if (x.slug) served['slug:' + x.slug] = String(x.modified);
      });
    });
    var arts = (data.articles || []).filter(function (a) {
      if (!a) return false;
      if (a.status === 'draft') return true;
      var m = served['id:' + a.id] || (a.slug ? served['slug:' + a.slug] : '') || '';
      return !m || String(a.updatedAt || '') > m;
    });
    if (arts.length !== (data.articles || []).length) {
      data.articles = arts;
      changed = true;
    }
    (data.articles || []).forEach(function (a) {
      stripHeavy(a, false);
    });
    return changed;
  }

  function paintDeskBanner() {
    var el = document.getElementById('desk-banner');
    if (!el) return;
    var over = deskBytes() >= 4.6 * 1024 * 1024;
    el.hidden = !over;
    if (over) {
      el.innerHTML = '<p>В этом браузере накопилось слишком много черновиков, и старые статьи могут не сохраниться. Не очищайте сайт — откройте «Циклы» и нажмите «Опубликовать», затем обновите страницу.</p>';
    }
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
    pruneRemoteCopies(data);
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      paintDeskBanner();
      return;
    } catch (e2) {
      if (!isQuota(e2)) throw e2;
    }
    compactDesk(data, keepId, true);
    pruneRemoteCopies(data);
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      paintDeskBanner();
    } catch (e3) {
      paintDeskBanner();
      throw new Error('Не хватает места в браузере для этой статьи. Опубликуйте циклы — копии уйдут на сервер, и сохранение снова заработает.');
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
    var skip = {};
    local.forEach(function (p) { skip[p.id] = 1; });
    var gone = (AdminStore.goneLog && AdminStore.goneLog('photos')) || {};
    Object.keys(gone).forEach(function (id) { skip[id] = 1; });
    var remote = remoteCache.photostock && remoteCache.photostock.photos;
    (Array.isArray(remote) ? remote : []).forEach(function (p) {
      if (p && p.id && p.status === 'hidden') skip[p.id] = 1;
    });
    return seedPhotos.filter(function (p) { return !skip[p.id]; }).concat(local);
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
    if (type === 'video-channel') return data.videoChannels || [];
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
    if (type === 'video-channel' && window.YakVideos) {
      return (YakVideos.channels || []).map(function (c) {
        return Object.assign({ status: 'published', source: 'site' }, c);
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
    mergeHiddenSlugs(remoteCache.authors, read()).slugs.forEach(function (s) {
      if (s) set[String(s)] = 1;
    });
    return set;
  }

  /* Что показывать в админке: вшитое в сайт → пакет с сервера → правки этого браузера.
     Правка браузера перекрывает серверную запись, только если она новее.
     _sync: 'draft' — черновик здесь; 'pending' — ещё не на сайте; 'hidden' — снято. */
  function mergedList(type, q) {
    q = String(q || '').trim().toLowerCase();
    var byId = {};
    var fromRemote = {};
    var isArchive = type === 'news' || type === 'article';
    var site = isArchive ? (archiveCache[type] || []) : (packReplacesSite(type) ? [] : siteItems(type));
    if (type === 'article') {
      authorWorkItems(q).forEach(function (x) {
        if (x && x.id != null && x.id !== '') byId[String(x.id)] = x;
      });
    }
    site.forEach(function (x) {
      if (x && x.id != null && x.id !== '') byId[String(x.id)] = x;
      if (isArchive && x) {
        fromRemote[String(x.id)] = 1;
        if (x.slug) fromRemote[String(x.slug)] = 1;
      }
    });
    remoteItems(type).forEach(function (x) {
      if (!x) return;
      var key = String(x.id || x.slug || x.date || '');
      if (!key) return;
      var base = byId[key] || (x.slug && byId[String(x.slug)]) || { status: 'published', source: 'remote' };
      var merged = Object.assign({}, base, x, { id: x.id || base.id || key });
      byId[key] = merged;
      fromRemote[key] = 1;
      if (x.slug) { byId[String(x.slug)] = merged; fromRemote[String(x.slug)] = 1; }
    });
    listOf(type).forEach(function (x) {
      if (!x || x.id == null) return;
      var key = String(x.id);
      var skey = x.slug ? String(x.slug) : '';
      var cur = byId[key] || (skey && byId[skey]) || null;
      var onServer = !!(fromRemote[key] || (skey && fromRemote[skey]));
      if (cur && onServer && String(x.updatedAt || '') <= remoteTime(cur, type)) return;
      var merged = Object.assign({}, cur || {}, x);
      merged._sync = x.status === 'draft' ? 'draft' : 'pending';
      merged._live = !!(onServer && cur && cur.status !== 'hidden');
      byId[String(merged.id)] = merged;
      if (merged.slug) byId[String(merged.slug)] = merged;
    });
    Object.keys(byId).forEach(function (k) {
      var x = byId[k];
      if (x && !x._sync && x.status === 'hidden') byId[k] = Object.assign({}, x, { _sync: 'hidden' });
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

  /* Свежая версия записи: серверная, если правка в этом браузере не новее её. */
  function getItem(type, id) {
    id = String(id || '');
    var list = mergedList(type);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id || list[i].date === id || list[i].slug === id) return list[i];
    }
    return deskRecord(type, id);
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
      tags: a.tags || [],
      category: slugs[0],
      rubrics: slugs,
      cycleSlug: a.cycleSlug || a.cycle_slug || '',
      cycleOrder: a.cycleOrder || a.cycle_order || 0,
      modified: a.modified || '',
      status: slugs.length === 1 && slugs[0] === 'hidden' ? 'hidden' : 'published',
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
      : type === 'video-channel' ? 'videoChannels'
      : 'churchDays';
    var list = data[key] || [];
    delete item._sync;
    delete item._live;
    item.updatedAt = freshStamp(type, item);
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
      : type === 'video-channel' ? 'videoChannels'
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

  function stripOfficeJunk(s) {
    return String(s == null ? '' : s)
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
      .replace(/<!-+\s*StartFragment\s*-*>/gi, '')
      .replace(/<!-+\s*EndFragment\s*-*>/gi, '')
      .replace(/&lt;!-+\s*StartFragment\s*-*&gt;/gi, '')
      .replace(/&lt;!-+\s*EndFragment\s*-*&gt;/gi, '')
      .replace(/\uFEFF/g, '');
  }

  var LIST_TAGS = { ul: 1, ol: 1, li: 1 };

  function sanitizeLead(html, extra) {
    var box = document.createElement('div');
    box.innerHTML = stripOfficeJunk(html || '');
    box.querySelectorAll('script,style,iframe,object,img,video,figure,svg').forEach(function (n) { n.remove(); });
    var allow = { a: 1, em: 1, i: 1, strong: 1, b: 1, u: 1, br: 1, p: 1, span: 1 };
    if (extra) Object.keys(extra).forEach(function (k) { allow[k] = 1; });
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
    var html = item.excerptHtml || item.excerpt || '';
    if (!html) return '';
    if (hasMarkup(html) || /<!-/.test(html)) return sanitizeLead(html);
    return esc(stripOfficeJunk(html));
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

  function eventDescHtml() {
    var el = document.getElementById('d-desc');
    if (!el) return '';
    var box = document.createElement('div');
    box.innerHTML = el.innerHTML || '';
    box.querySelectorAll('div').forEach(function (d) {
      var p = document.createElement('p');
      while (d.firstChild) p.appendChild(d.firstChild);
      d.parentNode.replaceChild(p, d);
    });
    var html = flatBlocks(sanitizeLead(box.innerHTML, LIST_TAGS));
    return htmlToText(html) ? html : '';
  }

  /* Chrome оставляет первую строку голым текстом, а список кладёт внутрь абзаца —
     раскладываем в ровный ряд абзацев и списков, пустые убираем. */
  function flatBlocks(html) {
    var src = document.createElement('div');
    src.innerHTML = html;
    var out = document.createElement('div');
    var para = null;
    function hasText(n) { return !!String(n.textContent || '').replace(/\u00a0/g, ' ').trim(); }
    function flush() {
      if (para) {
        while (para.firstChild && para.firstChild.nodeName === 'BR') para.removeChild(para.firstChild);
        while (para.lastChild && para.lastChild.nodeName === 'BR') para.removeChild(para.lastChild);
        if (hasText(para)) out.appendChild(para);
      }
      para = null;
    }
    function walk(parent) {
      [].slice.call(parent.childNodes).forEach(function (n) {
        var tag = n.nodeType === 1 ? n.tagName : '';
        if (tag === 'P') { flush(); walk(n); flush(); return; }
        if (tag === 'UL' || tag === 'OL') {
          flush();
          [].slice.call(n.querySelectorAll('li')).forEach(function (li) { if (!hasText(li)) li.parentNode.removeChild(li); });
          if (hasText(n)) out.appendChild(n);
          return;
        }
        if (!para) para = document.createElement('p');
        para.appendChild(n);
      });
    }
    walk(src);
    flush();
    return out.innerHTML;
  }

  /* Простой текст описания читает ИИ-чат на сервере: абзацы и пункты — с новой строки. */
  function richToPlain(html) {
    var box = document.createElement('div');
    box.innerHTML = String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n— ')
      .replace(/<\/?(p|ul|ol|li|div)\b[^>]*>/gi, '\n');
    return (box.textContent || '').replace(/[ \t\u00a0]+\n/g, '\n').replace(/\n[ \t\u00a0]+/g, '\n').replace(/\n{2,}/g, '\n').trim();
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
      var server = mapArchive(a, type);
      server._serverModified = String(a.modified || '');
      server._serverSlug = String(a.slug || '');
      archiveCache[type] = (archiveCache[type] || []).filter(function (x) {
        return String(x.id) !== String(server.id);
      }).concat([server]);
      /* Правка этого браузера открывается, только если она новее сайта. */
      var deskNewer = desk && String(desk.updatedAt || '') > server._serverModified;
      function withDesk() {
        return Object.assign({}, server, desk, {
          id: server.id,
          archiveId: server.id,
          source: 'desk',
          _serverModified: server._serverModified,
          _serverSlug: server._serverSlug,
        });
      }
      renderFn(deskNewer ? withDesk() : server);
      if (desk && !deskNewer && desk.status === 'draft') {
        var host = ctx.viewEl.querySelector('.post-main') || ctx.viewEl;
        var note = document.createElement('p');
        note.className = 'hint-note';
        note.innerHTML = 'На сайте версия новее вашего черновика от ' + esc(String(desk.updatedAt || '').slice(0, 16).replace('T', ' ')) +
          ' — открыта она. <button type="button" class="btn btn-ghost" id="desk-old-draft">Открыть мой черновик</button>';
        host.insertBefore(note, host.firstChild);
        var oldBtn = document.getElementById('desk-old-draft');
        if (oldBtn) oldBtn.onclick = function () { renderFn(withDesk()); };
      }
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
    var hidden = {};
    (read().authors || []).forEach(function (a) {
      if (a && a.status === 'hidden') hidden[String(a.slug || a.id || '').toLowerCase()] = 1;
    });
    function skipHidden(a) {
      var key = String((a && (a.slug || a.id)) || '').toLowerCase();
      return hidden[key];
    }
    (window.YakAuthors || []).forEach(function (a) { if (!skipHidden(a)) add(a); });
    authorsFromPack(remoteCache.authors).forEach(function (a) { if (!skipHidden(a)) add(a); });
    (read().authors || []).forEach(function (a) { if (!skipHidden(a)) add(a); });
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

  /* Номер новой статьи — случайный из верхнего диапазона; занятость проверяет сервер
     (expectModified: null), и при совпадении берём другой. */
  function mintArticleId() {
    return 2000000000 + Math.floor(Math.random() * 147483000);
  }

  function ensureNumericId(item) {
    var n = numericIdOf(item.id) || numericIdOf(item.archiveId);
    if (n) {
      if (String(item.id) !== String(n)) item._prevDeskId = item.id;
      item.id = n;
      item.archiveId = n;
      return n;
    }
    var minted = mintArticleId();
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

  /* opts.expectModified — версия на сервере, с которой открыли форму (null — статьи ещё нет).
     Возвращает modified записанной версии. */
  function publishToArchive(item, type, opts) {
    opts = opts || {};
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
    (item.tags || []).forEach(function (t) {
      var slug = 'tag:' + String((t && (t.slug || t)) || '');
      if (slug !== 'tag:' && slugs.indexOf(slug) === -1) slugs.push(slug);
    });
    var modified = new Date().toISOString();
    if (opts.after && opts.after >= modified) {
      var bump = Date.parse(opts.after);
      if (!isNaN(bump)) modified = new Date(bump + 1).toISOString();
    }
    var row = {
      id: ensureNumericId(item),
      slug: item.slug,
      title: item.title,
      date: item.date,
      modified: modified,
      author: item.author || '',
      categories: slugs.map(rubricTitle),
      categorySlugs: slugs,
      excerpt: item.excerptHtml || item.excerpt || '',
      contentHtml: item.contentHtml || '',
      contentText: item.body || '',
      image: httpCover(item) || undefined,
      authorSlug: item.authorSlug || '',
      authorSlugs: item.authorSlugs || (item.authorSlug ? [item.authorSlug] : []),
      tags: item.tags || [],
      source: 'desk',
    };
    if (opts.expectModified !== undefined) row.expectModified = opts.expectModified;
    return AdminApi.upsertArchive({ articles: [row] }).then(function (res) {
      var n = res && res.articles && res.articles.upserted;
      if (!res || res.ok === false || n === 0) throw new Error('сервер не сохранил статью');
      return modified;
    }, function (err) {
      if (err && err.status === 409) {
        var e = new Error(opts.expectModified === null
          ? 'номер статьи оказался занят'
          : 'Эту публикацию изменили с другого устройства, пока она была открыта здесь.');
        e.conflict = true;
        e.idTaken = opts.expectModified === null;
        throw e;
      }
      throw err;
    });
  }

  /* Адрес уже занят другой публикацией на сервере? Сбой проверки — не повод не публиковать:
     сервер ищет адрес в базе первым, и до запасного источника доходит, только если его там нет. */
  function slugTakenOnServer(slug, id) {
    if (!slug || !window.AdminApi || !AdminApi.getArticle) return Promise.resolve(false);
    return AdminApi.getArticle(slug).then(function (a) {
      return !!(a && a.slug === slug && a.id != null && String(a.id) !== String(id));
    }, function () { return false; });
  }

  /* Сервер подтвердил запись: список показывает серверную версию,
     копия в этом браузере больше не нужна (стол не пухнет). */
  function settleArchive(type, rec, modified) {
    var shown = Object.assign({}, rec, { modified: modified, source: 'site' });
    delete shown._sync;
    delete shown._live;
    archiveCache[type] = (archiveCache[type] || []).filter(function (x) {
      return String(x.id) !== String(shown.id) && !(shown.slug && x.slug === shown.slug);
    }).concat([shown]);
    var data = read();
    var before = data.articles.length;
    data.articles = data.articles.filter(function (a) {
      if (!a) return false;
      var same = String(a.id) === String(rec.id) ||
        (rec.slug && a.slug === rec.slug) ||
        (rec._prevDeskId && String(a.id) === String(rec._prevDeskId));
      return !same || String(a.updatedAt || '') > modified;
    });
    if (data.articles.length !== before) write(data);
  }

  /* Прежняя версия админки после удачной публикации ещё раз сохраняла статью в браузер — копия
     оказывалась на секунды новее сайта и светилась «Не отправлено». Такие копии сверяем с сервером
     и убираем, только если на сайте то же самое (или версия новее); настоящие неотправленные правки остаются. */
  function samePublished(copy, srv) {
    function text(html) { return htmlToText(stripOfficeJunk(html)); }
    function pic(u) { return String(u || '').split('?')[0].replace(/^.*\//, ''); }
    return String(copy.title || '').trim() === String(srv.title || '').trim() &&
      text(copy.contentHtml) === text(srv.contentHtml || srv.content || '') &&
      pic(httpCover(copy)) === pic(srv.image || srv.cover || '');
  }

  var healed = false;
  function healPublishedCopies(force) {
    if ((healed && !force) || !window.AdminApi || !AdminApi.getArticle) return Promise.resolve(0);
    healed = true;
    var suspects = (read().articles || []).filter(function (a) {
      return a && a.status === 'published' && a._serverModified === undefined && a.slug;
    });
    var drop = {};
    return suspects.reduce(function (chain, a) {
      return chain.then(function () {
        return AdminApi.getArticle(a.slug).then(function (srv) {
          if (!srv || srv.slug !== a.slug) return;
          var lag = Date.parse(a.updatedAt || '') - Date.parse(srv.modified || '');
          if (isNaN(lag)) return;
          if (lag <= 0 || (lag <= 120000 && samePublished(a, srv))) drop[String(a.id)] = String(a.updatedAt || '');
        }, function () {});
      });
    }, Promise.resolve()).then(function () {
      var ids = Object.keys(drop);
      if (!ids.length) return 0;
      var data = read();
      data.articles = (data.articles || []).filter(function (a) {
        return !(a && drop[String(a.id)] === String(a.updatedAt || ''));
      });
      write(data);
      if (/^#?(dashboard|news|articles)?$/.test(location.hash) && typeof HashChangeEvent === 'function') window.dispatchEvent(new HashChangeEvent('hashchange'));
      return ids.length;
    });
  }

  function catalogTags() {
    if (window.AdminStore && AdminStore.listTags) {
      return (AdminStore.listTags() || []).filter(function (t) { return t && (t.slug || t.id) && t.name; });
    }
    return [];
  }

  function collectedTags() {
    var out = [];
    document.querySelectorAll('#d-tags option:checked, #d-tags input:checked').forEach(function (el) {
      var slug = el.value;
      if (!slug) return;
      var t = catalogTags().filter(function (x) { return String(x.slug || x.id) === slug; })[0];
      out.push({ slug: slug, title: (t && (t.name || t.title)) || slug });
    });
    var sel = document.getElementById('d-tags');
    if (sel && sel.tagName === 'SELECT') {
      [].slice.call(sel.selectedOptions || []).forEach(function (opt) {
        if (!opt.value) return;
        if (out.some(function (t) { return t.slug === opt.value; })) return;
        out.push({ slug: opt.value, title: opt.textContent || opt.value });
      });
    }
    return out;
  }

  function tagPickerHtml(selected) {
    selected = selected || [];
    var slugs = selected.map(function (t) { return String(t.slug || t); });
    var tags = catalogTags();
    if (!tags.length) {
      return '<p class="hint-note">Теги задаются в разделе «Рубрики и темы». Пока список пуст.</p>';
    }
    return (
      '<div class="field"><label>Тег</label>' +
      '<select class="select" id="d-tags" multiple size="' + Math.min(6, tags.length) + '">' +
      tags.map(function (t) {
        var slug = t.slug || t.id;
        var on = slugs.indexOf(String(slug)) !== -1;
        return '<option value="' + esc(slug) + '"' + (on ? ' selected' : '') + '>' + esc(t.name || t.title || slug) + '</option>';
      }).join('') +
      '</select>' +
      '<p class="hint-note">Из меток, созданных в «Рубрики и темы». На сайте тег будет под текстом.</p></div>'
    );
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
      tagPickerHtml(item.tags || []) +
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
    var slug = String(item.slug || item.id || '');
    var onServer = !!(numericIdOf(item.id) || numericIdOf(item.archiveId) ||
      item._serverModified !== undefined || item.source === 'site' || item.source === 'author-work');
    if (!onServer) {
      remove(type, item.id);
      ctx.toast('Черновик удалён — на сайте его не было');
      ctx.go(back);
      return;
    }
    if (savingArticle) { ctx.toast('Уже отправляем — подождите', true); return; }
    savingArticle = true;
    hideItem(type, item.id || slug);
    markHiddenSlug(slug, true);
    var linked = {};
    (window.YakAuthors || []).concat(authorsFromPack(remoteCache.authors)).forEach(function (a) {
      if (!a || !a.slug || linked[a.slug]) return;
      if ((a.recent || []).some(function (p) { return p && String(p.slug) === slug; })) linked[a.slug] = 1;
    });
    if (item.authorSlug) linked[item.authorSlug] = 1;
    Object.keys(linked).forEach(function (a) { unlinkAuthor(a, slug); });
    var cyclesDirty = type === 'article' && syncArticleToCycle({ slug: slug, status: 'hidden' });
    ctx.toast('Снимаем с сайта…');
    var hidden = null;
    var main = Promise.resolve(null);
    if (item.source !== 'author-work' || item.contentHtml || item.body) {
      hidden = Object.assign({}, item, {
        slug: slug,
        title: item.title || slug,
        date: item.date || todayIso(),
        rubrics: ['hidden'],
        status: 'hidden',
        excerpt: item.excerpt || '',
        contentHtml: item.contentHtml || '',
        body: item.body || '',
      });
      main = publishToArchive(hidden, type, { after: item._serverModified || '' });
    }
    Promise.all([main, publishAuthors()]).then(function (res) {
      if (hidden && res[0]) settleArchive(type, hidden, res[0]);
      if (!cyclesDirty) return '';
      return publishCycles().then(function () { return ''; }, function (e) {
        return 'Снято, но цикл не обновился (' + ((e && e.message) || 'нет связи') + ') — откройте цикл и нажмите «Опубликовать».';
      });
    }).then(function (warn) {
      ctx.toast(warn || 'Снято с публикации', !!warn);
      ctx.go(back);
    }, function (err) {
      var msg = (err && err.message) || 'нет связи';
      ctx.toast(err && err.readFailed ? msg : ('Не снято с сайта: ' + msg + '. Нажмите «Снять» ещё раз.'), true);
    }).then(function () {
      savingArticle = false;
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

  /* Циклы, как они стоят на сайте, плюс опубликованные здесь правки новее серверных. */
  function catalogCycles() {
    var stamp = packStamp[CYCLES_PAGE_SLUG] || '';
    var byId = {};
    var order = [];
    var onServer = {};
    function put(id, rec) {
      if (!byId[id]) order.push(id);
      byId[id] = rec;
    }
    function inherit(next, prev) {
      if (!prev) return next;
      if (!next.authorSlug && prev.authorSlug) next.authorSlug = prev.authorSlug;
      if ((!next.authorSlugs || !next.authorSlugs.length) && prev.authorSlugs && prev.authorSlugs.length) {
        next.authorSlugs = prev.authorSlugs;
      }
      return next;
    }
    ((window.YakCycles && YakCycles.ALL) || []).forEach(function (c) {
      if (c && c.id) put(c.id, Object.assign({ status: 'published', source: 'site' }, c));
    });
    (Array.isArray(remoteCache.cycles) ? remoteCache.cycles : []).forEach(function (c) {
      if (!c || !c.id) return;
      var prev = byId[c.id];
      onServer[c.id] = 1;
      put(c.id, inherit(Object.assign({}, prev || {}, c, { updatedAt: c.updatedAt || stamp }), prev));
    });
    (read().cycles || []).forEach(function (c) {
      if (!c || !c.id || c.status === 'draft') return;
      var prev = byId[c.id];
      if (prev && onServer[c.id] && String(prev.updatedAt || '') >= String(c.updatedAt || '')) return;
      put(c.id, inherit(Object.assign({}, prev || {}, c), prev));
    });
    return order.map(function (k) { return byId[k]; }).filter(function (c) {
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

  function mountLeadRTE(el, onChange, barId, extra) {
    if (!el) return;
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      var box = document.createElement('div');
      if (hasMarkup(html)) box.innerHTML = html;
      else box.innerHTML = linkifyPlain(html);
      box.querySelectorAll('script,style,img,figure,iframe,video').forEach(function (n) { n.remove(); });
      document.execCommand('insertHTML', false, sanitizeLead(box.innerHTML, extra));
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
    if (savingArticle) { ctx.toast('Уже отправляем — подождите', true); return; }
    savingArticle = true;

    var ready = Promise.resolve({ cover: coverNow, html: html, lead: lead });
    if (status === 'published' && (String(coverNow).indexOf('data:') === 0 || /src="data:image/.test(html + lead))) {
      ctx.toast('Сохраняем фото на сервер…');
      ready = Promise.resolve().then(function () {
        return uploadDataUrl(coverNow, 'covers');
      }).then(function (cover) {
        return hoistHtmlImages(html, 'inline').then(function (h) {
          return hoistHtmlImages(lead, 'inline').then(function (l) {
            return { cover: cover, html: h, lead: l };
          });
        });
      });
    }

    var stored = false;
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
        tags: collectedTags(),
        status: status,
        source: 'desk',
      });
      /* Номер присваиваем до записи в стол: повтор после сбоя пишет ту же статью, а не новую. */
      var fresh = false;
      if (status === 'published') {
        fresh = !numericIdOf(next.id) && !numericIdOf(next.archiveId);
        ensureNumericId(next);
        item.id = next.id;
        item.archiveId = next.archiveId;
        if (next._prevDeskId) item._prevDeskId = next._prevDeskId;
      }
      upsert(type, next);
      stored = true;
      if (status !== 'published') {
        ctx.toast(item._serverModified ? 'Черновик сохранён здесь — на сайте пока прежняя версия' : 'Черновик сохранён — на сайт не отправлен');
        ctx.go(type === 'news' ? 'news' : 'articles');
        return;
      }
      ctx.toast('Отправляем на сайт…');
      return sendArticle(ctx, item, next, type, fresh, false, 3).then(function (modified) {
        if (modified == null) return;
        return afterArticlePublished(ctx, item, next, type, author, modified);
      });
    }).catch(function (e) {
      var msg = (e && e.message) || 'нет связи';
      ctx.toast(stored
        ? 'Не ушло на сайт: ' + msg + '. Правка сохранена здесь — нажмите «Опубликовать» ещё раз.'
        : 'Не сохранено: ' + msg + '. Текст остался в форме — повторите.', true);
    }).then(function () {
      savingArticle = false;
    });
  }

  var savingArticle = false;

  /* Запись статьи без перезаписи чужой правки. null — редактор решил не заменять. */
  function sendArticle(ctx, item, next, type, fresh, force, left) {
    var opts = { after: item._serverModified || '' };
    if (fresh) opts.expectModified = null;
    else if (!force && item._serverModified !== undefined) opts.expectModified = item._serverModified;
    var slugCheck = (!fresh && item._serverSlug && next.slug === item._serverSlug)
      ? Promise.resolve(false)
      : slugTakenOnServer(next.slug, next.id);
    return slugCheck.then(function (taken) {
      if (taken) throw new Error('адрес «' + next.slug + '» уже занят другой публикацией — поменяйте адрес');
      return publishToArchive(next, type, opts);
    }).catch(function (e) {
      if (e && e.idTaken && left > 0) {
        next.id = mintArticleId();
        next.archiveId = next.id;
        item.id = next.id;
        item.archiveId = next.id;
        upsert(type, next);
        return sendArticle(ctx, item, next, type, true, force, left - 1);
      }
      if (e && e.conflict && !e.idTaken) {
        if (confirm(e.message + '\n\nЗаменить ту версию вашей?')) return sendArticle(ctx, item, next, type, false, true, left);
        ctx.toast('Ничего не отправлено. Ваша правка сохранена здесь — откройте публикацию заново, чтобы увидеть версию с сайта.', true);
        return null;
      }
      throw e;
    });
  }

  /* Сервер принял статью: убираем копию из стола, возвращаем адрес из снятых,
     обновляем авторов и циклы. Сбой этих шагов показываем, а не глотаем. */
  function afterArticlePublished(ctx, item, next, type, author, modified) {
    var prevSlug = item._serverSlug || item.slug || '';
    var prevAuthor = item.authorSlug || (item.authorSlugs && item.authorSlugs[0]) || '';
    item._serverModified = modified;
    item._serverSlug = next.slug;
    settleArchive(type, next, modified);
    var authorsDirty = false;
    if (isSlugHidden(next.slug)) {
      markHiddenSlug(next.slug, false);
      authorsDirty = true;
    }
    if (prevAuthor && (!author || prevAuthor !== author.slug || (prevSlug && prevSlug !== next.slug))) {
      unlinkAuthor(prevAuthor, prevSlug || next.slug);
      authorsDirty = true;
    }
    if (author) {
      linkAuthor(author.slug, { slug: next.slug, title: next.title, date: next.date, excerpt: next.excerpt });
      authorsDirty = true;
    }
    function note(what) {
      return function (e) { return what + ' (' + ((e && e.message) || 'нет связи') + ')'; };
    }
    var follow = [];
    if (authorsDirty) follow.push(publishAuthors().then(function () { return ''; }, note('карточки авторов')));
    if (type === 'article' && syncArticleToCycle(next, prevSlug)) {
      follow.push(publishCycles().then(function () { return ''; }, note('цикл')));
    }
    return Promise.all(follow).then(function (res) {
      var bad = res.filter(Boolean);
      if (bad.length) ctx.toast('Статья на сайте, но не обновились: ' + bad.join('; ') + '. Нажмите «Опубликовать» ещё раз.', true);
      else ctx.toast('Опубликовано на сайте');
      ctx.go(type === 'news' ? 'news' : 'articles');
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
    var copy = cleanPackItem(e);
    if (copy && copy.status !== 'hidden') copy.status = 'published';
    return copy;
  }

  /* Афиша на проде целиком из пакета, поэтому пакет должен быть полным:
     серверный список + правки этого браузера, новее — побеждает. */
  function publishEvents() {
    return publishPackSafe({
      slug: EVENTS_PAGE_SLUG,
      fallbackId: EVENTS_PAGE_ID,
      title: 'Афиша редакции',
      source: 'desk-events',
      build: function (remote, stamp) {
        absorbEventsPack(remote);
        var data = read();
        var baseItems = remote ? eventsFromPack(remote) : siteItems('event').map(cleanEventPack);
        var baseOrgs = remote ? orgsFromPack(remote) : siteItems('organizer').map(function (o) { return shapeOrganizer(o); });
        return {
          items: lwwMerge(baseItems, data.events || [], { stamp: stamp, shape: cleanEventPack }),
          organizers: lwwMerge(baseOrgs, data.organizers || [], { stamp: stamp, shape: shapeOrganizer }),
        };
      },
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
      '<div class="field"><label>Описание</label>' +
      '<div class="rte lead-rte">' +
      '<div class="rte-bar" id="d-desc-bar">' +
      '<button type="button" data-cmd="bold" title="Жирный">Ж</button>' +
      '<button type="button" data-cmd="italic" title="Курсив">К</button>' +
      '<button type="button" data-cmd="insertUnorderedList" title="Список">•</button>' +
      '<button type="button" data-cmd="insertOrderedList" title="Нумерованный список">1.</button>' +
      '<button type="button" data-act="link" title="Ссылка">Ссылка</button>' +
      '</div>' +
      '<div class="rte-body excerpt-input" id="d-desc" contenteditable="true" data-placeholder="Абзацы, списки и ссылки сохранятся"></div>' +
      '</div>' +
      '<p class="hint-note">Enter — новый абзац. Для перечня участников или вопросов — кнопка «•».</p></div>' +
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
        hideAndPublish(ctx, function () { hideItem('event', item.id); }, publishEvents, 'afisha');
      },
      slug ? ('event.html?id=' + encodeURIComponent(slug)) : 'events.html'
    );
    bindSlugField(!isNew && !!slug);
    var descEl = document.getElementById('d-desc');
    if (descEl) {
      descEl.innerHTML = item.descHtml ? sanitizeLead(item.descHtml, LIST_TAGS) : bioToEditorHtml(item.desc || '');
      mountLeadRTE(descEl, null, 'd-desc-bar', LIST_TAGS);
    }
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
    var descHtml = eventDescHtml();
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
      desc: richToPlain(descHtml),
      descHtml: descHtml,
      href: val('d-href'),
      cover: coverNow,
      status: status,
    });
    var ready = (coverNow && coverNow.indexOf('data:') === 0)
      ? (ctx.toast('Сохраняем фото…'), uploadDataUrl(coverNow, 'covers').then(function (url) { next.cover = url; }))
      : Promise.resolve();
    ctx.toast(status === 'published' ? 'Публикуем…' : 'Сохраняем…');
    ready.then(function () {
      if (item.id && item.id !== next.id && status === 'published') hideItem('event', item.id);
      upsert('event', next);
      if (status !== 'published') return;
      return publishEvents();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён — на сайт не отправлен');
      ctx.go('afisha');
    }).catch(function (e) {
      ctx.toast(failText(e), true);
    });
  }

  /* Честный текст при сбое: правка лежит в этом браузере и уйдёт со следующей публикацией. */
  function failText(e) {
    var msg = (e && e.message) || '';
    if (e && e.readFailed) return msg;
    return 'Не ушло на сайт' + (msg ? ': ' + msg : '') + '. Правка сохранена здесь — нажмите «Опубликовать» ещё раз.';
  }

  /* «Снять»: отметка сохраняется сразу, «Снято» — только после ответа сервера.
     При сбое остаёмся в форме, чтобы можно было повторить. */
  function hideAndPublish(ctx, mark, publish, back) {
    mark();
    ctx.toast('Снимаем с сайта…');
    return publish().then(function () {
      ctx.toast('Снято с публикации');
      if (back) ctx.go(back);
    }).catch(function (e) {
      var msg = (e && e.message) || '';
      ctx.toast(e && e.readFailed ? msg : ('Не снято с сайта' + (msg ? ': ' + msg : '') + '. Нажмите «Снять» ещё раз.'), true);
    });
  }

  function publishAudio() {
    return publishPackSafe({
      slug: AUDIO_PAGE_SLUG,
      fallbackId: AUDIO_PAGE_ID,
      title: 'Аудио редакции',
      source: 'desk-audio',
      build: function (remote, stamp) {
        if (remote) remoteCache.audio = remote;
        return { tracks: lwwMerge(listFromPack(remote, 'tracks'), read().audio || [], { stamp: stamp }) };
      },
    });
  }

  /* Партнёры на проде целиком из пакета: база — серверный список,
     а пока его нет — вшитые в сайт карточки. */
  function publishVideo() {
    return publishPackSafe({
      slug: VIDEO_PAGE_SLUG,
      fallbackId: VIDEO_PAGE_ID,
      title: 'Видео редакции',
      source: 'desk-video',
      build: function (remote, stamp) {
        if (remote) remoteCache.video = remote;
        var data = read();
        var r = remote && !Array.isArray(remote) ? remote : {};
        var baseChannels = Array.isArray(r.channels)
          ? r.channels
          : ((window.YakVideos && YakVideos.channels) || []).map(cleanPackItem);
        return {
          items: lwwMerge(r.items || [], data.video || [], { stamp: stamp }),
          channels: lwwMerge(baseChannels, data.videoChannels || [], { stamp: stamp }),
        };
      },
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
        hideAndPublish(ctx, function () { hideItem('audio', item.id); }, publishAudio, 'audio');
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
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён — на сайт не отправлен');
      ctx.go('audio');
    }).catch(function (e) {
      ctx.toast(failText(e), true);
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
      field('Канал партнёра', 'd-channel', item.channelId || '', 'select',
        '<option value="">— нет —</option>' +
        catalogVideoChannels().map(function (c) {
          return '<option value="' + esc(c.id) + '"' + (c.id === item.channelId ? ' selected' : '') + '>' + esc(c.name || c.id) + '</option>';
        }).join('')) +
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
        hideAndPublish(ctx, function () { hideItem('video', item.id); }, publishVideo, 'video');
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
    var url = val('d-url') || item.videoUrl || item.embedUrl || '';
    var ext = val('d-ext') || item.externalUrl || '';
    if (!url && !ext && !item.embedUrl && !item.videoUrl) { ctx.toast('Прикрепите файл или укажите ссылку', true); return; }
    if (url.indexOf('data:') === 0) { ctx.toast('Сначала дождитесь загрузки файла в бакет', true); return; }
    var thumbNow = val('d-thumb');
    var next = Object.assign({}, item, {
      title: title,
      type: val('d-type') || 'long',
      speaker: val('d-speaker'),
      channelId: val('d-channel'),
      cycle: val('d-cycle'),
      description: val('d-desc'),
      videoUrl: url || item.videoUrl || '',
      embedUrl: item.embedUrl || '',
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
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён — на сайт не отправлен');
      ctx.go('video');
    }).catch(function (e) {
      ctx.toast(failText(e), true);
    });
  }

  function catalogVideoChannels() {
    return mergedList('video-channel').filter(function (c) {
      return c && c.id && c.status !== 'hidden';
    });
  }

  function catalogAllVideos() {
    return mergedList('video').filter(function (v) {
      return v && v.id != null && v.status !== 'hidden';
    });
  }

  function renderVideoPartners(ctx, id) {
    if (id) {
      renderVideoPartnerForm(ctx, id);
      return;
    }
    var items = catalogVideoChannels();
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Видео-партнёры</h1><p>Карточки каналов: название, логотип, описание, ссылки и привязка роликов.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="#video">К видео</a>' +
      '<a class="btn btn-primary" href="#video-partners/new">Добавить</a></div></div>' +
      '<div class="panel">' +
      (items.length
        ? '<div class="list-stack">' + items.map(function (c) {
          return '<a class="list-item" href="#video-partners/' + esc(c.id) + '"><div><strong>' + esc(c.name || c.id) + '</strong><small>' + esc(c.id) + '</small></div></a>';
        }).join('') + '</div>'
        : emptyRow('Пока нет карточек партнёров.')) +
      '</div>';
  }

  function renderVideoPartnerForm(ctx, id) {
    var isNew = !id || id === 'new';
    var baked = ((window.YakVideos && YakVideos.channels) || []).filter(function (c) { return c.id === id; })[0] || {};
    var item = isNew
      ? { id: '', name: '', logo: '', description: '', links: [], videoIds: [], status: 'published' }
      : Object.assign({}, baked, getItem('video-channel', id) || { id: id });
    var links = (item.links && item.links.length) ? item.links.slice() : [{ label: '', href: '' }];
    var videos = catalogAllVideos();
    var picked = item.videoIds || videos.filter(function (v) { return v.channelId === item.id; }).map(function (v) { return String(v.id); });
    composeShell(
      ctx, isNew ? 'Новый партнёр' : (item.name || 'Партнёр'), 'video-partners',
      field('Название', 'd-title', item.name) +
      '<div class="field slug-row"><label>Адрес</label><span class="slug-prefix">video-channel.html?id=</span>' +
      '<input class="input" id="d-slug" value="' + esc(item.id || '') + '" placeholder="vselenskaya-tserkov" /></div>' +
      field('Описание', 'd-desc', item.description || item.bio || '', 'textarea') +
      '<div class="field"><label>Логотип</label>' +
      '<div class="cover-frame' + (item.logo ? '' : ' is-empty') + '" id="d-cover-frame" style="width:88px;height:88px;border-radius:50%;overflow:hidden">' +
      (item.logo ? '<img src="' + esc(mediaSrc(item.logo)) + '" alt="" />' : '<span>Лого</span>') +
      '</div>' +
      '<input type="hidden" id="d-cover" value="' + esc(item.logo || '') + '" />' +
      '<button type="button" class="btn btn-ghost" id="d-cover-up">Загрузить логотип</button>' +
      '<input type="file" id="d-cover-file" accept="image/*" hidden /></div>' +
      '<div class="field"><label>Ссылки на другие платформы</label><div id="d-links"></div>' +
      '<button type="button" class="btn btn-ghost" id="d-link-add">+ Ссылка</button></div>' +
      '<div class="field"><label>Привязать видео с сайта</label>' +
      '<select class="select" id="d-videos" multiple size="8">' +
      videos.map(function (v) {
        var on = picked.indexOf(String(v.id)) !== -1;
        return '<option value="' + esc(String(v.id)) + '"' + (on ? ' selected' : '') + '>' + esc(v.title || v.id) + '</option>';
      }).join('') +
      '</select></div>',
      function (status) { saveVideoPartner(ctx, item, isNew, status); },
      function () { saveVideoPartner(ctx, item, isNew, 'published'); },
      isNew ? null : function () {
        if (!confirm('Удалить карточку партнёра? Видео останутся в каталоге.')) return;
        hideAndPublish(ctx, function () {
          upsert('video-channel', Object.assign({}, item, { status: 'hidden' }));
        }, publishVideo, 'video-partners');
      },
      item.id ? ('video-channel.html?id=' + encodeURIComponent(item.id)) : 'video.html'
    );
    function drawLinks() {
      var box = document.getElementById('d-links');
      if (!box) return;
      box.innerHTML = links.map(function (l, i) {
        return '<div class="form-grid" data-link="' + i + '" style="margin-bottom:8px">' +
          '<input class="input" data-f="label" value="' + esc(l.label || '') + '" placeholder="Название" />' +
          '<input class="input" data-f="href" value="' + esc(l.href || '') + '" placeholder="https://" />' +
          '<button type="button" class="btn btn-ghost" data-del-link="' + i + '">Убрать</button></div>';
      }).join('');
      box.querySelectorAll('[data-del-link]').forEach(function (btn) {
        btn.onclick = function () {
          collectLinks();
          links.splice(Number(btn.getAttribute('data-del-link')), 1);
          drawLinks();
        };
      });
    }
    function collectLinks() {
      links = [];
      document.querySelectorAll('#d-links [data-link]').forEach(function (row) {
        var label = (row.querySelector('[data-f="label"]') || {}).value || '';
        var href = (row.querySelector('[data-f="href"]') || {}).value || '';
        if (label.trim() || href.trim()) links.push({ label: label.trim(), href: href.trim() });
      });
    }
    drawLinks();
    var add = document.getElementById('d-link-add');
    if (add) add.onclick = function () { collectLinks(); links.push({ label: '', href: '' }); drawLinks(); };
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
    item._collectLinks = collectLinks;
    item._linksRef = function () { return links; };
  }

  function saveVideoPartner(ctx, item, isNew, status) {
    var name = val('d-title');
    if (!name) { ctx.toast('Укажите название', true); return; }
    if (item._collectLinks) item._collectLinks();
    var nextId = val('d-slug') || slugify(name);
    var logoNow = val('d-cover');
    var videoIds = [];
    var sel = document.getElementById('d-videos');
    if (sel) [].slice.call(sel.selectedOptions || []).forEach(function (o) { videoIds.push(o.value); });
    var next = Object.assign({}, item, {
      id: nextId,
      name: name,
      description: val('d-desc'),
      logo: logoNow,
      links: item._linksRef ? item._linksRef() : [],
      videoIds: videoIds,
      status: status,
    });
    var ready = (logoNow && logoNow.indexOf('data:') === 0)
      ? (ctx.toast('Сохраняем логотип…'), uploadDataUrl(logoNow, 'covers').then(function (url) { next.logo = url; }))
      : Promise.resolve();
    ctx.toast(status === 'published' ? 'Публикуем…' : 'Сохраняем…');
    ready.then(function () {
      upsert('video-channel', next);
      videoIds.forEach(function (vid) {
        var v = getItem('video', vid) || { id: vid };
        upsert('video', Object.assign({}, v, { id: vid, channelId: nextId, status: v.status || 'published' }));
      });
      if (status === 'published') return publishVideo();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён — на сайт не отправлен');
      ctx.go('video-partners');
    }).catch(function (e) {
      ctx.toast(failText(e), true);
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
    { id: 'память', title: 'Память' },
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
    if (cat === 'память') return 'mem';
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
      hideAndPublish(ctx, function () { hideItem('church-day', item.date || item.id); }, publishChurchDays, 'church-day');
    };
  }

  var CALENDAR_PAGE_ID = 1900000007;
  var CALENDAR_PAGE_SLUG = 'yak-calendar-data';

  function shapeDay(d) {
    var copy = cleanPackItem(d);
    if (!copy || !copy.date) return null;
    copy.id = copy.date;
    return copy;
  }

  function publishChurchDays() {
    return publishPackSafe({
      slug: CALENDAR_PAGE_SLUG,
      fallbackId: CALENDAR_PAGE_ID,
      title: 'Дни Церкви',
      source: 'desk-calendar',
      build: function (remote, stamp) {
        if (remote) remoteCache.calendar = remote;
        return { days: lwwMerge(listFromPack(remote, 'days'), read().churchDays || [], { stamp: stamp, key: dayKey, shape: shapeDay }) };
      },
    });
  }

  function saveChurch(ctx, item, status) {
    var date = val('d-date') || todayIso();
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название дня', true); return; }
    var saintBox = document.getElementById('d-saint');
    var saintHtml = saintBox ? saintBox.innerHTML : '';
    var saintName = saintBox ? (saintBox.textContent || '').replace(/\s+/g, ' ').trim() : '';
    var nextDay = Object.assign({}, item, {
      id: date,
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
    });
    var movedFrom = item.date && item.date !== date && item.status !== 'draft' ? item.date : '';
    if (movedFrom && status === 'published') hideItem('church-day', movedFrom);
    upsert('church-day', nextDay);
    if (status !== 'published') {
      ctx.toast('Черновик сохранён — на сайт не отправлен');
      ctx.go('church-day');
      return;
    }
    ctx.toast('Отправляем на сайт…');
    publishChurchDays().then(function () {
      ctx.toast('День на сайте');
      ctx.go('church-day');
    }).catch(function (err) {
      ctx.toast(failText(err), true);
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
        isNew ? null : function () { deleteAuthor(ctx, item); },
        item.slug ? 'author.html?slug=' + encodeURIComponent(item.slug) : ''
      );
      var delAuthorBtn = document.getElementById('desk-del');
      if (delAuthorBtn) delAuthorBtn.textContent = 'Удалить';
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
    var items = mergedList('authors').filter(function (a) { return !a || a.status !== 'hidden'; });
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

  function unlinkAuthorFromArticles(slug) {
    if (!slug) return;
    var data = read();
    (data.articles || []).forEach(function (a) {
      if (!a) return;
      if (String(a.authorSlug || '') === String(slug)) a.authorSlug = '';
      if (Array.isArray(a.authorSlugs)) {
        a.authorSlugs = a.authorSlugs.filter(function (s) { return String(s) !== String(slug); });
      }
    });
    data.authorLinks = (data.authorLinks || []).filter(function (l) {
      return !l || String(l.authorSlug) !== String(slug);
    });
    write(data, slug);
  }

  function deleteAuthor(ctx, item) {
    var slug = item.slug || item.id;
    if (!slug) { ctx.go('authors'); return; }
    if (!confirm('Удалить автора? Статьи останутся на сайте, но без карточки этого автора.')) return;
    unlinkAuthorFromArticles(slug);
    upsert('authors', Object.assign({}, item, { id: slug, slug: slug, status: 'hidden' }));
    ctx.toast('Удаляем…');
    publishAuthors().then(function () {
      ctx.toast('Автор удалён, статьи на месте');
      ctx.go('authors');
    }).catch(function (e) {
      var msg = (e && e.message) || '';
      ctx.toast(e && e.readFailed ? msg : ('Карточка ещё на сайте' + (msg ? ': ' + msg : '') + '. Нажмите «Удалить» ещё раз.'), true);
    });
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
        ctx.toast('Черновик сохранён — на сайт не отправлен');
        ctx.go('authors');
        return;
      }
      return publishAuthors().then(function () {
        ctx.toast('Автор сохранён на сайте');
        ctx.go('authors');
      });
    }).catch(function (e) {
      ctx.toast(failText(e), true);
    });
  }

  var CYCLES_PAGE_ID = 1900000001;
  var CYCLES_PAGE_SLUG = 'yak-cycles-data';
  var AUTHORS_PAGE_ID = 1900000002;
  var AUTHORS_PAGE_SLUG = 'yak-authors-data';
  var PHOTO_PAGE_ID = 1900000003;
  var PHOTO_PAGE_SLUG = 'yak-photostock-data';
  var TOPICS_PAGE_ID = 1910000004;
  var TOPICS_PAGE_SLUG = 'yak-topics-data';
  var EVENTS_PAGE_ID = 1900000006;
  var GUIDES_PAGE_ID = 1900000013;
  var GUIDES_PAGE_SLUG = 'yak-guides-data';
  var AUDIO_PAGE_ID = 1910000010;
  var AUDIO_PAGE_SLUG = 'yak-audio-data';
  var VIDEO_PAGE_ID = 1900000011;
  var VIDEO_PAGE_SLUG = 'yak-video-data';
  var EVENTS_PAGE_SLUG = 'yak-events-data';

  function parseArchivePack(art) {
    var raw = (art && (art.contentText || art.content || '')) || '';
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* Мягкое чтение для показа: при сбое — null, кэш остаётся прежним. */
  function pullRemotePack(slug) {
    return readPackStrict(slug).then(function (cur) { return cur.pack; }, function () { return null; });
  }

  function pullRemoteArticle(idOrSlug) {
    if (!window.AdminApi || !AdminApi.getArticle) return Promise.resolve(null);
    return AdminApi.getArticle(idOrSlug).catch(function () { return null; });
  }

  function safePackId(fallbackId) {
    var n = Number(fallbackId) || 0;
    if (n >= 1910000000) return n;
    return 1910000000 + (n % 100);
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* Строгое чтение перед записью. 404 — пакета ещё нет; любой другой сбой — ошибка:
     писать вслепую нельзя, иначе пакет перезапишется данными одного браузера. */
  function readPackStrict(slug) {
    if (!window.AdminApi || !AdminApi.getArticle) return Promise.reject(new Error('нет соединения с сервером'));
    function attempt(left) {
      return AdminApi.getArticle(slug).then(function (art) {
        if (!art || art.slug !== slug) return { article: null, pack: null };
        packStamp[slug] = String(art.modified || art.date || '');
        var pack = parseArchivePack(art);
        if (pack != null && slug !== PHOTO_PAGE_SLUG) rememberPack(slug, pack);
        return { article: art, pack: pack };
      }, function (err) {
        if (err && err.status === 404) return { article: null, pack: null };
        if (left > 0) return wait(800).then(function () { return attempt(left - 1); });
        var e = new Error('Сайт не ответил — ничего не отправлено. Правка сохранена здесь, повторите через минуту.');
        e.readFailed = true;
        throw e;
      });
    }
    return attempt(2);
  }

  function resolvePackTarget(slug, fallbackId) {
    return readPackStrict(slug).then(function (cur) {
      return {
        id: cur.article && cur.article.id ? cur.article.id : safePackId(fallbackId),
        slug: slug,
        article: cur.article,
        pack: cur.pack,
      };
    });
  }

  /* Сколько записей в пакете — защита от записи, после которой на сайте станет меньше. */
  function packSize(pack) {
    if (!pack) return 0;
    if (Array.isArray(pack)) return pack.length;
    var n = 0;
    ['items', 'events', 'organizers', 'tracks', 'days', 'authors', 'photos', 'photographers', 'shows', 'guides', 'channels', 'rubrics', 'themes'].forEach(function (k) {
      if (Array.isArray(pack[k])) n += pack[k].length;
    });
    return n;
  }

  function cleanPackItem(rec) {
    if (!rec || typeof rec !== 'object') return rec;
    var copy = Object.assign({}, rec);
    Object.keys(copy).forEach(function (k) {
      if (k.charAt(0) === '_') delete copy[k];
    });
    delete copy.source;
    ['cover', 'image', 'thumb', 'photo', 'logo'].forEach(function (f) {
      if (typeof copy[f] === 'string' && copy[f].indexOf('data:') === 0) copy[f] = '';
    });
    return copy;
  }

  /* Слияние списка для пакета. База — серверный список; запись из стола заменяет
     серверную, только если она новее. Черновики в пакет не идут вовсе.
     Снятое остаётся записью со status:'hidden' — так оно не всплывёт ни из вшитых
     данных сайта, ни из старой копии в другом браузере. */
  function lwwMerge(remoteList, localList, opts) {
    opts = opts || {};
    var keyOf = opts.key || recKey;
    var stamp = opts.stamp || '';
    var shape = opts.shape || cleanPackItem;
    var by = {};
    var order = [];
    (remoteList || []).forEach(function (r) {
      if (!r || typeof r !== 'object') return;
      var k = keyOf(r);
      if (!k || by[k]) return;
      by[k] = (stamp && !r.updatedAt) ? Object.assign({}, r, { updatedAt: stamp }) : r;
      order.push(k);
    });
    (localList || []).forEach(function (l) {
      if (!l || typeof l !== 'object') return;
      var k = keyOf(l);
      if (!k) return;
      if ((l.status || 'published') === 'draft') return;
      var r = by[k];
      if (r && String(r.updatedAt || '') >= String(l.updatedAt || '')) return;
      var next = shape(l, r || null);
      if (!next) return;
      if (!next.updatedAt) next.updatedAt = l.updatedAt || new Date().toISOString();
      by[k] = next;
      if (!r) order.push(k);
    });
    return order.map(function (k) { return by[k]; });
  }

  var packChain = {};

  /* Публикация пакета: одна за раз на пакет, свежее чтение, сборка, запись.
     opts.build(remotePack, stamp) возвращает новый пакет. */
  function publishPackSafe(opts) {
    if (!window.AdminApi || !AdminApi.upsertArchive || !AdminApi.getArticle) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var slug = opts.slug;
    /* 409 — между чтением и записью пакет успел записать другой браузер:
       читаем заново и собираем ещё раз, его правки не теряются. */
    function attempt(left) {
      return readPackStrict(slug).then(function (cur) {
        if (cur.pack != null) rememberPack(slug, cur.pack);
        var body = opts.build ? opts.build(cur.pack, packStamp[slug] || '') : opts.body;
        if (opts.shrinkGuard !== false && cur.pack && packSize(body) < packSize(cur.pack)) {
          throw new Error('Публикация остановлена: на сайте стало бы меньше записей, чем сейчас. Ничего не изменилось.');
        }
        return writePack(slug, opts, body, cur);
      }).catch(function (err) {
        if (!err || err.status !== 409) throw err;
        if (left > 0) return wait(250 + Math.floor(Math.random() * 500)).then(function () { return attempt(left - 1); });
        var busy = new Error('Этот раздел сейчас публикуют с другого устройства — ничего не отправлено. Правка сохранена здесь, повторите.');
        busy.readFailed = true;
        throw busy;
      });
    }
    function run() {
      return attempt(3).then(function (body) {
        try {
          var data = read();
          if (pruneRemoteCopies(data)) write(data);
        } catch (e) {}
        return body;
      });
    }
    var prev = packChain[slug] || Promise.resolve();
    var next = prev.then(run, run);
    packChain[slug] = next.then(function () {}, function () {});
    return next;
  }

  function writePack(slug, opts, body, cur) {
    var modified = new Date().toISOString();
    var prevStamp = packStamp[slug] || '';
    if (prevStamp && prevStamp >= modified) {
      var t = Date.parse(prevStamp);
      if (!isNaN(t)) modified = new Date(t + 1).toISOString();
    }
    var contentText = opts.contentText != null ? opts.contentText : JSON.stringify(body == null ? {} : body);
    return AdminApi.upsertArchive({
      articles: [{
        id: cur.article && cur.article.id ? cur.article.id : safePackId(opts.fallbackId),
        slug: slug,
        title: opts.title,
        date: (cur.article && cur.article.date) || todayIso(),
        modified: modified,
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: contentText,
        source: opts.source,
        expectModified: cur.article ? (cur.article.modified == null ? null : String(cur.article.modified)) : null,
      }],
    }).then(function (res) {
      var n = res && res.articles && res.articles.upserted;
      if (!res || res.ok === false || n === 0) throw new Error('Сервер не сохранил изменения — повторите.');
      packStamp[slug] = modified;
      var pack = body != null ? body : parseArchivePack({ contentText: contentText });
      rememberPack(slug, pack);
      return pack;
    });
  }

  function rememberPack(slug, pack) {
    if (!pack) return;
    if (slug === GUIDES_PAGE_SLUG) remoteCache.guides = pack;
    else if (slug === EVENTS_PAGE_SLUG) remoteCache.events = pack;
    else if (slug === AUTHORS_PAGE_SLUG) remoteCache.authors = pack;
    else if (slug === VIDEO_PAGE_SLUG) remoteCache.video = pack;
    else if (slug === PHOTO_PAGE_SLUG) remoteCache.photostock = pack;
    else if (slug === CYCLES_PAGE_SLUG) remoteCache.cycles = pack;
    else if (slug === AUDIO_PAGE_SLUG) remoteCache.audio = pack;
    else if (slug === TOPICS_PAGE_SLUG) remoteCache.topics = pack;
    else if (slug === CALENDAR_PAGE_SLUG) remoteCache.calendar = pack;
    else if (slug === 'yak-home-data') remoteCache.home = pack;
    else if (slug === 'yak-about-data') remoteCache.about = pack;
    else if (slug === 'yak-library-data') remoteCache.library = pack;
    else if (slug === 'yak-podcasts-data') remoteCache.podcasts = pack;
  }

  /* Общий вход для модулей (О проекте, Главная, Библиотека, Подкасты):
     opts.build(remote) — слияние со свежим пакетом; opts.body — готовый объект целиком. */
  function upsertJsonPack(opts) {
    return publishPackSafe(opts);
  }

  /* Пакет-объект (Главная, О проекте) пишется целиком. Если с момента открытия формы
     его обновили с другого устройства — ошибка conflict, а не молчаливая перезапись. */
  function publishObjectPack(opts) {
    return publishPackSafe({
      slug: opts.slug,
      fallbackId: opts.fallbackId,
      title: opts.title,
      source: opts.source,
      shrinkGuard: false,
      build: function (remote, stamp) {
        if (!opts.force && opts.openedAt && stamp && stamp !== opts.openedAt) {
          var e = new Error('Пока вы редактировали, эту страницу обновили с другого устройства.');
          e.conflict = true;
          throw e;
        }
        return opts.body;
      },
    });
  }

  function recKey(rec) {
    return String((rec && (rec.id || rec.slug)) || '').toLowerCase();
  }

  function absorbCycles(list) {
    if (Array.isArray(list) && list.length) remoteCache.cycles = list;
  }

  function absorbAuthorsPack(pack) {
    if (pack) remoteCache.authors = pack;
  }

  function absorbEventsPack(pack) {
    if (pack) remoteCache.events = pack;
  }

  var hydratedAt = 0;

  function waitingFirstPacks() {
    return !hydratedAt && !!hydrateRemote._p;
  }

  function packsLoading(ctx, title) {
    var skel = window.AdminGod && AdminGod.skelGrid ? AdminGod.skelGrid(10) : '';
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(title) + '</h1><p>Загружаю актуальную версию с сайта…</p></div></div>' +
      (skel || '<div class="yak-loading yak-loading--page" role="status"><span class="yak-spin" aria-hidden="true"></span><span>Загружаю…</span></div>');
  }

  /* Список из пакетов сайта. Первый показ — только по свежим данным (встроенные карточки могут быть
     устаревшими); повторный заход тихо подтягивает правки других браузеров, не чаще раза в 30 с. */
  function freshList(ctx, title, paint) {
    var hash = location.hash;
    var first = waitingFirstPacks();
    if (first) packsLoading(ctx, title);
    else paint();
    if (!hydrateRemote._p && Date.now() - hydratedAt < 30000) return;
    hydrateRemote(function () {
      if (location.hash !== hash) return;
      var a = document.activeElement;
      if (!first && a && ctx.viewEl.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value) return;
      paint();
    });
  }

  /* Форма по прямой ссылке сразу после входа: ждём пакеты, иначе откроется устаревшая версия
     или «не найдено». Потом форму не перерисовываем — там правки редактора. */
  function afterFirstPacks(ctx, title, paint) {
    if (!waitingFirstPacks()) { paint(); return; }
    var hash = location.hash;
    packsLoading(ctx, title);
    hydrateRemote(function () {
      if (location.hash === hash) paint();
    });
  }

  function hydrateRemote(done) {
    if (hydrateRemote._p) {
      return hydrateRemote._p.then(function () { if (done) done(); });
    }
    hydrateRemote._p = Promise.all([
      pullRemotePack(CYCLES_PAGE_SLUG).then(function (p) { if (Array.isArray(p)) absorbCycles(p); }),
      pullRemotePack(AUTHORS_PAGE_SLUG).then(absorbAuthorsPack),
      pullRemotePack(EVENTS_PAGE_SLUG).then(absorbEventsPack),
      pullRemotePack(GUIDES_PAGE_SLUG).then(function (p) { if (p) remoteCache.guides = p; }),
      pullRemotePack(VIDEO_PAGE_SLUG).then(function (p) { if (p) remoteCache.video = p; }),
      pullRemotePack(PHOTO_PAGE_SLUG).then(function (p) { if (p) absorbPhotostock(p); }),
      pullRemotePack('yak-home-data').then(function (p) { if (p) remoteCache.home = p; }),
      pullRemotePack('yak-about-data').then(function (p) { if (p) remoteCache.about = p; }),
      pullRemotePack(CALENDAR_PAGE_SLUG).then(function (p) { if (p) remoteCache.calendar = p; }),
      pullRemotePack('yak-library-data').then(function (p) { if (p) remoteCache.library = p; }),
      pullRemotePack(AUDIO_PAGE_SLUG).then(function (p) { if (p) remoteCache.audio = p; }),
      pullRemotePack(TOPICS_PAGE_SLUG).then(function (p) { if (p) remoteCache.topics = p; }),
      pullRemotePack('yak-podcasts-data').then(function (p) { if (p) remoteCache.podcasts = p; }),
    ]).then(function () {
      hydratedAt = Date.now();
      try {
        var data = read();
        if (pruneRemoteCopies(data)) write(data);
      } catch (e) {}
      paintDeskBanner();
    }).catch(function () {
      paintDeskBanner();
    }).then(function () {
      hydrateRemote._p = null;
      if (done) done();
    });
    return hydrateRemote._p;
  }

  function keptImage(value, prev) {
    var s = String(value || '');
    if (s && s.indexOf('data:') !== 0) return s;
    return prev || '';
  }

  function shapeAuthor(a, prev) {
    var slug = a && (a.slug || a.id);
    if (!slug) return null;
    prev = prev || {};
    var out = {
      slug: slug,
      name: a.name || prev.name || '',
      role: a.role != null ? a.role : (prev.role || ''),
      bio: a.bio != null ? a.bio : (prev.bio || ''),
      photo: keptImage(a.photo, prev.photo),
      recent: Array.isArray(a.recent) ? a.recent : (prev.recent || []),
      status: a.status === 'hidden' ? 'hidden' : 'published',
      updatedAt: a.updatedAt || '',
    };
    if (a.socials || prev.socials) out.socials = a.socials || prev.socials;
    return out;
  }

  /* Снятые публикации: журнал «снято/возвращено» со временем, чтобы последнее
     действие побеждало в любом браузере. hiddenSlugs — для сайта. */
  function mergeHiddenSlugs(remote, data) {
    var log = {};
    function put(slug, entry) {
      slug = String(slug || '');
      if (!slug || !entry) return;
      var cur = log[slug];
      if (!cur || String(entry.at || '') > String(cur.at || '')) {
        log[slug] = { hidden: entry.hidden !== false, at: String(entry.at || '') };
      }
    }
    var r = remote && !Array.isArray(remote) ? remote : {};
    (r.hiddenSlugs || []).forEach(function (s) { put(s, { hidden: true, at: '' }); });
    Object.keys(r.hiddenLog || {}).forEach(function (s) { put(s, r.hiddenLog[s]); });
    (data.hiddenSlugs || []).forEach(function (s) { put(s, { hidden: true, at: '' }); });
    Object.keys(data.hiddenLog || {}).forEach(function (s) { put(s, data.hiddenLog[s]); });
    return { slugs: Object.keys(log).filter(function (s) { return log[s].hidden; }), log: log };
  }

  function markHiddenSlug(slug, hidden) {
    slug = String(slug || '');
    if (!slug) return;
    var data = read();
    data.hiddenLog = data.hiddenLog || {};
    data.hiddenLog[slug] = { hidden: !!hidden, at: new Date().toISOString() };
    data.hiddenSlugs = (data.hiddenSlugs || []).filter(function (s) { return String(s) !== slug; });
    if (hidden) data.hiddenSlugs.push(slug);
    write(data);
  }

  function isSlugHidden(slug) {
    slug = String(slug || '');
    if (!slug) return false;
    return mergeHiddenSlugs(remoteCache.authors, read()).slugs.indexOf(slug) !== -1;
  }

  function publishedAuthorsPack() {
    return lwwMerge(authorsFromPack(remoteCache.authors), read().authors || [], {
      stamp: packStamp[AUTHORS_PAGE_SLUG] || '',
      key: authorKey,
      shape: shapeAuthor,
    });
  }

  function publishAuthors() {
    return publishPackSafe({
      slug: AUTHORS_PAGE_SLUG,
      fallbackId: AUTHORS_PAGE_ID,
      title: 'Авторы редакции',
      source: 'desk-authors',
      build: function (remote, stamp) {
        absorbAuthorsPack(remote);
        var data = read();
        var hid = mergeHiddenSlugs(remote, data);
        return {
          authors: lwwMerge(authorsFromPack(remote), data.authors || [], { stamp: stamp, key: authorKey, shape: shapeAuthor }),
          hiddenSlugs: hid.slugs,
          hiddenLog: hid.log,
        };
      },
    });
  }

  function shapeOrganizer(o, prev) {
    if (!o || !o.id) return null;
    prev = prev || {};
    return {
      id: o.id,
      name: o.name || prev.name || '',
      short: o.short || o.name || prev.short || '',
      city: o.city != null ? o.city : (prev.city || ''),
      blurb: o.blurb || o.desc || '',
      website: o.website || '',
      email: o.email || '',
      phone: o.phone || '',
      socials: Array.isArray(o.socials) ? o.socials : [],
      contactsFromDesk: true,
      logo: keptImage(o.logo, prev.logo),
      coverTone: o.coverTone || prev.coverTone || '#5c5346',
      partnerTitle: o.partnerTitle || '',
      status: o.status === 'hidden' ? 'hidden' : 'published',
      updatedAt: o.updatedAt || '',
    };
  }

  function publishedOrganizers() {
    var remote = remoteCache.events;
    var base = remote ? orgsFromPack(remote) : siteItems('organizer').map(function (o) { return shapeOrganizer(o); });
    return lwwMerge(base, read().organizers || [], {
      stamp: packStamp[EVENTS_PAGE_SLUG] || '',
      shape: shapeOrganizer,
    });
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
        hideAndPublish(ctx, function () { hideItem('organizer', item.id); }, publishEvents, 'organizers');
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
      email: '',
      phone: '',
      socials: [],
      contactsFromDesk: true,
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
      if (item.id && item.id !== next.id && status === 'published') hideItem('organizer', item.id);
      upsert('organizer', next);
      if (status === 'published') return publishEvents();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён — на сайт не отправлен');
      ctx.go('organizers');
    }).catch(function (e) {
      ctx.toast(failText(e), true);
    });
  }

  function topicKey(t) {
    return String((t && (t.id || t.slug || t.q || t.title)) || '').toLowerCase();
  }

  function shapeTopic(t) {
    if (!t || !t.title) return null;
    return {
      id: t.id || uid('topic'),
      title: t.title,
      slug: t.slug || '',
      q: t.q || '',
      note: t.note || '',
      status: t.status === 'hidden' ? 'hidden' : 'published',
      updatedAt: t.updatedAt || '',
    };
  }

  /* Темы, которые сайт показывает, пока пакета нет (как в articles-page.js портала):
     первая публикация из админки должна их сохранить, а не заменить одной новой. */
  var DEFAULT_TOPICS = [
    { id: 'искусственный интеллект', title: 'Искусственный интеллект', q: 'искусственный интеллект' },
    { id: 'theology-of-the-body', title: 'Теология тела', slug: 'theology-of-the-body' },
    { id: 'pravda', title: 'Мифы и правда о Католической Церкви', slug: 'pravda' },
    { id: 'laudato', title: 'Забота об общем доме', q: 'Laudato' },
    { id: 'экуменический', title: 'Экуменический диалог', q: 'экуменический' },
  ];

  function baseTopics(remote) {
    if (Array.isArray(remote)) return remote;
    return DEFAULT_TOPICS.map(function (t) { return Object.assign({ status: 'published' }, t); });
  }

  function allTopics() {
    var remote = baseTopics(remoteCache.topics);
    var stamp = packStamp[TOPICS_PAGE_SLUG] || '';
    var by = {};
    var order = [];
    remote.forEach(function (r) {
      var k = topicKey(r);
      if (!k || by[k]) return;
      by[k] = r.id ? r : Object.assign({}, r, { id: k });
      order.push(k);
    });
    (read().topics || []).forEach(function (l) {
      var k = topicKey(l);
      if (!k) return;
      var r = by[k];
      if (r && String(r.updatedAt || stamp) >= String(l.updatedAt || '')) return;
      by[k] = l;
      if (!r) order.push(k);
    });
    return order.map(function (k) { return by[k]; });
  }

  function listTopics() {
    return allTopics().filter(function (t) { return t && t.title && t.status !== 'hidden'; });
  }

  function upsertTopic(topic) {
    var data = read();
    data.topics = data.topics || [];
    topic.id = topic.id || uid('topic');
    topic.slug = topic.slug || (topic.q ? '' : slugify(topic.title));
    topic.status = topic.status || 'published';
    topic.updatedAt = new Date().toISOString();
    var i = data.topics.findIndex(function (t) { return t && String(t.id) === String(topic.id); });
    if (i === -1) data.topics.push(topic);
    else data.topics[i] = Object.assign({}, data.topics[i], topic);
    write(data);
    return topic;
  }

  /* Удаление темы — отметка «снято»: иначе тема вернётся из пакета или другого браузера. */
  function deleteTopic(id) {
    var cur = allTopics().filter(function (t) { return String(t.id) === String(id); })[0];
    if (!cur) return;
    upsertTopic(Object.assign({}, cur, { status: 'hidden' }));
  }

  function publishTopics() {
    return publishPackSafe({
      slug: TOPICS_PAGE_SLUG,
      fallbackId: TOPICS_PAGE_ID,
      title: 'Темы раздела Статьи',
      source: 'desk-topics',
      build: function (remote, stamp) {
        if (remote) remoteCache.topics = remote;
        return lwwMerge(baseTopics(remote), read().topics || [], { stamp: stamp, key: topicKey, shape: shapeTopic });
      },
    });
  }

  /* В пакет идут и снимки на модерации — иначе редактор в другом браузере их не увидит.
     Сайт показывает только status:'approved'. */
  function packPhoto(p) {
    if (!p || !p.id) return null;
    var url = p.url || p.thumb || '';
    if (!url || String(url).indexOf('data:') === 0) return null;
    var thumb = p.thumb && String(p.thumb).indexOf('data:') !== 0 ? p.thumb : url;
    return {
      id: p.id,
      url: url,
      thumb: thumb,
      title: p.title || '',
      tags: p.tags || [],
      photographerId: p.photographerId || '',
      photographerSlug: p.photographerSlug || '',
      photographerName: p.photographerName || p.ownerName || '',
      photographerTag: p.photographerTag || '',
      status: p.status === 'pending' || p.status === 'rejected' ? p.status : 'approved',
      createdAt: p.createdAt || p.updatedAt || '',
      updatedAt: p.updatedAt || '',
      license: p.license || 'CC BY 4.0',
    };
  }

  function packPhotographer(p) {
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

  function stockKey(p) {
    return String((p && (p.id || p.slug)) || '').toLowerCase();
  }

  /* Демо-карточка первого запуска админки: на сайт не уходит и уступает серверной. */
  function isDemoPhotographer(p) {
    return !!p && (p.slug === 'olga-fotograf' || String(p.email || '').toLowerCase() === 'shooter@yakatolik.local');
  }

  function goneOf(kind) {
    return (window.AdminStore && AdminStore.goneLog && AdminStore.goneLog(kind)) || {};
  }

  /* Местные записи, к которым добавлены отметки удаления, если удаление новее записи. */
  function withTombstones(list, gone) {
    var by = {};
    list.forEach(function (p) { by[p.id] = p; });
    Object.keys(gone).forEach(function (id) {
      if (by[id] && String(by[id].updatedAt || '') > String(gone[id])) return;
      by[id] = { id: id, status: 'hidden', updatedAt: gone[id] };
    });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  /* Свежий пакет → хранилище фотостока этого браузера: серверная запись заменяет
     местную, только если она новее; снятое на сервере убирается и здесь. */
  function absorbPhotostock(pack) {
    if (!pack || typeof pack !== 'object') return;
    remoteCache.photostock = pack;
    if (!window.AdminStore) return;
    var stamp = packStamp[PHOTO_PAGE_SLUG] || '';
    if (Array.isArray(pack.photographers) && AdminStore.listPhotographers && AdminStore.savePhotographers) {
      var phGone = goneOf('photographers');
      var phs = (AdminStore.listPhotographers() || []).slice();
      var phChanged = false;
      pack.photographers.forEach(function (r) {
        if (!r || !(r.id || r.slug)) return;
        var rt = String(r.updatedAt || stamp);
        var i = phs.findIndex(function (p) { return p && ((r.id && p.id === r.id) || (r.slug && p.slug === r.slug)); });
        if (i === -1) {
          if (r.status === 'hidden' || (phGone[r.id] && String(phGone[r.id]) >= rt)) return;
          phs.push(Object.assign({}, r, { updatedAt: rt }));
          phChanged = true;
          return;
        }
        if (!isDemoPhotographer(phs[i]) && String(phs[i].updatedAt || '') >= rt) return;
        if (r.status === 'hidden') phs.splice(i, 1);
        else phs[i] = Object.assign({}, phs[i], r, { updatedAt: rt });
        phChanged = true;
      });
      if (phChanged) AdminStore.savePhotographers(phs);
    }
    if (Array.isArray(pack.photos) && AdminStore.listMedia && AdminStore.saveMedia) {
      var gone = goneOf('photos');
      var media = (AdminStore.listMedia() || []).slice();
      var at = {};
      media.forEach(function (m, i) { if (m && m.id) at[m.id] = i; });
      var drop = {};
      var changed = false;
      pack.photos.forEach(function (r) {
        if (!r || !r.id) return;
        var rt = String(r.updatedAt || stamp);
        var i = at[r.id];
        if (i == null) {
          if (r.status === 'hidden' || !r.url || (gone[r.id] && String(gone[r.id]) >= rt)) return;
          at[r.id] = media.length;
          media.push(Object.assign({ kind: 'image', license: 'CC BY 4.0' }, r, { updatedAt: rt }));
          changed = true;
          return;
        }
        if (String(media[i].updatedAt || '') >= rt) return;
        if (r.status === 'hidden') drop[r.id] = 1;
        else media[i] = Object.assign({}, media[i], r, { kind: 'image', updatedAt: rt });
        changed = true;
      });
      if (changed) AdminStore.saveMedia(media.filter(function (m) { return !(m && drop[m.id]); }));
    }
  }

  function publishPhotostock() {
    return publishPackSafe({
      slug: PHOTO_PAGE_SLUG,
      fallbackId: PHOTO_PAGE_ID,
      title: 'Фотосток редакции',
      source: 'desk-photostock',
      build: function (remote, stamp) {
        if (remote) absorbPhotostock(remote);
        var r = remote && typeof remote === 'object' ? remote : {};
        var store = window.AdminStore;
        var photos = withTombstones(
          store ? (store.listPhotos() || []).map(packPhoto).filter(Boolean) : [],
          goneOf('photos')
        );
        var phs = withTombstones(
          store ? (store.listPhotographers() || []).filter(function (p) { return !isDemoPhotographer(p); }).map(packPhotographer).filter(Boolean) : [],
          goneOf('photographers')
        );
        return {
          photographers: lwwMerge(r.photographers || [], phs, { stamp: stamp, key: stockKey }),
          photos: lwwMerge(r.photos || [], photos, { stamp: stamp, key: stockKey }),
        };
      },
    });
  }

  /* Состав циклов под статью: убрать из чужих, поставить в свой (на прежнее место,
     если номер не задан). prevSlug — прежний адрес при переименовании. true — что-то поменялось. */
  function syncArticleToCycle(article, prevSlug) {
    if (!article || !article.slug) return false;
    var mine = {};
    mine[String(article.slug)] = 1;
    if (prevSlug) mine[String(prevSlug)] = 1;
    var want = article.status === 'hidden' ? '' : String(article.cycleSlug || '').trim();
    var order = parseInt(article.cycleOrder, 10) || 0;
    var changed = false;
    catalogCycles().forEach(function (c) {
      var before = c.items || [];
      var prev = before.filter(function (it) { return it && mine[String(it.slug)]; })[0];
      var items = before.filter(function (it) { return it && !mine[String(it.slug)]; });
      if (want && (String(c.id) === want || String(c.slug || '') === want)) {
        items.push({ slug: article.slug, title: article.title, order: order || (prev && Number(prev.order)) || items.length + 1 });
        items.sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
      }
      if (JSON.stringify(items) === JSON.stringify(before)) return;
      changed = true;
      upsert('cycle', Object.assign({}, c, { items: items, status: c.status || 'published' }));
    });
    return changed;
  }

  function publishCycles() {
    return publishPackSafe({
      slug: CYCLES_PAGE_SLUG,
      fallbackId: CYCLES_PAGE_ID,
      title: 'Циклы редакции',
      source: 'desk-cycles',
      build: function (remote, stamp) {
        if (Array.isArray(remote)) absorbCycles(remote);
        var base = Array.isArray(remote)
          ? remote
          : ((window.YakCycles && YakCycles.ALL) || []).map(function (c) { return Object.assign({ status: 'published' }, c); });
        return lwwMerge(base, read().cycles || [], {
          stamp: stamp,
          key: function (c) { return String((c && c.id) || '').toLowerCase(); },
        });
      },
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
      try { upsert('cycle', next); ctx.toast('Черновик сохранён — на сайт не отправлен'); ctx.go('cycles'); }
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
        if (item.id && item.id !== next.id) upsert('cycle', Object.assign({}, item, { status: 'hidden' }));
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
        ctx.toast(failText(e), true);
      });
    };
    var delBtn = document.getElementById('desk-del');
    if (delBtn) delBtn.onclick = function () {
      if (!confirm('Снять цикл с публикации? Статьи останутся.')) return;
      hideAndPublish(ctx, function () {
        upsert('cycle', Object.assign({}, item, { status: 'hidden', id: item.id || item.slug }));
      }, publishCycles, 'cycles');
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

  var STRUCTURE_TITLES = {
    'structure-pope': 'Папа Римский',
    'structure-vatican': 'Ватикан',
    'structure-dicasteries': 'Дикастерии Римской курии',
    'structure-cardinals': 'Коллегия кардиналов',
    'structure-nunciatures': 'Апостольские нунциатуры',
    'structure-bishop': 'Епархии и епископы',
    'structure-parish': 'Приходы и настоятели',
    'structure-religious': 'Монашествующие и ордена',
    'structure-movements': 'Движения мирян',
    'structure-charity': 'Благотворительные организации',
  };

  function guideNodeId(g) {
    if (g && g.nodeId) return String(g.nodeId);
    var parts = String((g && g.id) || '').split(/[:/]/);
    return parts[parts.length - 1] || '';
  }

  function sanitizeGuideRecord(g) {
    if (!g) return null;
    var id = guideNodeId(g);
    var title = String(g.title || '').trim();
    if (g.added && (g.siblingsOf === 'structure' || STRUCTURE_TITLES[id])) return null;
    if (id.indexOf('structure-') === 0 || id === 'structure-clergy' || id === 'structure-laity') {
      if (!STRUCTURE_TITLES[id] || (title && title !== STRUCTURE_TITLES[id])) return null;
      g = Object.assign({}, g, { title: STRUCTURE_TITLES[id] });
    }
    return g;
  }

  function guideKey(g) {
    if (!g) return '';
    var node = guideNodeId(g);
    var section = g.section || (String(g.id || '').indexOf(':') !== -1 ? String(g.id).split(':')[0] : '');
    return section && node ? (section + ':' + node).toLowerCase() : '';
  }

  function guideList(pack) {
    return !pack ? [] : (Array.isArray(pack) ? pack : (pack.guides || []));
  }

  function shapeGuide(l, r) {
    var g = sanitizeGuideRecord(l);
    if (!g || !guideKey(g)) return null;
    var next = cleanPackItem(g);
    next.status = next.status === 'hidden' ? 'hidden' : 'published';
    if (!String(next.image || '').trim() && r && r.image) next.image = r.image;
    return next;
  }

  /* Публикация гидов: свежий пакет — основа, правка отсюда заменяет страницу,
     только если она новее серверной. Черновики остаются здесь. */
  function publishGuides() {
    return publishPackSafe({
      slug: GUIDES_PAGE_SLUG,
      fallbackId: GUIDES_PAGE_ID,
      title: 'Разделы О Церкви и Духовная жизнь',
      source: 'desk-guides',
      shrinkGuard: false,
      build: function (remote, stamp) {
        if (remote) remoteCache.guides = remote;
        var base = guideList(remote).map(sanitizeGuideRecord).filter(Boolean);
        return { guides: lwwMerge(base, read().guides || [], { stamp: stamp, key: guideKey, shape: shapeGuide }) };
      },
    });
  }

  function autoPublishGuides() {
    /* Больше не публикуем гиды сами при открытии админки.
       Локальный стол мог перетереть пакет на сервере. */
  }

  function upsertGuide(item) {
    var data = read();
    var list = data.guides || [];
    item.updatedAt = new Date().toISOString();
    var remote = guideList(remoteCache.guides).filter(function (g) { return guideKey(g) === guideKey(item); })[0];
    var remoteAt = String((remote && remote.updatedAt) || packStamp[GUIDES_PAGE_SLUG] || '');
    if (remote && remoteAt >= item.updatedAt) {
      var t = Date.parse(remoteAt);
      if (!isNaN(t)) item.updatedAt = new Date(t + 1).toISOString();
    }
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
      freshList(ctx, 'Обзор', function () { renderHub(ctx); });
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
      if (!id && window.AdminGod) freshList(ctx, 'Авторы', function () { AdminGod.paintSection(ctx, 'authors', 'Авторы', '#authors/new'); });
      else afterFirstPacks(ctx, 'Авторы', function () { renderAuthors(ctx, id); });
      return true;
    }
    if (name === 'organizers') {
      if (id) afterFirstPacks(ctx, 'Организаторы', function () { renderOrganizers(ctx, id); });
      else freshList(ctx, 'Организаторы', function () { renderOrganizers(ctx, id); });
      return true;
    }
    if (name === 'video-partners') {
      if (id) afterFirstPacks(ctx, 'Видео-партнёры', function () { renderVideoPartners(ctx, id); });
      else freshList(ctx, 'Видео-партнёры', function () { renderVideoPartners(ctx, id); });
      return true;
    }
    if (name === 'cycles') {
      if (!id && window.AdminGod) {
        freshList(ctx, 'Циклы', function () {
          loadPortalCycles(function () { AdminGod.paintSection(ctx, 'cycle', 'Циклы', '#cycles/new'); });
        });
      } else afterFirstPacks(ctx, 'Циклы', function () { renderCycleForm(ctx, id); });
      return true;
    }
    if (LIST_MAP[name]) {
      var title = (NAV_TITLES[name] || name);
      var fromArchive = name === 'news' || name === 'articles';
      if (id) {
        if (fromArchive) FORM_MAP[name](ctx, id);
        else afterFirstPacks(ctx, title, function () { FORM_MAP[name](ctx, id); });
      } else if (fromArchive) renderList(LIST_MAP[name], ctx);
      else freshList(ctx, title, function () { renderList(LIST_MAP[name], ctx); });
      return true;
    }
    return false;
  }

  var NAV_TITLES = { afisha: 'Афиша', audio: 'Аудио', video: 'Видео', 'church-day': 'День Церкви' };

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
    absorbPhotostock: absorbPhotostock,
    listTopics: listTopics,
    upsertTopic: upsertTopic,
    deleteTopic: deleteTopic,
    publishTopics: publishTopics,
    portalHref: portalHref,
    read: read,
    write: write,
    upsertGuide: upsertGuide,
    publishGuides: publishGuides,
    upsertJsonPack: upsertJsonPack,
    publishPackSafe: publishPackSafe,
    publishObjectPack: publishObjectPack,
    readPackStrict: readPackStrict,
    lwwMerge: lwwMerge,
    packTime: function (slug) { return packStamp[slug] || ''; },
    failText: failText,
    remoteGuides: function () {
      var stamp = packStamp[GUIDES_PAGE_SLUG] || '';
      return guideList(remoteCache.guides).map(function (g) {
        return g && !g.updatedAt && stamp ? Object.assign({}, g, { updatedAt: stamp }) : g;
      });
    },
    remoteHome: function () { return remoteCache.home; },
    remoteAbout: function () { return remoteCache.about; },
    remoteLibrary: function () { return remoteCache.library; },
    linkAuthor: linkAuthor,
    exportDesk: exportDesk,
    importDesk: importDesk,
    hydrateRemote: hydrateRemote,
    healPublishedCopies: healPublishedCopies,
  };

  try {
    var stored = read();
    var guides = stored.guides || [];
    var cleaned = guides.map(sanitizeGuideRecord).filter(Boolean);
    if (cleaned.length !== guides.length) {
      stored.guides = cleaned;
      write(stored);
    }
    loadSeed(function () {});
    loadArchive('news', function () {});
    loadArchive('article', function () {});
    hydrateRemote();
    setTimeout(function () { healPublishedCopies().catch(function () {}); }, 2500);
  } catch (e) {}
})(window);
