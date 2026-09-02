/**
 * Авторизация (упрощённая по ТЗ заказчика на этом этапе).
 * - Демо-пользователи по ролям (email + пароль demo)
 * - Счётчик неудачных попыток + локальная блокировка (без реальной отправки супер-админу)
 * - Роли и права для UI
 * Сложную серверную auth/RBAC намеренно пропускаем; для API используется x-admin-token.
 */
(function (global) {
  'use strict';

  var SESSION_KEY = 'yak_admin_session';
  var ATTEMPTS_KEY = 'yak_admin_login_attempts';

  var ROLES = {
    super: {
      id: 'super',
      title: 'Супер-администратор',
      nav: ['dashboard', 'publish', 'news', 'articles', 'church', 'spirit', 'afisha', 'audio', 'video', 'church-day', 'materials', 'pages', 'taxonomy', 'authors', 'library', 'media', 'photographers', 'photo-moderation', 'users', 'logs', 'settings'],
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
      nav: ['dashboard', 'publish', 'news', 'articles', 'church', 'spirit', 'afisha', 'audio', 'video', 'church-day', 'materials', 'pages', 'taxonomy', 'authors', 'library', 'media', 'photographers', 'photo-moderation', 'users', 'logs'],
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
      nav: ['dashboard', 'publish', 'news', 'articles', 'afisha', 'materials'],
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
      nav: ['dashboard', 'publish', 'news', 'articles', 'materials'],
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
      canPublish: false,
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
    writeJson(SESSION_KEY, {
      email: user.email,
      name: user.name,
      role: user.role,
      rubrics: user.rubrics || null,
      at: Date.now(),
    });
  }

  /** Режим без паролей: сразу супер-админ */
  function ensureDevSession() {
    var s = getSession();
    if (s && s.email) return s;
    var user = DEMO_USERS[0]; // super@yakatolik.local
    setSession(user);
    audit(user.email, 'auth.dev_enter', 'Вход без пароля (режим разработки)');
    return getSession();
  }

  function clearSession() {
    try { delete mem[SESSION_KEY]; } catch (e) {}
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
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

  function requireAuth() {
    return ensureDevSession();
  }

  function can(user, flag) {
    var r = roleOf(user);
    return !!r[flag];
  }

  function canAccessNav(user, id) {
    // aliases: old photostock/library → media; page-editor → pages
    if (id === 'photostock' || id === 'library') id = 'media';
    if (id === 'page-editor') id = 'pages';
    if (id === 'photographer-edit') id = 'photographers';
    if (id === 'publish' || id === 'news' || id === 'articles' || id === 'audio' || id === 'video' || id === 'afisha' || id === 'church-day' || id === 'authors' || id === 'church' || id === 'spirit') {
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
    ensureDevSession: ensureDevSession,
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
