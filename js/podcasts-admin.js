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

  /* Последний свежий пакет с сервера и время его записи. */
  var remotePack = null;
  var remoteStamp = '';
  var hydrated = false;

  function remoteShows() {
    return remotePack && Array.isArray(remotePack.shows) ? remotePack.shows : [];
  }

  function localShows() {
    return (readAll().podcasts || []).filter(function (s) { return s && s.id; });
  }

  function timeOf(rec) {
    return String((rec && rec.updatedAt) || remoteStamp || '');
  }

  function remoteShow(id) {
    return remoteShows().filter(function (s) { return s && String(s.id) === String(id); })[0] || null;
  }

  function remoteEpisode(showId, epId) {
    var s = remoteShow(showId);
    return s ? ((s.episodes || []).filter(function (e) { return e && String(e.id) === String(epId); })[0] || null) : null;
  }

  function freshTime(remoteRec) {
    var now = new Date().toISOString();
    var rt = remoteRec ? timeOf(remoteRec) : '';
    if (rt && rt >= now) {
      var t = Date.parse(rt);
      if (!isNaN(t)) now = new Date(t + 1).toISOString();
    }
    return now;
  }

  function syncOf(rec) {
    if (rec.status === 'draft') return 'draft';
    if (rec.status === 'hidden') return 'hidden';
    return 'pending';
  }

  /* Местная правка видна поверх серверной, только если она новее. */
  function viewEpisodes(base, local) {
    var by = {};
    var order = [];
    (base || []).forEach(function (e) {
      if (!e || !e.id || by[e.id]) return;
      by[e.id] = e;
      order.push(e.id);
    });
    (local || []).forEach(function (e) {
      if (!e || !e.id) return;
      var cur = by[e.id];
      if (cur && timeOf(cur) >= String(e.updatedAt || '')) return;
      by[e.id] = Object.assign({}, e, { _sync: syncOf(e) });
      if (!cur) order.push(e.id);
    });
    return order.map(function (k) { return by[k]; }).filter(function (e) {
      return e.status !== 'hidden' || e._sync === 'hidden';
    });
  }

  function allShows() {
    var by = {};
    var order = [];
    var onServer = {};
    seedShows().forEach(function (s) {
      if (!s || !s.id || by[s.id]) return;
      by[s.id] = s;
      order.push(s.id);
    });
    remoteShows().forEach(function (r) {
      if (!r || !r.id) return;
      onServer[r.id] = 1;
      if (!by[r.id]) order.push(r.id);
      var prev = by[r.id] || {};
      by[r.id] = Object.assign({}, prev, r, { episodes: Array.isArray(r.episodes) ? r.episodes : (prev.episodes || []) });
    });
    localShows().forEach(function (l) {
      var cur = by[l.id];
      var newer = !!l.updatedAt && (!cur || !onServer[l.id] || String(l.updatedAt) > timeOf(cur));
      var eps = viewEpisodes(cur ? cur.episodes : [], l.episodes);
      var row = Object.assign({}, newer ? l : cur, { episodes: eps });
      if (newer) row._sync = syncOf(l);
      else if (eps.some(function (e) { return e._sync; })) row._sync = 'pending';
      else delete row._sync;
      by[l.id] = row;
      if (!cur) order.push(l.id);
    });
    return order.map(function (k) { return by[k]; }).filter(function (s) {
      return s && (s.status !== 'hidden' || s._sync === 'hidden');
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

  function showFields(show) {
    var copy = Object.assign({}, show);
    delete copy.episodes;
    delete copy._sync;
    delete copy.source;
    return copy;
  }

  /* Поля шоу — своя запись со своим временем; выпуски внутри не трогаются. */
  function saveShowLocal(show) {
    var list = localShows();
    var i = list.findIndex(function (s) { return String(s.id) === String(show.id); });
    var prev = i === -1 ? null : list[i];
    var rec = Object.assign({}, prev || {}, showFields(show), {
      episodes: prev ? (prev.episodes || []) : [],
      updatedAt: freshTime(remoteShow(show.id)),
    });
    if (i === -1) list.unshift(rec);
    else list[i] = rec;
    writeShows(list);
    return rec;
  }

  /* Выпуск — отдельная запись со своим временем; поля шоу не меняются. */
  function saveEpisodeLocal(show, ep) {
    var list = localShows();
    var i = list.findIndex(function (s) { return String(s.id) === String(show.id); });
    var rec = i === -1
      ? Object.assign(showFields(show), { episodes: [], updatedAt: '' })
      : list[i];
    var stamped = Object.assign({}, ep, { updatedAt: freshTime(remoteEpisode(show.id, ep.id)) });
    delete stamped._sync;
    var eps = (rec.episodes || []).filter(function (e) { return e && String(e.id) !== String(ep.id); });
    eps.unshift(stamped);
    rec = Object.assign({}, rec, { episodes: eps });
    if (i === -1) list.unshift(rec);
    else list[i] = rec;
    writeShows(list);
    return stamped;
  }

  /* Свежий пакет → основа. Местные записи, которые не новее серверных, убираются. */
  function absorb(pack, stamp) {
    if (!pack || typeof pack !== 'object') return;
    remotePack = pack;
    if (stamp) remoteStamp = String(stamp);
    var changed = false;
    var next = localShows().map(function (l) {
      var r = remoteShow(l.id);
      var eps = (l.episodes || []).filter(function (e) {
        if (!e || !e.id || !e.updatedAt) return false;
        var re = r && (r.episodes || []).filter(function (x) { return x && String(x.id) === String(e.id); })[0];
        return !re || String(e.updatedAt) > timeOf(re);
      });
      var showNewer = !!l.updatedAt && (!r || String(l.updatedAt) > timeOf(r));
      if (eps.length !== (l.episodes || []).length) changed = true;
      if (!showNewer && !eps.length) {
        changed = true;
        return null;
      }
      return Object.assign({}, l, { episodes: eps });
    }).filter(Boolean);
    if (changed) writeShows(next);
  }

  function hydrate(done) {
    if (hydrated || !window.AdminDesk || !AdminDesk.readPackStrict) { done(); return; }
    AdminDesk.readPackStrict(PAGE_SLUG).then(function (cur) {
      if (cur.pack) absorb(cur.pack, AdminDesk.packTime ? AdminDesk.packTime(PAGE_SLUG) : '');
      hydrated = true;
    }, function () {}).then(done);
  }

  function cleanShow(l) {
    var copy = showFields(l);
    Object.keys(copy).forEach(function (k) { if (k.charAt(0) === '_') delete copy[k]; });
    copy.status = copy.status === 'hidden' ? 'hidden' : 'published';
    return copy;
  }

  function buildPack(remote, stamp) {
    if (remote) absorb(remote, stamp);
    var base = remote && Array.isArray(remote.shows)
      ? remote.shows
      : seedShows().map(function (s) { return Object.assign({ status: 'published' }, s); });
    var by = {};
    var order = [];
    base.forEach(function (r) {
      if (!r || !r.id || by[r.id]) return;
      var s = Object.assign({}, r);
      if (!s.updatedAt && stamp) s.updatedAt = stamp;
      by[r.id] = s;
      order.push(r.id);
    });
    localShows().forEach(function (l) {
      var r = by[l.id];
      if (!r && l.status === 'draft') return;
      var showNewer = !r || String(l.updatedAt || '') > String(r.updatedAt || '');
      var fields = showNewer && l.status !== 'draft' ? cleanShow(l) : r;
      var eps = AdminDesk.lwwMerge(r ? (r.episodes || []) : [], l.episodes || [], {
        stamp: stamp,
        key: function (e) { return String((e && e.id) || ''); },
      });
      by[l.id] = Object.assign({}, fields, { episodes: eps });
      if (!r) order.push(l.id);
    });
    return { shows: order.map(function (k) { return by[k]; }) };
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
    if (!window.AdminDesk || !AdminDesk.publishPackSafe || !AdminDesk.lwwMerge) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return AdminDesk.publishPackSafe({
      fallbackId: PAGE_ID,
      slug: PAGE_SLUG,
      title: 'Подкасты редакции',
      source: 'desk-podcasts',
      build: buildPack,
    }).then(function (pack) {
      absorb(pack, (AdminDesk.packTime && AdminDesk.packTime(PAGE_SLUG)) || new Date().toISOString());
      return pack;
    });
  }

  function failText(e, again) {
    var msg = (e && e.message) || 'нет связи';
    if (e && e.readFailed) return msg;
    return 'Не ушло на сайт: ' + msg + '. Правка сохранена здесь — нажмите «' + (again || 'Опубликовать') + '» ещё раз.';
  }

  function syncChip(sync) {
    if (sync === 'draft') return ' <span class="badge warn">Черновик</span>';
    if (sync === 'pending') return ' <span class="badge rose" title="Правка есть только в этом браузере">Не отправлено</span>';
    if (sync === 'hidden') return ' <span class="badge rose" title="Снято здесь, на сайте ещё видно">Не снято с сайта</span>';
    return '';
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
    if (!hydrated) {
      ctx.viewEl.innerHTML = '<div class="yak-loading yak-loading--page" role="status"><span class="yak-spin" aria-hidden="true"></span><span>Открываю подкасты…</span></div>';
    }
    hydrate(function () {
      if (parsed.kind === 'show') return renderShow(ctx, parsed.id);
      if (parsed.kind === 'episode') return renderEpisode(ctx, parsed.showId, parsed.epId);
      return renderList(ctx);
    });
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
        var n = (s.episodes || []).filter(function (e) { return e.status !== 'hidden'; }).length;
        return (
          '<a class="god-card" href="#podcasts/' + encodeURIComponent(s.id) + '">' +
          '<span class="god-thumb" style="background-image:url(\'' + esc(s.cover || '') + '\')"></span>' +
          '<span class="god-copy"><strong>' + esc(s.title) + '</strong>' +
          '<small>' + esc(s.host || '') + ' · ' + n + ' вып.</small>' + syncChip(s._sync) + '</span></a>'
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
              '<span>S' + esc(String(ep.season || 0)) + 'E' + esc(String(ep.episode || 0)) + ' · ' + esc(ep.title) + syncChip(ep._sync) + '</span>' +
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

    function collect(publish) {
      var next = Object.assign({}, item, {
        title: val('d-title'),
        host: val('d-host'),
        authorSlug: val('d-author'),
        blurb: val('d-blurb'),
        cover: val('d-cover'),
        status: publish ? 'published' : 'draft',
      });
      if (!next.id) next.id = uid('cast');
      return next;
    }

    function save(publish) {
      var next = collect(publish);
      if (!next.title) { ctx.toast('Укажите название', true); return; }
      if (String(next.cover || '').indexOf('data:') === 0) { ctx.toast('Дождитесь загрузки обложки', true); return; }
      saveShowLocal(next);
      if (!publish) {
        ctx.toast('Черновик сохранён — на сайт не отправлен');
        ctx.go('podcasts', next.id);
        return;
      }
      ctx.toast('Публикуем…');
      publishPack().then(function () {
        ctx.toast('На сайте');
        ctx.go('podcasts', next.id);
      }).catch(function (e) { ctx.toast(failText(e), true); });
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

    function collect(publish) {
      return Object.assign({}, item, {
        season: Number(val('d-season')) || 0,
        episode: Number(val('d-episode')) || 0,
        title: val('d-title'),
        date: val('d-date') || todayIso(),
        duration: val('d-dur'),
        audioUrl: val('d-url'),
        description: val('d-desc'),
        status: publish ? 'published' : 'draft',
      });
    }

    function save(publish) {
      var next = collect(publish);
      if (!next.title) { ctx.toast('Укажите название', true); return; }
      if (!next.audioUrl) { ctx.toast('Прикрепите файл', true); return; }
      if (next.audioUrl.indexOf('data:') === 0) { ctx.toast('Дождитесь загрузки в бакет', true); return; }
      saveEpisodeLocal(show, next);
      if (!publish) {
        ctx.toast('Черновик сохранён — на сайт не отправлен');
        ctx.go('podcasts', show.id);
        return;
      }
      ctx.toast('Публикуем…');
      publishPack().then(function () {
        ctx.toast('На сайте');
        ctx.go('podcasts', show.id);
      }).catch(function (e) { ctx.toast(failText(e), true); });
    }

    document.getElementById('ep-draft').onclick = function () { save(false); };
    document.getElementById('ep-pub').onclick = function () { save(true); };
    var del = document.getElementById('ep-del');
    if (del) del.onclick = function () {
      if (!confirm('Снять выпуск?')) return;
      saveEpisodeLocal(show, Object.assign({}, item, { status: 'hidden' }));
      ctx.toast('Снимаем с сайта…');
      publishPack().then(function () {
        ctx.toast('Снято с публикации');
        ctx.go('podcasts', show.id);
      }).catch(function (e) { ctx.toast(failText(e, 'Снять'), true); });
    };
  }

  global.AdminPodcasts = { render: render, publishPack: publishPack };
})(window);
