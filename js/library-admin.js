/**
 * Библиотека редакции: карточки как на портале + рубрики/подрубрики.
 */
(function (global) {
  'use strict';

  var PAGE_ID = 1900000005;
  var PAGE_SLUG = 'yak-library-data';
  var PORTAL = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
  if (PORTAL.slice(-1) !== '/') PORTAL += '/';

  var LANGS = [
    { id: 'ru', label: 'русский' },
    { id: 'la', label: 'латынь' },
    { id: 'it', label: 'итальянский' },
    { id: 'es', label: 'испанский' },
    { id: 'fr', label: 'французский' },
    { id: 'en', label: 'английский' },
    { id: 'de', label: 'немецкий' },
    { id: 'pl', label: 'польский' },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function slugify(s) {
    if (window.AdminStore && AdminStore.slugify) return AdminStore.slugify(s);
    var map = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
      и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
      с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
      ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    };
    return String(s || '')
      .toLowerCase()
      .split('')
      .map(function (ch) { return map[ch] != null ? map[ch] : ch; })
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || ('lib-' + Date.now().toString(36));
  }

  function uniqueSlug(base, keepId) {
    var slug = slugify(base);
    var used = {};
    allItems().forEach(function (it) {
      if (!it || !it.id || it.id === keepId || it.status === 'hidden') return;
      used[it.id] = true;
    });
    if (!used[slug]) return slug;
    var n = 2;
    while (used[slug + '-' + n]) n += 1;
    return slug + '-' + n;
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function decodeRouteId(id) {
    id = String(id == null ? '' : id);
    try { id = decodeURIComponent(id); } catch (e) { /* уже декодирован или битый */ }
    return id;
  }

  function idsEqual(a, b) {
    a = decodeRouteId(a);
    b = decodeRouteId(b);
    return !!a && a === b;
  }

  function readAll() {
    if (window.AdminDesk && typeof AdminDesk.read === 'function') return AdminDesk.read();
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem('yak_desk') || '{}') || {}; } catch (e) { raw = {}; }
    return raw;
  }

  function patchDesk(fn) {
    var all = readAll();
    if (!all.libraryItems) all.libraryItems = [];
    if (!all.libraryRubrics) all.libraryRubrics = [];
    if (!all.libraryThemes) all.libraryThemes = [];
    fn(all);
    if (window.AdminDesk && typeof AdminDesk.write === 'function') {
      AdminDesk.write(all);
      return;
    }
    localStorage.setItem('yak_desk', JSON.stringify(all));
  }

  function L() { return global.YAK_LIBRARY || null; }

  function seedRubrics() {
    var fallback = [
      { id: 'encyclicals', section: 'church', label: 'Энциклики', parentId: '' },
      { id: 'exhortations', section: 'church', label: 'Апостольские увещевания', parentId: '' },
      { id: 'letters', section: 'church', label: 'Послания', parentId: '' },
      { id: 'messages', section: 'church', label: 'Обращения и послания', parentId: '' },
      { id: 'hagiography', section: 'books', label: 'Житийная литература', parentId: '' },
      { id: 'children', section: 'books', label: 'Для детей', parentId: '' },
      { id: 'spirituality', section: 'books', label: 'Духовность', parentId: '' },
      { id: 'theology', section: 'books', label: 'Богословие', parentId: '' },
      { id: 'history', section: 'books', label: 'История', parentId: '' },
      { id: 'magazines', section: 'periodicals', label: 'Журналы', parentId: '' },
      { id: 'newspapers', section: 'periodicals', label: 'Газеты', parentId: '' },
      { id: 'bulletins', section: 'periodicals', label: 'Бюллетени', parentId: '' },
    ];
    var by = {};
    fallback.forEach(function (r) { by[r.section + ':' + r.id] = r; });
    ((L() && L().RUBRICS) || []).forEach(function (r) {
      if (r && r.id) by[(r.section || '') + ':' + r.id] = r;
    });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  /* Последний свежий пакет с сервера и время его записи. */
  var remotePack = null;
  var remoteStamp = '';

  function remoteList(key) {
    return remotePack && Array.isArray(remotePack[key]) ? remotePack[key] : [];
  }

  function rubricKey(r) { return String((r && r.section) || '') + ':' + String((r && r.id) || ''); }
  function themeKey(t) { return String((t && t.id) || ''); }
  function itemKey(it) { return String((it && it.id) || ''); }

  function remoteTimeOf(key, keyFn, rec) {
    var k = keyFn(rec);
    var hit = remoteList(key).filter(function (r) { return r && keyFn(r) === k; })[0];
    if (!hit) return '';
    return String(hit.updatedAt || remoteStamp || '');
  }

  /* Местная запись видна поверх серверной, только если она новее. */
  function newerHere(key, keyFn, rec) {
    var rt = remoteTimeOf(key, keyFn, rec);
    return !rt || String((rec && rec.updatedAt) || '') > rt;
  }

  function freshTime(key, keyFn, rec) {
    var now = new Date().toISOString();
    var rt = remoteTimeOf(key, keyFn, rec);
    if (rt && rt >= now) {
      var t = Date.parse(rt);
      if (!isNaN(t)) now = new Date(t + 1).toISOString();
    }
    return now;
  }

  function allThemes() {
    var by = {};
    ((L() && L().THEMES) || []).forEach(function (t) { if (t && t.id) by[t.id] = t; });
    (readAll().libraryThemes || []).forEach(function (t) {
      if (t && t.id && newerHere('themes', themeKey, t)) by[t.id] = t;
    });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  function sectionLabel(section) {
    if (section === 'church') return 'Документ';
    if (section === 'periodicals') return 'Периодика';
    return 'Книга';
  }

  function allRubrics() {
    var by = {};
    seedRubrics().forEach(function (r) { by[rubricKey(r)] = r; });
    (readAll().libraryRubrics || []).forEach(function (r) {
      if (r && r.id && newerHere('rubrics', rubricKey, r)) by[rubricKey(r)] = r;
    });
    return Object.keys(by).map(function (k) { return by[k]; });
  }

  function rubricsOf(section, parentId) {
    parentId = parentId || '';
    return allRubrics().filter(function (r) {
      return r.section === section && String(r.parentId || '') === String(parentId);
    });
  }

  function allItems() {
    var by = {};
    var lib = L();
    ((lib && lib.ITEMS) || []).forEach(function (it) {
      if (it && it.id) by[it.id] = Object.assign({ status: 'published' }, it);
    });
    (readAll().libraryItems || []).forEach(function (it) {
      if (!it || !it.id || !newerHere('items', itemKey, it)) return;
      var sync = it.status === 'draft' ? 'draft' : (it.status === 'hidden' ? 'hidden' : 'pending');
      by[it.id] = Object.assign({}, by[it.id] || {}, it, { _sync: sync });
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) {
      return String(b.addedAt || b.editionDate || '').localeCompare(String(a.addedAt || a.editionDate || ''));
    });
  }

  function getItem(id) {
    id = decodeRouteId(id);
    if (!id) return null;
    var list = allItems();
    for (var i = 0; i < list.length; i++) {
      if (idsEqual(list[i].id, id)) return list[i];
    }
    return null;
  }

  function upsertItem(item) {
    delete item._sync;
    item.updatedAt = freshTime('items', itemKey, item);
    patchDesk(function (all) {
      var i = all.libraryItems.findIndex(function (x) { return x && String(x.id) === String(item.id); });
      if (i === -1) all.libraryItems.unshift(item);
      else all.libraryItems[i] = Object.assign({}, all.libraryItems[i], item);
    });
    return item;
  }

  function hideItem(id) {
    var cur = Object.assign({}, getItem(id) || { id: id });
    cur.status = 'hidden';
    upsertItem(cur);
  }

  function syncChip(sync) {
    if (sync === 'draft') return '<span class="badge warn">Черновик</span>';
    if (sync === 'pending') return '<span class="badge rose" title="Правка есть только в этом браузере">Не отправлено</span>';
    if (sync === 'hidden') return '<span class="badge rose" title="Снято здесь, на сайте ещё видно">Не снято с сайта</span>';
    return '';
  }

  function titleOf(it) {
    var lib = L();
    if (lib && lib.displayTitle) return lib.displayTitle(it);
    return it.titleRu || it.titleOriginal || it.id;
  }

  function ensureSeed(done) {
    if (L()) { done(); return; }
    var s = document.createElement('script');
    s.src = PORTAL + 'js/library-data.js';
    s.onload = function () { done(); };
    s.onerror = function () { done(); };
    document.head.appendChild(s);
  }

  function selectOpts(list, selected, blank) {
    var html = '<option value="">' + esc(blank || '—') + '</option>';
    (list || []).forEach(function (opt) {
      var id = typeof opt === 'string' ? opt : opt.id;
      var lab = typeof opt === 'string' ? opt : (opt.label || opt.title);
      html += '<option value="' + esc(id) + '"' + (String(selected) === String(id) ? ' selected' : '') + '>' + esc(lab) + '</option>';
    });
    return html;
  }

  function uploadFile(file, folder) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('нет файла'));
      if (file.size > 25 * 1024 * 1024) return reject(new Error('файл больше 25 МБ'));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('не удалось прочитать файл')); };
      reader.onload = function () {
        var dataUrl = String(reader.result || '');
        if (!window.AdminApi || !AdminApi.uploadMedia) {
          reject(new Error('нет соединения с сервером'));
          return;
        }
        AdminApi.uploadMedia({ dataUrl: dataUrl, folder: folder || 'library', filename: file.name })
          .then(function (pack) {
            if (!pack || !pack.url) throw new Error('сервер не вернул ссылку');
            resolve({ url: pack.url, size: file.size, name: file.name, type: file.type });
          })
          .catch(reject);
      };
      reader.readAsDataURL(file);
    });
  }

  function fmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' Б';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' КБ';
    return (n / (1024 * 1024)).toFixed(1) + ' МБ';
  }

  function guessFormat(name, mime) {
    var s = String(name || mime || '').toLowerCase();
    if (s.indexOf('pdf') !== -1) return 'PDF';
    if (s.indexOf('epub') !== -1) return 'EPUB';
    if (s.indexOf('fb2') !== -1) return 'FB2';
    if (s.indexOf('doc') !== -1) return 'DOC';
    return 'Файл';
  }

  /* Свежий пакет — основа; правка отсюда заменяет запись, только если она новее.
     Черновики на сайт не уходят. */
  function publishPack() {
    if (!window.AdminDesk || !AdminDesk.publishPackSafe || !AdminDesk.lwwMerge) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return AdminDesk.publishPackSafe({
      fallbackId: PAGE_ID,
      slug: PAGE_SLUG,
      title: 'Библиотека редакции',
      source: 'desk-library',
      build: function (remote, stamp) {
        if (remote) absorbPack(remote, stamp);
        var r = remote && typeof remote === 'object' && !Array.isArray(remote) ? remote : {};
        var lib = L() || {};
        var all = readAll();
        var baseItems = Array.isArray(r.items)
          ? r.items
          : (lib.ITEMS || []).map(function (it) { return Object.assign({ status: 'published' }, it); });
        return {
          items: AdminDesk.lwwMerge(baseItems, all.libraryItems || [], { stamp: stamp, key: itemKey }),
          rubrics: AdminDesk.lwwMerge(Array.isArray(r.rubrics) ? r.rubrics : seedRubrics(), all.libraryRubrics || [], { stamp: stamp, key: rubricKey }),
          docTypes: Array.isArray(r.docTypes) && r.docTypes.length ? r.docTypes : (lib.DOC_TYPES || []),
          popes: Array.isArray(r.popes) && r.popes.length ? r.popes : (lib.POPES || []),
          themes: AdminDesk.lwwMerge(Array.isArray(r.themes) ? r.themes : (lib.THEMES || []), all.libraryThemes || [], { stamp: stamp, key: themeKey }),
        };
      },
    }).then(function (pack) {
      absorbPack(pack, (AdminDesk.packTime && AdminDesk.packTime(PAGE_SLUG)) || new Date().toISOString());
      return pack;
    });
  }

  function parsePack(art) {
    var raw = (art && (art.contentText || art.content || '')) || '';
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* Пакет с сервера становится основой; местные копии, которые не новее серверных,
     убираются — так стол не пухнет и старое не перетирает свежее. */
  function absorbPack(pack, stamp) {
    if (!pack || typeof pack !== 'object') return;
    remotePack = pack;
    if (stamp) remoteStamp = String(stamp);
    patchDesk(function (all) {
      all.libraryItems = (all.libraryItems || []).filter(function (it) {
        return it && it.id && newerHere('items', itemKey, it);
      });
      all.libraryRubrics = (all.libraryRubrics || []).filter(function (r) {
        return r && r.id && newerHere('rubrics', rubricKey, r);
      });
      all.libraryThemes = (all.libraryThemes || []).filter(function (t) {
        return t && t.id && newerHere('themes', themeKey, t);
      });
    });
    if (L() && L().mergePack) L().mergePack(pack);
  }

  var hydrated = false;
  var hydrateWait = [];

  function hydrate(done) {
    ensureSeed(function () {
      if (hydrated) { done(); return; }
      hydrateWait.push(done);
      if (hydrateWait.length > 1) return;
      function finish() {
        hydrated = true;
        var q = hydrateWait.splice(0);
        q.forEach(function (fn) { try { fn(); } catch (e) {} });
      }
      if (!window.AdminApi || !AdminApi.getArticle) { finish(); return; }
      AdminApi.getArticle(PAGE_SLUG)
        .then(function (art) {
          if (art && art.slug === PAGE_SLUG) absorbPack(parsePack(art), art.modified || art.date);
        })
        .catch(function () {})
        .then(finish);
    });
  }

  function render(id, ctx) {
    hydrate(function () {
      id = decodeRouteId(id);
      if (id === 'rubrics') renderRubrics(ctx);
      else if (id) renderForm(ctx, id);
      else renderList(ctx);
    });
  }

  function renderList(ctx) {
    var q = '';
    var section = '';
    function draw() {
      var list = allItems().filter(function (it) {
        if (it.status === 'hidden' && it._sync !== 'hidden') return false;
        if (section && it.section !== section) return false;
        if (!q) return true;
        var hay = [it.titleRu, it.titleOriginal, it.author, it.annotation].join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      ctx.viewEl.innerHTML =
        '<div class="topbar"><div><h1>Библиотека</h1>' +
        '<p>Карточки как на сайте: документы Церкви, книги и периодика. Можно добавить файл и текст на страницу.</p></div>' +
        '<div class="topbar-actions">' +
        '<a class="btn btn-ghost" href="#library/rubrics">Рубрики</a>' +
        '<a class="btn btn-primary" href="#library/new">Добавить</a>' +
        '</div></div>' +
        '<div class="panel archive-bar">' +
        '<input class="input" id="lib-q" type="search" placeholder="Поиск по названию и автору" value="' + esc(q) + '" />' +
        '<div class="tabs">' +
        '<button type="button" class="tab' + (!section ? ' active' : '') + '" data-s="">Все</button>' +
        '<button type="button" class="tab' + (section === 'church' ? ' active' : '') + '" data-s="church">Документы Церкви</button>' +
        '<button type="button" class="tab' + (section === 'books' ? ' active' : '') + '" data-s="books">Книги</button>' +
        '<button type="button" class="tab' + (section === 'periodicals' ? ' active' : '') + '" data-s="periodicals">Периодика</button>' +
        '</div></div>' +
        (list.length
          ? '<div class="god-grid">' + list.map(function (it) {
            var tone = it.coverTone || '#5c5346';
            var cover = it.cover
              ? 'background-image:url(\'' + String(it.cover).replace(/'/g, '%27') + '\');background-size:cover'
              : 'background:linear-gradient(145deg,' + tone + ',#1a1814)';
            return (
              '<a class="god-card" href="#library/' + esc(it.id) + '">' +
              '<span class="god-thumb" style="' + cover + '"></span>' +
              '<span class="god-copy"><strong>' + esc(titleOf(it)) + '</strong>' +
              '<small>' + esc(sectionLabel(it.section) + ' · ' + (it.author || '')) + '</small>' +
              syncChip(it._sync) + '</span></a>'
            );
          }).join('') + '</div>'
          : '<div class="panel"><div class="empty">Пока нет карточек в этом фильтре.</div></div>');
      var qEl = document.getElementById('lib-q');
      if (qEl) {
        qEl.oninput = function () {
          q = qEl.value.trim().toLowerCase();
          draw();
          var again = document.getElementById('lib-q');
          if (again) { again.focus(); try { again.setSelectionRange(again.value.length, again.value.length); } catch (e) {} }
        };
      }
      ctx.viewEl.querySelectorAll('.tab[data-s]').forEach(function (btn) {
        btn.onclick = function () { section = btn.getAttribute('data-s') || ''; draw(); };
      });
    }
    draw();
  }

  function emptyItem() {
    return {
      id: '',
      section: 'books',
      category: '',
      docType: '',
      pope: '',
      titleOriginal: '',
      titleRu: '',
      author: '',
      firstPublished: '',
      editionDate: todayIso(),
      publisher: '',
      originalLanguage: 'ru',
      translator: '',
      genre: '',
      annotation: '',
      contentHtml: '',
      ageRating: '0+',
      flags: { lgbt18: false, substances: false, foreignAgent: false },
      themes: [],
      cover: '',
      coverTone: '#5c5346',
      addedAt: todayIso(),
      views: 0,
      downloadsCount: 0,
      downloads: [],
      buyUrl: '',
      quotes: [],
      status: 'published',
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function checked(id) {
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function renderForm(ctx, id) {
    var isNew = id === 'new';
    var item = isNew ? emptyItem() : (getItem(id) || emptyItem());
    if (!isNew && !getItem(id)) {
      ctx.toast('Карточка не найдена', true);
      ctx.go('library');
      return;
    }
    var downloads = (item.downloads || []).slice();
    var lib = L();
    var docTypes = (lib && lib.DOC_TYPES) || [];
    var popes = (lib && lib.POPES) || [];
    var pickedThemes = (item.themes || []).slice();

    function catsFor(section) {
      var top = rubricsOf(section, '');
      var out = [];
      top.forEach(function (r) {
        out.push({ id: r.id, label: r.label });
        rubricsOf(section, r.id).forEach(function (ch) {
          out.push({ id: ch.id, label: '— ' + ch.label });
        });
      });
      return out;
    }

    function draw() {
      var church = item.section === 'church';
      var themes = allThemes();
      ctx.viewEl.innerHTML =
        '<div class="post-editor">' +
        '<div class="post-editor-bar">' +
        '<a class="btn btn-ghost btn-back" href="#library">← Список</a>' +
        '<div class="post-editor-bar-actions">' +
        '<a class="btn btn-ghost" href="' + PORTAL + 'book.html?id=' + encodeURIComponent(item.id || 'new') + '" target="_blank" rel="noopener">На сайте</a>' +
        (isNew ? '' : '<button type="button" class="btn btn-ghost" id="lib-del">Снять</button>') +
        '<button type="button" class="btn btn-ghost" id="lib-draft">Черновик</button>' +
        '<button type="button" class="btn btn-primary" id="lib-pub">Опубликовать</button>' +
        '</div></div>' +
        '<div class="pub-layout">' +
        '<div class="post-main panel">' +
        '<label class="field"><span>Раздел</span>' +
        '<select class="select" id="lib-section">' +
        '<option value="books"' + (item.section === 'books' ? ' selected' : '') + '>Книги</option>' +
        '<option value="church"' + (church ? ' selected' : '') + '>Документы Церкви</option>' +
        '<option value="periodicals"' + (item.section === 'periodicals' ? ' selected' : '') + '>Периодика</option>' +
        '</select></label>' +
        '<label class="field"><span>Рубрика</span>' +
        '<select class="select" id="lib-category">' + selectOpts(catsFor(item.section), item.category, 'Выберите рубрику') + '</select></label>' +
        (church
          ? '<div class="form-grid" style="padding:0">' +
            '<label>Тип документа<select class="select" id="lib-doctype">' + selectOpts(docTypes, item.docType) + '</select></label>' +
            '<label>Папа / дикастерия<select class="select" id="lib-pope">' + selectOpts(popes, item.pope) + '</select></label>' +
            '</div>'
          : '') +
        '<input class="editor-title" id="lib-title-main" value="' + esc(church ? (item.titleOriginal || '') : (item.titleRu || '')) + '" placeholder="' + (church ? 'Оригинальное название' : 'Название на русском') + '" />' +
        '<div class="field slug-row"><label>Адрес</label>' +
        '<span class="slug-prefix">book.html?id=</span>' +
        '<input class="input" id="lib-slug" value="' + esc(item.id || '') + '" placeholder="laudato-si" autocomplete="off" /></div>' +
        '<label class="field"><span>' + (church ? 'Русское название' : 'Оригинальное название') + '</span>' +
        '<input class="input" id="lib-title-alt" value="' + esc(church ? (item.titleRu || '') : (item.titleOriginal || '')) + '" /></label>' +
        '<label class="field"><span>Автор</span><input class="input" id="lib-author" value="' + esc(item.author || '') + '" placeholder="Как на карточке сайта. Клик ведёт на все книги автора." /></label>' +
        '<label class="field"><span>Аннотация</span>' +
        '<div class="rte lead-rte">' +
        '<div class="rte-bar" id="lib-ann-bar">' +
        '<button type="button" data-cmd="bold">Жирный</button>' +
        '<button type="button" data-cmd="italic">Курсив</button>' +
        '<button type="button" data-cmd="insertUnorderedList">Список</button>' +
        '<button type="button" data-act="link">Ссылка</button>' +
        '</div>' +
        '<div class="rte-body excerpt-input" id="lib-ann" contenteditable="true" data-placeholder="Абзацы сохранятся. Можно вставить готовый текст.">' +
        (item.annotation || '') + '</div></div></label>' +
        '<label class="field"><span>Текст на странице</span>' +
        '<div class="rte">' +
        '<div class="rte-bar" id="lib-rte-bar">' +
        '<button type="button" data-block="p" title="Обычный абзац">Текст</button>' +
        '<button type="button" data-block="h2" title="Заголовок">Заголовок</button>' +
        '<button type="button" data-block="h3" title="Подзаголовок">Подзаголовок</button>' +
        '<span class="rte-sep"></span>' +
        '<button type="button" data-cmd="bold" title="Жирный">Жирный</button>' +
        '<button type="button" data-cmd="italic" title="Курсив">Курсив</button>' +
        '<button type="button" data-cmd="underline" title="Подчёркнутый">Подчёркнутый</button>' +
        '<button type="button" data-block="quote" title="Цитата">Цитата</button>' +
        '<button type="button" data-act="note" title="Сноска">Сноска</button>' +
        '<span class="rte-sep"></span>' +
        '<button type="button" data-cmd="insertUnorderedList" title="Список">Список</button>' +
        '<button type="button" data-cmd="insertOrderedList" title="Нумерация">1. 2. 3.</button>' +
        '<button type="button" data-act="link" title="Ссылка">Ссылка</button>' +
        '<button type="button" data-act="image" title="Фото">Фото</button>' +
        '</div>' +
        '<div class="rte-body" id="lib-text" contenteditable="true" data-placeholder="Можно выложить текст целиком, не только файл. Вставка из Word и Docs сохраняет абзацы, списки и выделения.">' +
        (item.contentHtml || '') + '</div>' +
        '<input type="file" id="lib-inline-file" accept="image/*" hidden />' +
        '</div>' +
        '<p class="hint-note">Вставка из Word и Google Docs: абзацы, заголовки, списки, ссылки и выделения сохраняются.</p></label>' +
        '<div class="lib-dl-edit">' +
        '<h3>Файлы для скачивания</h3>' +
        '<div id="lib-files">' + filesHtml(downloads) + '</div>' +
        '<div class="archive-bar-row" style="margin-top:8px">' +
        '<input class="input" id="lib-file-url" placeholder="Или вставьте ссылку на файл" />' +
        '<select class="select" id="lib-file-fmt"><option>PDF</option><option>EPUB</option><option>FB2</option><option>DOC</option></select>' +
        '<button type="button" class="btn btn-ghost" id="lib-file-add">Добавить ссылку</button>' +
        '<button type="button" class="btn btn-ghost" id="lib-file-up">Загрузить файл</button>' +
        '<input type="file" id="lib-file-input" hidden accept=".pdf,.epub,.fb2,.doc,.docx,.txt,application/pdf" />' +
        '</div></div>' +
        '</div>' +
        '<aside class="post-side">' +
        '<div class="panel post-card"><h3>Издание</h3>' +
        '<label>Первая публикация<input class="input" id="lib-first" type="date" value="' + esc((item.firstPublished || '').slice(0, 10)) + '" /></label>' +
        '<label>Дата издания<input class="input" id="lib-edition" type="date" value="' + esc((item.editionDate || '').slice(0, 10)) + '" /></label>' +
        '<label>Издательство<input class="input" id="lib-pubhouse" value="' + esc(item.publisher || '') + '" /></label>' +
        '<label>Жанр<input class="input" id="lib-genre" value="' + esc(item.genre || '') + '" /></label>' +
        '<label>Язык оригинала<select class="select" id="lib-lang">' + selectOpts(LANGS, item.originalLanguage, '—') + '</select></label>' +
        '<label>Перевод<input class="input" id="lib-tr" value="' + esc(item.translator || '') + '" /></label>' +
        '<label>Возраст<select class="select" id="lib-age">' +
        ['0+', '6+', '12+', '16+', '18+'].map(function (a) {
          return '<option' + (item.ageRating === a ? ' selected' : '') + '>' + a + '</option>';
        }).join('') +
        '</select></label>' +
        '<label>Купить (ссылка)<input class="input" id="lib-buy" value="' + esc(item.buyUrl || '') + '" /></label>' +
        '</div>' +
        '<div class="panel post-card"><h3>Обложка</h3>' +
        '<div class="cover-frame' + (item.cover ? '' : ' is-empty') + '" id="lib-cover-frame">' +
        (item.cover ? '<img src="' + esc(item.cover) + '" alt="" />' : '<span>Нет обложки</span>') +
        '</div>' +
        '<input class="input" id="lib-cover" value="' + esc(item.cover || '') + '" placeholder="URL обложки" />' +
        '<input class="input" id="lib-tone" value="' + esc(item.coverTone || '#5c5346') + '" placeholder="#5c5346" />' +
        '<button type="button" class="btn btn-ghost" id="lib-cover-up">Загрузить обложку</button>' +
        '<input type="file" id="lib-cover-input" hidden accept="image/*" />' +
        '</div>' +
        '<div class="panel post-card"><h3>Темы</h3><div class="rubric-pills" id="lib-themes">' +
        themes.map(function (t) {
          var on = pickedThemes.indexOf(t.id) !== -1;
          return '<label class="rubric-pill"><input type="checkbox" value="' + esc(t.id) + '"' + (on ? ' checked' : '') + ' /><span>' + esc(t.label) + '</span></label>';
        }).join('') +
        '</div>' +
        '<div class="archive-bar-row" style="margin-top:8px">' +
        '<input class="input" id="lib-theme-new" placeholder="Новая тема" />' +
        '<button type="button" class="btn btn-ghost" id="lib-theme-add">Добавить</button>' +
        '</div></div>' +
        '<div class="panel post-card"><h3>Пометки</h3>' +
        '<label class="check-row"><input type="checkbox" id="lib-f-18"' + (item.flags && item.flags.lgbt18 ? ' checked' : '') + ' /> 18+ / чувствительные темы</label>' +
        '<label class="check-row"><input type="checkbox" id="lib-f-ns"' + (item.flags && item.flags.substances ? ' checked' : '') + ' /> Упоминаются вещества</label>' +
        '<label class="check-row"><input type="checkbox" id="lib-f-fa"' + (item.flags && item.flags.foreignAgent ? ' checked' : '') + ' /> Иноагент</label>' +
        '</div>' +
        '<div class="panel post-card"><h3>Цитаты</h3>' +
        '<textarea class="textarea" id="lib-quotes" rows="4" placeholder="По одной на строку">' +
        esc((item.quotes || []).join('\n')) + '</textarea></div>' +
        '</aside></div></div>';

      bind(ctx, item, isNew, downloads, pickedThemes, draw);
    }

    draw();
  }

  function filesHtml(downloads) {
    if (!downloads.length) return '<p class="hint-note">Пока нет файлов. Загрузите PDF/EPUB/FB2 или вставьте ссылку.</p>';
    return downloads.map(function (d, i) {
      return (
        '<div class="cycle-art-row" data-i="' + i + '">' +
        '<strong>' + esc(d.format || 'Файл') + '</strong>' +
        '<small>' + esc(d.size || '') + ' · ' + esc(d.url || '') + '</small>' +
        '<button type="button" class="btn btn-ghost lib-file-x">Убрать</button></div>'
      );
    }).join('');
  }

  function collect(item, isNew, downloads, status) {
    var section = val('lib-section') || item.section || 'books';
    if (section !== 'church' && section !== 'periodicals') section = 'books';
    var church = section === 'church';
    var main = val('lib-title-main');
    var alt = val('lib-title-alt');
    var textEl = document.getElementById('lib-text');
    var themes = [];
    document.querySelectorAll('#lib-themes input:checked').forEach(function (el) {
      themes.push(el.value);
    });
    var next = Object.assign({}, item, {
      section: section,
      category: val('lib-category'),
      docType: church ? val('lib-doctype') : '',
      pope: church ? val('lib-pope') : '',
      titleOriginal: church ? main : alt,
      titleRu: church ? alt : main,
      author: val('lib-author'),
      annotation: (function () {
        var el = document.getElementById('lib-ann');
        var raw = el ? (el.innerHTML || '') : '';
        return raw
          .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
          .replace(/<!-+\s*StartFragment\s*-*>/gi, '')
          .replace(/<!-+\s*EndFragment\s*-*>/gi, '')
          .replace(/&lt;!-+\s*StartFragment\s*-*&gt;/gi, '')
          .replace(/&lt;!-+\s*EndFragment\s*-*&gt;/gi, '')
          .replace(/\uFEFF/g, '');
      })(),
      contentHtml: textEl ? textEl.innerHTML : '',
      firstPublished: val('lib-first'),
      editionDate: val('lib-edition'),
      publisher: val('lib-pubhouse'),
      genre: val('lib-genre'),
      originalLanguage: val('lib-lang'),
      translator: val('lib-tr'),
      ageRating: val('lib-age') || '0+',
      buyUrl: val('lib-buy'),
      cover: val('lib-cover'),
      coverTone: val('lib-tone') || '#5c5346',
      flags: {
        lgbt18: checked('lib-f-18'),
        substances: checked('lib-f-ns'),
        foreignAgent: checked('lib-f-fa'),
      },
      themes: themes,
      quotes: val('lib-quotes').split(/\n+/).map(function (s) { return s.replace(/^«|»$/g, '').trim(); }).filter(Boolean),
      downloads: downloads.slice(),
      addedAt: item.addedAt || todayIso(),
      status: status,
    });
    var rawSlug = val('lib-slug');
    if (!isNew && item.id && (!rawSlug || rawSlug === item.id)) {
      next.id = item.id;
    } else {
      next.id = uniqueSlug(rawSlug || next.titleOriginal || next.titleRu, item.id);
    }
    next._slugLocked = !!(document.getElementById('lib-slug') && document.getElementById('lib-slug').dataset.locked);
    return next;
  }

  function save(ctx, item, isNew, downloads, status) {
    var next = collect(item, isNew, downloads, status);
    if (!next.titleRu && !next.titleOriginal) {
      ctx.toast('Укажите название', true);
      return Promise.resolve();
    }
    var cover = next.cover;
    var ready = (cover && cover.indexOf('data:') === 0 && window.AdminDesk && AdminDesk.uploadDataUrl)
      ? AdminDesk.uploadDataUrl(cover, 'covers').then(function (url) { next.cover = url; })
      : Promise.resolve();
    ctx.toast(status === 'published' ? 'Публикуем…' : 'Сохраняем…');
    var stored = false;
    return ready.then(function () {
      return hoistHtmlImages(next.contentHtml).then(function (html) { next.contentHtml = html; });
    }).then(function () {
      if (status === 'published' && item.id && item.id !== next.id) hideItem(item.id);
      upsertItem(next);
      stored = true;
      if (status === 'published') return publishPack();
    }).then(function () {
      ctx.toast(status === 'published' ? 'На сайте' : 'Черновик сохранён — на сайт не отправлен');
      ctx.go('library');
    }).catch(function (err) {
      var msg = (err && err.message) || 'нет связи';
      if (err && err.readFailed) ctx.toast(msg, true);
      else if (stored) ctx.toast('Не ушло на сайт: ' + msg + '. Правка сохранена здесь — нажмите «Опубликовать» ещё раз.', true);
      else ctx.toast('Не сохранено: ' + msg, true);
    });
  }

  function hoistHtmlImages(html) {
    html = String(html || '');
    var found = [];
    html.replace(/src="(data:image[^"]+)"/g, function (_m, src) {
      if (found.indexOf(src) === -1) found.push(src);
      return _m;
    });
    if (!found.length || !window.AdminDesk || !AdminDesk.uploadDataUrl) return Promise.resolve(html);
    var i = 0;
    function next() {
      if (i >= found.length) return Promise.resolve(html);
      var src = found[i++];
      return AdminDesk.uploadDataUrl(src, 'inline').then(function (url) {
        html = html.split(src).join(url);
        return next();
      });
    }
    return next();
  }

  function sanitizePaste(raw) {
    var box = document.createElement('div');
    if (/<[a-z][\s\S]*>/i.test(raw)) box.innerHTML = raw;
    else box.innerHTML = '<p>' + esc(raw).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
    box.querySelectorAll('script,style,meta,link').forEach(function (n) { n.remove(); });
    box.querySelectorAll('*').forEach(function (n) {
      [].forEach.call(n.attributes, function (a) {
        if (/^on/i.test(a.name)) n.removeAttribute(a.name);
      });
    });
    box.querySelectorAll('h1').forEach(function (n) {
      var h = document.createElement('h2');
      h.innerHTML = n.innerHTML;
      n.parentNode.replaceChild(h, n);
    });
    return box.innerHTML;
  }

  function mountLibRTE() {
    var el = document.getElementById('lib-text');
    var bar = document.getElementById('lib-rte-bar');
    if (!el || !bar) return;
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      document.execCommand('insertHTML', false, sanitizePaste(html));
    });
    bar.onclick = function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      el.focus();
      var cmd = btn.getAttribute('data-cmd');
      var block = btn.getAttribute('data-block');
      var act = btn.getAttribute('data-act');
      if (cmd) document.execCommand(cmd, false, null);
      if (block === 'p' || block === 'h2' || block === 'h3') document.execCommand('formatBlock', false, block);
      if (block === 'quote') {
        document.execCommand('formatBlock', false, 'blockquote');
        var q = el.querySelector('blockquote:not(.guide-quote)');
        if (q) q.className = 'guide-quote';
      }
      if (act === 'note') {
        document.execCommand('insertHTML', false, '<p class="guide-note">Пояснение для читателя</p>');
      }
      if (act === 'link') {
        var href = prompt('Адрес ссылки', 'https://');
        if (href) document.execCommand('createLink', false, href);
      }
      if (act === 'image') {
        var input = document.getElementById('lib-inline-file');
        if (!input) return;
        input.onchange = function () {
          var f = input.files && input.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function () {
            el.focus();
            document.execCommand('insertHTML', false, '<figure class="rte-figure"><img src="' + esc(reader.result) + '" alt="" /></figure>');
          };
          reader.readAsDataURL(f);
          input.value = '';
        };
        input.click();
      }
    };
  }

  function bindSlug(item, isNew) {
    var title = document.getElementById('lib-title-main');
    var slug = document.getElementById('lib-slug');
    if (!title || !slug) return;
    if (!isNew && item.id) slug.dataset.locked = '1';
    if (item._slugLocked) slug.dataset.locked = '1';
    if (isNew && !slug.value) slug.value = slugify(title.value);
    title.addEventListener('input', function () {
      if (!slug.dataset.locked) slug.value = slugify(title.value);
    });
    slug.addEventListener('input', function () { slug.dataset.locked = '1'; });
    slug.addEventListener('blur', function () {
      slug.value = slugify(slug.value || title.value);
    });
  }

  function bind(ctx, item, isNew, downloads, pickedThemes, draw) {
    bindSlug(item, isNew);
    mountLibRTE();
    var annBar = document.getElementById('lib-ann-bar');
    var annEl = document.getElementById('lib-ann');
    if (annBar && annEl) {
      annBar.onclick = function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        annEl.focus();
        var cmd = btn.getAttribute('data-cmd');
        var act = btn.getAttribute('data-act');
        if (cmd) document.execCommand(cmd, false, null);
        if (act === 'link') {
          var href = prompt('Ссылка', 'https://');
          if (href) document.execCommand('createLink', false, href);
        }
      };
    }
    function persist() {
      Object.assign(item, collect(item, isNew, downloads, item.status || 'published'));
      return item;
    }
    var sec = document.getElementById('lib-section');
    if (sec) {
      sec.onchange = function () {
        persist();
        draw();
      };
    }
    var coverInp = document.getElementById('lib-cover');
    if (coverInp) {
      coverInp.oninput = function () {
        var frame = document.getElementById('lib-cover-frame');
        if (!frame) return;
        if (coverInp.value) {
          frame.classList.remove('is-empty');
          frame.innerHTML = '<img src="' + esc(coverInp.value) + '" alt="" />';
        }
      };
    }
    var coverBtn = document.getElementById('lib-cover-up');
    var coverFile = document.getElementById('lib-cover-input');
    if (coverBtn && coverFile) {
      coverBtn.onclick = function () { coverFile.click(); };
      coverFile.onchange = function () {
        var file = coverFile.files && coverFile.files[0];
        if (!file) return;
        ctx.toast('Загружаю обложку…');
        uploadFile(file, 'covers').then(function (out) {
          var inp = document.getElementById('lib-cover');
          if (inp) inp.value = out.url;
          var frame = document.getElementById('lib-cover-frame');
          if (frame) {
            frame.classList.remove('is-empty');
            frame.innerHTML = '<img src="' + esc(out.url) + '" alt="" />';
          }
          ctx.toast('Обложка загружена');
        }).catch(function (err) { ctx.toast(err.message || 'Не удалось загрузить', true); });
      };
    }
    var addBtn = document.getElementById('lib-file-add');
    if (addBtn) {
      addBtn.onclick = function () {
        var url = val('lib-file-url');
        var fmt = val('lib-file-fmt') || 'PDF';
        if (!url) { ctx.toast('Вставьте ссылку', true); return; }
        downloads.push({ format: fmt, url: url, size: '' });
        persist();
        draw();
      };
    }
    var upBtn = document.getElementById('lib-file-up');
    var upInp = document.getElementById('lib-file-input');
    if (upBtn && upInp) {
      upBtn.onclick = function () { upInp.click(); };
      upInp.onchange = function () {
        var file = upInp.files && upInp.files[0];
        if (!file) return;
        ctx.toast('Загружаю файл…');
        uploadFile(file, 'library').then(function (out) {
          downloads.push({
            format: guessFormat(out.name, out.type),
            url: out.url,
            size: fmtSize(out.size),
          });
          persist();
          ctx.toast('Файл на сервере');
          draw();
        }).catch(function (err) { ctx.toast(err.message || 'Не удалось загрузить файл', true); });
      };
    }
    ctx.viewEl.querySelectorAll('.lib-file-x').forEach(function (btn) {
      btn.onclick = function () {
        var row = btn.closest('[data-i]');
        var i = row ? Number(row.getAttribute('data-i')) : -1;
        if (i >= 0) downloads.splice(i, 1);
        persist();
        draw();
      };
    });
    var themeAdd = document.getElementById('lib-theme-add');
    if (themeAdd) {
      themeAdd.onclick = function () {
        var label = val('lib-theme-new');
        if (!label) { ctx.toast('Напишите название темы', true); return; }
        var rec = { id: slugify(label), label: label };
        if (allThemes().some(function (t) { return t && t.id === rec.id; })) rec.id = rec.id + '-' + Date.now().toString(36).slice(-3);
        rec.updatedAt = new Date().toISOString();
        patchDesk(function (all) { all.libraryThemes.push(rec); });
        pickedThemes.push(rec.id);
        persist();
        draw();
      };
    }
    var pub = document.getElementById('lib-pub');
    if (pub) pub.onclick = function () { save(ctx, item, isNew, downloads, 'published'); };
    var draft = document.getElementById('lib-draft');
    if (draft) draft.onclick = function () { save(ctx, item, isNew, downloads, 'draft'); };
    var del = document.getElementById('lib-del');
    if (del) {
      del.onclick = function () {
        if (!confirm('Снять карточку с сайта?')) return;
        hideItem(item.id);
        ctx.toast('Снимаем с сайта…');
        publishPack().then(function () {
          ctx.toast('Снято с публикации');
          ctx.go('library');
        }).catch(function (err) {
          var msg = (err && err.message) || 'нет связи';
          ctx.toast(err && err.readFailed ? msg : ('Не снято с сайта: ' + msg + '. Нажмите «Снять» ещё раз.'), true);
        });
      };
    }
  }

  function renderRubrics(ctx) {
    function draw() {
      var church = rubricsOf('church', '');
      var books = rubricsOf('books', '');
      var periodicals = rubricsOf('periodicals', '');
      function block(section, title, rows) {
        return (
          '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>' + esc(title) + '</h2>' +
          '<button type="button" class="btn btn-ghost" data-add="' + section + '">+ Рубрика</button></div>' +
          (rows.length ? rows.map(function (r) {
            var kids = rubricsOf(section, r.id);
            return (
              '<div class="guide-row" style="margin:0 12px 8px">' +
              '<div class="guide-row-copy"><strong>' + esc(r.label) + '</strong><small>' + esc(r.id) + '</small></div>' +
              '<div class="row-actions">' +
              '<button type="button" class="btn btn-ghost" data-sub="' + esc(section) + '" data-parent="' + esc(r.id) + '">Подрубрика</button>' +
              '<button type="button" class="btn btn-ghost" data-ren="' + esc(r.id) + '">Переименовать</button>' +
              '</div></div>' +
              kids.map(function (ch) {
                return (
                  '<div class="guide-row" style="margin:0 12px 8px 28px">' +
                  '<div class="guide-row-copy"><strong>' + esc(ch.label) + '</strong><small>подрубрика · ' + esc(ch.id) + '</small></div>' +
                  '<button type="button" class="btn btn-ghost" data-ren="' + esc(ch.id) + '">Переименовать</button></div>'
                );
              }).join('')
            );
          }).join('') : '<p class="hint-note">Пока нет рубрик.</p>') +
          '</div>'
        );
      }
      var themes = allThemes();
      ctx.viewEl.innerHTML =
        '<div class="topbar"><div><h1>Рубрики библиотеки</h1>' +
        '<p>Появляются на сайте в «Документах Церкви», «Книгах» и «Периодике». Подрубрика живёт внутри рубрики.</p></div>' +
        '<div class="topbar-actions"><a class="btn btn-ghost btn-back" href="#library">← Список</a></div></div>' +
        block('church', 'Документы Церкви', church) +
        block('books', 'Книги', books) +
        block('periodicals', 'Периодика', periodicals) +
        '<div class="panel"><div class="panel-head"><h2>Темы</h2></div>' +
        '<p class="hint-note" style="margin:0 12px 8px">Эти темы стоят в карточках книг. Можно добавить свои, не только девять стартовых.</p>' +
        (themes.length
          ? themes.map(function (t) {
            return '<div class="guide-row" style="margin:0 12px 8px"><div class="guide-row-copy"><strong>' +
              esc(t.label) + '</strong><small>' + esc(t.id) + '</small></div></div>';
          }).join('')
          : '<p class="hint-note">Пока нет тем.</p>') +
        '<div class="archive-bar-row" style="margin:8px 12px 12px">' +
        '<input class="input" id="lib-theme-new" placeholder="Новая тема" />' +
        '<button type="button" class="btn btn-ghost" id="lib-theme-add">Добавить тему</button></div></div>';
      ctx.viewEl.querySelectorAll('[data-add]').forEach(function (btn) {
        btn.onclick = function () { addRubric(ctx, btn.getAttribute('data-add'), '', draw); };
      });
      ctx.viewEl.querySelectorAll('[data-sub]').forEach(function (btn) {
        btn.onclick = function () { addRubric(ctx, btn.getAttribute('data-sub'), btn.getAttribute('data-parent'), draw); };
      });
      ctx.viewEl.querySelectorAll('[data-ren]').forEach(function (btn) {
        btn.onclick = function () { renameRubric(ctx, btn.getAttribute('data-ren'), draw); };
      });
      var themeAdd = document.getElementById('lib-theme-add');
      if (themeAdd) {
        themeAdd.onclick = function () {
          var label = val('lib-theme-new');
          if (!label) { ctx.toast('Напишите название темы', true); return; }
          var rec = { id: slugify(label), label: label.trim() };
          if (allThemes().some(function (t) { return t && t.id === rec.id; })) rec.id = rec.id + '-' + Date.now().toString(36).slice(-3);
          rec.updatedAt = new Date().toISOString();
          patchDesk(function (all) { all.libraryThemes.push(rec); });
          publishPack().then(function () {
            ctx.toast('Тема на сайте');
            draw();
          }).catch(function (err) {
            ctx.toast(failText(err), true);
            draw();
          });
        };
      }
    }
    draw();
  }

  function addRubric(ctx, section, parentId, draw) {
    var label = prompt(parentId ? 'Название подрубрики' : 'Название рубрики');
    if (!label) return;
    var rec = { id: slugify(label), section: section, label: label.trim(), parentId: parentId || '' };
    if (allRubrics().some(function (r) { return r.id === rec.id && r.section === section; })) {
      rec.id = rec.id + '-' + Date.now().toString(36).slice(-3);
    }
    rec.updatedAt = new Date().toISOString();
    patchDesk(function (all) { all.libraryRubrics.push(rec); });
    publishPack().then(function () {
      ctx.toast('Рубрика на сайте');
      draw();
    }).catch(function (err) {
      ctx.toast(failText(err), true);
      draw();
    });
  }

  function renameRubric(ctx, id, draw) {
    var cur = allRubrics().filter(function (r) { return r.id === id; })[0];
    if (!cur) return;
    var label = prompt('Новое название', cur.label);
    if (!label) return;
    var next = Object.assign({}, cur, { label: label.trim() });
    next.updatedAt = freshTime('rubrics', rubricKey, next);
    patchDesk(function (all) {
      var i = all.libraryRubrics.findIndex(function (r) { return rubricKey(r) === rubricKey(next); });
      if (i === -1) all.libraryRubrics.push(next);
      else all.libraryRubrics[i] = Object.assign({}, all.libraryRubrics[i], next);
    });
    publishPack().then(function () {
      ctx.toast('Обновлено на сайте');
      draw();
    }).catch(function (err) {
      ctx.toast(failText(err), true);
      draw();
    });
  }

  function failText(err) {
    var msg = (err && err.message) || 'нет связи';
    return err && err.readFailed ? msg : ('Не ушло на сайт: ' + msg + '. Правка сохранена здесь — повторите.');
  }

  global.AdminLibrary = {
    render: render,
    allItems: allItems,
    publishPack: publishPack,
  };
})(window);
