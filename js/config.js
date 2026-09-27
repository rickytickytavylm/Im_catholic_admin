/**
 * Конфиг админки ЯКатолик.
 * Прод API — только Timeweb. Без Railway.
 */
(function (global) {
  'use strict';

  var TIMEWEB = 'https://rickytickytavylm-fides-at-ratio-server-d4c9.twc1.net';
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

  if (/railway\.app|sslip\.io/i.test(storedApi)) {
    storedApi = '';
    try {
      localStorage.removeItem('yak_admin_api_override');
    } catch (e) {}
  }

  global.AdminConfig = {
    BRAND: 'ЯКатолик',
    APP_NAME: 'Редакция',
    API_BASE: String(override.API_BASE || params.api || storedApi || TIMEWEB).replace(/\/$/, ''),
    API_FALLBACKS: [TIMEWEB],
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
