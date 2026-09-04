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
    return { articles: [], events: [], audio: [], video: [], churchDays: [], authors: [], guides: [], authorLinks: [], photographers: [], videoChannels: [] };
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

  function openArchiveForm(ctx, type, id, renderFn) {
    var cached = getItem(type, id);
    var hasText = cached && (cached.body || cached.contentHtml);
    ctx.viewEl.innerHTML = '<div class="panel"><div class="empty">Загрузка полного текста</div></div>';
    if (!window.AdminApi || !AdminApi.getArticle) {
      if (cached) renderFn(cached);
      else ctx.go(type === 'news' ? 'news' : 'articles');
      return;
    }
    AdminApi.getArticle(id).then(function (a) {
      if (!a || !a.title) throw new Error('empty');
      var mapped = mapArchive(a, type);
      if (cached && cached.source !== 'site') {
        mapped = Object.assign({}, mapped, cached, {
          body: cached.body || mapped.body,
          contentHtml: cached.contentHtml || mapped.contentHtml,
        });
      }
      archiveCache[type] = (archiveCache[type] || []).filter(function (x) {
        return String(x.id) !== String(mapped.id);
      }).concat([mapped]);
      renderFn(mapped);
    }).catch(function () {
      if (hasText) {
        renderFn(cached);
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

  function paintPublicationForm(ctx, item, isNew, type) {
    var isNews = type === 'news';
    var cats = isNews ? NEWS_CATS : ARTICLE_CATS;
    var back = isNews ? 'news' : 'articles';
    var portal = isNews ? 'archive.html?category=news' : 'articles.html';
    var cover = item.cover || item.image || '';

    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(isNew ? (isNews ? 'Новая новость' : 'Новая статья') : (item.title || (isNews ? 'Новость' : 'Статья'))) + '</h1>' +
      '<p>' + (isNews ? 'Полный текст новости — как на сайте.' : 'Полный текст статьи — как на сайте.') + '</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="#' + back + '">Назад</a>' +
      '<a class="btn btn-ghost" href="' + portalHref(portal) + '" target="_blank" rel="noopener">На портале</a>' +
      (isNew ? '' : '<button type="button" class="btn btn-ghost" id="desk-del">Снять</button>') +
      '<button type="button" class="btn btn-ghost" id="desk-draft">Сохранить черновик</button>' +
      '<button type="button" class="btn btn-primary" id="desk-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="day-editor guide-editor">' +
      '<div class="panel form-grid desk-form">' +
      field('Заголовок', 'd-title', item.title) +
      field('Рубрика', 'd-cat', item.category, 'select', opts(cats, item.category || (isNews ? 'news' : 'columns'))) +
      field('Дата', 'd-date', (item.date || todayIso()).slice(0, 10), 'date') +
      field('Лид', 'd-excerpt', item.excerpt, 'textarea') +
      field('Автор', 'd-author', item.author || (ctx.session && ctx.session.name) || '') +
      '<div class="field"><label>Обложка</label>' +
      '<div class="cover-frame' + (cover ? '' : ' is-empty') + '" id="d-cover-frame">' +
      (cover ? '<img src="' + esc(mediaSrc(cover)) + '" alt="" />' : '<span>Фото 16:9</span>') +
      '</div>' +
      '<input type="hidden" id="d-cover" value="' + esc(cover) + '" />' +
      '<div class="post-side-actions" style="margin-top:8px">' +
      '<button type="button" class="btn btn-ghost" id="d-cover-up">С устройства</button></div>' +
      '<input type="file" id="d-file" accept="image/*" hidden /></div>' +
      '<div class="field"><label>Текст</label>' +
      '<div class="rte">' +
      '<div class="rte-bar" id="d-rte-bar">' +
      '<button type="button" data-block="p">Текст</button>' +
      '<button type="button" data-block="h2">Заголовок</button>' +
      '<button type="button" data-cmd="bold">Жирный</button>' +
      '<button type="button" data-cmd="italic">Курсив</button>' +
      '<button type="button" data-block="quote">Цитата</button>' +
      '<button type="button" data-cmd="insertUnorderedList">Список</button>' +
      '<button type="button" data-act="link">Ссылка</button>' +
      '<button type="button" data-act="image">Фото</button>' +
      '</div>' +
      '<div class="rte-body" id="d-body" contenteditable="true" data-placeholder="Текст публикации"></div>' +
      '<input type="file" id="d-inline-file" accept="image/*" hidden />' +
      '</div></div></div>' +
      '<aside class="day-preview-wrap"><div class="day-preview-sticky">' +
      '<p class="day-preview-label">Предпросмотр — полный текст</p>' +
      '<div id="d-preview" class="day-preview guide-live"></div></div></aside></div>';

    var bodyEl = document.getElementById('d-body');
    bodyEl.innerHTML = articleHtml(item);
    mountDeskRTE(bodyEl, function () { drawPubPreview(); });
    bindCoverFile(function () { drawPubPreview(); });
    ['d-title', 'd-excerpt', 'd-author', 'd-date'].forEach(function (fid) {
      var el = document.getElementById(fid);
      if (el) el.addEventListener('input', drawPubPreview);
    });
    drawPubPreview();

    document.getElementById('desk-draft').onclick = function () { saveArticle(ctx, item, type, 'draft'); };
    document.getElementById('desk-pub').onclick = function () { saveArticle(ctx, item, type, 'published'); };
    var delBtn = document.getElementById('desk-del');
    if (delBtn) delBtn.onclick = function () {
      if (confirm(isNews ? 'Снять новость с публикации?' : 'Снять статью с публикации?')) {
        hideItem(type, item.id);
        ctx.toast('Снято с публикации');
        ctx.go(back);
      }
    };
  }

  function drawPubPreview() {
    var el = document.getElementById('d-preview');
    if (!el) return;
    var cover = val('d-cover');
    var body = document.getElementById('d-body');
    el.innerHTML =
      (cover ? '<img src="' + esc(mediaSrc(cover)) + '" alt="" />' : '') +
      '<p class="dp-date">' + esc(val('d-date')) + (val('d-author') ? ' · ' + esc(val('d-author')) : '') + '</p>' +
      '<h3 class="dp-title">' + (esc(val('d-title')) || '<em class="dp-empty">Заголовок</em>') + '</h3>' +
      (val('d-excerpt') ? '<p class="guide-lead">' + esc(val('d-excerpt')) + '</p>' : '') +
      '<div class="guide-body">' + ((body && body.innerHTML) || '') + '</div>';
  }

  function mountDeskRTE(el, onChange) {
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      var box = document.createElement('div');
      if (/<[a-z][\s\S]*>/i.test(html)) box.innerHTML = html;
      else box.innerHTML = '<p>' + esc(html).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      box.querySelectorAll('script,style').forEach(function (n) { n.remove(); });
      document.execCommand('insertHTML', false, box.innerHTML);
      if (onChange) onChange();
    });
    el.addEventListener('input', function () { if (onChange) onChange(); });
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
      if (act === 'image') {
        var input = document.getElementById('d-inline-file');
        if (!input) return;
        input.onchange = function () {
          var f = input.files && input.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function () {
            document.execCommand('insertHTML', false, '<figure class="rte-figure"><img src="' + esc(reader.result) + '" alt="" /></figure>');
            if (onChange) onChange();
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
        var cover = document.getElementById('d-cover');
        if (cover) cover.value = reader.result;
        var frame = document.getElementById('d-cover-frame');
        if (frame) {
          frame.classList.remove('is-empty');
          frame.innerHTML = '<img src="' + reader.result + '" alt="" />';
        }
        if (onChange) onChange();
      };
      reader.readAsDataURL(f);
    };
  }

  function saveArticle(ctx, item, type, status) {
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите заголовок', true); return; }
    var bodyEl = document.getElementById('d-body');
    var html = bodyEl ? bodyEl.innerHTML : '';
    var next = Object.assign({}, item, {
      kind: type === 'news' ? 'news' : 'article',
      title: title,
      category: val('d-cat'),
      date: val('d-date') || todayIso(),
      excerpt: val('d-excerpt') || htmlToText(html).slice(0, 220),
      body: htmlToText(html),
      contentHtml: html,
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
      field('Канал партнёра', 'd-channel', item.channelId) +
      field('Цикл', 'd-cycle', item.cycle) +
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
      channelId: val('d-channel'),
      cycle: val('d-cycle'),
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
      '<a class="btn btn-ghost" href="#church-day">Назад</a>' +
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
      field('Святой дня', 'd-saint', lit.saint && lit.saint.name) +
      field('Ссылка на святого (необязательно)', 'd-saint-href', lit.saint && lit.saint.href, 'text', 'placeholder="https://…"') +
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
    function drawPreview() {
      var cat = val('d-cat') || defaultCat;
      var el = document.getElementById('d-preview');
      if (!el) return;
      var saint = val('d-saint');
      var saintHref = val('d-saint-href');
      function blk(label, body) {
        if (!body) return '';
        return '<div class="dp-block"><h4>' + esc(label) + '</h4>' + body + '</div>';
      }
      el.innerHTML =
        '<p class="dp-date">' + esc(weekdayName(val('d-date'))) + ' · ' + esc(fmtLongRu(val('d-date'))) + '</p>' +
        '<span class="cal-rank cal-rank-' + catClass(cat) + '">' + esc(cat) + '</span>' +
        '<h3 class="dp-title">' + (esc(val('d-title')) || '<em class="dp-empty">Название дня</em>') + '</h3>' +
        (val('d-color') ? '<p class="dp-color">Литургический цвет: <b>' + esc(val('d-color')) + '</b></p>' : '') +
        blk('Святой дня', saint ? (saintHref ? '<a href="' + esc(saintHref) + '">' + esc(saint) + '</a>' : '<p>' + esc(saint) + '</p>') : '') +
        blk('Чтение дня', val('d-reading') ? '<p>' + esc(val('d-reading')) + '</p>' : '') +
        blk('Молитва дня', val('d-prayer') ? '<p>' + esc(val('d-prayer')) + '</p>' : '') +
        blk('Цитата дня', val('d-quote') ? '<p class="dp-quote">' + esc(val('d-quote')) + '</p>' : '');
    }
    if (dateEl) dateEl.addEventListener('change', function () { syncWeekday(); drawPreview(); });
    ['d-cat', 'd-color', 'd-title', 'd-saint', 'd-saint-href', 'd-reading', 'd-prayer', 'd-quote'].forEach(function (fid) {
      var el = document.getElementById(fid);
      if (el) el.addEventListener('input', drawPreview);
      if (el && el.tagName === 'SELECT') el.addEventListener('change', drawPreview);
    });
    drawPreview();

    document.getElementById('desk-draft').onclick = function () { saveChurch(ctx, item, 'draft'); };
    document.getElementById('desk-pub').onclick = function () { saveChurch(ctx, item, 'published'); };
    var delBtn = document.getElementById('desk-del');
    if (delBtn) delBtn.onclick = function () {
      if (confirm('Снять день с публикации?')) { hideItem('church-day', item.id); ctx.toast('Снято с публикации'); ctx.go('church-day'); }
    };
  }

  function saveChurch(ctx, item, status) {
    var date = val('d-date') || todayIso();
    var title = val('d-title');
    if (!title) { ctx.toast('Укажите название дня', true); return; }
    upsert('church-day', Object.assign({}, item, {
      date: date,
      weekday: weekdayName(date),
      title: title,
      status: status,
      liturgical: {
        title: title,
        category: val('d-cat') || (weekdayName(date) === 'Воскресенье' ? 'воскресный' : 'будний'),
        color: val('d-color'),
        saint: { name: val('d-saint'), href: val('d-saint-href') },
        reading: val('d-reading'),
        prayer: val('d-prayer'),
        quote: val('d-quote'),
      },
    }));
    ctx.toast(status === 'published' ? 'Опубликовано' : 'Черновик сохранён');
    ctx.go('church-day');
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

  function renderAuthors(ctx, id) {
    if (id && id !== 'new') {
      var baked = (window.YakAuthors || []).filter(function (a) { return a.slug === id || a.id === id; })[0] || {};
      var item = Object.assign({}, baked, getItem('authors', id) || { id: id, slug: id });
      var linked = (item.recent || []).slice();
      (read().authorLinks || []).forEach(function (l) {
        if (l.authorSlug === item.slug && !linked.some(function (p) { return p.slug === l.slug; })) linked.unshift(l);
      });
      composeShell(
        ctx, item.name || 'Автор', 'authors',
        field('Имя', 'd-title', item.name) +
        field('Роль', 'd-role', item.role) +
        field('Биография', 'd-bio', item.bio, 'textarea') +
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
        'author.html?slug=' + encodeURIComponent(item.slug || id)
      );
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
          document.getElementById('d-photo-url').value = reader.result;
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
      '<div class="topbar"><div><h1>Авторы</h1><p>Карточки, описания и привязка публикаций.</p></div></div>' +
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
      photo: val('d-photo-url') || item.photo || '',
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
    write(data);
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
            var inc = incoming[key] || [];
            if (!inc.length) return;
            var list = cur[key] || [];
            inc.forEach(function (rec) {
              if (!rec) return;
              var i = list.findIndex(function (x) {
                return String(x.id) === String(rec.id) || (rec.date && String(x.date) === String(rec.date));
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
    linkAuthor: linkAuthor,
    exportDesk: exportDesk,
    importDesk: importDesk,
  };

  try {
    loadSeed(function () {});
    loadArchive('news', function () {});
    loadArchive('article', function () {});
  } catch (e) {}
})(window);
