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
    { id: 'event', title: 'Афиша', where: 'События', hint: 'Дата, место и описание.', portal: 'events.html' },
    { id: 'audio', title: 'Аудио', where: 'Аудио', hint: 'Название, исполнитель и файл.', portal: 'audio.html' },
    { id: 'video', title: 'Видео', where: 'Видео', hint: 'Название, описание и ссылка.', portal: 'video.html' },
    { id: 'photo', title: 'Фото', where: 'Фотосток', hint: 'Снимок и теги.', portal: 'photostock.html' },
    { id: 'church-day', title: 'День Церкви', where: 'Календарь', hint: 'Святой, чтение и молитва.', portal: 'calendar.html' },
  ];

  var NEWS_CATS = [
    { id: 'news', title: 'Новости' },
    { id: 'church-rus', title: 'Россия' },
    { id: 'sng', title: 'КЦ в мире' },
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
    { id: 'interview', title: 'Интервью' },
    { id: 'svidetelstva', title: 'Свидетельства' },
    { id: 'propovedi', title: 'Проповеди' },
  ];

  var EVENT_CATS = [
    { id: 'concert', title: 'Концерт' },
    { id: 'meeting', title: 'Встреча' },
    { id: 'lecture', title: 'Лекция' },
    { id: 'pilgrimage', title: 'Паломничество' },
    { id: 'retreat', title: 'Реколлекции' },
    { id: 'charity', title: 'Благотворительность' },
  ];

  function emptyState() {
    return { articles: [], events: [], audio: [], video: [], churchDays: [], authors: [], guides: [] };
  }

  var archiveCache = { news: [], article: [] };

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      return Object.assign(emptyState(), data || {});
    } catch (e) {
      return emptyState();
    }
  }

  function write(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return (prefix || 'desk') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    return [];
  }

  function mergedList(type) {
    var byId = {};
    var site = (type === 'news' || type === 'article') ? (archiveCache[type] || []) : siteItems(type);
    site.forEach(function (x) {
      if (x && x.id != null && x.id !== '') byId[String(x.id)] = x;
    });
    listOf(type).forEach(function (x) {
      if (!x || x.id == null) return;
      byId[String(x.id)] = Object.assign({}, byId[String(x.id)] || {}, x);
    });
    return Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) {
      return String(b.date || b.updatedAt || '').localeCompare(String(a.date || a.updatedAt || ''));
    });
  }

  function getItem(type, id) {
    id = String(id || '');
    var list = mergedList(type);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id || list[i].date === id || list[i].slug === id) return list[i];
    }
    return null;
  }

  function mapArchive(a, type) {
    var cat = (a.categorySlugs && a.categorySlugs[0]) || '';
    if (!cat && a.categories && a.categories[0]) {
      cat = typeof a.categories[0] === 'string' ? a.categories[0] : (a.categories[0].slug || '');
    }
    if (!cat) cat = type === 'news' ? 'news' : 'columns';
    return {
      id: String(a.id || a.slug || ''),
      kind: type === 'news' ? 'news' : 'article',
      title: a.title || '',
      excerpt: a.excerpt || '',
      body: a.contentText || a.content || '',
      contentHtml: a.contentHtml || '',
      cover: a.image || a.cover || '',
      image: a.image || a.cover || '',
      date: String(a.date || '').slice(0, 10),
      author: a.author || '',
      category: cat,
      status: 'published',
      source: 'site',
    };
  }

  function loadArchive(type, done) {
    if (!window.AdminApi || !AdminApi.getArticles) {
      done([]);
      return;
    }
    AdminApi.getArticles({ category: type === 'news' ? 'news' : 'columns', limit: 50, page: 1 })
      .then(function (pack) {
        archiveCache[type] = ((pack && pack.items) || []).map(function (a) { return mapArchive(a, type); });
        done(archiveCache[type]);
      })
      .catch(function () { done(archiveCache[type] || []); });
  }

  function hideItem(type, id) {
    var item = getItem(type, id) || { id: id };
    if (item.source === 'site') upsert(type, Object.assign({}, item, { status: 'hidden' }));
    else remove(type, id);
  }

  function upsert(type, item) {
    var data = read();
    var key = type === 'news' || type === 'article' ? 'articles'
      : type === 'event' ? 'events'
      : type === 'audio' ? 'audio'
      : type === 'video' ? 'video'
      : type === 'authors' ? 'authors'
      : type === 'guides' ? 'guides'
      : 'churchDays';
    var list = data[key] || [];
    item.updatedAt = new Date().toISOString();
    if (!item.createdAt) item.createdAt = item.updatedAt;
    var i = list.findIndex(function (x) { return String(x.id) === String(item.id); });
    if (i === -1) list.unshift(item);
    else list[i] = item;
    data[key] = list;
    write(data);
    return item;
  }

  function remove(type, id) {
    var data = read();
    var key = type === 'news' || type === 'article' ? 'articles'
      : type === 'event' ? 'events'
      : type === 'audio' ? 'audio'
      : type === 'video' ? 'video'
      : type === 'authors' ? 'authors'
      : type === 'guides' ? 'guides'
      : 'churchDays';
    data[key] = (data[key] || []).filter(function (x) { return String(x.id) !== String(id); });
    write(data);
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
      '<a class="btn btn-ghost" href="#' + back + '">Назад</a>' +
      (portal ? '<a class="btn btn-ghost" href="' + portalHref(portal) + '" target="_blank" rel="noopener">На портале</a>' : '') +
      (onDelete ? '<button type="button" class="btn btn-ghost" id="desk-del">Снять</button>' : '') +
      '<button type="button" class="btn btn-ghost" id="desk-draft">Сохранить</button>' +
      '<button type="button" class="btn btn-primary" id="desk-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="panel form-grid desk-form">' + body + '</div>';
    document.getElementById('desk-draft').onclick = function () { onSave('draft'); };
    document.getElementById('desk-pub').onclick = function () { onPublish(); };
    if (onDelete) document.getElementById('desk-del').onclick = onDelete;
  }

  function openArchiveForm(ctx, type, id, renderFn) {
    var item = getItem(type, id);
    if (item) {
      renderFn(item);
      return;
    }
    ctx.viewEl.innerHTML = '<div class="panel"><div class="empty">Загрузка</div></div>';
    if (!window.AdminApi || !AdminApi.getArticle) {
      ctx.go(type === 'news' ? 'news' : 'articles');
      return;
    }
    AdminApi.getArticle(id).then(function (a) {
      if (!a || !a.title) throw new Error('empty');
      var mapped = mapArchive(a, type);
      archiveCache[type] = (archiveCache[type] || []).concat([mapped]);
      renderFn(mapped);
    }).catch(function () {
      ctx.toast('Не удалось открыть материал', true);
      ctx.go(type === 'news' ? 'news' : 'articles');
    });
  }

  function renderNewsForm(ctx, id) {
    var isNew = !id || id === 'new';
    if (isNew) {
      paintNewsForm(ctx, { id: uid('news'), kind: 'news', category: 'news', date: todayIso(), status: 'draft' }, true);
      return;
    }
    openArchiveForm(ctx, 'news', id, function (item) { paintNewsForm(ctx, item, false); });
  }

  function paintNewsForm(ctx, item, isNew) {
    composeShell(
      ctx, isNew ? 'Новая новость' : 'Новость', 'news',
      field('Заголовок', 'd-title', item.title) +
      field('Рубрика', 'd-cat', item.category, 'select', opts(NEWS_CATS, item.category || 'news')) +
      field('Дата', 'd-date', (item.date || todayIso()).slice(0, 10), 'date') +
      field('Лид', 'd-excerpt', item.excerpt, 'textarea') +
      field('Текст', 'd-body', item.body || item.contentHtml, 'textarea') +
      field('Обложка', 'd-cover', item.cover || item.image) +
      '<div class="field"><label>Файл обложки</label><input class="input" type="file" id="d-file" accept="image/*" /></div>' +
      field('Автор', 'd-author', item.author || ctx.session.name),
      function (status) { saveArticle(ctx, item, 'news', status); },
      function () { saveArticle(ctx, item, 'news', 'published'); },
      isNew ? null : function () { if (confirm('Снять новость с публикации?')) { hideItem('news', item.id); ctx.toast('Снято с публикации'); ctx.go('news'); } },
      'archive.html?category=news'
    );
    bindCoverFile();
  }

  function renderArticleForm(ctx, id) {
    var isNew = !id || id === 'new';
    if (isNew) {
      paintArticleForm(ctx, { id: uid('art'), kind: 'article', category: 'columns', date: todayIso(), status: 'draft' }, true);
      return;
    }
    openArchiveForm(ctx, 'article', id, function (item) { paintArticleForm(ctx, item, false); });
  }

  function paintArticleForm(ctx, item, isNew) {
    composeShell(
      ctx, isNew ? 'Новая статья' : 'Статья', 'articles',
      field('Заголовок', 'd-title', item.title) +
      field('Рубрика', 'd-cat', item.category, 'select', opts(ARTICLE_CATS, item.category || 'columns')) +
      field('Дата', 'd-date', (item.date || todayIso()).slice(0, 10), 'date') +
      field('Лид', 'd-excerpt', item.excerpt, 'textarea') +
      field('Текст', 'd-body', item.body || item.contentHtml, 'textarea') +
      field('Обложка', 'd-cover', item.cover || item.image) +
      '<div class="field"><label>Файл обложки</label><input class="input" type="file" id="d-file" accept="image/*" /></div>' +
      field('Автор', 'd-author', item.author || ctx.session.name),
      function (status) { saveArticle(ctx, item, 'article', status); },
      function () { saveArticle(ctx, item, 'article', 'published'); },
      isNew ? null : function () { if (confirm('Снять статью с публикации?')) { hideItem('article', item.id); ctx.toast('Снято с публикации'); ctx.go('articles'); } },
      'articles.html'
    );
    bindCoverFile();
  }

  function bindCoverFile() {
    var file = document.getElementById('d-file');
    if (!file) return;
    file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var cover = document.getElementById('d-cover');
        if (cover) cover.value = reader.result;
      };
      reader.readAsDataURL(f);
    };
  }

  function saveArticle(ctx, item, type, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите заголовок', true); return; }
    var next = Object.assign({}, item, {
      kind: type === 'news' ? 'news' : 'article',
      title: title,
      category: val('d-cat'),
      date: val('d-date') || todayIso(),
      excerpt: val('d-excerpt'),
      body: val('d-body'),
      contentHtml: val('d-body').split(/\n+/).map(function (p) {
        return '<p>' + esc(p) + '</p>';
      }).join(''),
      cover: val('d-cover'),
      image: val('d-cover'),
      author: val('d-author') || ctx.session.name,
      status: status,
    });
    upsert(type, next);
    ctx.toast(status === 'published' ? 'Опубликовано' : 'Черновик сохранён');
    ctx.go(type === 'news' ? 'news' : 'articles');
  }

  function renderEventForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew
      ? { id: uid('ev'), date: todayIso(), category: 'meeting', cost: 'free', registration: 'none', city: 'Москва', status: 'published' }
      : getItem('event', id);
    if (!item) { ctx.toast('Событие не найдено', true); ctx.go('afisha'); return; }
    composeShell(
      ctx, isNew ? 'Новое событие' : 'Событие', 'afisha',
      field('Название', 'd-title', item.title) +
      field('Тип', 'd-cat', item.category, 'select', opts(EVENT_CATS, item.category || 'meeting')) +
      field('Дата', 'd-date', item.date, 'date') +
      field('Дата окончания', 'd-end', item.endDate || '', 'date') +
      field('Время', 'd-time', item.time, 'text', 'placeholder="19:00"') +
      field('Город', 'd-city', item.city) +
      field('Площадка', 'd-venue', item.venue) +
      field('Адрес', 'd-place', item.place) +
      field('Описание', 'd-desc', item.desc, 'textarea') +
      field('Ссылка', 'd-href', item.href),
      function (status) { saveEvent(ctx, item, status); },
      function () { saveEvent(ctx, item, 'published'); },
      isNew ? null : function () { if (confirm('Снять событие с публикации?')) { hideItem('event', item.id); ctx.toast('Снято с публикации'); ctx.go('afisha'); } },
      'events.html'
    );
  }

  function saveEvent(ctx, item, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название', true); return; }
    upsert('event', Object.assign({}, item, {
      title: title,
      category: val('d-cat'),
      date: val('d-date') || todayIso(),
      endDate: val('d-end'),
      time: val('d-time'),
      city: val('d-city'),
      venue: val('d-venue'),
      place: val('d-place'),
      desc: val('d-desc'),
      href: val('d-href'),
      status: status,
    }));
    ctx.toast(status === 'published' ? 'Опубликовано' : 'Черновик сохранён');
    ctx.go('afisha');
  }

  function renderAudioForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew ? { id: uid('au'), date: todayIso(), artist: '', status: 'published' }       : getItem('audio', id);
    if (!item) { ctx.toast('Аудио не найдено', true); ctx.go('audio'); return; }
    composeShell(
      ctx, isNew ? 'Новое аудио' : 'Аудио', 'audio',
      field('Название', 'd-title', item.title) +
      field('Исполнитель', 'd-artist', item.artist) +
      field('Дата', 'd-date', item.date, 'date') +
      field('Длительность', 'd-dur', item.duration, 'text', 'placeholder="12:40"') +
      field('Ссылка на файл', 'd-url', item.audioUrl || item.url) +
      '<div class="field"><label>Файл</label><input class="input" type="file" id="d-file" accept="audio/*" /></div>' +
      field('Обложка', 'd-cover', item.cover),
      function (status) { saveAudio(ctx, item, status); },
      function () { saveAudio(ctx, item, 'published'); },
      isNew ? null : function () { if (confirm('Снять аудио с публикации?')) { hideItem('audio', item.id); ctx.toast('Снято с публикации'); ctx.go('audio'); } },
      'audio.html'
    );
    var file = document.getElementById('d-file');
    if (file) file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var url = document.getElementById('d-url');
        if (url) url.value = reader.result;
        if (!val('d-title')) document.getElementById('d-title').value = f.name.replace(/\.[^.]+$/, '');
      };
      reader.readAsDataURL(f);
    };
  }

  function saveAudio(ctx, item, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название', true); return; }
    if (!val('d-url')) { ctx.toast('Укажите ссылку или файл', true); return; }
    upsert('audio', Object.assign({}, item, {
      title: title,
      artist: val('d-artist'),
      date: val('d-date') || todayIso(),
      duration: val('d-dur'),
      audioUrl: val('d-url'),
      url: val('d-url'),
      cover: val('d-cover'),
      status: status,
    }));
    ctx.toast(status === 'published' ? 'Опубликовано' : 'Черновик сохранён');
    ctx.go('audio');
  }

  function renderVideoForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew ? { id: uid('vid'), type: 'long', status: 'published' }       : getItem('video', id);
    if (!item) { ctx.toast('Видео не найдено', true); ctx.go('video'); return; }
    composeShell(
      ctx, isNew ? 'Новое видео' : 'Видео', 'video',
      field('Название', 'd-title', item.title) +
      field('Формат', 'd-type', item.type, 'select', opts([{ id: 'long', title: 'Полнометражное' }, { id: 'short', title: 'Shorts' }], item.type || 'long')) +
      field('Спикер', 'd-speaker', item.speaker) +
      field('Описание', 'd-desc', item.description, 'textarea') +
      field('Ссылка на видео', 'd-url', item.videoUrl) +
      field('Превью', 'd-thumb', item.thumb) +
      '<div class="field"><label>Файл превью</label><input class="input" type="file" id="d-file" accept="image/*" /></div>' +
      field('Длительность, сек.', 'd-dur', item.duration, 'number'),
      function (status) { saveVideo(ctx, item, status); },
      function () { saveVideo(ctx, item, 'published'); },
      isNew ? null : function () { if (confirm('Снять видео с публикации?')) { hideItem('video', item.id); ctx.toast('Снято с публикации'); ctx.go('video'); } },
      'video.html'
    );
    bindCoverFile();
    var file = document.getElementById('d-file');
    if (file) file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var thumb = document.getElementById('d-thumb');
        if (thumb) thumb.value = reader.result;
      };
      reader.readAsDataURL(f);
    };
  }

  function saveVideo(ctx, item, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название', true); return; }
    if (!val('d-url')) { ctx.toast('Укажите ссылку на видео', true); return; }
    upsert('video', Object.assign({}, item, {
      title: title,
      type: val('d-type') || 'long',
      speaker: val('d-speaker'),
      description: val('d-desc'),
      videoUrl: val('d-url'),
      thumb: val('d-thumb'),
      duration: Number(val('d-dur')) || 0,
      status: status,
    }));
    ctx.toast(status === 'published' ? 'Опубликовано' : 'Черновик сохранён');
    ctx.go('video');
  }

  function weekdayName(iso) {
    var names = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    var d = iso ? new Date(iso + 'T12:00:00') : new Date();
    return names[d.getDay()];
  }

  function renderChurchForm(ctx, id) {
    var isNew = !id || id === 'new';
    var item = isNew
      ? { id: uid('day'), date: todayIso(), weekday: weekdayName(todayIso()), status: 'published', liturgical: {} }
      : getItem('church-day', id);
    if (!item) { ctx.toast('День не найден', true); ctx.go('church-day'); return; }
    var lit = item.liturgical || {};
    composeShell(
      ctx, 'День Церкви', 'church-day',
      field('Дата', 'd-date', item.date, 'date') +
      field('Название дня', 'd-title', lit.title, 'text', 'placeholder="Пятница XVIII обычной недели"') +
      field('Святой дня', 'd-saint', lit.saint && lit.saint.name) +
      field('Чтение', 'd-reading', lit.reading, 'textarea') +
      field('Молитва', 'd-prayer', lit.prayer, 'textarea') +
      field('Цитата', 'd-quote', lit.quote, 'textarea'),
      function (status) { saveChurch(ctx, item, status); },
      function () { saveChurch(ctx, item, 'published'); },
      isNew ? null : function () { if (confirm('Снять день с публикации?')) { hideItem('church-day', item.id); ctx.toast('Снято с публикации'); ctx.go('church-day'); } },
      'calendar.html'
    );
  }

  function saveChurch(ctx, item, status) {
    var date = val('d-date') || todayIso();
    upsert('church-day', Object.assign({}, item, {
      date: date,
      weekday: weekdayName(date),
      title: val('d-title') || weekdayName(date),
      status: status,
      liturgical: {
        title: val('d-title'),
        category: 'будний',
        color: '',
        saint: { name: val('d-saint'), href: '' },
        reading: val('d-reading'),
        prayer: val('d-prayer'),
        quote: val('d-quote'),
      },
    }));
    ctx.toast(status === 'published' ? 'Опубликовано' : 'Черновик сохранён');
    ctx.go('church-day');
  }

  function renderAuthors(ctx, id) {
    if (id && id !== 'new') {
      var item = getItem('authors', id) || { id: id, slug: id, name: '', bio: '', role: '' };
      composeShell(
        ctx, item.name || 'Автор', 'authors',
        field('Имя', 'd-title', item.name) +
        field('Роль', 'd-role', item.role) +
        field('Биография', 'd-bio', item.bio, 'textarea'),
        function (status) { saveAuthor(ctx, item, status); },
        function () { saveAuthor(ctx, item, 'published'); },
        null,
        'authors.html'
      );
      return;
    }
    var items = mergedList('authors');
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Авторы</h1><p>Авторы портала.</p></div></div>' +
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
    upsert('authors', Object.assign({}, item, {
      id: item.slug || item.id,
      slug: item.slug || item.id,
      name: val('d-title'),
      role: val('d-role'),
      bio: val('d-bio'),
      status: status,
    }));
    ctx.toast(status === 'published' ? 'Сохранено' : 'Черновик сохранён');
    ctx.go('authors');
  }

  var LIST_MAP = { news: 'news', articles: 'article', afisha: 'event', audio: 'audio', video: 'video', 'church-day': 'church-day' };
  var FORM_MAP = {
    news: renderNewsForm,
    articles: renderArticleForm,
    afisha: renderEventForm,
    audio: renderAudioForm,
    video: renderVideoForm,
    'church-day': renderChurchForm,
  };

  function upsertGuide(item) {
    return upsert('guides', item);
  }

  function renderRoute(name, id, ctx) {
    if (name === 'publish' || name === 'dashboard') {
      renderHub(ctx);
      return true;
    }
    if (name === 'media' || name === 'photostock') {
      if (window.AdminGod) AdminGod.paintSection(ctx, 'photo', 'Фотосток', '#upload-photos');
      return true;
    }
    if (name === 'church') {
      if (id && window.AdminGod) AdminGod.paintGuideEdit(ctx, window.YakGuides && YakGuides.church, decodeURIComponent(id), 'church');
      else if (window.AdminGod) AdminGod.paintSection(ctx, 'church', 'О Церкви', '');
      return true;
    }
    if (name === 'spirit') {
      if (id && window.AdminGod) AdminGod.paintGuideEdit(ctx, window.YakGuides && YakGuides.spirit, decodeURIComponent(id), 'spirit');
      else if (window.AdminGod) AdminGod.paintSection(ctx, 'spirit', 'Духовная жизнь', '');
      return true;
    }
    if (name === 'authors') {
      if (!id && window.AdminGod) AdminGod.paintSection(ctx, 'authors', 'Авторы', '');
      else renderAuthors(ctx, id);
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
    mergedList: mergedList,
    allPhotos: allPhotos,
    portalHref: portalHref,
    read: read,
    upsertGuide: upsertGuide,
  };

  try {
    loadSeed(function () {});
    loadArchive('news', function () {});
    loadArchive('article', function () {});
  } catch (e) {}
})(window);
