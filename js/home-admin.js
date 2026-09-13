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

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function readDesk() {
    if (window.AdminDesk && AdminDesk.read) return AdminDesk.read();
    try { return JSON.parse(localStorage.getItem('yak_desk') || '{}') || {}; } catch (e) { return {}; }
  }

  function writeHome(home) {
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

  function emptyHome() {
    return {
      slides: [{ slug: '', title: '' }, { slug: '', title: '' }, { slug: '', title: '' }],
      side: [{ slug: '', title: '' }, { slug: '', title: '' }, { slug: '', title: '' }, { slug: '', title: '' }],
    };
  }

  function currentHome() {
    var saved = readDesk().home || {};
    var base = emptyHome();
    function fill(arr, n) {
      var out = [];
      for (var i = 0; i < n; i++) out.push(arr[i] ? { slug: arr[i].slug || '', title: arr[i].title || '' } : { slug: '', title: '' });
      return out;
    }
    return {
      slides: fill(saved.slides || [], 3),
      side: fill(saved.side || [], 4),
    };
  }

  function catalogPosts() {
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
        date: String(it.date || '').slice(0, 10),
      });
    }
    if (window.AdminDesk && AdminDesk.mergedList) {
      AdminDesk.mergedList('news').forEach(add);
      AdminDesk.mergedList('article').forEach(add);
    }
    if (window.AdminStore && AdminStore.listMaterials) {
      AdminStore.listMaterials().forEach(add);
    }
    return out.sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });
  }

  function collect() {
    var home = emptyHome();
    home.slides = [0, 1, 2].map(function (i) {
      return {
        slug: (document.getElementById('home-s-' + i) || {}).value || '',
        title: (document.getElementById('home-st-' + i) || {}).value || '',
      };
    });
    home.side = [0, 1, 2, 3].map(function (i) {
      return {
        slug: (document.getElementById('home-c-' + i) || {}).value || '',
        title: (document.getElementById('home-ct-' + i) || {}).value || '',
      };
    });
    return home;
  }

  function publish(home) {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    var clean = {
      slides: (home.slides || []).filter(function (x) { return x && x.slug; }),
      side: (home.side || []).filter(function (x) { return x && x.slug; }),
    };
    return AdminApi.upsertArchive({
      articles: [{
        id: PAGE_ID,
        slug: PAGE_SLUG,
        title: 'Главное на витрине',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify(clean),
        source: 'desk-home',
      }],
    });
  }

  function slotHtml(id, titleId, item, label, listId) {
    return (
      '<div class="field">' +
      '<label>' + esc(label) + '</label>' +
      '<input class="input" id="' + id + '" list="' + listId + '" value="' + esc(item.slug) + '" placeholder="slug публикации" />' +
      '<input class="input" id="' + titleId + '" value="' + esc(item.title) + '" placeholder="Название — подсказка для редакции" />' +
      '</div>'
    );
  }

  function render(ctx) {
    var home = currentHome();
    var posts = catalogPosts();
    var listId = 'home-post-list';
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Главная</h1>' +
      '<p>Слайдер «Главное» и четыре карточки справа. Пустые слоты на сайте заполнятся свежими публикациями.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="' + ((window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/') + 'index.html" target="_blank" rel="noopener">На сайте</a>' +
      '<button type="button" class="btn btn-primary" id="home-pub">Опубликовать</button>' +
      '</div></div>' +
      '<datalist id="' + listId + '">' +
      posts.map(function (p) {
        return '<option value="' + esc(p.slug) + '">' + esc(p.title) + (p.date ? ' · ' + esc(p.date) : '') + '</option>';
      }).join('') +
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

    function syncTitle(slugId, titleId) {
      var slugEl = document.getElementById(slugId);
      var titleEl = document.getElementById(titleId);
      if (!slugEl || !titleEl) return;
      slugEl.addEventListener('change', function () {
        var hit = posts.filter(function (p) { return p.slug === slugEl.value; })[0];
        if (hit && !titleEl.value) titleEl.value = hit.title;
      });
    }
    [0, 1, 2].forEach(function (i) { syncTitle('home-s-' + i, 'home-st-' + i); });
    [0, 1, 2, 3].forEach(function (i) { syncTitle('home-c-' + i, 'home-ct-' + i); });

    document.getElementById('home-pub').onclick = function () {
      var next = collect();
      writeHome(next);
      ctx.toast('Отправляем на сайт…');
      publish(next).then(function () {
        ctx.toast('Главная обновлена');
      }).catch(function (e) {
        ctx.toast(e.message || 'Не удалось опубликовать', true);
      });
    };
  }

  global.AdminHome = { render: render, publish: publish };
})(window);
