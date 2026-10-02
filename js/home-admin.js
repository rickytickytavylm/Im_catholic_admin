/**
 * Главная: вручную выбрать 3 слайда и 4 карточки справа.
 */
(function (global) {
  'use strict';

  var PAGE_ID = 1900000008;
  var PAGE_SLUG = 'yak-home-data';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function readDesk() {
    if (window.AdminDesk && AdminDesk.read) return AdminDesk.read();
    try { return JSON.parse(localStorage.getItem('yak_desk') || '{}') || {}; } catch (e) { return {}; }
  }

  function writeHome(home) {
    home = Object.assign({}, home, { updatedAt: new Date().toISOString() });
    if (window.AdminDesk && AdminDesk.read && AdminDesk.write) {
      var all = AdminDesk.read();
      all.home = home;
      AdminDesk.write(all);
      return;
    }
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem('yak_desk') || '{}') || {}; } catch (e) { raw = {}; }
    raw.home = home;
    localStorage.setItem('yak_desk', JSON.stringify(raw));
  }

  /* Запасные значения на случай, если раздел ещё ни разу не публиковали; node — запись в редакторе разделов. */
  var STATIC_PAGES = [
    { slug: 'guide:navigator', node: 'church:navigator', title: 'Навигатор по католической жизни', href: 'church.html?path=navigator', image: 'assets/cards/church-navigator.webp', kind: 'page', kicker: 'Страница · О Церкви' },
    { slug: 'guide:structure', node: 'church:structure', title: 'Как устроена Католическая Церковь', href: 'church.html?path=structure', image: 'assets/cards/church-become-parish.webp', kind: 'page', kicker: 'Страница · О Церкви' },
    { slug: 'guide:spirit', node: 'spirit:hub', title: 'Духовная жизнь', href: 'spiritual-life.html', image: 'assets/cards/spirit-prayer.webp', kind: 'page', kicker: 'Страница · Духовный путь' },
    { slug: 'guide:mass', node: 'spirit:mass-guide', title: 'Путеводитель по Мессе', href: 'spiritual-life.html?path=mass-guide', image: 'assets/cards/liturgy-mass-guide.webp', kind: 'page', kicker: 'Страница · Духовный путь' },
    { slug: 'guide:prayer', node: 'spirit:prayer', title: 'Молитва', href: 'spiritual-life.html?path=prayer', image: 'assets/cards/spirit-prayer.webp', kind: 'page', kicker: 'Страница · Духовный путь' },
    { slug: 'guide:church', node: 'church:hub', title: 'О Церкви', href: 'church.html', image: 'assets/cards/church-first-time.webp', kind: 'page', kicker: 'Страница · О Церкви' },
  ];
  var SECTIONS = [['church', 'church.html', 'О Церкви'], ['spirit', 'spiritual-life.html', 'Духовный путь']];

  /* Разделы в том виде, в каком они сейчас на сайте (опубликованы из редактора «О Церкви» / «Духовная жизнь»). */
  function publishedGuides() {
    var map = {};
    var list = (window.AdminDesk && AdminDesk.remoteGuides && AdminDesk.remoteGuides()) || [];
    list.forEach(function (g) {
      if (!g) return;
      var parts = String(g.id || '').split(':');
      var section = g.section || (parts.length > 1 ? parts[0] : '');
      var node = g.nodeId || parts[parts.length - 1];
      if (section && node) map[section + ':' + node] = g;
    });
    return map;
  }

  function withLive(page, live) {
    var g = page.node && live[page.node];
    if (!g || g.status === 'hidden') return page;
    return Object.assign({}, page, { title: g.title || page.title, image: g.image || page.image });
  }

  /* Все разделы «О Церкви» и «Духовная жизнь» как guide:id — с обложкой и названием из редактора разделов. */
  function guidePages() {
    var G = window.YakGuides || {};
    var live = publishedGuides();
    var out = [];
    SECTIONS.forEach(function (t) {
      var section = t[0];
      var tree = G[section] || {};
      var nodes = tree.nodes || {};
      var images = {};
      var cards = (tree.cards || []).slice();
      Object.keys(nodes).forEach(function (k) { cards = cards.concat((nodes[k] && nodes[k].cards) || []); });
      cards.forEach(function (c) { if (c && c.id && c.image && !images[c.id]) images[c.id] = c.image; });
      var ids = Object.keys(nodes);
      Object.keys(live).forEach(function (key) {
        var id = key.slice(section.length + 1);
        if (key.indexOf(section + ':') === 0 && id !== 'hub' && ids.indexOf(id) === -1) ids.push(id);
      });
      ids.forEach(function (id) {
        var n = nodes[id] || {};
        var g = live[section + ':' + id];
        if (n.type === 'external' || (g && g.status === 'hidden')) return;
        var title = (g && g.title) || n.title;
        if (!title) return;
        out.push({
          slug: 'guide:' + id,
          title: title,
          href: t[1] + '?path=' + encodeURIComponent(id),
          image: (g && g.image) || images[id] || n.image || '',
          kind: 'page',
          kicker: 'Страница · ' + t[2],
          alias: STATIC_PAGES.some(function (p) { return p.node === section + ':' + id && p.slug !== 'guide:' + id; }),
        });
      });
    });
    return out;
  }

  /* Название слота, подставленное из каталога (а не вписанное редакцией), обновляется вместе с разделом. */
  function defaultTitles(slug) {
    var out = [];
    STATIC_PAGES.forEach(function (p) { if (p.slug === slug) out.push(p.title); });
    var m = /^guide:(.+)$/.exec(String(slug || ''));
    var G = window.YakGuides || {};
    if (m) {
      SECTIONS.forEach(function (t) {
        var n = G[t[0]] && G[t[0]].nodes && G[t[0]].nodes[m[1]];
        if (n && n.title) out.push(n.title);
      });
    }
    return out;
  }

  function ownTitle(slot, hit) {
    if (!slot || !slot.title) return false;
    if (slot.ownTitle != null) return !!slot.ownTitle;
    if (hit && slot.title === hit.title) return false;
    return defaultTitles(slot.slug).indexOf(slot.title) === -1;
  }

  function emptySlot() {
    return { slug: '', title: '', href: '', image: '', kind: '' };
  }

  function emptyHome() {
    return {
      slides: [emptySlot(), emptySlot(), emptySlot()],
      side: [emptySlot(), emptySlot(), emptySlot(), emptySlot()],
    };
  }

  /* Время версии на сайте, с которой открыта форма. */
  var openedAt = '';

  function packTime() {
    return (window.AdminDesk && AdminDesk.packTime && AdminDesk.packTime(PAGE_SLUG)) || '';
  }

  /* Неотправленная правка этого браузера новее сайта — показываем её. */
  function unsentHome() {
    var local = readDesk().home;
    var remote = window.AdminDesk && AdminDesk.remoteHome && AdminDesk.remoteHome();
    if (!local || !local.updatedAt) return null;
    return !remote || String(local.updatedAt) > packTime() ? local : null;
  }

  function currentHome() {
    var remote = window.AdminDesk && AdminDesk.remoteHome && AdminDesk.remoteHome();
    var saved = unsentHome() || remote || readDesk().home || {};
    function fill(arr, n) {
      var out = [];
      for (var i = 0; i < n; i++) {
        var x = arr[i];
        var slot = x ? {
          slug: x.slug || '',
          title: x.title || '',
          href: x.href || '',
          image: x.image || '',
          kind: x.kind || '',
        } : emptySlot();
        if (x && x.ownTitle) slot.ownTitle = true;
        out.push(slot);
      }
      return out;
    }
    return {
      slides: fill(saved.slides || [], 3),
      side: fill(saved.side || [], 4),
    };
  }

  var catalogCache = [];
  /* Слоты, как они открылись: если слаг не трогали, а в каталоге его нет — ссылку и обложку не теряем. */
  var slotOnOpen = {};

  function catalogPosts(extraPages) {
    var out = [];
    var seen = {};
    function add(it) {
      if (!it) return;
      var slug = it.slug || it.id;
      if (!slug || seen[String(slug)]) return;
      if (/^yak-.*-data$/.test(String(slug))) return;
      if (it.status && it.status !== 'published') return;
      seen[String(slug)] = 1;
      out.push({
        slug: String(slug),
        title: it.title || String(slug),
        date: String(it.date || it.updatedAt || '').slice(0, 10),
        href: it.href || '',
        image: it.image || it.cover || '',
        kind: it.kind || 'article',
        kicker: it.kicker || '',
        alias: !!it.alias,
      });
    }
    var live = publishedGuides();
    STATIC_PAGES.forEach(function (p) { add(withLive(p, live)); });
    guidePages().forEach(add);
    (extraPages || []).forEach(add);
    if (window.AdminStore && AdminStore.listPages) {
      AdminStore.listPages().forEach(function (p) {
        add({
          slug: p.slug || p.id,
          title: p.title,
          href: 'static.html?id=' + encodeURIComponent(p.slug || p.id),
          kind: 'page',
          kicker: 'Страница',
          date: p.updatedAt || p.createdAt || '',
        });
      });
    }
    if (window.AdminDesk && AdminDesk.mergedList) {
      AdminDesk.mergedList('news').forEach(add);
      AdminDesk.mergedList('article').forEach(add);
    }
    if (window.AdminStore && AdminStore.listMaterials) {
      AdminStore.listMaterials().forEach(add);
    }
    catalogCache = out.slice();
    return out.sort(function (a, b) {
      var ak = a.kind === 'page' ? '0' : '1';
      var bk = b.kind === 'page' ? '0' : '1';
      if (ak !== bk) return ak.localeCompare(bk);
      return String(b.date).localeCompare(String(a.date));
    });
  }

  function catalogHit(slug) {
    return catalogCache.filter(function (p) { return p.slug === slug; })[0] || null;
  }

  function slotFromInput(slugId, titleId) {
    var titleEl = document.getElementById(titleId) || {};
    var slug = String((document.getElementById(slugId) || {}).value || '').trim();
    var title = String(titleEl.value || '').trim();
    var hit = catalogHit(slug);
    var was = slotOnOpen[slugId] && slotOnOpen[slugId].slug === slug ? slotOnOpen[slugId] : null;
    var page = hit && hit.kind === 'page';
    var auto = titleEl.dataset && titleEl.dataset.auto === '1';
    var own = page && !!title && !auto && title !== hit.title && defaultTitles(slug).indexOf(title) === -1;
    /* Разделы не загрузились — у слотов разделов оставляем то, что уже на сайте, а не запасные картинки. */
    var trust = guidesLive || !/^guide:/.test(slug) || !was;
    var slot = {
      slug: slug,
      title: page && !own && trust ? hit.title : (title || (hit && hit.title) || ''),
      href: (hit && hit.href) || (was && was.href) || '',
      image: (trust && hit && hit.image) || (was && was.image) || (hit && hit.image) || '',
      kind: (hit && hit.kind) || (was && was.kind) || '',
    };
    if (own) slot.ownTitle = true;
    return slot;
  }

  /* После публикации раздела слоты главной с ним получают его обложку и название — без ручной перепубликации главной. */
  function syncGuideSlots() {
    var D = window.AdminDesk;
    if (!D || !D.readPackStrict || !D.publishPackSafe) return Promise.resolve(false);
    if (!D.remoteGuides || !D.remoteGuides().length) return Promise.resolve(false);
    function fixed(pack) {
      catalogPosts();
      var changed = false;
      function fix(s) {
        if (!s || !/^guide:/.test(String(s.slug || ''))) return s;
        var hit = catalogHit(s.slug);
        if (!hit) return s;
        var next = Object.assign({}, s, {
          title: ownTitle(s, hit) ? s.title : hit.title,
          href: hit.href || s.href || '',
          image: hit.image || s.image || '',
          kind: 'page',
        });
        ['title', 'href', 'image', 'kind'].forEach(function (k) {
          if (String(next[k] || '') !== String(s[k] || '')) changed = true;
        });
        return next;
      }
      var body = {
        slides: ((pack && pack.slides) || []).map(fix),
        side: ((pack && pack.side) || []).map(fix),
      };
      return changed ? body : null;
    }
    return D.readPackStrict(PAGE_SLUG).then(function (cur) {
      if (!cur || !cur.pack || !fixed(cur.pack)) return false;
      return D.publishPackSafe({
        slug: PAGE_SLUG,
        fallbackId: PAGE_ID,
        title: 'Главное на витрине',
        source: 'desk-home',
        shrinkGuard: false,
        build: function (remote) { return fixed(remote) || remote; },
      }).then(function () { return true; });
    });
  }

  function portalImage(url) {
    url = String(url || '');
    if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
    var base = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
    return base.replace(/\/?$/, '/') + url.replace(/^\.?\//, '');
  }

  function collect() {
    var home = emptyHome();
    home.slides = [0, 1, 2].map(function (i) {
      return slotFromInput('home-s-' + i, 'home-st-' + i);
    });
    home.side = [0, 1, 2, 3].map(function (i) {
      return slotFromInput('home-c-' + i, 'home-ct-' + i);
    });
    return home;
  }

  function publish(home, force) {
    var clean = {
      slides: (home.slides || []).filter(function (x) { return x && x.slug; }),
      side: (home.side || []).filter(function (x) { return x && x.slug; }),
    };
    if (!window.AdminDesk || !AdminDesk.publishObjectPack) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return AdminDesk.publishObjectPack({
      fallbackId: PAGE_ID,
      slug: PAGE_SLUG,
      title: 'Главное на витрине',
      source: 'desk-home',
      body: clean,
      openedAt: openedAt,
      force: !!force,
    }).then(function (pack) {
      openedAt = packTime();
      return pack;
    });
  }

  function slotHtml(id, titleId, item, label, listId) {
    return (
      '<div class="field home-slot">' +
      '<label for="' + id + '">' + esc(label) + '</label>' +
      '<div class="home-slot-row">' +
      '<span class="home-slot-pic" id="' + id + '-pic" aria-hidden="true"></span>' +
      '<div class="home-slot-inputs">' +
      '<input class="input" id="' + id + '" list="' + listId + '" value="' + esc(item.slug) + '" placeholder="статья или страница, например guide:navigator" />' +
      '<input class="input" id="' + titleId + '" value="' + esc(item.title) + '" placeholder="Название — подсказка для редакции" />' +
      '<small class="home-slot-note" id="' + id + '-note"></small>' +
      '</div></div></div>'
    );
  }

  /* Обложки разделов берутся из опубликованных разделов: без них форма не открывается, иначе уйдут запасные картинки. */
  var guidesLive = false;
  function loadGuides(D) {
    if (D.remoteGuides && D.remoteGuides().length) { guidesLive = true; return Promise.resolve(); }
    return D.readPackStrict('yak-guides-data').then(function () {
      guidesLive = !!(D.remoteGuides && D.remoteGuides().length);
    }, function () { guidesLive = false; });
  }

  function render(ctx) {
    var D = window.AdminDesk;
    if (!D || !D.readPackStrict) { draw(ctx); return; }
    ctx.viewEl.innerHTML = '<div class="yak-loading yak-loading--page" role="status"><span class="yak-spin" aria-hidden="true"></span><span>Открываю главную…</span></div>';
    var guides = loadGuides(D);
    D.readPackStrict(PAGE_SLUG).then(function () {
      return guides.then(function () {
        draw(ctx);
        if (!guidesLive) ctx.toast('Разделы сайта не загрузились — у слотов разделов останутся обложки, что уже на сайте', true);
      });
    }, function () {
      return guides.then(function () {
        draw(ctx);
        ctx.toast('Сайт не ответил — показана последняя известная версия', true);
      });
    });
  }

  function draw(ctx) {
    openedAt = packTime();
    var unsent = !!unsentHome();
    var home = currentHome();
    if (!home.slides[0].slug) {
      home.slides = [
        Object.assign({}, STATIC_PAGES[0]),
        Object.assign({}, STATIC_PAGES[1]),
        Object.assign({}, STATIC_PAGES[3]),
      ];
    }
    var posts = catalogPosts();
    slotOnOpen = {};
    function open(list, prefix) {
      list.forEach(function (s, i) {
        slotOnOpen[prefix + i] = Object.assign({}, s);
        var hit = s.slug && catalogHit(s.slug);
        if (hit && hit.kind === 'page' && guidesLive && !ownTitle(s, hit)) s.title = hit.title;
      });
    }
    open(home.slides, 'home-s-');
    open(home.side, 'home-c-');
    var listId = 'home-post-list';
    function optionHtml(p) {
      if (p.alias) return '';
      var mark = p.kind === 'page' ? 'страница · ' : '';
      return '<option value="' + esc(p.slug) + '">' + esc(mark + p.title) + (p.date ? ' · ' + esc(p.date) : '') + '</option>';
    }
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Главная</h1>' +
      '<p>Слайдер и четыре карточки справа: статьи или статические страницы — Навигатор, устройство Церкви, духовный путь. Пустые слоты на сайте заполнятся свежими публикациями.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="' + ((window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/') + 'index.html" target="_blank" rel="noopener">На сайте</a>' +
      '<button type="button" class="btn btn-primary" id="home-pub">Опубликовать</button>' +
      '</div></div>' +
      (unsent ? '<p class="hint-note sync-note">Здесь правка, которая ещё не ушла на сайт. Нажмите «Опубликовать».</p>' : '') +
      '<datalist id="' + listId + '">' +
      posts.map(optionHtml).join('') +
      '</datalist>' +
      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Слайдер — 3 записи</h2></div>' +
      '<div class="form-grid">' +
      slotHtml('home-s-0', 'home-st-0', home.slides[0], 'Слайд 1', listId) +
      slotHtml('home-s-1', 'home-st-1', home.slides[1], 'Слайд 2', listId) +
      slotHtml('home-s-2', 'home-st-2', home.slides[2], 'Слайд 3', listId) +
      '</div></div>' +
      '<div class="panel"><div class="panel-head"><h2>Справа от слайдера — 4 записи</h2></div>' +
      '<div class="form-grid">' +
      slotHtml('home-c-0', 'home-ct-0', home.side[0], 'Карточка 1', listId) +
      slotHtml('home-c-1', 'home-ct-1', home.side[1], 'Карточка 2', listId) +
      slotHtml('home-c-2', 'home-ct-2', home.side[2], 'Карточка 3', listId) +
      slotHtml('home-c-3', 'home-ct-3', home.side[3], 'Карточка 4', listId) +
      '</div></div>';

    function bindSlot(slugId, titleId) {
      var slugEl = document.getElementById(slugId);
      var titleEl = document.getElementById(titleId);
      var pic = document.getElementById(slugId + '-pic');
      var note = document.getElementById(slugId + '-note');
      if (!slugEl || !titleEl) return;
      var was = slotOnOpen[slugId] || {};
      titleEl.dataset.auto = !titleEl.value || !ownTitle(was, catalogHit(was.slug)) ? '1' : '0';
      function paint() {
        var slot = slotFromInput(slugId, titleId);
        var hit = catalogHit(slot.slug);
        var url = portalImage(slot.image);
        if (pic) {
          pic.style.backgroundImage = url ? "url('" + url.replace(/'/g, '%27') + "')" : '';
          pic.classList.toggle('is-empty', !url);
        }
        if (!note) return;
        var text;
        if (!slot.slug) text = 'Пусто — на сайте встанет свежая публикация';
        else if (!hit && !slot.href) text = 'Нет в каталоге — проверьте адрес';
        else if (/^guide:/.test(slot.slug)) text = 'Обложка и название — из раздела «' + (/^spiritual/.test(slot.href) ? 'Духовная жизнь' : 'О Церкви') + '»';
        else if (slot.kind === 'page') text = 'Страница сайта';
        else text = 'Обложка и название — из материала';
        if (was.slug === slot.slug && slot.image && was.image !== slot.image) text += ' · на сайте сейчас другая обложка — нажмите «Опубликовать»';
        note.textContent = text;
      }
      slugEl.addEventListener('input', function () {
        var hit = catalogHit(String(slugEl.value || '').trim());
        if (hit && titleEl.dataset.auto === '1') titleEl.value = hit.title;
        paint();
      });
      titleEl.addEventListener('input', function () {
        titleEl.dataset.auto = titleEl.value ? '0' : '1';
      });
      paint();
    }
    [0, 1, 2].forEach(function (i) { bindSlot('home-s-' + i, 'home-st-' + i); });
    [0, 1, 2, 3].forEach(function (i) { bindSlot('home-c-' + i, 'home-ct-' + i); });

    document.getElementById('home-pub').onclick = function () {
      var next = collect();
      writeHome(next);
      send(false);
      function send(force) {
        ctx.toast('Отправляем на сайт…');
        publish(next, force).then(function () {
          ctx.toast('Главная обновлена');
          var note = ctx.viewEl.querySelector('.sync-note');
          if (note) note.remove();
        }).catch(function (e) {
          if (e && e.conflict) {
            if (confirm(e.message + '\n\nЗаменить ту версию вашей?')) { send(true); return; }
            ctx.toast('Ничего не отправлено. Ваша правка сохранена здесь — откройте раздел заново, чтобы сравнить.', true);
            return;
          }
          ctx.toast(AdminDesk.failText ? AdminDesk.failText(e) : ((e && e.message) || 'Не удалось опубликовать'), true);
        });
      }
    };

    if (window.AdminApi && AdminApi.getPages) {
      AdminApi.getPages({ limit: 100 }).then(function (pack) {
        var extra = ((pack && (pack.items || pack.pages)) || []).map(function (p) {
          return {
            slug: p.slug || p.id,
            title: p.title,
            href: 'static.html?id=' + encodeURIComponent(p.slug || p.id),
            kind: 'page',
            kicker: 'Страница',
            date: p.modified || p.date || '',
          };
        });
        posts = catalogPosts(extra);
        var list = document.getElementById(listId);
        if (list) list.innerHTML = posts.map(optionHtml).join('');
      }).catch(function () {});
    }
  }

  global.AdminHome = { render: render, publish: publish, syncGuides: syncGuideSlots };
})(window);
