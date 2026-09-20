/**
 * «О проекте» — отдельная форма, не общий редактор страниц.
 */
(function (global) {
  'use strict';

  var PAGE_ID = 1900000009;
  var PAGE_SLUG = 'yak-about-data';
  var PORTAL = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
  if (PORTAL.slice(-1) !== '/') PORTAL += '/';

  var DEFAULT_LINKS = [
    { label: 'App Store', href: 'https://apps.apple.com/ru/app/%D1%8F%D0%BA%D0%B0%D1%82%D0%BE%D0%BB%D0%B8%D0%BA/id6742419988' },
    { label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=ru.yacatholic.mobile' },
    { label: 'FAQ', href: 'https://telegra.ph/CHasto-zadavaemye-voprosy-05-09-6' },
    { label: 'Поддержка', href: 'https://t.me/yacatholicapp' },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function defaults() {
    return (window.YakAbout && YakAbout.DEFAULTS) ? JSON.parse(JSON.stringify(YakAbout.DEFAULTS)) : {
      eyebrow: 'О проекте',
      titleHtml: '',
      cover: '',
      coverMobile: '',
      descriptionHtml: '',
      principlesTitle: 'Наша команда',
      principles: [],
      donate: { eyebrow: 'Поддержите нас', titleHtml: '', qrs: [{ image: '', label: 'Портал' }, { image: '', label: 'Приложение' }] },
      app: { eyebrow: 'Приложение', title: '', subtitle: '', html: '', photo: '', links: DEFAULT_LINKS.slice(), authors: [] },
      partnersTitle: 'С кем мы работаем',
      partners: [],
      contacts: [],
    };
  }

  function readDesk() {
    if (window.AdminDesk && AdminDesk.read) return AdminDesk.read();
    try { return JSON.parse(localStorage.getItem('yak_desk') || '{}') || {}; } catch (e) { return {}; }
  }

  function writeAbout(about) {
    if (window.AdminDesk && AdminDesk.read && AdminDesk.write) {
      var all = AdminDesk.read();
      all.about = about;
      AdminDesk.write(all);
      return;
    }
    var raw = readDesk();
    raw.about = about;
    localStorage.setItem('yak_desk', JSON.stringify(raw));
  }

  function current() {
    var base = defaults();
    var saved = readDesk().about;
    if (!saved) return base;
    var next = Object.assign({}, base, saved);
    next.principles = (saved.principles && saved.principles.length ? saved.principles : base.principles).slice();
    next.donate = Object.assign({}, base.donate, saved.donate || {});
    next.donate.qrs = ((saved.donate && saved.donate.qrs) || base.donate.qrs || []).slice();
    while (next.donate.qrs.length < 2) next.donate.qrs.push({ image: '', label: next.donate.qrs.length ? 'Приложение' : 'Портал' });
    next.app = Object.assign({}, base.app, saved.app || {});
    next.app.links = ((saved.app && saved.app.links && saved.app.links.length) ? saved.app.links : base.app.links).slice(0, 4);
    while (next.app.links.length < 4) next.app.links.push({ label: '', href: '' });
    next.app.authors = ((saved.app && saved.app.authors) || []).slice();
    next.partners = (saved.partners && saved.partners.length) ? saved.partners.slice() : base.partners.slice();
    next.contacts = (saved.contacts && saved.contacts.length) ? saved.contacts.slice() : base.contacts.slice();
    return next;
  }

  function upload(dataUrl, folder) {
    if (!dataUrl) return Promise.resolve('');
    if (dataUrl.indexOf('data:') !== 0) return Promise.resolve(dataUrl);
    if (window.AdminDesk && AdminDesk.uploadDataUrl) return AdminDesk.uploadDataUrl(dataUrl, folder || 'about');
    if (!window.AdminApi || !AdminApi.uploadMedia) return Promise.reject(new Error('нет соединения с сервером'));
    return AdminApi.uploadMedia({ dataUrl: dataUrl, folder: folder || 'about' }).then(function (pack) {
      if (!pack || !pack.url) throw new Error('сервер не вернул ссылку');
      return pack.url;
    });
  }

  function hoistHtml(html) {
    html = String(html || '');
    var found = [];
    html.replace(/src="(data:image[^"]+)"/g, function (_m, src) {
      if (found.indexOf(src) === -1) found.push(src);
      return _m;
    });
    if (!found.length) return Promise.resolve(html);
    var i = 0;
    function next() {
      if (i >= found.length) return Promise.resolve(html);
      var src = found[i++];
      return upload(src, 'inline').then(function (url) {
        html = html.split(src).join(url);
        return next();
      });
    }
    return next();
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function rteBar(id, withImage) {
    return (
      '<div class="rte">' +
      '<div class="rte-bar" data-rte="' + id + '">' +
      '<button type="button" data-cmd="bold">Жирный</button>' +
      '<button type="button" data-cmd="italic">Курсив</button>' +
      '<button type="button" data-cmd="insertUnorderedList">Список</button>' +
      '<button type="button" data-act="link">Ссылка</button>' +
      (withImage ? '<button type="button" data-act="image">Фото</button>' : '') +
      '</div>' +
      '<div class="rte-body" id="' + id + '" contenteditable="true"></div>' +
      '<input type="file" id="' + id + '-file" accept="image/*" hidden />' +
      '</div>'
    );
  }

  function mountRTE(id, toast) {
    var el = document.getElementById(id);
    var bar = document.querySelector('[data-rte="' + id + '"]');
    if (!el || !bar) return;
    bar.onclick = function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      el.focus();
      var cmd = btn.getAttribute('data-cmd');
      var act = btn.getAttribute('data-act');
      if (cmd) document.execCommand(cmd, false, null);
      if (act === 'link') {
        var href = prompt('Ссылка', 'https://');
        if (href) document.execCommand('createLink', false, href);
      }
      if (act === 'image') {
        var input = document.getElementById(id + '-file');
        if (!input) return;
        input.onchange = function () {
          var f = input.files && input.files[0];
          if (!f) return;
          toast('Сохраняем фото…');
          readFile(f).then(function (dataUrl) { return upload(dataUrl, 'inline'); }).then(function (url) {
            el.focus();
            document.execCommand('insertHTML', false, '<figure class="rte-figure"><img src="' + esc(url) + '" alt="" /></figure>');
          }).catch(function (err) { toast(err.message || 'Не удалось загрузить фото', true); });
          input.value = '';
        };
        input.click();
      }
    };
  }

  function bindPhoto(btnId, fileId, hiddenId, frameId, folder, toast) {
    var btn = document.getElementById(btnId);
    var file = document.getElementById(fileId);
    if (!btn || !file) return;
    btn.onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      toast('Сохраняем фото…');
      readFile(f).then(function (dataUrl) { return upload(dataUrl, folder); }).then(function (url) {
        var hidden = document.getElementById(hiddenId);
        if (hidden) hidden.value = url;
        var frame = document.getElementById(frameId);
        if (frame) {
          frame.classList.remove('is-empty');
          frame.innerHTML = '<img src="' + esc(url) + '" alt="" />';
        }
        toast('Фото в бакете');
      }).catch(function (err) { toast(err.message || 'Не удалось загрузить', true); });
    };
  }

  function personRows(list, prefix) {
    return (list.length ? list : [{ title: '', text: '', photo: '' }]).map(function (p, i) {
      return (
        '<div class="form-grid" data-' + prefix + '="' + i + '" style="margin-bottom:12px">' +
        '<input class="input" data-f="title" value="' + esc(p.title || '') + '" placeholder="Подпись" />' +
        '<textarea class="textarea" data-f="text" rows="2" placeholder="Текст">' + esc(p.text || '') + '</textarea>' +
        '<div class="field"><label>Фото — станет ч/б кружком</label>' +
        '<div class="cover-frame' + (p.photo ? '' : ' is-empty') + '" id="' + prefix + '-ph-' + i + '" style="width:72px;height:72px;border-radius:50%;overflow:hidden">' +
        (p.photo ? '<img src="' + esc(p.photo) + '" alt="" />' : '<span>Фото</span>') + '</div>' +
        '<input type="hidden" data-f="photo" value="' + esc(p.photo || '') + '" />' +
        '<button type="button" class="btn btn-ghost" data-ph-up="' + prefix + ':' + i + '">Загрузить</button>' +
        '<input type="file" accept="image/*" hidden data-ph-file="' + prefix + ':' + i + '" /></div>' +
        '<button type="button" class="btn btn-ghost" data-del-' + prefix + '="' + i + '">Убрать</button></div>'
      );
    }).join('');
  }

  function collectPeople(prefix) {
    var out = [];
    document.querySelectorAll('[data-' + prefix + ']').forEach(function (row) {
      var title = (row.querySelector('[data-f="title"]') || {}).value || '';
      var text = (row.querySelector('[data-f="text"]') || {}).value || '';
      var photo = (row.querySelector('[data-f="photo"]') || {}).value || '';
      if (title.trim() || text.trim() || photo) out.push({ title: title.trim(), text: text.trim(), photo: photo });
    });
    return out;
  }

  function partnersHtml(list) {
    return (list.length ? list : [{ name: '', href: '' }]).map(function (p, i) {
      return (
        '<div class="form-grid" data-partner="' + i + '" style="margin-bottom:8px">' +
        '<input class="input" data-f="name" value="' + esc(p.name || '') + '" placeholder="Название" />' +
        '<input class="input" data-f="href" value="' + esc(p.href || '') + '" placeholder="https://…" />' +
        '<button type="button" class="btn btn-ghost" data-del-partner="' + i + '">Убрать</button></div>'
      );
    }).join('');
  }

  function collectPartners() {
    var out = [];
    document.querySelectorAll('[data-partner]').forEach(function (row) {
      var name = (row.querySelector('[data-f="name"]') || {}).value || '';
      var href = (row.querySelector('[data-f="href"]') || {}).value || '';
      if (name.trim()) out.push({ name: name.trim(), href: href.trim() });
    });
    return out;
  }

  function collectContacts() {
    var out = [];
    document.querySelectorAll('[data-contact]').forEach(function (row) {
      var label = (row.querySelector('[data-f="label"]') || {}).value || '';
      var value = (row.querySelector('[data-f="value"]') || {}).value || '';
      var href = (row.querySelector('[data-f="href"]') || {}).value || '';
      var rte = row.querySelector('[data-f="html"]');
      var textHtml = rte ? rte.innerHTML : '';
      if (label.trim()) out.push({ label: label.trim(), value: value.trim(), href: href.trim(), textHtml: textHtml });
    });
    return out;
  }

  function collect(partners, principles, authors) {
    var desc = document.getElementById('ab-desc');
    var appHtml = document.getElementById('ab-app-html');
    var links = [0, 1, 2, 3].map(function (i) {
      return {
        label: ((document.getElementById('ab-app-l-' + i) || {}).value || '').trim(),
        href: ((document.getElementById('ab-app-h-' + i) || {}).value || '').trim(),
      };
    }).filter(function (l) { return l.label || l.href; });
    return {
      eyebrow: ((document.getElementById('ab-eye') || {}).value || '').trim(),
      titleHtml: ((document.getElementById('ab-title') || {}).value || '').trim(),
      cover: ((document.getElementById('ab-cover') || {}).value || '').trim(),
      coverMobile: ((document.getElementById('ab-cover-m') || {}).value || '').trim(),
      descriptionHtml: desc ? desc.innerHTML : '',
      principlesTitle: ((document.getElementById('ab-pr-title') || {}).value || '').trim(),
      principles: principles || collectPeople('team'),
      donate: {
        eyebrow: ((document.getElementById('ab-don-eye') || {}).value || '').trim(),
        titleHtml: ((document.getElementById('ab-don-title') || {}).value || '').trim(),
        qrs: [0, 1].map(function (i) {
          return {
            image: ((document.getElementById('ab-qr-' + i) || {}).value || '').trim(),
            label: ((document.getElementById('ab-qr-l-' + i) || {}).value || '').trim(),
          };
        }),
      },
      app: {
        eyebrow: ((document.getElementById('ab-app-eye') || {}).value || '').trim(),
        title: ((document.getElementById('ab-app-title') || {}).value || '').trim(),
        subtitle: ((document.getElementById('ab-app-sub') || {}).value || '').trim(),
        html: appHtml ? appHtml.innerHTML : '',
        photo: ((document.getElementById('ab-app-photo') || {}).value || '').trim(),
        links: links,
        authors: authors || collectPeople('appauth'),
      },
      partnersTitle: ((document.getElementById('ab-par-title') || {}).value || '').trim(),
      partners: partners || collectPartners(),
      contactsTitle: ((document.getElementById('ab-c-title') || {}).value || '').trim(),
      contacts: collectContacts(),
    };
  }

  function publish(data) {
    if (!window.AdminApi || !AdminApi.upsertArchive) {
      return Promise.reject(new Error('нет соединения с сервером'));
    }
    return AdminApi.upsertArchive({
      articles: [{
        id: PAGE_ID,
        slug: PAGE_SLUG,
        title: 'О проекте',
        date: todayIso(),
        modified: new Date().toISOString(),
        author: '',
        categories: [],
        categorySlugs: ['day-by-day'],
        excerpt: '',
        contentHtml: '<p></p>',
        contentText: JSON.stringify(data),
        source: 'desk-about',
      }],
    });
  }

  function photoCell(id, url, label, btn, file) {
    return (
      '<div class="field"><label>' + esc(label) + '</label>' +
      '<div class="cover-frame' + (url ? '' : ' is-empty') + '" id="' + id + '-frame">' +
      (url ? '<img src="' + esc(url) + '" alt="" />' : '<span>Нет фото</span>') + '</div>' +
      '<input type="hidden" id="' + id + '" value="' + esc(url || '') + '" />' +
      '<button type="button" class="btn btn-ghost" id="' + btn + '">Загрузить</button>' +
      '<input type="file" id="' + file + '" accept="image/*" hidden /></div>'
    );
  }

  function render(ctx) {
    var d = current();
    var partners = (d.partners || []).slice();
    if (!partners.length) partners = [{ name: '', href: '' }];
    var team = (d.principles || []).slice();
    if (!team.length) team = [{ title: '', text: '', photo: '' }];
    var appAuthors = ((d.app && d.app.authors) || []).slice();
    if (!appAuthors.length) appAuthors = [{ title: '', text: '', photo: '' }];
    var contacts = (d.contacts || []).slice();
    if (!contacts.length) contacts = [{ label: '', value: '', href: '', textHtml: '' }];
    var qrs = d.donate.qrs || [];
    var links = d.app.links || [];

    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>О проекте</h1><p>Команда, приложение, поддержка, партнёры и контакты.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="' + PORTAL + 'page.html" target="_blank" rel="noopener">На сайте</a>' +
      '<button type="button" class="btn btn-primary" id="ab-pub">Опубликовать</button>' +
      '</div></div>' +

      '<div class="panel" style="margin-bottom:12px">' +
      '<div class="form-grid">' +
      '<label class="field">Надзаголовок<input class="input" id="ab-eye" value="' + esc(d.eyebrow || '') + '" /></label>' +
      '<label class="field">Заголовок (можно с &lt;br&gt; и &lt;em&gt;)<textarea class="textarea" id="ab-title" rows="3">' + esc(d.titleHtml || '') + '</textarea></label>' +
      '</div>' +
      photoCell('ab-cover', d.cover, 'Обложка — десктоп', 'ab-cover-up', 'ab-cover-file') +
      photoCell('ab-cover-m', d.coverMobile, 'Обложка — телефон, кадр 4:5', 'ab-cover-m-up', 'ab-cover-m-file') +
      '<p class="hint-note">На телефоне берётся отдельный кадр. Если пусто — сайт подставит вертикальный WebP.</p>' +
      '<div class="field"><label>Описание</label>' + rteBar('ab-desc', true) + '</div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Наша команда</h2>' +
      '<button type="button" class="btn btn-ghost" id="ab-team-add">+ Блок</button></div>' +
      '<label class="field">Заголовок блока<input class="input" id="ab-pr-title" value="' + esc(d.principlesTitle || 'Наша команда') + '" /></label>' +
      '<div id="ab-team">' + personRows(team, 'team') + '</div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Приложение</h2></div>' +
      '<p class="hint-note">На сайте этот блок стоит выше поддержки и на всю ширину.</p>' +
      '<div class="form-grid">' +
      '<label class="field">Надзаголовок<input class="input" id="ab-app-eye" value="' + esc(d.app.eyebrow || '') + '" /></label>' +
      '<label class="field">Заголовок<input class="input" id="ab-app-title" value="' + esc(d.app.title || '') + '" /></label>' +
      '<label class="field">Подзаголовок<input class="input" id="ab-app-sub" value="' + esc(d.app.subtitle || '') + '" /></label>' +
      '</div>' +
      photoCell('ab-app-photo', d.app.photo, 'Фото блока', 'ab-app-up', 'ab-app-file') +
      '<div class="form-grid">' +
      [0, 1, 2, 3].map(function (i) {
        var l = links[i] || { label: '', href: '' };
        return '<label class="field">Ссылка ' + (i + 1) +
          '<input class="input" id="ab-app-l-' + i + '" value="' + esc(l.label || '') + '" placeholder="App Store" />' +
          '<input class="input" id="ab-app-h-' + i + '" value="' + esc(l.href || '') + '" placeholder="https://" /></label>';
      }).join('') +
      '</div>' +
      '<div class="field"><label>Текст</label>' + rteBar('ab-app-html', true) + '</div>' +
      '<div class="panel-head"><h3>Авторы приложения</h3>' +
      '<button type="button" class="btn btn-ghost" id="ab-appauth-add">+ Блок</button></div>' +
      '<div id="ab-appauth">' + personRows(appAuthors, 'appauth') + '</div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Поддержите нас</h2></div>' +
      '<p class="hint-note">Блок стоит под приложением. Два QR в ряд — для портала и для приложения.</p>' +
      '<div class="form-grid">' +
      '<label class="field">Надзаголовок<input class="input" id="ab-don-eye" value="' + esc(d.donate.eyebrow || '') + '" /></label>' +
      '<label class="field">Заголовок<textarea class="textarea" id="ab-don-title" rows="2">' + esc(d.donate.titleHtml || '') + '</textarea></label>' +
      '</div>' +
      '<div class="form-grid">' +
      [0, 1].map(function (i) {
        var q = qrs[i] || { image: '', label: i ? 'Приложение' : 'Портал' };
        return photoCell('ab-qr-' + i, q.image, 'QR ' + (i + 1), 'ab-qr-up-' + i, 'ab-qr-file-' + i) +
          '<label class="field">Подпись QR ' + (i + 1) + '<input class="input" id="ab-qr-l-' + i + '" value="' + esc(q.label || '') + '" /></label>';
      }).join('') +
      '</div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Партнёры</h2>' +
      '<button type="button" class="btn btn-ghost" id="ab-par-add">+ Партнёр</button></div>' +
      '<label class="field">Заголовок<input class="input" id="ab-par-title" value="' + esc(d.partnersTitle || '') + '" /></label>' +
      '<div id="ab-partners">' + partnersHtml(partners) + '</div></div>' +

      '<div class="panel"><div class="panel-head"><h2>Контакты</h2>' +
      '<button type="button" class="btn btn-ghost" id="ab-c-add">+ Блок</button></div>' +
      '<p class="hint-note">Верстка как у партнёров. Для «Мы в соцсетях» ссылки добавляйте в текст, поле mailto не нужно.</p>' +
      '<label class="field">Заголовок<input class="input" id="ab-c-title" value="' + esc(d.contactsTitle || 'Написать редакции') + '" /></label>' +
      '<div id="ab-contacts">' + contacts.map(function (c, i) {
        return (
          '<div class="form-grid" data-contact="' + i + '" style="margin-bottom:8px">' +
          '<input class="input" data-f="label" value="' + esc(c.label || '') + '" placeholder="Подпись" />' +
          '<input class="input" data-f="value" value="' + esc(c.value || '') + '" placeholder="Короткий текст" />' +
          '<input class="input" data-f="href" value="' + esc(c.href || '') + '" placeholder="https:// если одна ссылка" />' +
          '<div class="field"><label>Текст со ссылками</label>' + rteBar('ab-c-html-' + i, false) + '</div>' +
          '<button type="button" class="btn btn-ghost" data-del-contact="' + i + '">Убрать</button></div>'
        );
      }).join('') + '</div></div>';

    document.getElementById('ab-desc').innerHTML = d.descriptionHtml || '';
    document.getElementById('ab-app-html').innerHTML = d.app.html || '';
    mountRTE('ab-desc', ctx.toast);
    mountRTE('ab-app-html', ctx.toast);
    contacts.forEach(function (c, i) {
      var el = document.getElementById('ab-c-html-' + i);
      if (el) {
        el.setAttribute('data-f', 'html');
        el.innerHTML = c.textHtml || c.value || '';
        mountRTE('ab-c-html-' + i, ctx.toast);
      }
    });
    bindPhoto('ab-cover-up', 'ab-cover-file', 'ab-cover', 'ab-cover-frame', 'about', ctx.toast);
    bindPhoto('ab-cover-m-up', 'ab-cover-m-file', 'ab-cover-m', 'ab-cover-m-frame', 'about', ctx.toast);
    bindPhoto('ab-app-up', 'ab-app-file', 'ab-app-photo', 'ab-app-photo-frame', 'about', ctx.toast);
    bindPhoto('ab-qr-up-0', 'ab-qr-file-0', 'ab-qr-0', 'ab-qr-0-frame', 'about', ctx.toast);
    bindPhoto('ab-qr-up-1', 'ab-qr-file-1', 'ab-qr-1', 'ab-qr-1-frame', 'about', ctx.toast);

    function bindPeople(prefix) {
      ctx.viewEl.querySelectorAll('[data-ph-up]').forEach(function (btn) {
        var key = btn.getAttribute('data-ph-up');
        if (!key || key.indexOf(prefix + ':') !== 0) return;
        var file = ctx.viewEl.querySelector('[data-ph-file="' + key + '"]');
        var row = btn.closest('[data-' + prefix + ']');
        if (!file || !row) return;
        btn.onclick = function () { file.click(); };
        file.onchange = function () {
          var f = file.files && file.files[0];
          if (!f) return;
          ctx.toast('Сохраняем фото…');
          readFile(f).then(function (dataUrl) { return upload(dataUrl, 'about'); }).then(function (url) {
            var hidden = row.querySelector('[data-f="photo"]');
            if (hidden) hidden.value = url;
            var i = key.split(':')[1];
            var frame = document.getElementById(prefix + '-ph-' + i);
            if (frame) {
              frame.classList.remove('is-empty');
              frame.innerHTML = '<img src="' + esc(url) + '" alt="" />';
            }
          }).catch(function (err) { ctx.toast(err.message || 'Не удалось загрузить', true); });
        };
      });
      ctx.viewEl.querySelectorAll('[data-del-' + prefix + ']').forEach(function (btn) {
        btn.onclick = function () {
          var list = collectPeople(prefix);
          list.splice(Number(btn.getAttribute('data-del-' + prefix)), 1);
          document.getElementById(prefix === 'team' ? 'ab-team' : 'ab-appauth').innerHTML = personRows(list, prefix);
          bindPeople(prefix);
        };
      });
    }
    bindPeople('team');
    bindPeople('appauth');
    document.getElementById('ab-team-add').onclick = function () {
      var list = collectPeople('team');
      list.push({ title: '', text: '', photo: '' });
      document.getElementById('ab-team').innerHTML = personRows(list, 'team');
      bindPeople('team');
    };
    document.getElementById('ab-appauth-add').onclick = function () {
      var list = collectPeople('appauth');
      list.push({ title: '', text: '', photo: '' });
      document.getElementById('ab-appauth').innerHTML = personRows(list, 'appauth');
      bindPeople('appauth');
    };

    function bindPartnerDel() {
      ctx.viewEl.querySelectorAll('[data-del-partner]').forEach(function (btn) {
        btn.onclick = function () {
          partners = collectPartners();
          partners.splice(Number(btn.getAttribute('data-del-partner')), 1);
          document.getElementById('ab-partners').innerHTML = partnersHtml(partners);
          bindPartnerDel();
        };
      });
    }
    bindPartnerDel();
    document.getElementById('ab-par-add').onclick = function () {
      partners = collectPartners();
      partners.push({ name: '', href: '' });
      document.getElementById('ab-partners').innerHTML = partnersHtml(partners);
      bindPartnerDel();
    };

    document.getElementById('ab-c-add').onclick = function () {
      ctx.toast('Сохраните и откройте снова, чтобы добавить ещё один контакт — или заполните пустую строку ниже.', false);
    };

    document.getElementById('ab-pub').onclick = function () {
      var data = collect(collectPartners(), collectPeople('team'), collectPeople('appauth'));
      ctx.toast('Сохраняем фото…');
      hoistHtml(data.descriptionHtml).then(function (html) {
        data.descriptionHtml = html;
        return hoistHtml(data.app.html);
      }).then(function (html) {
        data.app.html = html;
        writeAbout(data);
        return publish(data);
      }).then(function () {
        ctx.toast('Страница на сайте');
      }).catch(function (e) {
        ctx.toast(e.message || 'Не удалось опубликовать', true);
      });
    };
  }

  global.AdminAbout = { render: render };
})(window);
