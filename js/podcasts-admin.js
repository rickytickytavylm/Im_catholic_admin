/**
 * Подкасты: шоу + выпуски. Файлы — в бакет, на сайте обычная ссылка.
 */
(function (global) {
  'use strict';

  var PAGE_ID = 1900000012;
  var PAGE_SLUG = 'yak-podcasts-data';
  var PORTAL = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
  if (PORTAL.slice(-1) !== '/') PORTAL += '/';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function readAll() {
    if (window.AdminDesk && AdminDesk.read) return AdminDesk.read();
    try { return JSON.parse(localStorage.getItem('yak_desk') || '{}') || {}; } catch (e) { return {}; }
  }

  function writeShows(list) {
    if (window.AdminDesk && AdminDesk.read && AdminDesk.write) {
      var all = AdminDesk.read();
      all.podcasts = list;
      AdminDesk.write(all);
      return;
    }
    var raw = readAll();
    raw.podcasts = list;
    localStorage.setItem('yak_desk', JSON.stringify(raw));
  }

  function seedShows() {
    var fromSite = (window.YakPodcasts && YakPodcasts.shows) ? YakPodcasts.shows : [];
    return fromSite.map(function (s) { return JSON.parse(JSON.stringify(s)); });
  }

  function allShows() {
    var seed = seedShows();
    var saved = readAll().podcasts;
    if (!saved || !saved.length) return seed;
    return saved.map(function (s) {
      var fromSeed = seed.filter(function (x) { return x && x.id === s.id; })[0];
      if (fromSeed && fromSeed.episodes && (!s.episodes || s.episodes.length < fromSeed.episodes.length)) {
        return Object.assign({}, s, { episodes: fromSeed.episodes.slice() });
      }
      return s;
    });
  }

  function getShow(id) {
    id = String(id || '');
    var list = allShows();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === id) return list[i];
    }
    return null;
  }

  function upsertShow(show) {
    var list = allShows();
    var i = list.findIndex(function (s) { return String(s.id) === String(show.id); });
    if (i === -1) list.unshift(show);
    else list[i] = Object.assign({}, list[i], show);
    writeShows(list);
    return show;
  }

  function findEp(show, epId) {
    var list = (show && show.episodes) || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(epId)) return list[i];
    }
    return null;
  }

  function authors() {
    if (window.AdminDesk && AdminDesk.read) {
      /* catalog lives on YakAuthors + desk */
    }
    var out = [];
    var seen = {};
    function add(a) {
      if (!a || !a.slug) return;
      if (seen[a.slug]) return;
      seen[a.slug] = 1;
      out.push({ slug: a.slug, name: a.name || a.slug });
    }
    (window.YakAuthors || []).forEach(add);
    (readAll().authors || []).forEach(add);
    return out.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'ru'); });
  }

  function authorOpts(selected) {
    return '<option value="">— без карточки —</option>' + authors().map(function (a) {
      return '<option value="' + esc(a.slug) + '"' + (a.slug === selected ? ' selected' : '') + '>' + esc(a.name) + '</option>';
    }).join('');
  }

  function publishPack() {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var shows = allShows().filter(function (s) {
      return s && s.id && (!s.status || s.status === 'published');
    }).map(function (s) {
      var copy = Object.assign({}, s);
      delete copy.source;
      copy.episodes = (s.episodes || []).filter(function (ep) {
        return ep && (!ep.status || ep.status === 'published');
      });
      return copy;
    });
    return AdminApi.upsertArchive({
      articles: [{
        id: PAGE_ID,
        slug: PAGE_SLUG,
        title: 'Подкасты редакции',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify({ shows: shows }),
        source: 'desk-podcasts',
      }],
    });
  }

  function parseId(raw) {
    raw = String(raw || '');
    if (!raw || raw === 'new') return { kind: 'list' };
    if (raw === 'show-new') return { kind: 'show', id: '' };
    if (raw.indexOf('ep-new:') === 0) return { kind: 'episode', showId: raw.slice(7), epId: '' };
    if (raw.indexOf('ep:') === 0) {
      var rest = raw.slice(3);
      var cut = rest.indexOf(':');
      if (cut === -1) return { kind: 'list' };
      return { kind: 'episode', showId: rest.slice(0, cut), epId: rest.slice(cut + 1) };
    }
    return { kind: 'show', id: raw };
  }

  function render(id, ctx) {
    var parsed = parseId(id);
    if (parsed.kind === 'show') return renderShow(ctx, parsed.id);
    if (parsed.kind === 'episode') return renderEpisode(ctx, parsed.showId, parsed.epId);
    return renderList(ctx);
  }

  function renderList(ctx) {
    var shows = allShows();
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Подкасты</h1></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="' + PORTAL + 'audio.html" target="_blank" rel="noopener">На сайте</a>' +
      '<a class="btn btn-primary" href="#podcasts/show-new">Новый подкаст</a>' +
      '</div></div>' +
      '<div class="panel">' +
      (shows.length ? shows.map(function (s) {
        var n = (s.episodes || []).length;
        return (
          '<a class="god-card" href="#podcasts/' + encodeURIComponent(s.id) + '">' +
          '<span class="god-thumb" style="background-image:url(\'' + esc(s.cover || '') + '\')"></span>' +
          '<span class="god-copy"><strong>' + esc(s.title) + '</strong>' +
          '<small>' + esc(s.host || '') + ' · ' + n + ' вып.</small></span></a>'
        );
      }).join('') : '<p class="hint-note">Пока нет подкастов. Добавьте шоу — потом выпуски с файлами.</p>') +
      '</div>';
  }

  function renderShow(ctx, id) {
    var isNew = !id;
    var item = isNew
      ? { id: uid('cast'), title: '', host: '', authorSlug: '', blurb: '', cover: '', episodes: [], status: 'published' }
      : getShow(id);
    if (!item) { ctx.toast('Подкаст не найден', true); ctx.go('podcasts', ''); return; }
    var D = window.AdminDesk;
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + (isNew ? 'Новый подкаст' : esc(item.title || 'Подкаст')) + '</h1></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost btn-back" href="#podcasts">← Список</a>' +
      (isNew ? '' : '<a class="btn btn-ghost" href="#podcasts/ep-new:' + encodeURIComponent(item.id) + '">Выпуск</a>') +
      '<button type="button" class="btn btn-ghost" id="cast-draft">Сохранить</button>' +
      '<button type="button" class="btn btn-primary" id="cast-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="panel form-grid desk-form">' +
      '<div class="field"><label>Название</label><input class="input" id="d-title" value="' + esc(item.title) + '" /></div>' +
      '<div class="field"><label>Автор / ведущий</label><input class="input" id="d-host" value="' + esc(item.host) + '" /></div>' +
      '<div class="field"><label>Карточка автора</label><select class="select" id="d-author">' + authorOpts(item.authorSlug) + '</select></div>' +
      '<div class="field"><label>Описание</label><textarea class="textarea" id="d-blurb" rows="5">' + esc(item.blurb) + '</textarea></div>' +
      '<div class="field"><label>Обложка</label><input class="input" id="d-cover" value="' + esc(item.cover || '') + '" />' +
      '<input class="input" type="file" id="d-cover-file" accept="image/*" /></div>' +
      '</div>' +
      (isNew ? '' :
        '<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Выпуски</h2>' +
        '<a class="btn btn-ghost" href="#podcasts/ep-new:' + encodeURIComponent(item.id) + '">Добавить</a></div>' +
        ((item.episodes || []).length
          ? '<div class="cycle-list">' + (item.episodes || []).slice().sort(function (a, b) {
            var sa = Number(a.season) || 0; var sb = Number(b.season) || 0;
            if (sa !== sb) return sb - sa;
            return (Number(b.episode) || 0) - (Number(a.episode) || 0);
          }).map(function (ep) {
            return (
              '<a class="cycle-row" href="#podcasts/ep:' + encodeURIComponent(item.id) + ':' + encodeURIComponent(ep.id) + '">' +
              '<span>S' + esc(String(ep.season || 0)) + 'E' + esc(String(ep.episode || 0)) + ' · ' + esc(ep.title) + '</span>' +
              '<small>' + esc(ep.date || '') + '</small></a>'
            );
          }).join('')
          : '<p class="hint-note">Выпусков ещё нет.</p>') +
        '</div>');

    var coverFile = document.getElementById('d-cover-file');
    if (coverFile) coverFile.onchange = function () {
      var f = coverFile.files && coverFile.files[0];
      if (!f || !D || !D.uploadDataUrl) return;
      var reader = new FileReader();
      reader.onload = function () {
        ctx.toast('Сохраняем обложку…');
        D.uploadDataUrl(reader.result, 'covers').then(function (url) {
          document.getElementById('d-cover').value = url;
          ctx.toast('Обложка в бакете');
        }).catch(function (e) { ctx.toast(e.message || 'Не удалось', true); });
      };
      reader.readAsDataURL(f);
    };

    function collect() {
      var next = Object.assign({}, item, {
        title: val('d-title'),
        host: val('d-host'),
        authorSlug: val('d-author'),
        blurb: val('d-blurb'),
        cover: val('d-cover'),
        episodes: item.episodes || [],
        status: 'published',
      });
      if (!next.id) next.id = uid('cast');
      return next;
    }

    function save(publish) {
      var next = collect();
      if (!next.title) { ctx.toast('Укажите название', true); return; }
      upsertShow(next);
      var done = publish ? publishPack() : Promise.resolve();
      ctx.toast(publish ? 'Публикуем…' : 'Сохраняем…');
      done.then(function () {
        ctx.toast(publish ? 'На сайте' : 'Сохранено');
        ctx.go('podcasts', next.id);
      }).catch(function (e) { ctx.toast(e.message || 'Не удалось сохранить', true); });
    }

    document.getElementById('cast-draft').onclick = function () { save(false); };
    document.getElementById('cast-pub').onclick = function () { save(true); };
  }

  function renderEpisode(ctx, showId, epId) {
    var show = getShow(showId);
    if (!show) { ctx.toast('Подкаст не найден', true); ctx.go('podcasts', ''); return; }
    var isNew = !epId;
    var item = isNew
      ? { id: uid('ep'), season: 1, episode: ((show.episodes || []).length + 1), title: '', date: todayIso(), audioUrl: '', duration: '', description: '' }
      : findEp(show, epId);
    if (!item) { ctx.toast('Выпуск не найден', true); ctx.go('podcasts', showId); return; }
    var D = window.AdminDesk;
    var attach = D && D.attachField
      ? D.attachField({
        label: 'Аудиофайл',
        btnId: 'd-audio-btn',
        inputId: 'd-audio-file',
        nameId: 'd-audio-name',
        barId: 'd-audio-bar',
        fillId: 'd-audio-fill',
        accept: 'audio/*',
        button: 'Прикрепить аудио',
        current: D.fileLabel ? D.fileLabel(item.audioUrl) : (item.audioUrl || 'файл не выбран'),
        hint: 'Файл уйдёт в бакет. На сайте плеер откроет обычную ссылку.',
      })
      : '<div class="field"><label>Файл</label><input class="input" type="file" id="d-audio-file" accept="audio/*" /></div>';

    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + (isNew ? 'Новый выпуск' : esc(item.title || 'Выпуск')) + '</h1></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost btn-back" href="#podcasts/' + encodeURIComponent(show.id) + '">← ' + esc(show.title) + '</a>' +
      (isNew ? '' : '<button type="button" class="btn btn-ghost" id="ep-del">Снять</button>') +
      '<button type="button" class="btn btn-ghost" id="ep-draft">Сохранить</button>' +
      '<button type="button" class="btn btn-primary" id="ep-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="panel form-grid desk-form">' +
      '<p class="hint-note">' + esc(show.title) + ' · ' + esc(show.host || '') + '</p>' +
      '<div class="field"><label>Сезон</label><input class="input" id="d-season" type="number" min="1" value="' + esc(item.season || 1) + '" /></div>' +
      '<div class="field"><label>Выпуск</label><input class="input" id="d-episode" type="number" min="1" value="' + esc(item.episode || 1) + '" /></div>' +
      '<div class="field"><label>Название</label><input class="input" id="d-title" value="' + esc(item.title) + '" /></div>' +
      '<div class="field"><label>Дата</label><input class="input" id="d-date" type="date" value="' + esc(item.date || '') + '" /></div>' +
      '<div class="field"><label>Длительность</label><input class="input" id="d-dur" value="' + esc(item.duration || '') + '" placeholder="42:10" /></div>' +
      attach +
      '<div class="field"><label>Ссылка на файл</label><input class="input" id="d-url" value="' + esc(item.audioUrl || '') + '" /></div>' +
      '<div class="field"><label>Описание</label><textarea class="textarea" id="d-desc" rows="4">' + esc(item.description || '') + '</textarea></div>' +
      '</div>';

    if (D && D.bindBucketFile) {
      D.bindBucketFile({
        ctx: ctx,
        folder: 'podcasts',
        btnId: 'd-audio-btn',
        inputId: 'd-audio-file',
        nameId: 'd-audio-name',
        barId: 'd-audio-bar',
        fillId: 'd-audio-fill',
        urlId: 'd-url',
        onDone: function (_out, file) {
          if (!val('d-title')) document.getElementById('d-title').value = file.name.replace(/\.[^.]+$/, '');
          if (D.readMediaDuration) {
            D.readMediaDuration(file, 'audio').then(function (dur) {
              if (dur && !val('d-dur')) document.getElementById('d-dur').value = dur;
            });
          }
        },
      });
    }

    function collect() {
      return Object.assign({}, item, {
        season: Number(val('d-season')) || 0,
        episode: Number(val('d-episode')) || 0,
        title: val('d-title'),
        date: val('d-date') || todayIso(),
        duration: val('d-dur'),
        audioUrl: val('d-url'),
        description: val('d-desc'),
        status: 'published',
      });
    }

    function save(publish) {
      var next = collect();
      if (!next.title) { ctx.toast('Укажите название', true); return; }
      if (!next.audioUrl) { ctx.toast('Прикрепите файл', true); return; }
      if (next.audioUrl.indexOf('data:') === 0) { ctx.toast('Дождитесь загрузки в бакет', true); return; }
      show.episodes = show.episodes || [];
      var i = show.episodes.findIndex(function (ep) { return String(ep.id) === String(next.id); });
      if (i === -1) show.episodes.unshift(next);
      else show.episodes[i] = next;
      upsertShow(show);
      var done = publish ? publishPack() : Promise.resolve();
      ctx.toast(publish ? 'Публикуем…' : 'Сохраняем…');
      done.then(function () {
        ctx.toast(publish ? 'На сайте' : 'Сохранено');
        ctx.go('podcasts', show.id);
      }).catch(function (e) { ctx.toast(e.message || 'Не удалось сохранить', true); });
    }

    document.getElementById('ep-draft').onclick = function () { save(false); };
    document.getElementById('ep-pub').onclick = function () { save(true); };
    var del = document.getElementById('ep-del');
    if (del) del.onclick = function () {
      if (!confirm('Снять выпуск?')) return;
      show.episodes = (show.episodes || []).filter(function (ep) { return String(ep.id) !== String(item.id); });
      upsertShow(show);
      publishPack().then(function () {
        ctx.toast('Снято');
        ctx.go('podcasts', show.id);
      }).catch(function (e) { ctx.toast(e.message || 'Не удалось снять', true); });
    };
  }

  global.AdminPodcasts = { render: render, publishPack: publishPack };
})(window);
