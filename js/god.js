/**
 * Режим бога: визуальная копия живого сайта.
 * Показывает карточки, превью, описания — не пустые списки.
 */
(function (global) {
  'use strict';

  var PORTAL = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
  if (PORTAL.slice(-1) !== '/') PORTAL += '/';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function src(url) {
    if (!url) return '';
    if (/^(https?:|data:|blob:|\.\.\/|\/)/i.test(url)) return url;
    return PORTAL + String(url).replace(/^\//, '');
  }

  function thumbStyle(url) {
    var u = src(url);
    if (!u) return '';
    return 'background-image:url(\'' + u.replace(/'/g, '%27') + '\')';
  }

  function card(href, img, title, meta, wide) {
    return (
      '<a class="god-card' + (wide ? ' god-card--wide' : '') + '" href="' + href + '">' +
      '<span class="god-thumb' + (img ? '' : ' is-empty') + '" style="' + thumbStyle(img) + '"></span>' +
      '<span class="god-copy"><strong>' + esc(title || 'Без названия') + '</strong>' +
      (meta ? '<small>' + esc(meta) + '</small>' : '') +
      '</span></a>'
    );
  }

  function band(title, href, itemsHtml, count) {
    return (
      '<section class="god-band">' +
      '<div class="god-band-head">' +
      '<h2>' + esc(title) + (count != null ? ' <em>' + count + '</em>' : '') + '</h2>' +
      (href ? '<a href="' + href + '">Все →</a>' : '') +
      '</div>' +
      (itemsHtml
        ? '<div class="god-rail">' + itemsHtml + '</div>'
        : '<p class="god-miss">Этот блок на сайте есть, но сейчас не подгрузился. Обновите страницу.</p>') +
      '</section>'
    );
  }

  function guideCards(root, prefix) {
    var out = [];
    if (!root) return out;
    (root.cards || []).forEach(function (c) {
      if (!c || !c.title) return;
      out.push({
        id: prefix + '/' + c.id,
        title: c.title,
        sub: c.sub || c.kicker || '',
        image: c.image || '',
      });
    });
    var nodes = root.nodes || {};
    Object.keys(nodes).forEach(function (key) {
      var n = nodes[key] || {};
      (n.cards || []).forEach(function (c) {
        if (!c || !c.title) return;
        out.push({
          id: prefix + '/' + key + '/' + (c.id || c.title),
          title: c.title,
          sub: c.sub || n.title || '',
          image: c.image || '',
        });
      });
    });
    try {
      var raw = JSON.parse(localStorage.getItem('yak_desk') || '{}');
      var ovs = {};
      (raw.guides || []).forEach(function (g) { if (g && g.id) ovs[g.id] = g; });
      out = out.map(function (c) { return ovs[c.id] ? Object.assign({}, c, ovs[c.id]) : c; });
    } catch (e) {}
    return out;
  }

  function newsItems() {
    return (window.AdminDesk && AdminDesk.mergedList) ? AdminDesk.mergedList('news') : [];
  }
  function articleItems() {
    return (window.AdminDesk && AdminDesk.mergedList) ? AdminDesk.mergedList('article') : [];
  }
  function eventItems() {
    return (window.AdminDesk && AdminDesk.mergedList) ? AdminDesk.mergedList('event') : [];
  }
  function audioItems() {
    return (window.AdminDesk && AdminDesk.mergedList) ? AdminDesk.mergedList('audio') : [];
  }
  function videoItems() {
    return (window.AdminDesk && AdminDesk.mergedList) ? AdminDesk.mergedList('video') : [];
  }
  function dayItems() {
    return (window.AdminDesk && AdminDesk.mergedList) ? AdminDesk.mergedList('church-day') : [];
  }
  function authorItems() {
    return (window.AdminDesk && AdminDesk.mergedList) ? AdminDesk.mergedList('authors') : [];
  }
  function photos() {
    if (window.AdminDesk && AdminDesk.allPhotos) return AdminDesk.allPhotos();
    return [];
  }
  function eventCover(e) {
    if (e.cover || e.image) return e.cover || e.image;
    var A = window.YakAfisha;
    if (A && A.covers && e.category) return A.covers[e.category];
    return 'assets/cards/event-meeting.webp';
  }

  function paintHome(ctx) {
    var view = ctx.viewEl;
    function draw() {
      var news = newsItems();
      var arts = articleItems();
      var vids = videoItems();
      var auds = audioItems();
      var evs = eventItems();
      var ph = photos();
      var church = guideCards(window.YakGuides && YakGuides.church, 'church');
      var spirit = guideCards(window.YakGuides && YakGuides.spirit, 'spirit');
      var authors = authorItems();
      var days = dayItems();

      view.innerHTML =
        '<div class="topbar"><div><h1>Сайт как есть</h1>' +
        '<p>Это живой ресурс. Нажмите любую карточку — откроется правка того, что уже видит читатель.</p></div></div>' +
        band('Новости', '#news', news.slice(0, 8).map(function (it) {
          return card('#news/' + encodeURIComponent(it.id), it.image || it.cover || 'assets/cards/articles-spirituality.webp', it.title, it.date || it.excerpt);
        }).join(''), news.length) +
        band('Статьи', '#articles', arts.slice(0, 8).map(function (it) {
          return card('#articles/' + encodeURIComponent(it.id), it.image || it.cover || 'assets/cards/articles-spirituality.webp', it.title, it.excerpt || it.date);
        }).join(''), arts.length) +
        band('О Церкви', '#church', church.slice(0, 8).map(function (it) {
          return card('#church/' + encodeURIComponent(it.id), it.image, it.title, it.sub);
        }).join(''), church.length) +
        band('Духовная жизнь', '#spirit', spirit.slice(0, 8).map(function (it) {
          return card('#spirit/' + encodeURIComponent(it.id), it.image, it.title, it.sub);
        }).join(''), spirit.length) +
        band('Видео', '#video', vids.slice(0, 8).map(function (it) {
          return card('#video/' + encodeURIComponent(it.id), it.thumb, it.title, (it.type === 'short' ? 'Shorts · ' : '') + (it.speaker || ''));
        }).join(''), vids.length) +
        band('Аудио', '#audio', auds.slice(0, 8).map(function (it) {
          return card('#audio/' + encodeURIComponent(it.id), it.cover || 'assets/cards/articles-sermons.webp', it.title, (it.artist || '') + (it.duration ? ' · ' + it.duration : ''));
        }).join(''), auds.length) +
        band('Афиша', '#afisha', evs.slice(0, 8).map(function (it) {
          return card('#afisha/' + encodeURIComponent(it.id), eventCover(it), it.title, (it.date || '') + (it.city ? ' · ' + it.city : ''));
        }).join(''), evs.length) +
        band('Фотосток', '#media', ph.slice(0, 12).map(function (it) {
          return card('#media', it.url || it.thumb, it.title || (it.tags || []).slice(0, 2).join(', ') || 'Фото', (it.tags || []).slice(0, 3).join(' · '));
        }).join(''), ph.length) +
        band('Авторы', '#authors', authors.slice(0, 8).map(function (it) {
          return card('#authors/' + encodeURIComponent(it.slug || it.id), it.photo, it.name, it.role || '');
        }).join(''), authors.length) +
        band('День Церкви', '#church-day', days.slice(0, 8).map(function (it) {
          return card('#church-day/' + encodeURIComponent(it.id || it.date), 'assets/cards/spirit-liturgy.webp', it.title || (it.liturgical && it.liturgical.title), it.date);
        }).join(''), days.length);
    }

    draw();
    if (window.AdminDesk) {
      if (AdminDesk.loadSeed) AdminDesk.loadSeed(draw);
      if (AdminDesk.loadArchive) {
        AdminDesk.loadArchive('news', draw);
        AdminDesk.loadArchive('article', draw);
      }
    }
  }

  function paintSection(ctx, type, title, addHref) {
    var view = ctx.viewEl;
    function items() {
      if (type === 'news') return newsItems();
      if (type === 'article') return articleItems();
      if (type === 'event') return eventItems();
      if (type === 'audio') return audioItems();
      if (type === 'video') return videoItems();
      if (type === 'church-day') return dayItems();
      if (type === 'authors') return authorItems();
      if (type === 'photo') return photos();
      if (type === 'church') return guideCards(window.YakGuides && YakGuides.church, 'church');
      if (type === 'spirit') return guideCards(window.YakGuides && YakGuides.spirit, 'spirit');
      return [];
    }
    function hrefOf(it) {
      if (type === 'news') return '#news/' + encodeURIComponent(it.id);
      if (type === 'article') return '#articles/' + encodeURIComponent(it.id);
      if (type === 'event') return '#afisha/' + encodeURIComponent(it.id);
      if (type === 'audio') return '#audio/' + encodeURIComponent(it.id);
      if (type === 'video') return '#video/' + encodeURIComponent(it.id);
      if (type === 'church-day') return '#church-day/' + encodeURIComponent(it.id || it.date);
      if (type === 'authors') return '#authors/' + encodeURIComponent(it.slug || it.id);
      if (type === 'church') return '#church/' + encodeURIComponent(it.id);
      if (type === 'spirit') return '#spirit/' + encodeURIComponent(it.id);
      return '#media';
    }
    function imgOf(it) {
      if (type === 'event') return eventCover(it);
      if (type === 'video') return it.thumb;
      if (type === 'audio') return it.cover || 'assets/cards/articles-sermons.webp';
      if (type === 'photo') return it.url || it.thumb;
      if (type === 'authors') return it.photo;
      if (type === 'church' || type === 'spirit') return it.image;
      if (type === 'church-day') return 'assets/cards/spirit-liturgy.webp';
      return it.image || it.cover || 'assets/cards/articles-spirituality.webp';
    }
    function metaOf(it) {
      if (type === 'video') return (it.type === 'short' ? 'Shorts · ' : '') + (it.speaker || it.description || '');
      if (type === 'audio') return (it.artist || '') + (it.duration ? ' · ' + it.duration : '');
      if (type === 'event') return (it.date || '') + (it.city ? ' · ' + it.city : '');
      if (type === 'photo') return (it.tags || []).slice(0, 4).join(' · ');
      if (type === 'authors') return it.role || '';
      if (type === 'church' || type === 'spirit') return it.sub || '';
      if (type === 'church-day') return it.date || '';
      return it.excerpt || it.date || '';
    }
    function titleOf(it) {
      return it.title || it.name || (it.liturgical && it.liturgical.title) || (it.tags && it.tags[0]) || 'Без названия';
    }

    function draw() {
      var list = items();
      view.innerHTML =
        '<div class="topbar"><div><h1>' + esc(title) + '</h1>' +
        '<p>Карточки с сайта. Нажмите — правите заголовок, описание, обложку.</p></div>' +
        '<div class="topbar-actions">' +
        (addHref ? '<a class="btn btn-primary" href="' + addHref + '">Добавить</a>' : '') +
        '</div></div>' +
        (list.length
          ? '<div class="god-grid">' + list.map(function (it) {
            return card(hrefOf(it), imgOf(it), titleOf(it), metaOf(it));
          }).join('') + '</div>'
          : '<div class="panel"><div class="empty">Загружаю содержимое сайта…</div></div>');
    }

    draw();
    if (type === 'news' && window.AdminDesk && AdminDesk.loadArchive) AdminDesk.loadArchive('news', draw);
    if (type === 'article' && window.AdminDesk && AdminDesk.loadArchive) AdminDesk.loadArchive('article', draw);
    if (type === 'photo' && window.AdminDesk && AdminDesk.loadSeed) AdminDesk.loadSeed(draw);
  }

  function paintGuideEdit(ctx, tree, path, back) {
    var cards = guideCards(tree, back);
    var item = null;
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].id === path) { item = cards[i]; break; }
    }
    if (!item) {
      paintSection(ctx, back, back === 'church' ? 'О Церкви' : 'Духовная жизнь', '');
      return;
    }
    var desk = window.AdminDesk;
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(item.title) + '</h1><p>Карточка раздела на сайте.</p></div>' +
      '<div class="topbar-actions"><a class="btn btn-ghost" href="#' + back + '">К разделу</a>' +
      '<button type="button" class="btn btn-primary" id="god-save">Сохранить</button></div></div>' +
      '<div class="god-edit">' +
      '<div class="god-preview" style="' + thumbStyle(item.image) + '"></div>' +
      '<div class="panel form-grid desk-form">' +
      '<div class="field"><label>Заголовок</label><input class="input" id="g-title" value="' + esc(item.title) + '" /></div>' +
      '<div class="field"><label>Подпись</label><textarea class="textarea" id="g-sub" rows="3">' + esc(item.sub || '') + '</textarea></div>' +
      '<div class="field"><label>Картинка</label><input class="input" id="g-img" value="' + esc(item.image || '') + '" /></div>' +
      '</div></div>';
    document.getElementById('god-save').onclick = function () {
      if (!desk || !desk.upsertGuide) {
        ctx.toast('Сохранено локально');
        return;
      }
      desk.upsertGuide({
        id: item.id,
        title: document.getElementById('g-title').value,
        sub: document.getElementById('g-sub').value,
        image: document.getElementById('g-img').value,
        status: 'published',
      });
      ctx.toast('Карточка обновлена');
      ctx.go(back);
    };
  }

  global.AdminGod = {
    paintHome: paintHome,
    paintSection: paintSection,
    paintGuideEdit: paintGuideEdit,
    guideCards: guideCards,
  };
})(window);
