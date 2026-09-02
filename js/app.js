/**
 * SPA редакции: дашборд, материалы, страницы, медиатека, таксономия, пользователи, логи.
 */
(function () {
  'use strict';

  var session = AdminAuth.requireAuth();
  if (!session) return;

  var role = AdminAuth.roleOf(session);
  var viewEl = document.getElementById('view');
  var navEl = document.getElementById('side-nav');
  var userEl = document.getElementById('side-user');
  var toastEl = document.getElementById('toast');
  var autosaveTimer = null;
  var editorDirty = false;
  var mediaTab = 'images';

  var PORTAL_BASE = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
  if (PORTAL_BASE.slice(-1) !== '/') PORTAL_BASE += '/';

  /* Меню = блоки сайта, не склад сущностей CMS */
  var NAV = [
    { id: 'dashboard', title: 'Обзор', group: 'Сайт' },
    { id: 'news', title: 'Новости', group: 'Сайт' },
    { id: 'articles', title: 'Статьи', group: 'Сайт' },
    { id: 'church', title: 'О Церкви', group: 'Сайт' },
    { id: 'spirit', title: 'Духовная жизнь', group: 'Сайт' },
    { id: 'afisha', title: 'Афиша', group: 'Сайт' },
    { id: 'audio', title: 'Аудио', group: 'Сайт' },
    { id: 'video', title: 'Видео', group: 'Сайт' },
    { id: 'media', title: 'Фотосток', group: 'Сайт' },
    { id: 'church-day', title: 'День Церкви', group: 'Сайт' },
    { id: 'authors', title: 'Авторы', group: 'Люди' },
    { id: 'photographers', title: 'Фотографы', group: 'Люди' },
    { id: 'photo-moderation', title: 'Модерация фото', group: 'Люди' },
    { id: 'my-page', title: 'Моя страница', group: 'Люди' },
    { id: 'upload-photos', title: 'Загрузить фото', group: 'Люди' },
    { id: 'materials', title: 'Записи', group: 'Система' },
    { id: 'pages', title: 'Страницы', group: 'Система' },
    { id: 'settings', title: 'Настройки', group: 'Система' },
    { id: 'page-editor', title: 'Редактор страницы', hidden: true },
    { id: 'editor', title: 'Редактор', hidden: true },
    { id: 'photographer-edit', title: 'Карточка фотографа', hidden: true },
    { id: 'taxonomy', title: 'Рубрики и теги', hidden: true },
    { id: 'library', title: 'Библиотека', hidden: true },
    { id: 'users', title: 'Пользователи', hidden: true },
    { id: 'logs', title: 'Журнал', hidden: true },
    { id: 'profile', title: 'Профиль', hidden: true },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, isErr) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (isErr) toastEl.classList.add('err');
    else toastEl.classList.remove('err');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  function route() {
    var hash = (location.hash || '#dashboard').replace(/^#/, '');
    var parts = hash.split('/');
    var name = parts[0] || 'dashboard';
    if (name === 'photostock') name = 'media';
    if (name === 'columns') name = 'articles';
    if (name === 'posts') name = 'materials';
    return { name: name, id: parts[1] || '' };
  }

  function go(name, id) {
    location.hash = id ? name + '/' + id : name;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch (e) {
      return iso;
    }
  }

  function badgeForStatus(status) {
    var s = AdminStore.STATUSES.filter(function (x) { return x.id === status; })[0];
    var tone = s ? s.tone : 'muted';
    var title = s ? s.title : status;
    return '<span class="badge ' + tone + '">' + esc(title) + '</span>';
  }

  function badgeForPageStatus(status) {
    var s = AdminStore.PAGE_STATUSES.filter(function (x) { return x.id === status; })[0];
    var tone = s ? s.tone : 'muted';
    var title = s ? s.title : status;
    return '<span class="badge ' + tone + '">' + esc(title) + '</span>';
  }

  function badgeForMediaStatus(status) {
    var s = AdminStore.MEDIA_STATUSES.filter(function (x) { return x.id === status; })[0];
    var tone = s ? s.tone : 'muted';
    var title = s ? s.title : status;
    return '<span class="badge ' + tone + '">' + esc(title) + '</span>';
  }

  function portalPageUrl(slug) {
    return PORTAL_BASE + 'page.html?slug=' + encodeURIComponent(slug || '');
  }

  function portalCategoryUrl(slug) {
    return PORTAL_BASE + 'category.html?slug=' + encodeURIComponent(slug || '');
  }

  function portalTagUrl(slug) {
    return PORTAL_BASE + 'tag.html?slug=' + encodeURIComponent(slug || '');
  }

  function navAccessId(itemId, routeName) {
    if (routeName === 'editor') return 'materials';
    if (routeName === 'page-editor') return 'pages';
    if (routeName === 'photostock') return 'media';
    if (routeName === 'photographer-edit') return 'photographers';
    if (routeName === 'publish') return 'publish';
    return routeName;
  }

  function renderComingSoon(title, body) {
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(title) + '</h1>' +
      '<p class="muted">Раздел в разработке.</p></div></div>' +
      '<div class="panel"><div class="empty" style="text-align:left;line-height:1.55">' +
      body +
      '</div></div>';
  }

  function renderNav() {
    var r = route();
    var html = '';
    var lastGroup = '';
    NAV.filter(function (item) {
      if (item.hidden) return false;
      return AdminAuth.canAccessNav(session, item.id);
    }).forEach(function (item) {
      if (item.group && item.group !== lastGroup) {
        lastGroup = item.group;
        html += '<div class="nav-group">' + esc(item.group) + '</div>';
      }
      var active =
        r.name === item.id ||
        (item.id === 'dashboard' && r.name === 'publish') ||
        (item.id === 'materials' && r.name === 'editor') ||
        (item.id === 'pages' && r.name === 'page-editor') ||
        (item.id === 'photographers' && r.name === 'photographer-edit') ||
        (item.id === 'media' && (r.name === 'photostock' || r.name === 'library'));
      html += '<a href="#' + item.id + '" class="' + (active ? 'active' : '') + '">' + esc(item.title) + '</a>';
    });
    navEl.innerHTML = html;

    userEl.innerHTML =
      '<div class="name">' + esc(session.name) + '</div>' +
      '<div class="role">' + esc(role.title) + '</div>' +
      '<button type="button" class="btn btn-ghost btn-block" id="logout-btn">Сменить пользователя</button>';
    document.getElementById('logout-btn').onclick = function () {
      var emails = AdminAuth.DEMO_USERS.map(function (u) { return u.email + ' — ' + AdminAuth.ROLES[u.role].title; }).join('\n');
      var email = prompt('Email пользователя:\n' + emails, session.email);
      if (!email) return;
      var user = AdminAuth.DEMO_USERS.filter(function (u) { return u.email === email.trim().toLowerCase(); })[0];
      if (!user) { toast('Пользователь не найден'); return; }
      localStorage.setItem('yak_admin_session', JSON.stringify({
        email: user.email, name: user.name, role: user.role, rubrics: user.rubrics || null, at: Date.now(),
      }));
      location.reload();
    };
  }

  function checkServer() {
    var pill = document.getElementById('server-pill');
    if (!pill || !window.AdminApi || !AdminApi.health) return;
    AdminApi.health()
      .then(function () {
        pill.className = 'server-pill on';
        pill.textContent = 'Сервер доступен';
        pill.title = 'Публикация на портал доступна';
      })
      .catch(function () {
        pill.className = 'server-pill off';
        pill.textContent = 'Без сервера';
        pill.title = 'Изменения сохраняются в редакции';
      });
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    var mats = AdminStore.visibleMaterials(session);
    var drafts = mats.filter(function (m) { return m.status === 'draft'; });
    var review = mats.filter(function (m) { return m.status === 'review'; });
    var rework = mats.filter(function (m) { return m.status === 'rework'; });
    var published = mats.filter(function (m) { return m.status === 'published'; });
    var scheduled = mats.filter(function (m) { return m.status === 'scheduled'; });

    var statsHtml = '';
    var listsHtml = '';

    if (session.role === 'author') {
      statsHtml =
        card('Черновики', drafts.length, 'мои') +
        card('На доработке', rework.length, 'с комментариями') +
        card('На модерации', review.filter(function (m) { return m.authorEmail === session.email; }).length, 'ожидают') +
        card('Опубликовано', published.filter(function (m) { return m.authorEmail === session.email; }).length, 'мною');
      listsHtml =
        blockList('Мои черновики', drafts, true) +
        blockList('Возвращено на доработку', rework, true) +
        blockList('Опубликованные мной', published.filter(function (m) { return m.authorEmail === session.email; }), false);
    } else if (session.role === 'rubric_editor') {
      statsHtml =
        card('На модерации', review.length, 'ждут решения') +
        card('В очереди', scheduled.length, 'запланировано') +
        card('В работе', drafts.length + review.length, 'рубрика') +
        card('Теги / категории', AdminStore.listTags().length + ' / ' + AdminStore.listCategories().length, 'рубрики');
      listsHtml =
        blockList('На модерации', review, true) +
        blockList('Очередь публикаций', scheduled, false) +
        '<div class="panel"><div class="panel-head"><h2>Быстрый переход</h2></div><p style="display:flex;flex-wrap:wrap;gap:8px">' +
        '<a class="btn btn-ghost" href="#taxonomy">Категории и теги</a>' +
        '<a class="btn btn-ghost" href="#media">Фотосток</a></p></div>';
    } else if (session.role === 'chief' || session.role === 'super') {
      var all = AdminStore.listMaterials();
      var pages = AdminStore.listPages();
      statsHtml =
        card('На модерации', all.filter(function (m) { return m.status === 'review'; }).length, 'все рубрики') +
        card('Страницы', pages.length, pages.filter(function (p) { return p.status === 'published'; }).length + ' опубл.') +
        card('Запланировано', all.filter(function (m) { return m.status === 'scheduled'; }).length, 'календарь') +
        card('Медиа', AdminStore.listMedia().length, AdminStore.listPhotos().filter(function (p) { return p.status === 'pending'; }).length + ' в очереди');
      listsHtml =
        calendarBlock(all) +
        recentLogsBlock();
    } else if (session.role === 'photo_editor') {
      var photos = AdminStore.listPhotos();
      var pending = photos.filter(function (p) { return p.status === 'pending'; });
      statsHtml =
        card('Карточки', AdminStore.listPhotographers().length, 'фотографы') +
        card('На модерации', pending.length, 'очередь') +
        card('Опубликовано', AdminStore.publicImages().length, 'одобрено') +
        card('Всего фото', photos.length, 'в стоке');
      listsHtml =
        '<div class="panel"><div class="panel-head"><h2>Разделы фоторедактора</h2></div>' +
        '<p style="display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 16px">' +
        '<a class="btn btn-primary" href="#photographers">Карточки фотографов</a>' +
        '<a class="btn btn-ghost" href="#photo-moderation">Модерация фото</a></p>' +
        '<p class="hint-note">На портал попадают только одобренные снимки.</p></div>';
    } else if (session.role === 'photographer') {
      var mine = AdminStore.listPhotos().filter(function (p) { return p.ownerEmail === session.email; });
      var used = AdminStore.uploadsToday(session.email);
      statsHtml =
        card('Мои фото', mine.length, session.email) +
        card('Сегодня', used + ' / 50', 'лимит загрузок') +
        card('На модерации', mine.filter(function (p) { return p.status === 'pending'; }).length, 'ожидают') +
        card('Опубликовано', mine.filter(function (p) { return p.status === 'approved'; }).length, 'на сайте');
      listsHtml =
        '<div class="panel"><div class="panel-head"><h2>Кабинет фотографа</h2></div>' +
        '<p style="display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 16px">' +
        '<a class="btn btn-primary" href="#my-page">Моя страница</a>' +
        '<a class="btn btn-ghost" href="#upload-photos">Загрузить фото</a></p></div>';
    } else if (session.role === 'librarian') {
      var books = AdminStore.listBooks();
      statsHtml =
        card('Документов', books.length, 'в каталоге') +
        card('Разделы', uniq(books.map(function (b) { return b.section; })).length, 'структура') +
        card('PDF', books.filter(function (b) { return b.format === 'pdf'; }).length, 'формат') +
        card('Доступ', 'полный', 'библиотека');
      listsHtml = '<div class="panel"><div class="panel-head"><h2>Быстрый переход</h2></div><p><a class="btn btn-primary" href="#media">Библиотека</a></p></div>';
    }

    var desk = window.AdminDesk;
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Обзор</h1><p>Материалы портала по разделам.</p></div>' +
      '<div class="topbar-actions">' +
      (AdminAuth.canAccessNav(session, 'publish')
        ? '<a class="btn btn-primary" href="#publish">Опубликовать</a>'
        : '') +
      '</div></div>' +
      (desk
        ? '<div class="desk-grid desk-grid--home">' +
          desk.BLOCKS.map(function (b) {
            var href = b.id === 'photo' ? '#media' : '#' + (b.id === 'article' ? 'articles' : b.id === 'event' ? 'afisha' : b.id) + '/new';
            return (
              '<a class="desk-card" href="' + href + '">' +
              '<strong>' + esc(b.title) + '</strong>' +
              '<span class="desk-where">' + esc(b.where) + '</span></a>'
            );
          }).join('') + '</div>'
        : '') +
      (statsHtml ? '<div class="grid-cards">' + statsHtml + '</div>' : '') +
      listsHtml;

    syncServerPill();
  }

  function card(label, value, hint) {
    return (
      '<div class="stat-card"><div class="label">' + esc(label) + '</div>' +
      '<div class="value">' + esc(String(value)) + '</div>' +
      '<div class="hint">' + esc(hint || '') + '</div></div>'
    );
  }

  function blockList(title, items, linkEdit) {
    var body = !items.length
      ? '<div class="empty">Нет материалов</div>'
      : '<div class="list-stack">' + items.slice(0, 8).map(function (m) {
        var href = linkEdit ? '#editor/' + m.id : '#materials';
        return (
          '<a class="list-item" href="' + href + '"><div><strong>' + esc(m.title) + '</strong>' +
          '<small>' + badgeForStatus(m.status) + ' · ' + esc(fmtDate(m.updatedAt)) + '</small></div></a>'
        );
      }).join('') + '</div>';
    return '<div class="panel"><div class="panel-head"><h2>' + esc(title) + '</h2></div>' + body + '</div>';
  }

  function calendarBlock(all) {
    var upcoming = all
      .filter(function (m) { return m.status === 'scheduled' && m.scheduledAt; })
      .sort(function (a, b) { return String(a.scheduledAt).localeCompare(String(b.scheduledAt)); })
      .slice(0, 10);
    return (
      '<div class="panel"><div class="panel-head"><h2>Календарь публикаций</h2></div>' +
      (!upcoming.length
        ? '<div class="empty">Нет запланированных материалов</div>'
        : '<div class="list-stack">' + upcoming.map(function (m) {
          return '<div class="list-item"><div><strong>' + esc(m.title) + '</strong><small>' +
            esc(AdminStore.rubricTitle(m.rubric)) + ' · выход ' + esc(fmtDate(m.scheduledAt)) +
            '</small></div>' + badgeForStatus(m.status) + '</div>';
        }).join('') + '</div>') +
      '</div>'
    );
  }

  function recentLogsBlock() {
    var logs = AdminAuth.getAuditLog().slice(0, 8);
    return (
      '<div class="panel"><div class="panel-head"><h2>Последние действия</h2><a href="#logs">Весь журнал</a></div>' +
      (!logs.length
        ? '<div class="empty">Журнал пуст</div>'
        : '<div class="list-stack">' + logs.map(function (l) {
          return '<div class="list-item"><div><strong>' + esc(l.action) + '</strong><small>' +
            esc(l.actor) + ' · ' + esc(fmtDate(l.at)) + '<br>' + esc(l.detail) + '</small></div></div>';
        }).join('') + '</div>') +
      '</div>'
    );
  }

  function serverStatsBlock() {
    return '<div class="panel" id="server-stats"><div class="panel-head"><h2>Системная сводка</h2></div><div class="empty">Загрузка с сервера…</div></div>';
  }

  function loadServerStats() {
    var box = document.getElementById('server-stats');
    if (!box) return;
    if (!AdminApi.token()) {
      box.innerHTML = '<div class="panel-head"><h2>Системная сводка</h2></div><div class="empty">Укажите ADMIN_TOKEN в настройках или на экране входа, чтобы читать /api/admin/*.</div>';
      return;
    }
    Promise.all([
      AdminApi.getAdminAnalytics().catch(function (e) { return { error: e.message }; }),
      AdminApi.getArchiveStats().catch(function () { return null; }),
    ]).then(function (pack) {
      var a = pack[0] || {};
      var arch = pack[1] || {};
      box.innerHTML =
        '<div class="panel-head"><h2>Системная сводка</h2></div>' +
        '<div class="grid-cards" style="margin:0">' +
        card('Пользователи app', a.users != null ? a.users : (a.totalUsers != null ? a.totalUsers : '—'), 'analytics') +
        card('События', a.events != null ? a.events : '—', 'за период') +
        card('Архив статей', arch.articles != null ? arch.articles : (arch.total != null ? arch.total : '—'), 'ruscatholic') +
        card('Ошибки API', a.error || 'нет', a.error ? 'проверьте токен' : 'ok') +
        '</div>';
    });
  }

  function uniq(arr) {
    var o = {};
    arr.forEach(function (x) { if (x) o[x] = 1; });
    return Object.keys(o);
  }

  function syncServerPill() {
    var p = document.getElementById('server-pill-2');
    if (!p) return;
    p.textContent = AdminApi.token() ? 'Сайт на связи' : 'Локально';
    p.className = 'server-pill ' + (AdminApi.token() ? 'on' : 'off');
  }

  /* ---------- Materials ---------- */
  function runPagesImport(force) {
    if (!window.AdminImportPages) {
      toast('Модуль импорта страниц не загружен', true);
      return;
    }
    var btn = document.getElementById('btn-import-pages');
    var statusEl = document.getElementById('pages-import-status');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Импорт…';
    }
    if (statusEl) statusEl.textContent = 'Загрузка списка страниц из архива…';
    AdminImportPages.importPagesToDrafts({
      actorEmail: session.email,
      force: !!force,
      onProgress: function (cur, total, title) {
        if (statusEl) {
          statusEl.textContent = 'Черновик ' + cur + ' / ' + total + (title ? ' — ' + title : '');
        }
      },
    })
      .then(function (res) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Импорт WP pages';
        }
        if (res.skipped) {
          if (statusEl) {
            statusEl.textContent =
              'Уже импортировано ранее (' + res.total + '). Можно обновить принудительно.';
          }
          toast('WP pages уже в черновиках: ' + res.total);
        } else {
          if (statusEl) {
            statusEl.textContent =
              'Готово: новых ' + res.imported + ', обновлено ' + res.updated + ' из ' + res.total;
          }
          toast('В черновики: ' + res.total + ' страниц');
          AdminAuth.audit(session.email, 'pages.import_drafts', res.total + ' pages');
        }
        renderMaterials();
      })
      .catch(function (e) {
        console.error(e);
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Импорт WP pages';
        }
        if (statusEl) statusEl.textContent = 'Ошибка импорта: ' + (e.message || e);
        toast('Не удалось импортировать страницы', true);
      });
  }

  function runArchiveDraftsImport(force) {
    if (!window.AdminImportArchiveDrafts) {
      toast('Модуль импорта материалов не загружен', true);
      return;
    }
    var btn = document.getElementById('btn-import-drafts');
    var statusEl = document.getElementById('drafts-import-status');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Импорт…';
    }
    if (statusEl) statusEl.textContent = 'Загрузка особых категорий (нужен сервер с includeHidden)…';
    AdminImportArchiveDrafts.importArchiveDrafts({
      actorEmail: session.email,
      force: !!force,
      onProgress: function (cur, total, title) {
        if (statusEl) {
          statusEl.textContent = 'Категория ' + cur + ' / ' + total + (title ? ' — ' + title : '');
        }
      },
    })
      .then(function (res) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Импорт особых рубрик';
        }
        if (res.skipped) {
          if (statusEl) {
            statusEl.textContent =
              'Уже импортировано ранее (' + res.total + '). Можно обновить принудительно.';
          }
          toast('Материалы уже в черновиках: ' + res.total);
        } else {
          if (statusEl) {
            statusEl.textContent =
              'Готово: новых ' + res.imported + ', обновлено ' + res.updated + ' · всего ' + res.total;
          }
          toast('В черновики «Материалы»: ' + res.total);
          AdminAuth.audit(session.email, 'materials.import_archive_drafts', res.total + ' items');
        }
        renderMaterials();
      })
      .catch(function (e) {
        console.error(e);
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Импорт особых рубрик';
        }
        if (statusEl) statusEl.textContent = 'Ошибка: ' + (e.message || e);
        toast('Не удалось импортировать материалы', true);
      });
  }

  function renderMaterials() {
    var mats = AdminStore.visibleMaterials(session);
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Архив</h1><p>Черновики и импортированные материалы.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-primary" href="#dashboard">К обзору</a>' +
      '</div></div>' +
      '<div class="panel">' +
      '<div class="filters" id="filters">' +
      '<input class="input" id="f-q" placeholder="Поиск по заголовку и тексту" />' +
      '<select class="select" id="f-rubric"><option value="">Все рубрики</option>' +
      AdminStore.RUBRICS.map(function (r) {
        return '<option value="' + r.id + '">' + esc(r.title) + '</option>';
      }).join('') +
      '</select>' +
      '<select class="select" id="f-status"><option value="">Все статусы</option>' +
      AdminStore.STATUSES.map(function (s) {
        return '<option value="' + s.id + '">' + esc(s.title) + '</option>';
      }).join('') +
      '</select>' +
      '<input class="input" id="f-author" placeholder="Автор" />' +
      '<input class="input" id="f-from" type="date" />' +
      '</div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      (role.canModerate ? '<th><input type="checkbox" id="check-all" /></th>' : '<th></th>') +
      '<th>Заголовок</th><th>Автор</th><th>Рубрика</th><th>Статус</th><th>Изменён</th><th>Действия</th>' +
      '</tr></thead><tbody id="mat-body"></tbody></table></div></div>';

    ['f-q', 'f-rubric', 'f-status', 'f-author', 'f-from'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () { paintMaterialsTable(mats); });
      document.getElementById(id).addEventListener('change', function () { paintMaterialsTable(mats); });
    });
    paintMaterialsTable(mats);
  }

  function paintMaterialsTable(source) {
    var q = (document.getElementById('f-q').value || '').toLowerCase();
    var rubric = document.getElementById('f-rubric').value;
    var status = document.getElementById('f-status').value;
    var author = (document.getElementById('f-author').value || '').toLowerCase();
    var from = document.getElementById('f-from').value;
    var rows = source.filter(function (m) {
      if (rubric && m.rubric !== rubric) return false;
      if (status && m.status !== status) return false;
      if (author && String(m.authorName || '').toLowerCase().indexOf(author) === -1) return false;
      if (from && String(m.updatedAt || '').slice(0, 10) < from) return false;
      if (q) {
        var hay = (m.title + ' ' + (m.body || '') + ' ' + (m.excerpt || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var body = document.getElementById('mat-body');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7"><div class="empty">Ничего не найдено</div></td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (m) {
      return (
        '<tr data-id="' + esc(m.id) + '">' +
        '<td>' + (role.canModerate ? '<input type="checkbox" class="row-check" />' : '') + '</td>' +
        '<td><a class="title-link" href="#editor/' + esc(m.id) + '">' + esc(m.title || 'Без названия') + '</a></td>' +
        '<td>' + esc(m.authorName || '—') + '</td>' +
        '<td>' + esc(AdminStore.rubricTitle(m.rubric)) + '</td>' +
        '<td>' + badgeForStatus(m.status) + '</td>' +
        '<td>' + esc(fmtDate(m.updatedAt)) + '</td>' +
        '<td><div class="row-actions">' + actionsFor(m) + '</div></td></tr>'
      );
    }).join('');

    body.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleMaterialAction(btn.getAttribute('data-act'), btn.getAttribute('data-id'));
      });
    });
  }

  function actionsFor(m) {
    var id = m.id;
    var html = '<a class="icon-btn" title="Редактировать" href="#editor/' + esc(id) + '">✎</a>';
    html += '<button type="button" class="icon-btn" title="Предпросмотр" data-act="preview" data-id="' + esc(id) + '">◉</button>';
    if (!role.canPublish && m.status === 'draft') {
      html += '<button type="button" class="icon-btn" title="На модерацию" data-act="review" data-id="' + esc(id) + '">↑</button>';
    }
    if (role.canModerate && (m.status === 'review' || m.status === 'draft')) {
      html += '<button type="button" class="icon-btn" title="Опубликовать" data-act="publish" data-id="' + esc(id) + '">✓</button>';
      html += '<button type="button" class="icon-btn" title="На доработку" data-act="rework" data-id="' + esc(id) + '">↺</button>';
    }
    if (role.canPublish && m.status === 'published') {
      html += '<button type="button" class="icon-btn" title="Снять" data-act="unpublish" data-id="' + esc(id) + '">⏸</button>';
    }
    html += '<button type="button" class="icon-btn" title="В корзину" data-act="trash" data-id="' + esc(id) + '">🗑</button>';
    return html;
  }

  function handleMaterialAction(act, id) {
    var m = AdminStore.getMaterial(id);
    if (!m) return;
    if (act === 'preview') {
      alert((m.title || '') + '\n\n' + String(m.body || '').replace(/<[^>]+>/g, ' ').slice(0, 800));
      return;
    }
    if (act === 'review') {
      AdminStore.setStatus(id, 'review', session.email);
      toast('Отправлено на модерацию');
    } else if (act === 'publish') {
      if (m.rubric === 'pages' || m.kind === 'page') {
        toast('Архивные страницы не публикуются. Откройте раздел «Страницы».', true);
        if (confirm('Открыть раздел редакционных страниц?')) go('pages');
        return;
      }
      if (m.rubric === 'materials' || m.kind === 'archive-draft') {
        toast('Особые рубрики архива — только черновики редакции', true);
        return;
      }
      AdminStore.setStatus(id, 'published', session.email);
      toast('Опубликовано');
      maybePushToServer(AdminStore.getMaterial(id));
    } else if (act === 'rework') {
      var note = prompt('Комментарий автору', m.editorNote || '');
      if (note == null) return;
      AdminStore.setStatus(id, 'rework', session.email, note);
      toast('Возвращено на доработку');
    } else if (act === 'unpublish') {
      AdminStore.setStatus(id, 'unpublished', session.email);
      toast('Снято с публикации');
    } else if (act === 'trash') {
      if (!confirm('Удалить в корзину?')) return;
      AdminStore.trashMaterial(id, session.email);
      toast('В корзине');
    }
    render();
  }

  function createMaterial() {
    var mat = AdminStore.upsertMaterial({
      id: AdminStore.uid('mat'),
      title: 'Новый материал',
      authorEmail: session.email,
      authorName: session.name,
      rubric: (session.rubrics && session.rubrics[0]) || 'columns',
      status: 'draft',
      excerpt: '',
      body: '<p></p>',
      cover: '',
      scheduledAt: '',
      editorNote: '',
      tags: [],
    }, session.email);
    go('editor', mat.id);
  }

  function maybePushToServer(mat) {
    if (!AdminApi.token() || !mat) return;
    if (mat.rubric === 'pages' || mat.kind === 'page') {
      toast('Архивные страницы не публикуются на портал — используйте раздел «Страницы»');
      return;
    }
    if (mat.rubric === 'materials' || mat.kind === 'archive-draft') {
      toast('Особые рубрики архива не пушим на портал — только черновик');
      return;
    }
    if (mat.rubric === 'news') {
      AdminApi.createNews({
        title: mat.title,
        content: mat.body,
        excerpt: mat.excerpt,
        image: mat.cover || undefined,
        date: new Date().toISOString(),
      }).then(function () {
        toast('Отправлено в /api/admin/news');
        AdminAuth.audit(session.email, 'material.server_publish', mat.title);
      }).catch(function (e) {
        toast('Сервер: ' + e.message);
      });
      return;
    }
    AdminApi.upsertArchive({
      articles: [{
        slug: mat.id,
        title: mat.title,
        contentHtml: mat.body,
        excerpt: mat.excerpt,
        categories: [mat.rubric],
        date: new Date().toISOString(),
        author: mat.authorName,
      }],
    }).then(function () {
      toast('Upsert в архив отправлен');
      AdminAuth.audit(session.email, 'material.archive_upsert', mat.title);
    }).catch(function (e) {
      toast('Архив API: ' + e.message);
    });
  }

  /* ---------- Editor + autosave ---------- */
  function renderEditor(id) {
    var mat = AdminStore.getMaterial(id);
    if (!mat) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Материал не найден. <a href="#materials">Назад</a></div></div>';
      return;
    }
    if (session.role === 'author' && mat.authorEmail !== session.email) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа к чужому материалу.</div></div>';
      return;
    }

    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Редактор</h1><p>Черновик сохраняется автоматически.</p></div>' +
      '<div class="topbar-actions">' +
      '<span class="autosave" id="autosave-state">Ожидание изменений</span>' +
      '<a class="btn btn-ghost" href="#materials">Назад</a>' +
      '<button type="button" class="btn btn-primary" id="btn-save">Сохранить</button>' +
      '</div></div>' +
      ((mat.rubric === 'pages' || mat.kind === 'page')
        ? '<div class="panel notice-panel"><p class="empty" style="padding:0">Архивная страница. Для публикации на портале откройте раздел <a href="#pages">Страницы</a>.</p></div>'
        : '') +
      '<div class="editor-layout">' +
      '<div class="editor-main">' +
      '<div class="panel"><input class="editor-title" id="ed-title" value="' + esc(mat.title) + '" /></div>' +
      '<div class="panel"><label class="field"><span style="font-size:12px;font-weight:700;color:var(--stone-500)">Лид / анонс</span>' +
      '<textarea class="textarea" id="ed-excerpt" style="min-height:72px">' + esc(mat.excerpt || '') + '</textarea></label></div>' +
      '<div class="panel"><label class="field"><span style="font-size:12px;font-weight:700;color:var(--stone-500)">Текст (HTML)</span>' +
      '<textarea class="textarea" id="ed-body" style="min-height:360px">' + esc(mat.body || '') + '</textarea></label></div>' +
      (mat.editorNote ? '<div class="panel"><strong>Комментарий редактора</strong><p>' + esc(mat.editorNote) + '</p></div>' : '') +
      '</div>' +
      '<aside class="editor-side">' +
      '<div class="panel">' +
      '<div class="field"><label>Рубрика</label><select class="select" id="ed-rubric">' +
      AdminStore.RUBRICS.map(function (r) {
        return '<option value="' + r.id + '"' + (r.id === mat.rubric ? ' selected' : '') + '>' + esc(r.title) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>Статус</label><select class="select" id="ed-status"' + (!role.canModerate && !role.canPublish ? ' disabled' : '') + '>' +
      AdminStore.STATUSES.map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === mat.status ? ' selected' : '') + '>' + esc(s.title) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>Дата публикации</label><input class="input" id="ed-sched" type="datetime-local" value="' + esc(toLocalInput(mat.scheduledAt)) + '" /></div>' +
      '<div class="field"><label>Обложка</label><input class="input" id="ed-cover" value="' + esc(mat.cover || '') + '" /></div>' +
      '<div class="field"><label>Теги</label><input class="input" id="ed-tags" value="' + esc((mat.tags || []).join(', ')) + '" /></div>' +
      '</div>' +
      '<div class="panel"><button type="button" class="btn btn-ghost btn-block" id="btn-send-review">На модерацию</button>' +
      (role.canPublish ? '<button type="button" class="btn btn-primary btn-block" id="btn-publish" style="margin-top:8px">Опубликовать</button>' : '') +
      '</div></aside></div>';

    function collect() {
      return Object.assign({}, mat, {
        title: document.getElementById('ed-title').value.trim() || 'Без названия',
        excerpt: document.getElementById('ed-excerpt').value,
        body: document.getElementById('ed-body').value,
        rubric: document.getElementById('ed-rubric').value,
        status: document.getElementById('ed-status').value,
        scheduledAt: fromLocalInput(document.getElementById('ed-sched').value),
        cover: document.getElementById('ed-cover').value.trim(),
        tags: document.getElementById('ed-tags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      });
    }

    function save(silent) {
      mat = AdminStore.upsertMaterial(collect(), session.email);
      editorDirty = false;
      var st = document.getElementById('autosave-state');
      if (st) {
        st.textContent = 'Сохранено ' + new Date().toLocaleTimeString('ru-RU');
        st.className = 'autosave ok';
      }
      if (!silent) toast('Сохранено');
    }

    ['ed-title', 'ed-excerpt', 'ed-body', 'ed-rubric', 'ed-status', 'ed-sched', 'ed-cover', 'ed-tags'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        editorDirty = true;
        var st = document.getElementById('autosave-state');
        if (st) {
          st.textContent = 'Есть несохранённые изменения';
          st.className = 'autosave';
        }
      });
    });

    document.getElementById('btn-save').onclick = function () { save(false); };
    document.getElementById('btn-send-review').onclick = function () {
      document.getElementById('ed-status').value = 'review';
      save(true);
      toast('Отправлено на модерацию');
    };
    var pub = document.getElementById('btn-publish');
    if (pub) {
      pub.onclick = function () {
        if (mat.rubric === 'pages' || mat.kind === 'page') {
          toast('Архивные страницы не публикуются. Откройте раздел «Страницы».', true);
          return;
        }
        document.getElementById('ed-status').value = 'published';
        save(true);
        maybePushToServer(mat);
      };
    }

    clearInterval(autosaveTimer);
    autosaveTimer = setInterval(function () {
      if (editorDirty && route().name === 'editor') save(true);
    }, (AdminConfig && AdminConfig.AUTOSAVE_MS) || 30000);
  }

  function toLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fromLocalInput(v) {
    if (!v) return '';
    var d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Pages (editorial) ---------- */
  function createPage() {
    var page = AdminStore.upsertPage({
      id: AdminStore.uid('pg'),
      title: 'Новая страница',
      slug: 'novaya-stranitsa',
      type: 'other',
      cover: '',
      hideCoverOnPage: false,
      body: '<p></p>',
      cycleMaterials: [],
      status: 'draft',
      scheduledAt: '',
      seoTitle: '',
      seoDescription: '',
      createdByEmail: session.email,
      createdByName: session.name,
    }, session.email);
    go('page-editor', page.id);
  }

  function renderPages() {
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Страницы</h1><p>Статические страницы портала.</p></div>' +
      '<div class="topbar-actions"><button type="button" class="btn btn-primary" id="btn-new-page">Создать страницу</button></div></div>' +
      '<div class="panel">' +
      '<div class="filters filters-2">' +
      '<input class="input" id="pg-q" placeholder="Поиск по названию" />' +
      '<select class="select" id="pg-type"><option value="">Все типы</option>' +
      AdminStore.PAGE_TYPES.map(function (t) {
        return '<option value="' + t.id + '">' + esc(t.title) + '</option>';
      }).join('') +
      '</select>' +
      '<select class="select" id="pg-status"><option value="">Все статусы</option>' +
      AdminStore.PAGE_STATUSES.map(function (s) {
        return '<option value="' + s.id + '">' + esc(s.title) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Название</th><th>Тип</th><th>Кем создана</th><th>Статус</th><th>Дата</th><th>Действия</th>' +
      '</tr></thead><tbody id="pages-body"></tbody></table></div></div>';

    document.getElementById('btn-new-page').onclick = function () { createPage(); };
    ['pg-q', 'pg-type', 'pg-status'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', paintPagesTable);
      document.getElementById(id).addEventListener('change', paintPagesTable);
    });
    paintPagesTable();
  }

  function paintPagesTable() {
    var q = (document.getElementById('pg-q').value || '').toLowerCase();
    var type = document.getElementById('pg-type').value;
    var status = document.getElementById('pg-status').value;
    var rows = AdminStore.listPages()
      .slice()
      .sort(function (a, b) {
        return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
      })
      .filter(function (p) {
        if (type && p.type !== type) return false;
        if (status && p.status !== status) return false;
        if (q && String(p.title || '').toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
    var body = document.getElementById('pages-body');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="empty">Страниц нет</div></td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (p) {
      return (
        '<tr>' +
        '<td><a class="title-link" href="#page-editor/' + esc(p.id) + '">' + esc(p.title || 'Без названия') + '</a>' +
        '<div class="cell-meta">' + esc(p.slug || '') + '</div></td>' +
        '<td>' + esc(AdminStore.pageTypeTitle(p.type)) + '</td>' +
        '<td>' + esc(p.createdByName || p.createdByEmail || '—') + '</td>' +
        '<td>' + badgeForPageStatus(p.status) + '</td>' +
        '<td>' + esc(fmtDate(p.updatedAt || p.createdAt)) + '</td>' +
        '<td><div class="row-actions">' +
        '<a class="icon-btn" title="Редактировать" href="#page-editor/' + esc(p.id) + '">✎</a>' +
        '<button type="button" class="icon-btn" title="Удалить" data-pg-del="' + esc(p.id) + '">🗑</button>' +
        '</div></td></tr>'
      );
    }).join('');

    body.querySelectorAll('[data-pg-del]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('Удалить страницу?')) return;
        AdminStore.deletePage(btn.getAttribute('data-pg-del'), session.email);
        toast('Страница удалена');
        paintPagesTable();
      };
    });
  }

  function renderPageEditor(id) {
    var page = AdminStore.getPage(id);
    if (!page) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Страница не найдена. <a href="#pages">Назад</a></div></div>';
      return;
    }

    var slugLocked = false;

    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Страница</h1><p>Текст, обложка и публикация.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="#pages">Назад</a>' +
      '<button type="button" class="btn btn-ghost" id="pg-view">Смотреть на сайте</button>' +
      '<button type="button" class="btn btn-ghost" id="pg-draft">Сохранить черновик</button>' +
      '<button type="button" class="btn btn-primary" id="pg-publish">Опубликовать</button>' +
      '</div></div>' +
      '<div class="editor-layout">' +
      '<div class="editor-main">' +
      '<div class="panel">' +
      '<div class="field"><label>Название</label><input class="editor-title" id="pg-title" value="' + esc(page.title) + '" /></div>' +
      '<div class="field"><label>Slug</label><input class="input" id="pg-slug" value="' + esc(page.slug || '') + '" /></div>' +
      '</div>' +
      '<div class="panel">' +
      '<div class="toolbar" id="pg-toolbar">' +
      '<button type="button" class="btn btn-ghost" data-tb="bold"><b>B</b> Жирный</button>' +
      '<button type="button" class="btn btn-ghost" data-tb="quote">«» Цитата</button>' +
      '<button type="button" class="btn btn-ghost" data-tb="image">🖼 Картинка URL</button>' +
      '<button type="button" class="btn btn-ghost" data-tb="embed">&lt;/&gt; Embed</button>' +
      '<button type="button" class="btn btn-ghost" data-tb="preview">◉ Ссылка предпросмотра</button>' +
      '</div>' +
      '<div class="field"><label>Текст</label>' +
      '<textarea class="textarea" id="pg-body" style="min-height:360px">' + esc(page.body || '') + '</textarea></div>' +
      '</div>' +
      '<div class="panel" id="cycle-panel"' + (page.type === 'cycle' ? '' : ' hidden') + '>' +
      '<div class="panel-head"><h2>Материалы цикла</h2>' +
      '<button type="button" class="btn btn-ghost" id="cycle-add">Добавить</button></div>' +
      '<div id="cycle-rows"></div>' +
      '</div>' +
      '</div>' +
      '<aside class="editor-side">' +
      '<div class="panel">' +
      '<div class="field"><label>Тип</label><select class="select" id="pg-type">' +
      AdminStore.PAGE_TYPES.map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === page.type ? ' selected' : '') + '>' + esc(t.title) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>Статус</label><select class="select" id="pg-status">' +
      AdminStore.PAGE_STATUSES.map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === page.status ? ' selected' : '') + '>' + esc(s.title) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label>Расписание публикации</label>' +
      '<input class="input" id="pg-sched" type="datetime-local" value="' + esc(toLocalInput(page.scheduledAt)) + '" /></div>' +
      '<div class="field"><label>Обложка (файл)</label>' +
      '<input class="input" id="pg-cover-file" type="file" accept="image/*" />' +
      (page.cover ? '<div class="cover-preview" style="background-image:url(\'' + esc(page.cover).replace(/'/g, '%27') + '\')"></div>' : '') +
      '<input type="hidden" id="pg-cover" value="' + esc(page.cover || '') + '" />' +
      '</div>' +
      '<label class="check-row"><input type="checkbox" id="pg-hide-cover"' + (page.hideCoverOnPage ? ' checked' : '') + ' /> Не отображать на странице</label>' +
      '</div>' +
      '<div class="panel">' +
      '<div class="panel-head"><h2>SEO</h2></div>' +
      '<div class="field"><label>SEO title</label><input class="input" id="pg-seo-title" value="' + esc(page.seoTitle || '') + '" placeholder="из названия" /></div>' +
      '<div class="field"><label>SEO description</label><textarea class="textarea" id="pg-seo-desc" style="min-height:72px" placeholder="из текста">' + esc(page.seoDescription || '') + '</textarea></div>' +
      '<p class="cell-meta">URL: <code id="pg-url-preview">' + esc(portalPageUrl(page.slug)) + '</code></p>' +
      '</div>' +
      '<div class="panel">' +
      '<p class="cell-meta">Автор: ' + esc(page.createdByName || page.createdByEmail || '—') + '</p>' +
      '<p class="cell-meta">Создана: ' + esc(fmtDate(page.createdAt)) + '</p>' +
      '<p class="cell-meta">Изменена: ' + esc(fmtDate(page.updatedAt)) + '</p>' +
      '</div>' +
      '</aside></div>';

    function paintCycleRows() {
      var box = document.getElementById('cycle-rows');
      if (!box) return;
      var rows = page.cycleMaterials || [];
      if (!rows.length) {
        box.innerHTML = '<div class="empty">Нет материалов цикла</div>';
        return;
      }
      box.innerHTML = '<div class="cycle-list">' + rows.map(function (row, idx) {
        return (
          '<div class="cycle-row" data-idx="' + idx + '">' +
          '<input class="input" data-f="order" type="number" value="' + esc(row.order != null ? row.order : idx + 1) + '" title="Порядок" />' +
          '<input class="input" data-f="href" value="' + esc(row.href || '') + '" placeholder="href / article.html?slug=…" />' +
          '<button type="button" class="btn btn-danger" data-cycle-del="' + idx + '">Удалить</button>' +
          '</div>'
        );
      }).join('') + '</div>';

      box.querySelectorAll('[data-cycle-del]').forEach(function (btn) {
        btn.onclick = function () {
          var i = Number(btn.getAttribute('data-cycle-del'));
          page.cycleMaterials.splice(i, 1);
          paintCycleRows();
        };
      });
      box.querySelectorAll('.cycle-row').forEach(function (rowEl) {
        rowEl.querySelectorAll('input').forEach(function (inp) {
          inp.addEventListener('change', function () {
            var i = Number(rowEl.getAttribute('data-idx'));
            var f = inp.getAttribute('data-f');
            if (f === 'order') page.cycleMaterials[i].order = Number(inp.value) || 0;
            else page.cycleMaterials[i].href = inp.value.trim();
          });
        });
      });
    }

    function collectCycleFromDom() {
      var rows = [];
      document.querySelectorAll('#cycle-rows .cycle-row').forEach(function (rowEl) {
        rows.push({
          order: Number(rowEl.querySelector('[data-f="order"]').value) || 0,
          href: rowEl.querySelector('[data-f="href"]').value.trim(),
        });
      });
      rows.sort(function (a, b) { return a.order - b.order; });
      return rows;
    }

    function collect() {
      var title = document.getElementById('pg-title').value.trim() || 'Без названия';
      var slug = document.getElementById('pg-slug').value.trim() || AdminStore.slugify(title);
      var body = document.getElementById('pg-body').value;
      var seoTitle = document.getElementById('pg-seo-title').value.trim();
      var seoDesc = document.getElementById('pg-seo-desc').value.trim();
      if (!seoTitle) seoTitle = title;
      if (!seoDesc) {
        seoDesc = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      }
      var type = document.getElementById('pg-type').value;
      var status = document.getElementById('pg-status').value;
      var scheduledAt = fromLocalInput(document.getElementById('pg-sched').value);
      if (scheduledAt && status === 'draft') status = 'scheduled';
      return Object.assign({}, page, {
        title: title,
        slug: slug,
        type: type,
        body: body,
        cover: document.getElementById('pg-cover').value,
        hideCoverOnPage: document.getElementById('pg-hide-cover').checked,
        cycleMaterials: type === 'cycle' ? collectCycleFromDom() : (page.cycleMaterials || []),
        status: status,
        scheduledAt: scheduledAt,
        seoTitle: seoTitle,
        seoDescription: seoDesc,
      });
    }

    function save(statusOverride, silent) {
      var data = collect();
      if (statusOverride) data.status = statusOverride;
      if (data.status === 'published' && data.scheduledAt) {
        var when = new Date(data.scheduledAt);
        if (!isNaN(when.getTime()) && when.getTime() > Date.now()) {
          data.status = 'scheduled';
        }
      }
      page = AdminStore.upsertPage(data, session.email);
      document.getElementById('pg-seo-title').value = page.seoTitle || '';
      document.getElementById('pg-seo-desc').value = page.seoDescription || '';
      document.getElementById('pg-status').value = page.status;
      document.getElementById('pg-url-preview').textContent = portalPageUrl(page.slug);
      if (!silent) toast(page.status === 'published' ? 'Опубликовано' : page.status === 'scheduled' ? 'Запланировано' : 'Черновик сохранён');
    }

    document.getElementById('pg-title').addEventListener('input', function () {
      if (slugLocked) return;
      var slugEl = document.getElementById('pg-slug');
      slugEl.value = AdminStore.slugify(document.getElementById('pg-title').value);
      document.getElementById('pg-url-preview').textContent = portalPageUrl(slugEl.value);
    });
    document.getElementById('pg-slug').addEventListener('input', function () {
      slugLocked = true;
      document.getElementById('pg-url-preview').textContent = portalPageUrl(document.getElementById('pg-slug').value);
    });
    document.getElementById('pg-type').addEventListener('change', function () {
      var panel = document.getElementById('cycle-panel');
      if (document.getElementById('pg-type').value === 'cycle') {
        panel.hidden = false;
        if (!(page.cycleMaterials && page.cycleMaterials.length)) page.cycleMaterials = [];
        paintCycleRows();
      } else {
        panel.hidden = true;
      }
    });

    document.getElementById('pg-cover-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      readFileAsDataUrl(file).then(function (url) {
        document.getElementById('pg-cover').value = url;
        toast('Обложка загружена (data URL)');
        var side = document.getElementById('pg-cover').closest('.panel');
        var prev = side.querySelector('.cover-preview');
        if (!prev) {
          prev = document.createElement('div');
          prev.className = 'cover-preview';
          document.getElementById('pg-cover-file').insertAdjacentElement('afterend', prev);
        }
        prev.style.backgroundImage = "url('" + String(url).replace(/'/g, '%27') + "')";
      }).catch(function () { toast('Не удалось прочитать файл', true); });
    });

    document.getElementById('cycle-add').onclick = function () {
      page.cycleMaterials = collectCycleFromDom();
      page.cycleMaterials.push({ href: '', order: page.cycleMaterials.length + 1 });
      paintCycleRows();
    };

    document.querySelectorAll('#pg-toolbar [data-tb]').forEach(function (btn) {
      btn.onclick = function () {
        var ta = document.getElementById('pg-body');
        var start = ta.selectionStart;
        var end = ta.selectionEnd;
        var selected = ta.value.slice(start, end);
        var act = btn.getAttribute('data-tb');
        var insert = '';
        if (act === 'bold') {
          insert = '<strong>' + (selected || 'текст') + '</strong>';
        } else if (act === 'quote') {
          insert = '<blockquote>' + (selected || 'цитата') + '</blockquote>';
        } else if (act === 'image') {
          var imgUrl = prompt('URL изображения', 'https://');
          if (!imgUrl) return;
          insert = '<p><img src="' + imgUrl + '" alt="" /></p>';
        } else if (act === 'embed') {
          var code = prompt('Код embed (iframe / HTML)', '<iframe src=""></iframe>');
          if (code == null) return;
          insert = '\n' + code + '\n';
        } else if (act === 'preview') {
          var slug = document.getElementById('pg-slug').value || AdminStore.slugify(document.getElementById('pg-title').value);
          var link = portalPageUrl(slug);
          insert = '<p><a href="' + link + '">Предпросмотр публикации</a></p>';
        }
        ta.value = ta.value.slice(0, start) + insert + ta.value.slice(end);
        ta.focus();
      };
    });

    document.getElementById('pg-draft').onclick = function () { save('draft', false); };
    document.getElementById('pg-publish').onclick = function () { save('published', false); };
    document.getElementById('pg-view').onclick = function () {
      save(null, true);
      window.open(portalPageUrl(page.slug), '_blank');
    };

    paintCycleRows();
  }

  /* ---------- Media library ---------- */
  function canEditMediaItem(item) {
    if (!item) return false;
    if (role.photostockFull || role.canModerateMedia || session.role === 'super' || session.role === 'chief') return true;
    if (item.kind === 'document' && role.canManageDocs) return true;
    if (item.kind === 'image' && item.ownerEmail === session.email) return true;
    return false;
  }

  function canSeeDocuments() {
    return session.role === 'librarian';
  }

  function canSeeImages() {
    return session.role !== 'librarian' || role.canManageDocs;
  }

  function renderMedia() {
    if (session.role === 'librarian') mediaTab = 'documents';
    else if (session.role === 'photographer' || session.role === 'photo_editor') mediaTab = mediaTab === 'documents' && !canSeeDocuments() ? 'images' : mediaTab;

    var showImages = canSeeImages();
    var showDocs = canSeeDocuments();
    if (!showImages && showDocs) mediaTab = 'documents';
    if (showImages && !showDocs) mediaTab = 'images';

    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Фотосток</h1><p>Снимки, опубликованные в разделе «Фото».</p></div>' +
      '<div class="topbar-actions">' +
      (mediaTab === 'images'
        ? '<button type="button" class="btn btn-primary" id="btn-add-image">Добавить изображение</button>'
        : '<button type="button" class="btn btn-primary" id="btn-add-doc">Добавить документ</button>') +
      '</div></div>' +
      '<div class="tabs" id="media-tabs">' +
      (showImages ? '<button type="button" class="tab' + (mediaTab === 'images' ? ' active' : '') + '" data-tab="images">Фотосток</button>' : '') +
      (showDocs ? '<button type="button" class="tab' + (mediaTab === 'documents' ? ' active' : '') + '" data-tab="documents">Документы</button>' : '') +
      '</div>' +
      (mediaTab === 'images'
        ? '<p class="hint-note">На портал попадают только одобренные снимки.</p>'
        : '<p class="hint-note">Каталог документов библиотеки.</p>') +
      '<div class="panel" id="media-panel"></div>';

    document.querySelectorAll('#media-tabs [data-tab]').forEach(function (btn) {
      btn.onclick = function () {
        mediaTab = btn.getAttribute('data-tab');
        renderMedia();
      };
    });

    if (mediaTab === 'images') {
      if (window.AdminDesk) AdminDesk.loadSeed(function () { paintMediaImages(); });
      else paintMediaImages();
    } else paintMediaDocuments();
  }

  function paintMediaImages() {
    var panel = document.getElementById('media-panel');
    var photos = window.AdminDesk ? AdminDesk.allPhotos() : AdminStore.listPhotos();
    function srcOf(p) {
      return window.AdminDesk ? AdminDesk.mediaSrc(p.url || p.thumb) : (p.url || '');
    }
    var pendingCount = photos.filter(function (p) { return p.status === 'pending'; }).length;

    panel.innerHTML =
      '<div class="filters filters-2">' +
      '<input class="input" id="media-q" placeholder="Поиск по названию и тегам" />' +
      '<select class="select" id="media-filter">' +
      '<option value="all">Все</option>' +
      '<option value="mine">Мои</option>' +
      '<option value="pending">На модерации (' + pendingCount + ')</option>' +
      '<option value="approved">Одобренные</option>' +
      '<option value="rejected">Отклонённые</option>' +
      '</select></div>' +
      '<div class="photo-grid" id="photo-grid"></div>';

    var addBtn = document.getElementById('btn-add-image');
    if (addBtn) addBtn.onclick = function () { openAddImageDialog(); };

    function paint() {
      var q = (document.getElementById('media-q').value || '').toLowerCase();
      var filter = document.getElementById('media-filter').value;
      var rows = photos.filter(function (p) {
        if (filter === 'mine' && p.ownerEmail !== session.email) return false;
        if (filter === 'pending' && p.status !== 'pending') return false;
        if (filter === 'approved' && p.status !== 'approved') return false;
        if (filter === 'rejected' && p.status !== 'rejected') return false;
        if (role.photostockOwnOnly && !role.photostockFull && p.ownerEmail !== session.email && filter !== 'all') {
          /* photographer can browse all but edit own — keep list visible */
        }
        if (q) {
          var hay = (p.title + ' ' + (p.tags || []).join(' ') + ' ' + (p.ownerName || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      var grid = document.getElementById('photo-grid');
      grid.innerHTML = rows.map(function (p) {
        var canEdit = canEditMediaItem(p);
        var canModerate = role.canModerateMedia || role.photostockFull;
        return (
          '<article class="photo-card" data-id="' + esc(p.id) + '">' +
          '<div class="ph"' + (srcOf(p) ? ' style="background-image:url(\'' + esc(srcOf(p)).replace(/'/g, '%27') + '\')"' : '') + '></div>' +
          '<div class="in"><strong>' + esc(p.title) + '</strong>' +
          '<div class="tags">' + esc((p.tags || []).join(', ') || 'без тегов') + '</div>' +
          '<small style="color:var(--stone-500)">Кто добавил: ' + esc(p.ownerName || p.ownerEmail || '—') + '</small>' +
          '<div>' + badgeForMediaStatus(p.status || 'approved') + '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' +
          (canEdit || canModerate ? '<button type="button" class="btn btn-ghost" data-ph="tags">Теги</button>' : '') +
          (canEdit ? '<button type="button" class="btn btn-ghost" data-ph="url">URL / файл</button>' : '') +
          (canModerate && p.status === 'pending' ? '<button type="button" class="btn btn-primary" data-ph="approve">Одобрить</button>' : '') +
          (canModerate && p.status === 'pending' ? '<button type="button" class="btn btn-danger" data-ph="reject">Отклонить</button>' : '') +
          ((canModerate || (canEdit && p.ownerEmail === session.email)) ? '<button type="button" class="btn btn-danger" data-ph="del">Удалить</button>' : '') +
          '</div></div></article>'
        );
      }).join('') || '<div class="empty">Нет изображений</div>';

      grid.querySelectorAll('[data-ph]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var card = btn.closest('.photo-card');
          var id = card.getAttribute('data-id');
          var item = AdminStore.getMedia(id);
          if (!item) return;
          var act = btn.getAttribute('data-ph');
          if (act === 'tags') {
            if (!(canEditMediaItem(item) || role.canModerateMedia || role.photostockFull)) return;
            var tags = prompt('Теги через запятую', (item.tags || []).join(', '));
            if (tags == null) return;
            item.tags = tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
            AdminStore.upsertMedia(item, session.email);
            toast('Теги обновлены');
            photos = AdminStore.listPhotos();
            paint();
          } else if (act === 'url') {
            if (!canEditMediaItem(item)) return;
            pickMediaSource(item);
          } else if (act === 'approve') {
            item.status = 'approved';
            AdminStore.upsertMedia(item, session.email);
            toast('Одобрено');
            photos = AdminStore.listPhotos();
            paint();
          } else if (act === 'reject') {
            item.status = 'rejected';
            AdminStore.upsertMedia(item, session.email);
            toast('Отклонено');
            photos = AdminStore.listPhotos();
            paint();
          } else if (act === 'del') {
            var mayDel = role.canModerateMedia || role.photostockFull || item.ownerEmail === session.email;
            if (!mayDel) return;
            if (!confirm('Удалить файл?')) return;
            AdminStore.deleteMedia(id, session.email);
            toast('Удалено');
            photos = AdminStore.listPhotos();
            paint();
          }
        });
      });
    }

    document.getElementById('media-q').addEventListener('input', paint);
    document.getElementById('media-filter').addEventListener('change', paint);
    paint();
  }

  function openAddImageDialog() {
    var title = prompt('Название фото', 'Новое фото');
    if (!title) return;
    var isPhotographer = session.role === 'photographer';
    var item = {
      id: AdminStore.uid('media'),
      kind: 'image',
      title: title,
      url: '',
      ownerEmail: session.email,
      ownerName: session.name,
      status: isPhotographer ? 'pending' : 'approved',
      tags: [],
      format: '',
      section: '',
    };
    AdminStore.upsertMedia(item, session.email);
    toast(isPhotographer ? 'Добавлено в очередь модерации' : 'Изображение добавлено');
    pickMediaSource(AdminStore.getMedia(item.id), true);
  }

  function pickMediaSource(item, afterAdd) {
    var mode = prompt('Источник: 1 — внешний URL, 2 — файл с компьютера', '1');
    if (mode == null) {
      if (afterAdd) renderMedia();
      return;
    }
    if (String(mode).trim() === '2') {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = item.kind === 'document'
        ? '.pdf,.fb2,.doc,.docx,application/pdf,application/msword,*/*'
        : 'image/*';
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) return;
        readFileAsDataUrl(file).then(function (url) {
          item.url = url;
          if (item.kind === 'document' && !item.format) {
            var name = (file.name || '').toLowerCase();
            if (name.indexOf('.pdf') !== -1) item.format = 'pdf';
            else if (name.indexOf('.fb2') !== -1) item.format = 'fb2';
            else if (name.indexOf('.doc') !== -1) item.format = 'doc';
            else item.format = 'other';
          }
          AdminStore.upsertMedia(item, session.email);
          toast('Файл сохранён');
          renderMedia();
        }).catch(function () { toast('Ошибка чтения файла', true); });
      };
      input.click();
    } else {
      var url = prompt('Внешний URL', item.url || 'https://');
      if (url == null) {
        if (afterAdd) renderMedia();
        return;
      }
      item.url = url.trim();
      AdminStore.upsertMedia(item, session.email);
      toast('URL сохранён');
      renderMedia();
    }
  }

  function paintMediaDocuments() {
    var panel = document.getElementById('media-panel');
    var docs = AdminStore.listBooks();

    panel.innerHTML =
      '<div class="filters filters-2">' +
      '<input class="input" id="doc-q" placeholder="Поиск по названию" />' +
      '<input class="input" id="doc-section" placeholder="Фильтр по разделу" />' +
      '</div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Название</th><th>Формат</th><th>Раздел</th><th>Источник</th><th>Действия</th>' +
      '</tr></thead><tbody id="docs-body"></tbody></table></div>';

    var addBtn = document.getElementById('btn-add-doc');
    if (addBtn) {
      addBtn.onclick = function () {
        var title = prompt('Название документа');
        if (!title) return;
        var format = prompt('Формат: pdf / fb2 / doc / other', 'pdf') || 'other';
        var section = prompt('Раздел', 'Книги') || 'Книги';
        var item = AdminStore.upsertMedia({
          id: AdminStore.uid('media'),
          kind: 'document',
          title: title,
          url: '',
          ownerEmail: session.email,
          ownerName: session.name,
          status: 'approved',
          tags: [],
          format: format,
          section: section,
        }, session.email);
        toast('Документ добавлен');
        pickMediaSource(item, true);
      };
    }

    function paint() {
      var q = (document.getElementById('doc-q').value || '').toLowerCase();
      var section = (document.getElementById('doc-section').value || '').toLowerCase();
      var rows = docs.filter(function (d) {
        if (q && String(d.title || '').toLowerCase().indexOf(q) === -1) return false;
        if (section && String(d.section || '').toLowerCase().indexOf(section) === -1) return false;
        return true;
      });
      var body = document.getElementById('docs-body');
      body.innerHTML = rows.map(function (d) {
        var src = d.url
          ? (String(d.url).indexOf('data:') === 0 ? 'файл (local)' : 'URL')
          : '—';
        return (
          '<tr><td><strong>' + esc(d.title) + '</strong></td>' +
          '<td>' + esc((d.format || 'other').toUpperCase()) + '</td>' +
          '<td>' + esc(d.section || '—') + '</td>' +
          '<td>' + esc(src) + '</td>' +
          '<td class="row-actions">' +
          '<button type="button" class="btn btn-ghost" data-doc="url">URL / файл</button>' +
          '<button type="button" class="btn btn-ghost" data-doc="edit">Мета</button>' +
          '<button type="button" class="btn btn-danger" data-doc="del">Удалить</button>' +
          '</td></tr>'
        );
      }).join('') || '<tr><td colspan="5" class="empty">Нет документов</td></tr>';

      body.querySelectorAll('[data-doc]').forEach(function (btn) {
        btn.onclick = function () {
          var tr = btn.closest('tr');
          var idx = [].indexOf.call(body.querySelectorAll('tr'), tr);
          var item = rows[idx];
          if (!item) return;
          var act = btn.getAttribute('data-doc');
          if (act === 'url') {
            pickMediaSource(item);
          } else if (act === 'edit') {
            var title = prompt('Название', item.title || '');
            if (title == null) return;
            var format = prompt('Формат: pdf / fb2 / doc / other', item.format || 'pdf') || item.format;
            var section = prompt('Раздел', item.section || 'Книги') || item.section;
            item.title = title;
            item.format = format;
            item.section = section;
            AdminStore.upsertMedia(item, session.email);
            toast('Сохранено');
            docs = AdminStore.listBooks();
            paint();
          } else if (act === 'del') {
            if (!confirm('Удалить документ?')) return;
            AdminStore.deleteMedia(item.id, session.email);
            toast('Удалено');
            docs = AdminStore.listBooks();
            paint();
          }
        };
      });
    }

    document.getElementById('doc-q').addEventListener('input', paint);
    document.getElementById('doc-section').addEventListener('input', paint);
    paint();
  }

  /* ---------- Taxonomy ---------- */
  function renderTaxonomy() {
    if (!role.canManageTaxonomy && session.role !== 'super' && session.role !== 'chief') {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа</div></div>';
      return;
    }
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Категории и теги</h1><p>Рубрики и метки портала.</p></div>' +
      '<div class="topbar-actions">' +
      '<button type="button" class="btn btn-ghost" id="btn-add-cat">+ Категория</button>' +
      '<button type="button" class="btn btn-primary" id="btn-add-tag">+ Тег</button>' +
      '</div></div>' +
      '<div class="panel" style="margin-bottom:14px"><div class="panel-head"><h2>Категории / рубрики</h2></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Название</th><th>Slug</th><th>URL</th><th></th></tr></thead><tbody id="tax-cats"></tbody></table></div></div>' +
      '<div class="panel"><div class="panel-head"><h2>Теги / метки</h2></div>' +
      '<div class="filters"><select class="select" id="tag-kind-filter"><option value="">Все типы</option>' +
      AdminStore.TAG_KINDS.map(function (k) {
        return '<option value="' + k.id + '">' + esc(k.title) + '</option>';
      }).join('') +
      '</select><input class="input" id="tag-q" placeholder="Поиск тега" /></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Название</th><th>Тип</th><th>Slug</th><th>URL</th><th></th></tr></thead><tbody id="tax-tags"></tbody></table></div></div>';

    function paintCats() {
      var rows = AdminStore.listCategories();
      document.getElementById('tax-cats').innerHTML = rows.map(function (c) {
        return (
          '<tr><td><strong>' + esc(c.name) + '</strong></td><td><code>' + esc(c.slug) + '</code></td>' +
          '<td><a href="' + esc(portalCategoryUrl(c.slug)) + '" target="_blank" rel="noopener">category.html?slug=' + esc(c.slug) + '</a></td>' +
          '<td class="row-actions"><button type="button" class="btn btn-ghost" data-cat-edit="' + esc(c.id) + '">✎</button>' +
          '<button type="button" class="btn btn-danger" data-cat-del="' + esc(c.id) + '">✕</button></td></tr>'
        );
      }).join('') || '<tr><td colspan="4" class="empty">Пусто</td></tr>';
      document.querySelectorAll('[data-cat-edit]').forEach(function (btn) {
        btn.onclick = function () {
          var c = AdminStore.getCategory(btn.getAttribute('data-cat-edit'));
          if (!c) return;
          var name = prompt('Название', c.name);
          if (!name) return;
          var slug = prompt('Slug', c.slug || AdminStore.slugify(name));
          c.name = name;
          c.slug = slug || AdminStore.slugify(name);
          AdminStore.upsertCategory(c, session.email);
          toast('Категория сохранена');
          paintCats();
        };
      });
      document.querySelectorAll('[data-cat-del]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('Удалить категорию?')) return;
          AdminStore.deleteCategory(btn.getAttribute('data-cat-del'), session.email);
          paintCats();
        };
      });
    }

    function paintTags() {
      var kind = document.getElementById('tag-kind-filter').value;
      var q = (document.getElementById('tag-q').value || '').toLowerCase();
      var rows = AdminStore.listTags().filter(function (t) {
        if (kind && t.kind !== kind) return false;
        if (q && String(t.name || '').toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      document.getElementById('tax-tags').innerHTML = rows.map(function (t) {
        var kindTitle = (AdminStore.TAG_KINDS.filter(function (k) { return k.id === t.kind; })[0] || {}).title || t.kind;
        return (
          '<tr><td><strong>' + esc(t.name) + '</strong></td><td>' + esc(kindTitle) + '</td>' +
          '<td><code>' + esc(t.slug) + '</code></td>' +
          '<td><a href="' + esc(portalTagUrl(t.slug)) + '" target="_blank" rel="noopener">tag.html?slug=' + esc(t.slug) + '</a></td>' +
          '<td class="row-actions"><button type="button" class="btn btn-ghost" data-tag-edit="' + esc(t.id) + '">✎</button>' +
          '<button type="button" class="btn btn-danger" data-tag-del="' + esc(t.id) + '">✕</button></td></tr>'
        );
      }).join('') || '<tr><td colspan="5" class="empty">Пусто</td></tr>';
      document.querySelectorAll('[data-tag-edit]').forEach(function (btn) {
        btn.onclick = function () {
          var t = AdminStore.getTag(btn.getAttribute('data-tag-edit'));
          if (!t) return;
          var name = prompt('Название', t.name);
          if (!name) return;
          var kinds = AdminStore.TAG_KINDS.map(function (k) { return k.id; }).join('|');
          var k = prompt('Тип (' + kinds + ')', t.kind || 'other') || t.kind;
          var slug = prompt('Slug', t.slug || AdminStore.slugify(name));
          t.name = name;
          t.kind = k;
          t.slug = slug || AdminStore.slugify(name);
          AdminStore.upsertTag(t, session.email);
          toast('Тег сохранён');
          paintTags();
        };
      });
      document.querySelectorAll('[data-tag-del]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('Удалить тег?')) return;
          AdminStore.deleteTag(btn.getAttribute('data-tag-del'), session.email);
          paintTags();
        };
      });
    }

    document.getElementById('btn-add-cat').onclick = function () {
      var name = prompt('Название категории');
      if (!name) return;
      AdminStore.upsertCategory({
        id: AdminStore.uid('cat'),
        name: name,
        slug: AdminStore.slugify(name),
      }, session.email);
      toast('Категория добавлена');
      paintCats();
    };
    document.getElementById('btn-add-tag').onclick = function () {
      var name = prompt('Название тега');
      if (!name) return;
      var kinds = AdminStore.TAG_KINDS.map(function (k) { return k.id; }).join('|');
      var k = prompt('Тип (' + kinds + ')', 'author') || 'other';
      AdminStore.upsertTag({
        id: AdminStore.uid('tag'),
        name: name,
        slug: AdminStore.slugify(name),
        kind: k,
      }, session.email);
      toast('Тег добавлен');
      paintTags();
    };
    document.getElementById('tag-kind-filter').onchange = paintTags;
    document.getElementById('tag-q').oninput = paintTags;
    paintCats();
    paintTags();
  }

  /* ---------- Users / Logs / Settings / Profile ---------- */
  function renderUsers() {
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Пользователи</h1><p>Роли редакции.</p></div></div>' +
      '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Имя</th><th>Email</th><th>Роль</th></tr></thead><tbody>' +
      AdminAuth.DEMO_USERS.map(function (u) {
        return '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' +
          esc((AdminAuth.ROLES[u.role] || {}).title || u.role) + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  function renderLogs() {
    var logs = (AdminAuth.getAuditLog ? AdminAuth.getAuditLog() : []).slice().reverse();
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Журнал</h1><p>История действий редакции.</p></div></div>' +
      '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th></tr></thead><tbody>' +
      (logs.map(function (l) {
        return '<tr><td>' + esc(fmtDate(l.at)) + '</td><td>' + esc(l.actor) + '</td><td>' +
          esc(l.action) + '</td><td>' + esc(l.target || '') + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="empty">Записей нет</td></tr>') +
      '</tbody></table></div></div>';
  }

  function renderSettings() {
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Настройки</h1><p>Подключение к серверу и доступ редакции.</p></div></div>' +
      '<div class="panel">' +
      '<p class="hint-note">Изменения в редакции отображаются на портале после публикации.</p>' +
      '<details class="dev-box"><summary>Подключение сервера</summary>' +
      '<div class="form-grid">' +
      '<label>Адрес сервера архива<input class="input" id="set-api" value="' + esc(AdminConfig.API_BASE || '') + '" /></label>' +
      '<label>Ключ доступа<input class="input" id="set-token" value="' + esc(AdminConfig.ADMIN_TOKEN || '') + '" type="password" /></label>' +
      '<button type="button" class="btn btn-primary" id="set-save">Сохранить</button>' +
      '</div></details></div>';
    var save = document.getElementById('set-save');
    if (save) save.onclick = function () {
      var api = document.getElementById('set-api').value.trim();
      var token = document.getElementById('set-token').value.trim();
      try {
        localStorage.setItem('yak_admin_api_override', api);
        localStorage.setItem('yak_admin_token', token);
        AdminConfig.API_BASE = api;
        AdminConfig.ADMIN_TOKEN = token;
        toast('Сохранено');
        checkServer();
      } catch (e) {
        toast('Ошибка сохранения', true);
      }
    };
  }

  function renderProfile() {
    var key = 'yak_admin_profile_' + session.email;
    var profile = {};
    try { profile = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Профиль</h1><p>Ваши данные в редакции.</p></div></div>' +
      '<div class="panel form-grid">' +
      '<label>Имя<input class="input" id="pr-name" value="' + esc(profile.name || session.name) + '" /></label>' +
      '<label>Биография<textarea class="input" id="pr-bio" rows="4">' + esc(profile.bio || '') + '</textarea></label>' +
      '<label>Контакты<input class="input" id="pr-contacts" value="' + esc(profile.contacts || '') + '" /></label>' +
      '<button type="button" class="btn btn-primary" id="pr-save">Сохранить</button></div>';
    document.getElementById('pr-save').onclick = function () {
      var data = {
        name: document.getElementById('pr-name').value.trim(),
        bio: document.getElementById('pr-bio').value.trim(),
        contacts: document.getElementById('pr-contacts').value.trim(),
      };
      localStorage.setItem(key, JSON.stringify(data));
      toast('Профиль сохранён');
    };
  }

  /* ---------- Router ---------- */
  function render() {
    var r = route();
    renderNav();
    syncServerPill();

    if (!AdminAuth.canAccessNav(session, navAccessId(r.name, r.name)) && r.name !== 'editor' && r.name !== 'page-editor') {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа к разделу</div></div>';
      return;
    }

    var deskCtx = { viewEl: viewEl, session: session, role: role, toast: toast, go: go };
    if (window.AdminDesk && AdminDesk.renderRoute(r.name, r.id, deskCtx)) {
      return;
    }
    if (r.name === 'materials') {
      if (window.AdminPosts) AdminPosts.renderList({ viewEl: viewEl, session: session, role: role, toast: toast, go: go, push: maybePushToServer });
      else renderMaterials();
    } else if (r.name === 'editor') {
      if (window.AdminPosts) AdminPosts.renderEditor({ viewEl: viewEl, session: session, role: role, toast: toast, go: go, push: maybePushToServer }, r.id);
      else renderEditor(r.id);
    }
    else if (r.name === 'pages') {
      if (!role.canEditPages) {
        viewEl.innerHTML = '<div class="panel"><div class="empty">Страницы — только супер-админ и главный редактор</div></div>';
        return;
      }
      renderPages();
    } else if (r.name === 'page-editor') {
      if (!role.canEditPages) {
        viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа</div></div>';
        return;
      }
      renderPageEditor(r.id);
    } else if (r.name === 'media' || r.name === 'photostock') {
      mediaTab = 'images';
      renderMedia();
    } else if (r.name === 'library') {
      mediaTab = 'documents';
      renderMedia();
    } else if (r.name === 'authors') {
      if (window.AdminDesk) AdminDesk.renderRoute('authors', r.id, deskCtx);
      else {
        viewEl.innerHTML =
          '<div class="topbar"><div><h1>Авторы</h1></div></div>' +
          '<div class="panel"><p class="hint-note">Авторы портала.</p></div>';
      }
    } else if (
      window.AdminPhotostock &&
      AdminPhotostock.renderRoute(r.name, r.id, {
        viewEl: viewEl,
        session: session,
        role: role,
        toast: toast,
        go: go,
      })
    ) {
      /* photostock admin routes */
    } else if (r.name === 'taxonomy') renderTaxonomy();
    else if (r.name === 'users') renderUsers();
    else if (r.name === 'logs') renderLogs();
    else if (r.name === 'settings') renderSettings();
    else if (r.name === 'profile') renderProfile();
    else renderDashboard();
  }

  function setMenu(open) {
    document.body.classList.toggle('nav-open', open);
    var scrim = document.getElementById('nav-scrim');
    if (scrim) {
      if (open) scrim.removeAttribute('hidden');
      else scrim.setAttribute('hidden', '');
    }
  }
  window.addEventListener('hashchange', function () {
    setMenu(false);
    try { render(); } catch (e) { showBootError(e); }
  });
  var menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.onclick = function () {
      setMenu(!document.body.classList.contains('nav-open'));
    };
  }
  var scrim = document.getElementById('nav-scrim');
  if (scrim) {
    scrim.onclick = function () { setMenu(false); };
  }
  function showBootError(err) {
    if (!viewEl) return;
    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Редакция</h1><p>Не удалось открыть раздел.</p></div></div>' +
      '<div class="panel"><p>' + esc(err && err.message ? err.message : err) + '</p></div>';
  }
  try {
    checkServer();
    render();
  } catch (bootErr) {
    showBootError(bootErr);
  }
  if (AdminStore && AdminStore.storageDegraded && AdminStore.storageDegraded()) {
    toast('Сессия не сохраняется. Откройте редакцию через index.html', true);
  }
})();
