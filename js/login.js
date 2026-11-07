/**
 * Экран входа по ключу. Показывается, если вошедшего нет.
 * Пока на сервере ключи не заданы («открытый режим»), входим сами, как раньше.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function show() {
    document.body.classList.add('key-login-on');
    var host = document.createElement('div');
    host.className = 'key-login';
    host.innerHTML =
      '<div class="key-login-card">' +
      '<img src="assets/yakatolik-logo.svg" alt="" width="44" height="44" />' +
      '<h1>Редакция</h1>' +
      '<p class="key-login-note" id="key-note">Проверяю связь с сервером…</p>' +
      '</div>';
    document.body.appendChild(host);
    var card = host.querySelector('.key-login-card');

    function form(message) {
      card.innerHTML =
        '<img src="assets/yakatolik-logo.svg" alt="" width="44" height="44" />' +
        '<h1>Редакция</h1>' +
        '<p class="key-login-note">Введите ключ доступа</p>' +
        '<form id="key-form" autocomplete="off">' +
        '<input class="input" id="key-input" type="password" placeholder="Ключ" autocomplete="current-password" spellcheck="false" autocapitalize="off" />' +
        '<button type="submit" class="btn btn-primary btn-block" id="key-go">Войти</button>' +
        '<p class="key-login-err" id="key-err" role="alert">' + esc(message || '') + '</p>' +
        '</form>';
      var input = document.getElementById('key-input');
      var err = document.getElementById('key-err');
      var go = document.getElementById('key-go');
      if (input) input.focus();
      document.getElementById('key-form').onsubmit = function (e) {
        e.preventDefault();
        go.disabled = true;
        go.textContent = 'Проверяю…';
        err.textContent = '';
        AdminAuth.loginWithKey(input.value).then(function (res) {
          if (res.ok) {
            location.reload();
            return;
          }
          go.disabled = false;
          go.textContent = 'Войти';
          err.textContent = res.message || 'Ключ не подошёл';
          input.select();
        });
      };
    }

    AdminAuth.tryOpenMode().then(function (open) {
      if (open) {
        location.reload();
        return;
      }
      form('');
    }, function () {
      form('Нет связи с сервером. Если включён VPN — выключите его и обновите страницу.');
    });
  }

  global.AdminLogin = { show: show };
})(window);
