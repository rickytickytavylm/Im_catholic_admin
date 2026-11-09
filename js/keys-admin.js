/**
 * Разделы, которые появились вместе с ключами:
 *  - «Черновики редакторов» — новости, сохранённые на сервере ключами 2 и 3; ключ 1 открывает и публикует;
 *  - «Заявки Католик.LIVE» — ролики, присланные по ключу 3; ключи 1 и 3 одобряют или отклоняют;
 *  - обзор для ключей 2 и 3 — только их разделы.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(iso);
    }
  }

  function fmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' КБ';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' МБ';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' ГБ';
  }

  function loading(ctx, title) {
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(title) + '</h1></div></div>' +
      '<div class="yak-loading yak-loading--page" role="status"><span class="yak-spin" aria-hidden="true"></span><span>Загружаю…</span></div>';
  }

  function failed(ctx, title, e, retry) {
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + esc(title) + '</h1></div></div>' +
      '<div class="panel"><div class="empty">' + esc((e && e.message) || 'Сервер не ответил') +
      '</div><p style="padding:0 16px 16px"><button type="button" class="btn btn-primary" id="keys-retry">Повторить</button></p></div>';
    var b = document.getElementById('keys-retry');
    if (b) b.onclick = retry;
  }

  /* ---------- Обзор для ключей 2 и 3 ---------- */
  function renderLimitedHome(ctx) {
    var live = AdminAuth.canAccessNav(ctx.session, 'live-requests');
    var cards = [
      { href: '#news/new', title: 'Новость', note: 'Сохраняется черновиком — опубликует администратор' },
      { href: '#library', title: 'Библиотека', note: 'Добавлять и править. Удалять нельзя' },
      { href: '#afisha/new', title: 'Афиша', note: 'Добавлять и править. Удалять нельзя' },
      { href: '#drafts', title: 'Черновики', note: 'Новости, ожидающие проверки' },
    ];
    if (live) cards.push({ href: '#live-requests', title: 'Заявки Католик.LIVE', note: 'Присланные ролики: одобрить или отклонить' });
    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>Обзор</h1><p>Что доступно с вашим ключом.</p></div></div>' +
      '<div class="desk-grid desk-grid--home">' +
      cards.map(function (c) {
        return '<a class="desk-card" href="' + c.href + '"><strong>' + esc(c.title) + '</strong>' +
          '<span class="desk-where">' + esc(c.note) + '</span></a>';
      }).join('') + '</div>';
  }

  /* ---------- Черновики редакторов ---------- */
  var NEWS_LIKE = { news: 1, digest: 1, 'church-rus': 1, sng: 1, 'santa-sede': 1, pope: 1 };

  function draftKind(d) {
    var slugs = (d.draftSlugs && d.draftSlugs.length) ? d.draftSlugs : (d.categorySlugs || []);
    for (var i = 0; i < slugs.length; i++) if (NEWS_LIKE[slugs[i]]) return 'news';
    return 'articles';
  }

  function renderDrafts(ctx) {
    var title = 'Черновики редакторов';
    var isFull = AdminAuth.level() === 1;
    loading(ctx, title);
    AdminApi.getDeskDrafts().then(function (pack) {
      var list = (pack && pack.items) || [];
      ctx.viewEl.innerHTML =
        '<div class="topbar"><div><h1>' + esc(title) + '</h1>' +
        '<p>' + (isFull
          ? 'Новости, сохранённые редакторами с ключами 2 и 3. Откройте, проверьте и опубликуйте.'
          : 'Ваши и чужие черновики. Опубликовать их может только администратор.') + '</p></div>' +
        '<div class="topbar-actions"><a class="btn btn-primary" href="#news/new">Новая новость</a></div></div>' +
        '<div class="panel">' +
        (list.length
          ? '<div class="table-wrap"><table class="data"><thead><tr><th>Заголовок</th><th>Дата</th><th>Сохранён</th><th></th></tr></thead><tbody>' +
            list.map(function (d) {
              var kind = draftKind(d);
              return '<tr><td><a class="title-link" href="#' + kind + '/' + esc(d.id) + '">' + esc(d.title || 'Без названия') + '</a>' +
                '<div class="cell-meta">' + esc(d.excerpt ? String(d.excerpt).replace(/<[^>]+>/g, '').slice(0, 120) : '') + '</div></td>' +
                '<td>' + esc(String(d.date || '').slice(0, 10)) + '</td>' +
                '<td>' + esc(fmtDate(d.modified)) + '</td>' +
                '<td class="row-actions"><a class="btn btn-ghost" href="#' + kind + '/' + esc(d.id) + '">' + (isFull ? 'Открыть и опубликовать' : 'Открыть') + '</a>' +
                (isFull ? '<button type="button" class="btn btn-danger" data-draft-del="' + esc(d.id) + '">Удалить</button>' : '') +
                '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="empty">Черновиков нет</div>') +
        '</div>';
      ctx.viewEl.querySelectorAll('[data-draft-del]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('Удалить черновик насовсем?')) return;
          btn.disabled = true;
          AdminApi.deleteDeskDraft(btn.getAttribute('data-draft-del')).then(function () {
            ctx.toast('Черновик удалён');
            renderDrafts(ctx);
          }).catch(function (e) {
            btn.disabled = false;
            ctx.toast((e && e.message) || 'Не удалось удалить', true);
          });
        };
      });
    }).catch(function (e) {
      failed(ctx, title, e, function () { renderDrafts(ctx); });
    });
  }

  /* ---------- Заявки Католик.LIVE ---------- */
  var liveTab = 'pending';

  function liveBadge(it) {
    if (it.status === 'approved') return '<span class="badge ok">На сайте</span>';
    if (it.status === 'rejected') {
      return it.fileDeleted
        ? '<span class="badge muted">Отклонено, файл удалён</span>'
        : '<span class="badge rose" title="Файл остаётся в хранилище, пока администратор его не удалит">Отклонено · файл к удалению</span>';
    }
    return '<span class="badge warn">Ждёт решения</span>';
  }

  function renderLive(ctx) {
    var title = 'Заявки Католик.LIVE';
    var isFull = AdminAuth.level() === 1;
    loading(ctx, title);
    AdminApi.getLiveRequests('').then(function (pack) {
      var all = (pack && pack.items) || [];
      var counts = { pending: 0, approved: 0, rejected: 0 };
      all.forEach(function (it) { if (counts[it.status] != null) counts[it.status] += 1; });
      var rows = all.filter(function (it) { return it.status === liveTab; });
      var toDelete = all.filter(function (it) { return it.toDelete; }).length;

      ctx.viewEl.innerHTML =
        '<div class="topbar"><div><h1>' + esc(title) + '</h1>' +
        '<p>Ролики, присланные приходами. Пока вы не одобрили, на сайте их нет.</p></div>' +
        '<div class="topbar-actions">' +
        (isFull && toDelete ? '<button type="button" class="btn btn-danger" id="live-purge">Удалить файлы отклонённых (' + toDelete + ')</button>' : '') +
        '</div></div>' +
        '<div class="tabs" id="live-tabs">' +
        [['pending', 'Новые'], ['approved', 'Одобренные'], ['rejected', 'Отклонённые']].map(function (t) {
          return '<button type="button" class="tab' + (liveTab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '">' + t[1] + ' (' + counts[t[0]] + ')</button>';
        }).join('') + '</div>' +
        (rows.length
          ? '<div class="list-stack live-requests">' + rows.map(function (it) {
            var canPlay = !(it.status === 'rejected' && it.fileDeleted);
            return (
              '<article class="panel live-req" data-id="' + esc(it.id) + '">' +
              '<div class="live-req-head"><div><strong>' + esc(it.title) + '</strong>' +
              '<div class="cell-meta">' + (it.parishId === 'other' ? 'Приход не из списка: ' : '') + esc(it.parishName || it.parishId) + '</div></div>' + liveBadge(it) + '</div>' +
              (canPlay ? '<video class="live-req-video" controls preload="metadata" playsinline src="' + esc(it.videoUrl) + '"></video>' : '') +
              '<p class="live-req-text">' + esc(it.description) + '</p>' +
              '<p class="cell-meta">Прислал: ' + esc(it.senderName) + ' · ' + esc(it.contact) + '<br>' +
              esc(fmtDate(it.createdAt)) + ' · ' + esc(fmtSize(it.sizeBytes)) +
              (it.rejectReason ? '<br>Причина отказа: ' + esc(it.rejectReason) : '') + '</p>' +
              '<div class="row-actions">' +
              (it.status !== 'approved' && !it.fileDeleted ? '<button type="button" class="btn btn-primary" data-live="approve">Одобрить</button>' : '') +
              (it.status !== 'rejected' ? '<button type="button" class="btn btn-ghost" data-live="reject">' + (it.status === 'approved' ? 'Снять с сайта' : 'Отклонить') + '</button>' : '') +
              (isFull && it.toDelete ? '<button type="button" class="btn btn-danger" data-live="file">Удалить файл</button>' : '') +
              '</div></article>'
            );
          }).join('') + '</div>'
          : '<div class="panel"><div class="empty">' +
            (liveTab === 'pending' ? 'Новых заявок нет' : liveTab === 'approved' ? 'Одобренных роликов нет' : 'Отклонённых заявок нет') +
            '</div></div>');

      ctx.viewEl.querySelectorAll('#live-tabs [data-tab]').forEach(function (b) {
        b.onclick = function () { liveTab = b.getAttribute('data-tab'); renderLive(ctx); };
      });

      var purge = document.getElementById('live-purge');
      if (purge) {
        purge.onclick = function () {
          if (!confirm('Удалить из хранилища файлы всех отклонённых роликов (' + toDelete + ')? Вернуть их будет нельзя.')) return;
          purge.disabled = true;
          AdminApi.purgeRejectedLive().then(function (res) {
            ctx.toast(res && res.ok === false ? 'Часть файлов не удалилась — повторите' : 'Файлы удалены: ' + ((res && res.deleted) || 0), res && res.ok === false);
            renderLive(ctx);
          }).catch(function (e) {
            purge.disabled = false;
            ctx.toast((e && e.message) || 'Не удалось удалить', true);
          });
        };
      }

      ctx.viewEl.querySelectorAll('[data-live]').forEach(function (btn) {
        btn.onclick = function () {
          var card = btn.closest('.live-req');
          var id = card.getAttribute('data-id');
          var act = btn.getAttribute('data-live');
          var run;
          if (act === 'approve') {
            var item = all.filter(function (x) { return String(x.id) === String(id); })[0];
            var offList = item && item.parishId === 'other';
            if (!confirm(offList
              ? 'Этого прихода нет в каталоге Католик.LIVE, поэтому ролик на сайте пока не появится: сначала приход нужно добавить. Всё равно одобрить?'
              : 'Одобрить ролик? Он появится на сайте в Католик.LIVE.')) return;
            run = AdminApi.decideLiveRequest(id, 'approve').then(function () { ctx.toast(offList ? 'Одобрено. На сайте появится, когда приход добавят в каталог' : 'Ролик на сайте'); });
          } else if (act === 'reject') {
            var reason = prompt('Причина отказа (по желанию). Файл останется в хранилище с пометкой «к удалению».', '');
            if (reason == null) return;
            run = AdminApi.decideLiveRequest(id, 'reject', reason).then(function () { ctx.toast('Отклонено — на сайте ролика нет'); });
          } else {
            if (!confirm('Удалить файл из хранилища насовсем?')) return;
            run = AdminApi.deleteLiveFile(id).then(function () { ctx.toast('Файл удалён'); });
          }
          btn.disabled = true;
          run.then(function () { renderLive(ctx); }).catch(function (e) {
            btn.disabled = false;
            ctx.toast((e && e.message) || 'Не получилось', true);
          });
        };
      });
    }).catch(function (e) {
      failed(ctx, title, e, function () { renderLive(ctx); });
    });
  }

  function renderRoute(name, id, ctx) {
    if ((name === 'dashboard' || name === 'publish') && AdminAuth.limited()) {
      renderLimitedHome(ctx);
      return true;
    }
    if (name === 'drafts') {
      renderDrafts(ctx);
      return true;
    }
    if (name === 'live-requests') {
      renderLive(ctx);
      return true;
    }
    return false;
  }

  global.AdminKeys = { renderRoute: renderRoute };
})(window);
