/**
 * Вход по ключу. Ключ проверяет сервер (GET /api/admin/whoami), он же определяет уровень:
 *   1 — полный доступ; 2 — новости черновиком, библиотека и афиша без удаления;
 *   3 — то же, что 2, плюс присылать ролики в Католик.LIVE.
 * Пока на сервере не заданы ключи, он отвечает «открытый режим» и вход идёт без ключа, как раньше.
 * Кнопки скрываем для удобства, но настоящий запрет — на сервере.
 */
(function (global) {
  'use strict';

  var SESSION_KEY = 'yak_admin_session';
  var ATTEMPTS_KEY = 'yak_admin_login_attempts';

  var KEY_NAV = ['dashboard', 'news', 'library', 'afisha', 'organizers', 'drafts'];
  function keyRole(id, title, extraNav) {
    return {
      id: id,
      title: title,
      nav: KEY_NAV.concat(extraNav || []),
      canPublish: false,
      canModerate: false,
      canManageUsers: false,
      canDeleteForever: false,
      canSeeAllMaterials: false,
      canEditSystem: false,
      canEditPages: false,
      canModerateMedia: false,
      canManagePhotographers: false,
      canManageDocs: true,
      canManageTaxonomy: false,
      rubrics: ['news'],
      /* Без «Снять»/«Удалить», новости только черновиком — этим управляет deskLimited(). */
      limited: true,
    };
  }

  var ROLES = {
    key2: keyRole('key2', 'Ключ 2 · новости, библиотека, афиша'),
    key3: keyRole('key3', 'Ключ 3 · то же и Католик.LIVE', ['live-requests']),
    super: {
      id: 'super',
      title: 'Супер-администратор',
      nav: ['dashboard', 'home', 'about', 'publish', 'news', 'articles', 'cycles', 'church', 'spirit', 'afisha', 'organizers', 'audio', 'podcasts', 'video', 'video-partners', 'church-day', 'materials', 'pages', 'taxonomy', 'authors', 'library', 'media', 'photographers', 'photo-moderation', 'users', 'logs', 'settings', 'drafts', 'live-requests'],
      canPublish: true,
      canModerate: true,
      canManageUsers: true,
      canDeleteForever: true,
      canSeeAllMaterials: true,
      canEditSystem: true,
      canEditPages: true,
      canModerateMedia: true,
      canManagePhotographers: true,
      canManageDocs: true,
      canManageTaxonomy: true,
      rubrics: ['*'],
      photostockFull: true,
    },
    chief: {
      id: 'chief',
      title: 'Главный редактор',
      nav: ['dashboard', 'home', 'about', 'publish', 'news', 'articles', 'cycles', 'church', 'spirit', 'afisha', 'organizers', 'audio', 'podcasts', 'video', 'video-partners', 'church-day', 'materials', 'pages', 'taxonomy', 'authors', 'library', 'media', 'photographers', 'photo-moderation', 'users', 'logs'],
      canPublish: true,
      canModerate: true,
      canManageUsers: false,
      canDeleteForever: false,
      canSeeAllMaterials: true,
      canEditSystem: false,
      canEditPages: true,
      canModerateMedia: true,
      canManagePhotographers: true,
      canManageDocs: true,
      canManageTaxonomy: true,
      rubrics: ['*'],
      photostockFull: true,
    },
    rubric_editor: {
      id: 'rubric_editor',
      title: 'Редактор рубрики',
      nav: ['dashboard', 'home', 'publish', 'news', 'articles', 'cycles', 'afisha', 'organizers', 'materials'],
      canPublish: true,
      canModerate: true,
      canManageUsers: false,
      canDeleteForever: false,
      canSeeAllMaterials: false,
      canEditSystem: false,
      canEditPages: false,
      canModerateMedia: false,
      canManageDocs: false,
      canManageTaxonomy: true,
      rubrics: ['columns', 'news', 'announcement', 'interview'],
    },
    author: {
      id: 'author',
      title: 'Автор',
      nav: ['dashboard', 'publish', 'news', 'articles', 'cycles', 'materials'],
      canPublish: false,
      canModerate: false,
      canManageUsers: false,
      canDeleteForever: false,
      canSeeAllMaterials: false,
      canEditSystem: false,
      canEditPages: false,
      canModerateMedia: false,
      canManageDocs: false,
      canManageTaxonomy: false,
      rubrics: ['columns', 'news', 'announcement', 'interview'],
    },
    photo_editor: {
      id: 'photo_editor',
      title: 'Фоторедактор',
      nav: ['dashboard', 'media', 'photographers', 'photo-moderation'],
      canPublish: false,
      canModerate: false,
      canManageUsers: false,
      canDeleteForever: false,
      canSeeAllMaterials: false,
      canEditSystem: false,
      canEditPages: false,
      canModerateMedia: true,
      canManagePhotographers: true,
      canManageDocs: false,
      canManageTaxonomy: false,
      rubrics: [],
      photostockFull: true,
    },
    photographer: {
      id: 'photographer',
      title: 'Фотограф',
      nav: ['dashboard', 'my-page', 'upload-photos'],
      canPublish: false,
      canModerate: false,
      canManageUsers: false,
      canDeleteForever: false,
      canSeeAllMaterials: false,
      canEditSystem: false,
      canEditPages: false,
      canModerateMedia: false,
      canManagePhotographers: false,
      canManageDocs: false,
      canManageTaxonomy: false,
      rubrics: [],
      photostockOwnOnly: true,
    },
    librarian: {
      id: 'librarian',
      title: 'Библиотекарь',
      nav: ['dashboard', 'library'],
      canPublish: true,
      canModerate: false,
      canManageUsers: false,
      canDeleteForever: false,
      canSeeAllMaterials: false,
      canEditSystem: false,
      canEditPages: false,
      canModerateMedia: false,
      canManageDocs: true,
      canManageTaxonomy: false,
      rubrics: [],
    },
  };

  /** Демо-учётки. Пароль у всех: demo */
  var DEMO_USERS = [
    { email: 'super@yakatolik.local', name: 'Супер-админ', role: 'super', password: 'demo' },
    { email: 'chief@yakatolik.local', name: 'Анна Главред', role: 'chief', password: 'demo' },
    { email: 'editor@yakatolik.local', name: 'Пётр Редактор', role: 'rubric_editor', password: 'demo', rubrics: ['columns', 'news'] },
    { email: 'author@yakatolik.local', name: 'Мария Автор', role: 'author', password: 'demo' },
    { email: 'photo@yakatolik.local', name: 'Илья Фоторед', role: 'photo_editor', password: 'demo' },
    { email: 'shooter@yakatolik.local', name: 'Ольга Фотограф', role: 'photographer', password: 'demo' },
    { email: 'books@yakatolik.local', name: 'Кирилл Библиотекарь', role: 'librarian', password: 'demo' },
  ];

  var mem = Object.create(null);

  function readJson(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(mem, key)) return mem[key];
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    mem[key] = val;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      /* NS_ERROR_FILE_CORRUPTED / quota — сессия всё равно в памяти вкладки */
    }
  }

  function roleOf(user) {
    return ROLES[user && user.role] || ROLES.author;
  }

  function getSession() {
    return readJson(SESSION_KEY, null);
  }

  function setSession(user) {
    var token = '';
    try { token = user.token || localStorage.getItem('yak_admin_token') || ''; } catch (e) {}
    writeJson(SESSION_KEY, {
      email: user.email,
      name: user.name,
      role: user.role,
      rubrics: user.rubrics || null,
      token: token || '',
      at: Date.now(),
    });
    if (token) saveAdminToken(token);
  }

  var LEVELS = {
    1: { role: 'super', name: 'Супер-админ', email: 'key1@desk' },
    2: { role: 'key2', name: 'Редактор', email: 'key2@desk' },
    3: { role: 'key3', name: 'Редактор', email: 'key3@desk' },
  };

  function startSession(level, token, open) {
    var L = LEVELS[level] || LEVELS[2];
    writeJson(SESSION_KEY, {
      email: L.email,
      name: L.name,
      role: L.role,
      level: level,
      open: !!open,
      rubrics: null,
      token: token || '',
      at: Date.now(),
    });
    saveAdminToken(open ? '' : token);
    audit(L.email, 'auth.login', open ? 'Вход без ключа (на сервере ключи ещё не заданы)' : 'Вход по ключу, уровень ' + level);
    return getSession();
  }

  function whoamiUrl() {
    var base = (global.AdminApi && AdminApi.base && AdminApi.base()) || (global.AdminConfig && AdminConfig.API_BASE) || '';
    return base + '/api/admin/whoami';
  }

  /** Спрашиваем сервер, какой уровень открывает ключ (пустой ключ — проверка «открытого режима»). */
  function checkKey(key) {
    key = String(key || '').trim();
    var ready = global.AdminApi && AdminApi.connect ? AdminApi.connect() : Promise.resolve();
    return ready.then(function () {
      var headers = { Accept: 'application/json' };
      if (key) headers['x-admin-token'] = key;
      return fetch(whoamiUrl(), { method: 'GET', headers: headers, mode: 'cors', credentials: 'omit', cache: 'no-store' });
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        return { status: res.status, data: data || {} };
      });
    }, function () {
      return { status: 0, data: { error: 'Нет связи с сервером. Если включён VPN — выключите его.' } };
    });
  }

  /** Вход по ключу: { ok, level } или { ok:false, message } */
  function loginWithKey(key) {
    key = String(key || '').trim();
    if (!key) return Promise.resolve({ ok: false, message: 'Вставьте ключ' });
    if (/[^\x21-\x7e]/.test(key)) return Promise.resolve({ ok: false, message: 'Ключ не подошёл: в нём только латинские буквы и цифры — проверьте раскладку и пробелы' });
    return checkKey(key).then(function (r) {
      if (r.status === 200 && r.data.ok && r.data.level) {
        startSession(r.data.level, key, r.data.open);
        return { ok: true, level: r.data.level };
      }
      return { ok: false, message: r.data.error || (r.status === 0 ? 'Нет связи с сервером' : 'Ключ не подошёл') };
    });
  }

  /** Если сервер в открытом режиме — входим сами. Иначе false. */
  function tryOpenMode() {
    return checkKey('').then(function (r) {
      if (r.status === 200 && r.data.ok && r.data.open) {
        startSession(1, '', true);
        return true;
      }
      return false;
    });
  }

  function level() {
    var s = getSession();
    return (s && s.level) || 0;
  }

  /** Ключи 2 и 3: без «Снять», без «Опубликовать» для новостей. */
  function limited() {
    var s = getSession();
    return !!(s && roleOf(s).limited);
  }

  function clearSession() {
    try { delete mem[SESSION_KEY]; } catch (e) {}
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    saveAdminToken('');
  }

  function getAttempts() {
    return readJson(ATTEMPTS_KEY, { count: 0, lockedUntil: 0, lastEmail: '' });
  }

  function isLocked() {
    var a = getAttempts();
    return a.lockedUntil && Date.now() < a.lockedUntil ? a : null;
  }

  function notifySuperAboutLock(email) {
    // Заглушка уведомления супер-админу (по ТЗ — после 3 попыток).
    var logs = readJson('yak_admin_audit', []);
    logs.unshift({
      id: 'log_' + Date.now(),
      at: new Date().toISOString(),
      actor: 'system',
      action: 'security.lockout',
      detail: 'Временная блокировка входа для ' + email + ' после 3 неудачных попыток. Уведомление супер-админу (stub).',
      immutable: true,
    });
    writeJson('yak_admin_audit', logs.slice(0, 2000));
  }

  function login(email, password) {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');

    var lock = isLocked();
    if (lock) {
      var mins = Math.ceil((lock.lockedUntil - Date.now()) / 60000);
      return { ok: false, locked: true, message: 'Вход временно заблокирован. Повторите через ~' + mins + ' мин.' };
    }

    var user = DEMO_USERS.filter(function (u) {
      return u.email === email && u.password === password;
    })[0];

    if (!user) {
      var conf = global.AdminConfig || {};
      var max = conf.MAX_LOGIN_ATTEMPTS || 3;
      var a = getAttempts();
      a.count = (a.count || 0) + 1;
      a.lastEmail = email;
      if (a.count >= max) {
        a.lockedUntil = Date.now() + (conf.LOCKOUT_MINUTES || 15) * 60000;
        a.count = 0;
        notifySuperAboutLock(email);
        writeJson(ATTEMPTS_KEY, a);
        return {
          ok: false,
          locked: true,
          message: 'Слишком много попыток. Вход заблокирован на ' + (conf.LOCKOUT_MINUTES || 15) + ' мин. Супер-админ уведомлён.',
        };
      }
      writeJson(ATTEMPTS_KEY, a);
      return {
        ok: false,
        message: 'Неверный email или пароль. Осталось попыток: ' + (max - a.count),
      };
    }

    writeJson(ATTEMPTS_KEY, { count: 0, lockedUntil: 0, lastEmail: '' });
    setSession(user);
    audit(user.email, 'auth.login', 'Вход в редакцию');
    return { ok: true, user: getSession() };
  }

  function logout() {
    var s = getSession();
    if (s) audit(s.email, 'auth.logout', 'Выход');
    clearSession();
  }

  /** Вошедший по ключу — или null: тогда app.js показывает экран входа. */
  function requireAuth() {
    var s = getSession();
    return s && s.level && ROLES[s.role] ? s : null;
  }

  function can(user, flag) {
    var r = roleOf(user);
    return !!r[flag];
  }

  function canAccessNav(user, id) {
    // aliases: old photostock → media; page-editor → pages
    if (id === 'photostock') id = 'media';
    if (id === 'page-editor') id = 'pages';
    if (id === 'photographer-edit') id = 'photographers';
    if (id === 'publish' || id === 'home' || id === 'news' || id === 'articles' || id === 'cycles' || id === 'audio' || id === 'podcasts' || id === 'video' || id === 'video-partners' || id === 'afisha' || id === 'organizers' || id === 'church-day' || id === 'authors' || id === 'church' || id === 'spirit') {
      var n = roleOf(user).nav;
      if (n.indexOf(id) !== -1 || n.indexOf('publish') !== -1 || n.indexOf('materials') !== -1) return true;
    }
    return roleOf(user).nav.indexOf(id) !== -1;
  }

  function audit(actor, action, detail, meta) {
    var logs = readJson('yak_admin_audit', []);
    logs.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      at: new Date().toISOString(),
      actor: actor || 'unknown',
      action: action,
      detail: detail || '',
      meta: meta || null,
      immutable: true,
    });
    writeJson('yak_admin_audit', logs.slice(0, 5000));
  }

  function getAuditLog() {
    return readJson('yak_admin_audit', []);
  }

  /** Журнал только для чтения — API удаления нет по ТЗ */
  function clearAuditForbidden() {
    return { ok: false, message: 'Журнал действий нельзя редактировать или удалять.' };
  }

  function saveAdminToken(tok) {
    tok = String(tok || '').trim();
    try {
      if (tok) localStorage.setItem('yak_admin_token', tok);
      else localStorage.removeItem('yak_admin_token');
    } catch (e) {}
    if (global.AdminConfig) global.AdminConfig.ADMIN_TOKEN = tok;
  }

  global.AdminAuth = {
    ROLES: ROLES,
    DEMO_USERS: DEMO_USERS,
    login: login,
    logout: logout,
    getSession: getSession,
    loginWithKey: loginWithKey,
    tryOpenMode: tryOpenMode,
    level: level,
    limited: limited,
    requireAuth: requireAuth,
    roleOf: roleOf,
    can: can,
    canAccessNav: canAccessNav,
    isLocked: isLocked,
    audit: audit,
    getAuditLog: getAuditLog,
    clearAuditForbidden: clearAuditForbidden,
    saveAdminToken: saveAdminToken,
  };
})(window);
