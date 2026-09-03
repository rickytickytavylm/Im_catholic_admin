/**
 * Админка фотостока: карточки фотографов, загрузка, модерация.
 */
(function (global) {
  'use strict';

  var MAX_PER_DAY = 50;
  var MAX_BYTES = 5 * 1024 * 1024;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function canManageCards(session, role) {
    return !!(role.canManagePhotographers || session.role === 'super' || session.role === 'chief' || session.role === 'photo_editor');
  }

  function renderPhotographers(ctx) {
    var viewEl = ctx.viewEl;
    var session = ctx.session;
    var role = ctx.role;
    var toast = ctx.toast;
    var go = ctx.go;

    if (!canManageCards(session, role)) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа</div></div>';
      return;
    }

    var rows = AdminStore.listPhotographers().slice().sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Фотографы</h1><p>Карточки фотографов портала.</p></div>' +
      '<div class="topbar-actions"><button type="button" class="btn btn-primary" id="ph-add">Добавить карточку</button></div></div>' +
      '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Имя</th><th>Дата</th><th>Тег</th><th>Email</th><th></th></tr></thead><tbody>' +
      (rows.map(function (p) {
        return (
          '<tr><td><strong>' + esc(p.name) + '</strong><div><code>' + esc(p.slug) + '</code></div></td>' +
          '<td>' + esc(fmtDate(p.createdAt)) + '</td>' +
          '<td>#' + esc(p.tagSlug || (p.slug + '-photos')) + '</td>' +
          '<td>' + esc(p.email || '—') + '</td>' +
          '<td class="row-actions">' +
          '<button type="button" class="btn btn-ghost" data-edit="' + esc(p.id) + '">Редактировать</button>' +
          '<button type="button" class="btn btn-danger" data-del="' + esc(p.id) + '">Удалить</button>' +
          '</td></tr>'
        );
      }).join('') || '<tr><td colspan="5" class="empty">Нет карточек</td></tr>') +
      '</tbody></table></div></div>';

    document.getElementById('ph-add').onclick = function () { go('photographer-edit', 'new'); };
    viewEl.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.onclick = function () { go('photographer-edit', btn.getAttribute('data-edit')); };
    });
    viewEl.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('Удалить карточку фотографа?')) return;
        AdminStore.deletePhotographer(btn.getAttribute('data-del'), session.email);
        toast('Удалено');
        renderPhotographers(ctx);
      };
    });
  }

  function renderPhotographerEdit(ctx, id) {
    var viewEl = ctx.viewEl;
    var session = ctx.session;
    var role = ctx.role;
    var toast = ctx.toast;
    var go = ctx.go;

    var isNew = id === 'new' || !id;
    var ph = isNew
      ? {
          id: AdminStore.uid('ph'),
          name: '',
          slug: '',
          email: '',
          photo: '',
          bio: '',
          social: { vk: '', tg: '', max: '', pinterest: '', site: '' },
          tagSlug: '',
        }
      : AdminStore.getPhotographer(id);

    if (!ph) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Не найдено</div></div>';
      return;
    }

    var linked = String(ph.email || '').toLowerCase() === String(session.email || '').toLowerCase();
    var canEdit = canManageCards(session, role) || linked;
    if (!canEdit) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа</div></div>';
      return;
    }

    viewEl.innerHTML =
      '<div class="topbar"><div><h1>' + (isNew ? 'Новая карточка' : 'Карточка фотографа') + '</h1></div>' +
      '<div class="topbar-actions"><a class="btn btn-ghost" href="#photographers">Назад</a>' +
      '<button type="button" class="btn btn-primary" id="ph-save">Сохранить</button></div></div>' +
      '<div class="panel form-grid">' +
      '<label>Имя и фамилия<input class="input" id="ph-name" value="' + esc(ph.name) + '" /></label>' +
      '<label>Slug<input class="input" id="ph-slug" value="' + esc(ph.slug) + '" /></label>' +
      '<label>Email<input class="input" id="ph-email" value="' + esc(ph.email || '') + '" ' +
      (canManageCards(session, role) ? '' : 'readonly') + ' /></label>' +
      '<label>Фото (файл)<input class="input" type="file" id="ph-photo-file" accept="image/*" /></label>' +
      '<div id="ph-photo-preview">' +
      (ph.photo
        ? '<img src="' + esc(ph.photo) + '" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;filter:grayscale(1)" />'
        : '<span class="author-ava initials" style="display:inline-grid;place-items:center;width:72px;height:72px;border-radius:50%;background:#ddd">' +
          esc((ph.name || '?').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase()) +
          '</span>') +
      '</div>' +
      '<label>Биография<textarea class="input" id="ph-bio" rows="5">' + esc(ph.bio || '') + '</textarea></label>' +
      '<label>ВК<input class="input" id="ph-vk" value="' + esc((ph.social && ph.social.vk) || '') + '" /></label>' +
      '<label>ТГ<input class="input" id="ph-tg" value="' + esc((ph.social && ph.social.tg) || '') + '" /></label>' +
      '<label>Макс<input class="input" id="ph-max" value="' + esc((ph.social && ph.social.max) || '') + '" /></label>' +
      '<label>Pinterest<input class="input" id="ph-pin" value="' + esc((ph.social && ph.social.pinterest) || '') + '" /></label>' +
      '<label>Личный сайт<input class="input" id="ph-site" value="' + esc((ph.social && ph.social.site) || '') + '" /></label>' +
      '<p class="hint-note">Тег фотографа: <code>#' + esc(ph.tagSlug || (ph.slug ? ph.slug + '-photos' : '…-photos')) + '</code>. Чтобы снимки появились на сайте, загрузите их ниже и откройте портал с того же адреса, что и редакция.</p>' +
      '</div>' +
      '<div class="panel post-card" style="margin-top:14px">' +
      '<h3>Фото этого фотографа</h3>' +
      '<p class="hint-note">Загрузка сразу на карточку. Редактор публикует без отдельной модерации.</p>' +
      '<input type="file" id="ph-works" accept="image/*" multiple />' +
      '<div id="ph-works-list" class="photo-grid" style="margin-top:12px"></div>' +
      '</div>';

    var photoData = ph.photo || '';
    document.getElementById('ph-name').addEventListener('input', function () {
      var slugEl = document.getElementById('ph-slug');
      if (!slugEl.dataset.touched) slugEl.value = AdminStore.slugify(this.value);
    });
    document.getElementById('ph-slug').addEventListener('input', function () {
      this.dataset.touched = '1';
    });
    document.getElementById('ph-photo-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > MAX_BYTES) {
        toast('Файл тяжелее 5 Мб', true);
        return;
      }
      readFile(file).then(function (url) {
        photoData = url;
        document.getElementById('ph-photo-preview').innerHTML =
          '<img src="' + esc(url) + '" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;filter:grayscale(1)" />';
      });
    });

    document.getElementById('ph-save').onclick = function () {
      var name = document.getElementById('ph-name').value.trim();
      if (!name) { toast('Укажите имя', true); return; }
      var slug = document.getElementById('ph-slug').value.trim() || AdminStore.slugify(name);
      ph.name = name;
      ph.slug = slug;
      ph.tagSlug = slug + '-photos';
      ph.email = document.getElementById('ph-email').value.trim();
      ph.photo = photoData;
      ph.bio = document.getElementById('ph-bio').value.trim();
      ph.social = {
        vk: document.getElementById('ph-vk').value.trim(),
        tg: document.getElementById('ph-tg').value.trim(),
        max: document.getElementById('ph-max').value.trim(),
        pinterest: document.getElementById('ph-pin').value.trim(),
        site: document.getElementById('ph-site').value.trim(),
      };
      AdminStore.upsertPhotographer(ph, session.email);
      try {
        var desk = JSON.parse(localStorage.getItem('yak_desk') || '{}');
        desk.photographers = desk.photographers || [];
        var found = false;
        desk.photographers.forEach(function (row, i) {
          if (row.id === ph.id || row.slug === ph.slug) {
            desk.photographers[i] = ph;
            found = true;
          }
        });
        if (!found) desk.photographers.unshift(ph);
        localStorage.setItem('yak_desk', JSON.stringify(desk));
      } catch (e) {}
      toast('Сохранено. Карточка доступна на портале.');
      go('photographers');
    };

    function paintWorks() {
      var box = document.getElementById('ph-works-list');
      if (!box) return;
      var mine = AdminStore.listPhotos().filter(function (p) {
        return p.photographerId === ph.id || p.photographerSlug === ph.slug;
      });
      box.innerHTML = mine.map(function (p) {
        return '<div class="photo-card"><div class="ph" style="background-image:url(\'' + esc(p.url || p.thumb || '').replace(/'/g, '%27') + '\')"></div></div>';
      }).join('') || '<p class="hint-note">Пока нет снимков у этой карточки.</p>';
    }
    paintWorks();
    var works = document.getElementById('ph-works');
    if (works) works.onchange = function () {
      var files = [].slice.call(works.files || []);
      files.forEach(function (file) {
        if (file.size > MAX_BYTES) return;
        readFile(file).then(function (url) {
          AdminStore.upsertMedia({
            id: AdminStore.uid('media'),
            kind: 'image',
            title: file.name,
            url: url,
            thumb: url,
            status: 'approved',
            photographerId: ph.id,
            photographerSlug: ph.slug,
            photographerName: ph.name,
            photographerTag: ph.tagSlug || (ph.slug + '-photos'),
            tags: [ph.tagSlug || (ph.slug + '-photos')],
            ownerEmail: session.email,
            createdAt: new Date().toISOString(),
          }, session.email);
          paintWorks();
        });
      });
      works.value = '';
      toast('Фото добавлены на карточку');
    };
  }

  function renderModeration(ctx) {
    var viewEl = ctx.viewEl;
    var session = ctx.session;
    var role = ctx.role;
    var toast = ctx.toast;

    if (!(role.canModerateMedia || role.photostockFull)) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа</div></div>';
      return;
    }

    function paint() {
      var pending = AdminStore.listPhotos().filter(function (p) { return p.status === 'pending'; });
      viewEl.innerHTML =
        '<div class="topbar"><div><h1>Модерация фото</h1><p>Очередь снимков на публикацию.</p></div></div>' +
        '<div class="panel"><div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Превью</th><th>Фотограф / тег</th><th>Теги</th><th></th></tr></thead><tbody>' +
        (pending.map(function (p) {
          return (
            '<tr data-id="' + esc(p.id) + '">' +
            '<td><div class="ph" style="width:72px;height:72px;border-radius:8px;background-size:cover;background-position:center;' +
            (p.url ? 'background-image:url(\'' + esc(p.url).replace(/'/g, '%27') + '\')' : '') + '"></div></td>' +
            '<td>' + esc(p.photographerName || p.ownerName || '—') +
            '<div><small>#' + esc(p.photographerTag || '') + '</small></div></td>' +
            '<td>' + esc((p.tags || []).join(', ')) + '</td>' +
            '<td class="row-actions">' +
            '<button type="button" class="btn btn-ghost" data-act="tags">Теги</button>' +
            '<button type="button" class="btn btn-primary" data-act="ok">Опубликовать</button>' +
            '<button type="button" class="btn btn-danger" data-act="del">Удалить</button>' +
            '</td></tr>'
          );
        }).join('') || '<tr><td colspan="4" class="empty">Очередь пуста</td></tr>') +
        '</tbody></table></div></div>';

      viewEl.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.onclick = function () {
          var id = btn.closest('tr').getAttribute('data-id');
          var item = AdminStore.getMedia(id);
          if (!item) return;
          var act = btn.getAttribute('data-act');
          if (act === 'tags') {
            var tags = prompt('Теги через запятую', (item.tags || []).join(', '));
            if (tags == null) return;
            item.tags = tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
            AdminStore.upsertMedia(item, session.email);
            toast('Теги обновлены');
            paint();
          } else if (act === 'ok') {
            item.status = 'approved';
            AdminStore.upsertMedia(item, session.email);
            toast('Опубликовано');
            paint();
          } else if (act === 'del') {
            if (!confirm('Удалить фото?')) return;
            AdminStore.deleteMedia(id, session.email);
            toast('Удалено');
            paint();
          }
        };
      });
    }
    paint();
  }

  function renderMyPage(ctx) {
    var ph = AdminStore.getPhotographerByEmail(ctx.session.email);
    if (!ph) {
      ctx.viewEl.innerHTML =
        '<div class="panel"><div class="empty">Карточка фотографа не привязана к ' +
        esc(ctx.session.email) +
        '. Попросите фоторедактора создать карточку.</div></div>';
      return;
    }
    renderPhotographerEdit(ctx, ph.id);
  }

  function renderUpload(ctx) {
    var viewEl = ctx.viewEl;
    var session = ctx.session;
    var toast = ctx.toast;
    var ph = AdminStore.getPhotographerByEmail(session.email);
    if (!ph) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет привязанной карточки фотографа</div></div>';
      return;
    }

    var used = AdminStore.uploadsToday(session.email);
    var batch = [];

    function paintOwnTable() {
      var mine = AdminStore.listPhotos().filter(function (p) {
        return p.ownerEmail === session.email || p.photographerId === ph.id;
      });
      var body = document.getElementById('my-photos-body');
      if (!body) return;
      body.innerHTML =
        mine
          .map(function (p) {
            return (
              '<tr data-id="' + esc(p.id) + '">' +
              '<td><div style="width:64px;height:64px;border-radius:8px;background-size:cover;background-position:center;' +
              (p.url ? 'background-image:url(\'' + esc(p.url).replace(/'/g, '%27') + '\')' : '') + '"></div></td>' +
              '<td>' + esc((p.tags || []).join(', ') || '—') + '</td>' +
              '<td>' + esc(fmtDate(p.createdAt)) + '</td>' +
              '<td>' + esc(p.status) + '</td>' +
              '<td class="row-actions">' +
              '<button type="button" class="btn btn-ghost" data-act="edit">Теги</button>' +
              '<button type="button" class="btn btn-danger" data-act="del">Удалить</button>' +
              '</td></tr>'
            );
          })
          .join('') || '<tr><td colspan="5" class="empty">Нет загрузок</td></tr>';

      body.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.onclick = function () {
          var id = btn.closest('tr').getAttribute('data-id');
          var item = AdminStore.getMedia(id);
          if (!item) return;
          if (btn.getAttribute('data-act') === 'edit') {
            var tags = prompt('Теги через запятую', (item.tags || []).join(', '));
            if (tags == null) return;
            item.tags = tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
            // повторная модерация не нужна
            AdminStore.upsertMedia(item, session.email);
            toast('Теги сохранены');
            paintOwnTable();
          } else {
            if (!confirm('Удалить?')) return;
            AdminStore.deleteMedia(id, session.email);
            toast('Удалено');
            paintOwnTable();
          }
        };
      });
    }

    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Загрузить фото</h1><p>До ' +
      MAX_PER_DAY +
      ' файлов в сутки, не более 5 Мб. Сегодня: ' +
      used +
      ' из ' +
      MAX_PER_DAY +
      '.</p></div>' +
      '<div class="topbar-actions">' +
      '<button type="button" class="btn btn-ghost" id="btn-my-page">Моя страница</button>' +
      '<button type="button" class="btn btn-primary" id="btn-pick">Загрузить фото</button>' +
      '</div></div>' +
      '<input type="file" id="file-input" accept="image/*" multiple hidden />' +
      '<div class="panel" id="upload-panel"><p class="hint-note">Выберите файлы и укажите теги.</p></div>' +
      '<div class="panel" style="margin-top:14px"><div class="panel-head"><h2>Мои загрузки</h2></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Превью</th><th>Теги</th><th>Дата</th><th>Статус</th><th></th></tr></thead>' +
      '<tbody id="my-photos-body"></tbody></table></div></div>';

    document.getElementById('btn-my-page').onclick = function () {
      location.hash = 'my-page';
    };

    document.getElementById('btn-pick').onclick = function () {
      document.getElementById('file-input').click();
    };

    document.getElementById('file-input').onchange = function (e) {
      var files = [].slice.call(e.target.files || []);
      if (!files.length) return;
      var left = MAX_PER_DAY - AdminStore.uploadsToday(session.email);
      if (files.length > left) {
        toast('Не больше ' + MAX_PER_DAY + ' фото в сутки. Осталось: ' + Math.max(0, left), true);
        return;
      }
      var heavy = files.filter(function (f) { return f.size > MAX_BYTES; });
      if (heavy.length) {
        toast('Есть файлы тяжелее 5 Мб — уберите их', true);
        return;
      }

      var panel = document.getElementById('upload-panel');
      panel.innerHTML = '<p class="hint-note">Загрузка… 0 / ' + files.length + '</p>';
      batch = [];
      var i = 0;

      function next() {
        if (i >= files.length) {
          AdminStore.addUploadCount(session.email, files.length);
          panel.innerHTML =
            '<p class="hint-note">Файлы загружены. Укажите 5–7 тегов через запятую.</p>' +
            '<div class="table-wrap"><table class="data"><thead><tr><th>Превью</th><th>Теги</th></tr></thead><tbody>' +
            batch
              .map(function (item, idx) {
                return (
                  '<tr><td><div style="width:72px;height:72px;border-radius:8px;background-size:cover;background-image:url(\'' +
                  esc(item.url).replace(/'/g, '%27') +
                  '\')"></div></td>' +
                  '<td><input class="input" data-batch="' +
                  idx +
                  '" placeholder="храм, месса, москва…" value="' +
                  esc((item.tags || []).join(', ')) +
                  '" /></td></tr>'
                );
              })
              .join('') +
            '</tbody></table></div>' +
            '<div style="padding:12px 16px"><button type="button" class="btn btn-primary" id="save-batch">Сохранить всё</button></div>';

          document.getElementById('save-batch').onclick = function () {
            panel.querySelectorAll('[data-batch]').forEach(function (inp) {
              var idx = Number(inp.getAttribute('data-batch'));
              var tags = inp.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
              batch[idx].tags = tags;
              AdminStore.upsertMedia(batch[idx], session.email);
            });
            toast('Отправлено на модерацию');
            batch = [];
            paintOwnTable();
            panel.innerHTML = '<p class="hint-note">Отправлено на модерацию.</p>';
          };
          return;
        }

        var file = files[i];
        panel.innerHTML = '<p class="hint-note">Загрузка… ' + (i + 1) + ' / ' + files.length + ' — ' + esc(file.name) + '</p>';
        readFile(file)
          .then(function (url) {
            var item = {
              id: AdminStore.uid('media'),
              kind: 'image',
              title: file.name,
              url: url,
              ownerEmail: session.email,
              ownerName: ph.name,
              photographerId: ph.id,
              photographerSlug: ph.slug,
              photographerName: ph.name,
              photographerTag: ph.tagSlug,
              status: 'pending',
              tags: [ph.tagSlug].filter(Boolean),
              license: 'CC BY 4.0',
              createdAt: new Date().toISOString(),
            };
            AdminStore.upsertMedia(item, session.email);
            batch.push(item);
            i += 1;
            next();
          })
          .catch(function () {
            toast('Ошибка чтения ' + file.name, true);
            i += 1;
            next();
          });
      }
      next();
    };

    paintOwnTable();
  }

  function renderRoute(name, id, ctx) {
    if (name === 'photographers') {
      renderPhotographers(ctx);
      return true;
    }
    if (name === 'photographer-edit') {
      renderPhotographerEdit(ctx, id);
      return true;
    }
    if (name === 'photo-moderation') {
      renderModeration(ctx);
      return true;
    }
    if (name === 'my-page') {
      renderMyPage(ctx);
      return true;
    }
    if (name === 'upload-photos') {
      renderUpload(ctx);
      return true;
    }
    return false;
  }

  global.AdminPhotostock = {
    renderRoute: renderRoute,
    NAV_EXTRA: [
      { id: 'photographers', title: 'Карточки фотографов' },
      { id: 'photographer-edit', title: 'Карточка', hidden: true },
      { id: 'photo-moderation', title: 'Модерация фото' },
      { id: 'my-page', title: 'Моя страница' },
      { id: 'upload-photos', title: 'Загрузить фото' },
    ],
  };
})(window);
