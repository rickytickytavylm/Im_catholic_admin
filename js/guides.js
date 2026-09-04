/**
 * Редактор разделов «Духовная жизнь» и «О Церкви».
 * Текст с форматированием → yak_desk.guides → портал.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function portalBase() {
    var b = (global.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
    return b.slice(-1) === '/' ? b : b + '/';
  }

  function fileFor(section) {
    return section === 'church' ? 'church.html' : 'spiritual-life.html';
  }

  function sectionTitle(section) {
    return section === 'church' ? 'О Церкви' : 'Духовная жизнь';
  }

  function kindLabel(kind) {
    if (kind === 'hub') return 'Шапка раздела';
    if (kind === 'cards') return 'Подраздел';
    if (kind === 'prayers') return 'Молитвы';
    if (kind === 'navigator') return 'Справочник';
    if (kind === 'category') return 'Подборка';
    return 'Страница';
  }

  function treeOf(section) {
    return (global.YakGuides && YakGuides[section]) || null;
  }

  function deskGuides() {
    if (global.AdminDesk && AdminDesk.read) return AdminDesk.read().guides || [];
    try {
      var raw = JSON.parse(localStorage.getItem('yak_desk') || '{}');
      return raw.guides || [];
    } catch (e) {
      return [];
    }
  }

  function overrideMap(section) {
    var map = {};
    deskGuides().forEach(function (g) {
      if (!g) return;
      var key = g.nodeId || '';
      if (!key && g.id) {
        var parts = String(g.id).split(/[:/]/);
        key = parts[parts.length - 1];
      }
      if (g.section && g.section !== section) return;
      if (!g.section && String(g.id || '').indexOf(section) === -1) return;
      if (key) map[key] = g;
    });
    return map;
  }

  function findCard(tree, nodeId) {
    var found = null;
    (tree.cards || []).forEach(function (c) {
      if (c.id === nodeId) found = { card: c, parent: null };
    });
    var nodes = tree.nodes || {};
    Object.keys(nodes).forEach(function (key) {
      (nodes[key].cards || []).forEach(function (c) {
        if (c.id === nodeId) found = { card: c, parent: key };
      });
    });
    return found;
  }

  function blocksToHtml(body) {
    if (!body || !body.length) return '';
    return body.map(function (block) {
      if (!block) return '';
      var html = '';
      if (block.h2) html += '<h2>' + esc(block.h2) + '</h2>';
      if (block.p) html += '<p>' + esc(block.p) + '</p>';
      if (block.note) html += '<p class="guide-note">' + esc(block.note) + '</p>';
      if (block.quote) {
        html += '<blockquote class="guide-quote"><p>' + esc(block.quote) + '</p>';
        if (block.cite) html += '<cite>' + esc(block.cite) + '</cite>';
        html += '</blockquote>';
      }
      if (block.a && block.a.href) {
        html += '<p><a href="' + esc(block.a.href) + '">' + esc(block.a.title || block.a.href) + '</a></p>';
      }
      if (block.ul && block.ul.length) {
        html += '<ul>' + block.ul.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') + '</ul>';
      }
      if (block.ol && block.ol.length) {
        html += '<ol>' + block.ol.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') + '</ol>';
      }
      return html;
    }).join('');
  }

  function catalog(section) {
    var tree = treeOf(section);
    if (!tree) return [];
    var ovs = overrideMap(section);
    var out = [];

    function merge(item) {
      var ov = ovs[item.id];
      if (!ov) return item;
      return Object.assign({}, item, ov, {
        id: item.id,
        kind: ov.kind || item.kind,
        siblingsOf: ov.siblingsOf || item.siblingsOf,
        href: item.href,
      });
    }

    out.push(merge({
      id: 'hub',
      kind: 'hub',
      title: tree.title,
      desc: tree.desc || '',
      intro: tree.intro || '',
      group: '',
      groupTitle: '',
    }));

    var nodes = tree.nodes || {};
    Object.keys(nodes).forEach(function (key) {
      var n = nodes[key];
      if (!n || n.type === 'external') return;
      var cardHit = findCard(tree, key);
      var group = n.siblingsOf || (n.type === 'cards' || n.type === 'navigator' ? key : '');
      var groupTitle = (group && nodes[group] && nodes[group].title) || (group === key ? n.title : '');
      out.push(merge({
        id: key,
        kind: n.type || 'page',
        title: n.title || key,
        desc: n.desc || n.pageDesc || '',
        lead: n.lead || '',
        intro: n.intro || '',
        contentHtml: n.contentHtml || blocksToHtml(n.body),
        prayers: (n.prayers || []).map(function (p) {
          return { title: p.title || '', lead: p.lead || '', text: p.text || '' };
        }),
        siblingsOf: n.siblingsOf || '',
        image: (cardHit && cardHit.card.image) || n.image || '',
        sub: (cardHit && cardHit.card.sub) || n.sub || '',
        href: (cardHit && cardHit.card.href) || n.href || '',
        group: group,
        groupTitle: groupTitle,
      }));
    });

    Object.keys(ovs).forEach(function (key) {
      if (out.some(function (x) { return x.id === key; })) return;
      var ov = ovs[key];
      if (ov.status === 'hidden') return;
      out.push(Object.assign({
        kind: 'page',
        group: ov.siblingsOf || '',
        groupTitle: (nodes[ov.siblingsOf] && nodes[ov.siblingsOf].title) || '',
        contentHtml: '',
        prayers: [],
        added: true,
      }, ov, { id: key }));
    });

    return out.filter(function (x) { return x.status !== 'hidden'; });
  }

  function getItem(section, id) {
    var list = catalog(section);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function parentOptions(section) {
    return catalog(section).filter(function (x) {
      return x.kind === 'cards' || x.kind === 'hub';
    });
  }

  function renderList(ctx, section) {
    var items = catalog(section);
    var title = sectionTitle(section);
    var groups = [];
    var seen = {};
    items.forEach(function (it) {
      var g = it.kind === 'hub' ? '__hub' : (it.group || it.id);
      if (seen[g]) return;
      seen[g] = 1;
      groups.push(g);
    });

    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(title) + '</h1>' +
      '<p>Тексты раздела: форматирование сохраняется и появляется на портале.</p></div>' +
      '<div class="topbar-actions">' +
      (AdminDesk.exportDesk ? '<button type="button" class="btn btn-ghost" id="g-export">Выгрузить</button>' : '') +
      '<button type="button" class="btn btn-primary" id="g-add">Добавить страницу</button>' +
      '</div></div>' +
      '<div class="panel guides-list">' +
      '<input class="input" id="g-q" placeholder="Найти страницу" />' +
      '<div id="g-rows"></div></div>';

    function paint() {
      var q = (document.getElementById('g-q').value || '').toLowerCase();
      var html = '';
      groups.forEach(function (g) {
        var rows = items.filter(function (it) {
          if (g === '__hub') return it.kind === 'hub';
          if (it.kind === 'hub') return false;
          var belong = (it.group || it.id) === g;
          if (!belong) return false;
          if (!q) return true;
          return (it.title + ' ' + (it.lead || '') + ' ' + (it.desc || '')).toLowerCase().indexOf(q) !== -1;
        });
        if (!rows.length) return;
        var head = rows[0].kind === 'hub' ? title : (rows.filter(function (r) { return r.id === g; })[0] || rows[0]).groupTitle || rows[0].title;
        html += '<section class="guide-group"><h2>' + esc(head) + '</h2><div class="guide-rows">';
        rows.forEach(function (it) {
          html +=
            '<a class="guide-row" href="#' + section + '/' + encodeURIComponent(it.id) + '">' +
            '<span class="guide-row-copy"><strong>' + esc(it.title || 'Без названия') + '</strong>' +
            '<small>' + esc(it.lead || it.desc || it.sub || '') + '</small></span>' +
            '<span class="badge muted">' + esc(kindLabel(it.kind)) + '</span></a>';
        });
        html += '</div></section>';
      });
      document.getElementById('g-rows').innerHTML = html || '<div class="empty">Ничего не найдено</div>';
    }

    document.getElementById('g-q').oninput = paint;
    document.getElementById('g-add').onclick = function () { startNew(ctx, section); };
    var exp = document.getElementById('g-export');
    if (exp) exp.onclick = function () { AdminDesk.exportDesk(); };
    paint();
  }

  function startNew(ctx, section) {
    var parents = parentOptions(section).filter(function (p) { return p.kind === 'cards'; });
    if (!parents.length) {
      ctx.toast('Сначала откройте подраздел', true);
      return;
    }
    var parent = parents[0].id;
    var pick = parents.map(function (p, i) { return (i + 1) + '. ' + p.title; }).join('\n');
    var n = prompt('В какой подраздел добавить страницу?\n' + pick, '1');
    if (n == null) return;
    var idx = Math.max(0, (parseInt(n, 10) || 1) - 1);
    if (parents[idx]) parent = parents[idx].id;
    var title = prompt('Название страницы', '');
    if (!title) return;
    var id = slugify(title);
    if (getItem(section, id)) id = id + '-' + Date.now().toString(36);
    AdminDesk.upsertGuide({
      id: section + ':' + id,
      section: section,
      nodeId: id,
      kind: 'page',
      title: title,
      lead: '',
      contentHtml: '<p></p>',
      siblingsOf: parent,
      status: 'published',
      added: true,
    });
    ctx.toast('Страница создана');
    ctx.go(section, id);
  }

  function slugify(s) {
    var map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    return String(s || '').toLowerCase().split('').map(function (ch) {
      return map[ch] != null ? map[ch] : ch;
    }).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || ('page-' + Date.now().toString(36));
  }

  function resolveId(section, id) {
    if (getItem(section, id)) return id;
    var last = String(id || '').split(/[:/]/).pop();
    return getItem(section, last) ? last : id;
  }

  function renderEditor(ctx, section, id) {
    id = resolveId(section, id);
    var item = getItem(section, id);
    if (!item) {
      renderList(ctx, section);
      return;
    }
    var portal = fileFor(section) + (item.kind === 'hub' ? '' : '?path=' + encodeURIComponent(item.id));
    var isPage = item.kind === 'page' || item.kind === 'category';
    var isPrayers = item.kind === 'prayers';
    var isHub = item.kind === 'hub' || item.kind === 'cards' || item.kind === 'navigator';

    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(item.title || 'Страница') + '</h1>' +
      '<p>' + esc(kindLabel(item.kind)) + (item.groupTitle ? ' · ' + esc(item.groupTitle) : '') + '</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="#' + section + '">К разделу</a>' +
      '<a class="btn btn-ghost" href="' + portalBase() + portal + '" target="_blank" rel="noopener">На портале</a>' +
      '<button type="button" class="btn btn-ghost" id="g-draft">Сохранить черновик</button>' +
      '<button type="button" class="btn btn-primary" id="g-pub">Опубликовать</button>' +
      '</div></div>' +
      '<div class="day-editor guide-editor">' +
      '<div class="panel form-grid desk-form">' +
      field('Заголовок', 'g-title', item.title) +
      (isHub ? field(item.kind === 'hub' ? 'Описание под заголовком' : 'Описание подраздела', 'g-desc', item.desc, 'textarea') : '') +
      (item.kind === 'hub' ? field('Вводный текст', 'g-intro', item.intro, 'textarea') : '') +
      (isPage ? field('Лид — первый абзац крупнее', 'g-lead', item.lead, 'textarea') : '') +
      (isPage || isHub ? (
        field('Подзаголовок на карточке', 'g-sub', item.sub || '') +
        '<div class="field"><label>Обложка карточки</label>' +
        '<div class="cover-frame' + (item.image ? '' : ' is-empty') + '" id="g-cover-frame">' +
        (item.image ? '<img src="' + mediaSrc(item.image) + '" alt="" />' : '<span>Картинка карточки</span>') +
        '</div>' +
        '<input type="hidden" id="g-image" value="' + esc(item.image || '') + '" />' +
        '<div class="post-side-actions" style="margin-top:8px">' +
        '<button type="button" class="btn btn-ghost" id="g-img-up">С устройства</button>' +
        '</div>' +
        '<input type="file" id="g-img-file" accept="image/*" hidden /></div>'
      ) : '') +
      (isPage ? rteBlock() : '') +
      (isPrayers ? prayersBlock(item.prayers) : '') +
      '</div>' +
      '<aside class="day-preview-wrap"><div class="day-preview-sticky">' +
      '<p class="day-preview-label">Предпросмотр — как на сайте</p>' +
      '<div id="g-preview" class="day-preview guide-live"></div></div></aside>' +
      '</div>';

    if (isPage) {
      var body = document.getElementById('g-body');
      body.innerHTML = item.contentHtml || '<p></p>';
      mountRTE(body);
    }
    if (isPrayers) bindPrayerActions(item);
    bindCover();
    bindLive(item);

    document.getElementById('g-draft').onclick = function () { save(ctx, section, item, 'draft'); };
    document.getElementById('g-pub').onclick = function () { save(ctx, section, item, 'published'); };
  }

  function field(label, id, value, type) {
    if (type === 'textarea') {
      return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
        '<textarea class="textarea" id="' + id + '" rows="4">' + esc(value || '') + '</textarea></div>';
    }
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
      '<input class="input" id="' + id + '" type="text" value="' + esc(value || '') + '" /></div>';
  }

  function rteBlock() {
    return (
      '<div class="field"><label>Текст страницы</label>' +
      '<div class="rte">' +
      '<div class="rte-bar" id="g-rte-bar">' +
      '<button type="button" data-block="p" title="Обычный абзац">Текст</button>' +
      '<button type="button" data-block="h2" title="Крупный заголовок внутри текста">Заголовок</button>' +
      '<button type="button" data-block="h3" title="Мельче заголовка">Подзаголовок</button>' +
      '<span class="rte-sep"></span>' +
      '<button type="button" data-cmd="bold" title="Жирный">Жирный</button>' +
      '<button type="button" data-cmd="italic" title="Курсив">Курсив</button>' +
      '<button type="button" data-block="quote" title="Цитата">Цитата</button>' +
      '<button type="button" data-act="note" title="Сноска / пояснение">Сноска</button>' +
      '<span class="rte-sep"></span>' +
      '<button type="button" data-cmd="insertUnorderedList" title="Маркированный список">Список</button>' +
      '<button type="button" data-cmd="insertOrderedList" title="Нумерованный список">1. 2. 3.</button>' +
      '<button type="button" data-act="link" title="Ссылка">Ссылка</button>' +
      '<button type="button" data-act="image" title="Фото">Фото</button>' +
      '</div>' +
      '<div class="rte-body" id="g-body" contenteditable="true" data-placeholder="Вставьте или напишите текст. Форматирование сохранится."></div>' +
      '<input type="file" id="g-inline-file" accept="image/*" hidden />' +
      '</div>' +
      '<p class="hint-note">Можно вставить текст из Word или Google Docs — лишнее оформление снимется, абзацы, списки и курсив останутся.</p>' +
      '</div>'
    );
  }

  function prayersBlock(prayers) {
    return (
      '<div class="field"><label>Молитвы</label>' +
      '<p class="hint-note">Каждая молитва — отдельная карточка на сайте. Название видно сразу, текст открывается по нажатию.</p>' +
      '<div id="g-prayers"></div>' +
      '<button type="button" class="btn btn-ghost" id="g-prayer-add" style="margin-top:10px">Добавить молитву</button></div>'
    );
  }

  function prayerCard(p, i) {
    return (
      '<div class="prayer-edit" data-i="' + i + '">' +
      '<div class="prayer-edit-head"><strong>Молитва ' + (i + 1) + '</strong>' +
      '<button type="button" class="btn btn-ghost" data-del>Убрать</button></div>' +
      '<input class="input" data-f="title" placeholder="Название" value="' + esc(p.title || '') + '" />' +
      '<textarea class="textarea" data-f="lead" rows="2" placeholder="Пояснение, если нужно">' + esc(p.lead || '') + '</textarea>' +
      '<textarea class="textarea" data-f="text" rows="6" placeholder="Текст молитвы">' + esc(p.text || '') + '</textarea>' +
      '</div>'
    );
  }

  function bindPrayerActions(item) {
    var box = document.getElementById('g-prayers');
    var list = (item.prayers || []).slice();
    function draw() {
      box.innerHTML = list.map(prayerCard).join('') || '<p class="hint-note">Пока нет молитв.</p>';
      box.querySelectorAll('.prayer-edit').forEach(function (row) {
        var i = Number(row.getAttribute('data-i'));
        row.querySelectorAll('[data-f]').forEach(function (el) {
          el.oninput = function () {
            list[i][el.getAttribute('data-f')] = el.value;
            drawPreview(item);
          };
        });
        row.querySelector('[data-del]').onclick = function () {
          list.splice(i, 1);
          draw();
          drawPreview(item);
        };
      });
    }
    document.getElementById('g-prayer-add').onclick = function () {
      list.push({ title: '', lead: '', text: '' });
      draw();
    };
    item._prayersLive = function () { return list; };
    draw();
  }

  function mediaSrc(url) {
    if (!url) return '';
    if (/^(https?:|data:|blob:|\.\.\/|\/)/i.test(url)) return url;
    return portalBase() + String(url).replace(/^\//, '');
  }

  function bindCover() {
    var file = document.getElementById('g-img-file');
    var btn = document.getElementById('g-img-up');
    if (!file || !btn) return;
    btn.onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        document.getElementById('g-image').value = reader.result;
        var frame = document.getElementById('g-cover-frame');
        frame.classList.remove('is-empty');
        frame.innerHTML = '<img src="' + reader.result + '" alt="" />';
        var prev = document.getElementById('g-preview');
        if (prev) prev.dispatchEvent(new Event('refresh'));
      };
      reader.readAsDataURL(f);
    };
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '') : '';
  }

  function collect(item) {
    var next = {
      id: (item.section ? item.section + ':' : '') + item.id,
      section: item.section,
      nodeId: item.id,
      kind: item.kind,
      title: val('g-title').trim() || item.title,
      desc: val('g-desc'),
      intro: val('g-intro'),
      lead: val('g-lead'),
      sub: val('g-sub'),
      image: val('g-image') || item.image || '',
      siblingsOf: item.siblingsOf || '',
      added: !!item.added,
      contentHtml: '',
      prayers: item.prayers || [],
    };
    var body = document.getElementById('g-body');
    if (body) next.contentHtml = body.innerHTML;
    if (item._prayersLive) next.prayers = item._prayersLive();
    return next;
  }

  function save(ctx, section, item, status) {
    var next = collect(Object.assign({}, item, { section: section }));
    if (!next.title) { ctx.toast('Укажите заголовок', true); return; }
    next.status = status;
    next.id = section + ':' + item.id;
    next.section = section;
    next.nodeId = item.id;
    AdminDesk.upsertGuide(next);
    ctx.toast(status === 'published' ? 'Опубликовано — откройте страницу на портале' : 'Черновик сохранён');
    if (status === 'published') ctx.go(section);
  }

  function bindLive(item) {
    ['g-title', 'g-desc', 'g-intro', 'g-lead', 'g-sub'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { drawPreview(item); });
    });
    var body = document.getElementById('g-body');
    if (body) body.addEventListener('input', function () { drawPreview(item); });
    drawPreview(item);
  }

  function drawPreview(item) {
    var el = document.getElementById('g-preview');
    if (!el) return;
    var title = val('g-title') || item.title || '';
    var lead = val('g-lead') || item.lead || '';
    var desc = val('g-desc') || item.desc || '';
    var intro = val('g-intro') || item.intro || '';
    var body = document.getElementById('g-body');
    var html = '<p class="dp-date">' + esc(kindLabel(item.kind)) + '</p>';
    html += '<h3 class="dp-title">' + esc(title) + '</h3>';
    if (item.kind === 'hub') {
      if (desc) html += '<p>' + esc(desc) + '</p>';
      if (intro) html += '<p>' + esc(intro) + '</p>';
    } else if (item.kind === 'cards' || item.kind === 'navigator') {
      if (desc) html += '<p>' + esc(desc) + '</p>';
    } else if (item.kind === 'prayers') {
      var list = item._prayersLive ? item._prayersLive() : (item.prayers || []);
      list.forEach(function (p) {
        if (!p.title && !p.text) return;
        html += '<div class="dp-block"><h4>' + esc(p.title || 'Без названия') + '</h4>';
        if (p.lead) html += '<p>' + esc(p.lead) + '</p>';
        html += '<p class="dp-quote" style="white-space:pre-wrap">' + esc(p.text) + '</p></div>';
      });
    } else {
      if (lead) html += '<p class="guide-lead">' + esc(lead) + '</p>';
      html += '<div class="guide-body">' + (body ? body.innerHTML : (item.contentHtml || '')) + '</div>';
    }
    el.innerHTML = html;
  }

  function mountRTE(el) {
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      document.execCommand('insertHTML', false, sanitize(html));
      drawPreview({});
    });
    document.getElementById('g-rte-bar').onclick = function (e) {
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
        insertHtml(el, '<p class="guide-note">Пояснение для читателя</p>');
      }
      if (act === 'link') {
        var href = prompt('Адрес ссылки', 'https://');
        if (href) document.execCommand('createLink', false, href);
      }
      if (act === 'image') {
        var input = document.getElementById('g-inline-file');
        input.onchange = function () {
          var f = input.files && input.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function () {
            insertHtml(el, '<figure class="rte-figure"><img src="' + esc(reader.result) + '" alt="" /></figure>');
            drawPreview({});
          };
          reader.readAsDataURL(f);
          input.value = '';
        };
        input.click();
      }
      drawPreview({});
    };
  }

  function insertHtml(el, html) {
    el.focus();
    document.execCommand('insertHTML', false, html);
  }

  function sanitize(raw) {
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

  global.AdminGuides = {
    renderList: renderList,
    renderEditor: renderEditor,
    catalog: catalog,
  };
})(window);
