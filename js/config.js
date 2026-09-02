/**
 * Конфиг админки ЯКатолик.
 * По умолчанию — тот же сервер, что у портала.
 *
 * Переопределение:
 *   ?api=https://your-server
 *   window.AdminConfigOverride = { API_BASE: '…', ADMIN_TOKEN: '…' }
 */
(function (global) {
  'use strict';

  var DEFAULT_API = 'https://fides.186-246-11-81.sslip.io';
  var params = {};
  try {
    params = Object.fromEntries(new URLSearchParams(location.search));
  } catch (e) {}

  var override = global.AdminConfigOverride || {};
  var storedToken = '';
  var storedApi = '';
  try {
    storedToken = localStorage.getItem('yak_admin_token') || '';
    storedApi = localStorage.getItem('yak_admin_api_override') || '';
  } catch (e) {}

  global.AdminConfig = {
    BRAND: 'ЯКатолик',
    APP_NAME: 'Редакция',
    API_BASE: String(override.API_BASE || params.api || storedApi || DEFAULT_API).replace(/\/$/, ''),
    ADMIN_TOKEN: override.ADMIN_TOKEN || params.token || storedToken || '',
    PORTAL_URL: override.PORTAL_URL || (
      /github\.io/i.test(location.host)
        ? 'https://rickytickytavylm.github.io/fides_web/'
        : '../Ave_Maria/'
    ),
    AUTOSAVE_MS: 30000,
    MAX_LOGIN_ATTEMPTS: 3,
    LOCKOUT_MINUTES: 15,
  };
})(window);
