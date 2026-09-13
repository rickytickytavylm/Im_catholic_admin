/**
 * «О проекте» — отдельная форма, не общий редактор страниц.
 */
(function (global) {
  'use strict';

  var PAGE_ID = 1900000009;
  var PAGE_SLUG = 'yak-about-data';
  var PORTAL = (window.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
  if (PORTAL.slice(-1) !== '/') PORTAL += '/';

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
      descriptionHtml: '',
      principlesTitle: 'Во что мы верим как редакция',
      principles: [{ title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }],
      donate: { eyebrow: 'Поддержите нас', titleHtml: '', text: '', mailto: 'mailto:red@yacatholic.ru' },
      app: { eyebrow: 'Приложение', title: '', html: '', photo: '' },
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
    next.principles = (saved.principles && saved.principles.length ? saved.principles : base.principles).slice(0, 4);
    while (next.principles.length < 4) next.principles.push({ title: '', text: '' });
    next.donate = Object.assign({}, base.donate, saved.donate || {});
    next.app = Object.assign({}, base.app, saved.app || {});
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

  function rteBar(id) {
    return (
      '<div class="rte">' +
      '<div class="rte-bar" data-rte="' + id + '">' +
      '<button type="button" data-cmd="bold">Жирный</button>' +
      '<button type="button" data-cmd="italic">Курсив</button>' +
      '<button type="button" data-block="h2">Заголовок</button>' +
      '<button type="button" data-block="quote">Цитата</button>' +
      '<button type="button" data-cmd="insertUnorderedList">Список</button>' +
      '<button type="button" data-act="link">Ссылка</button>' +
      '<button type="button" data-act="image">Фото</button>' +
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
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      var box = document.createElement('div');
      if (/<[a-z][\s\S]*>/i.test(html)) box.innerHTML = html;
      else box.innerHTML = '<p>' + esc(html).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      box.querySelectorAll('script,style').forEach(function (n) { n.remove(); });
      document.execCommand('insertHTML', false, box.innerHTML);
    });
    bar.onclick = function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      el.focus();
      var cmd = btn.getAttribute('data-cmd');
      var block = btn.getAttribute('data-block');
      var act = btn.getAttribute('data-act');
      if (cmd) document.execCommand(cmd, false, null);
      if (block === 'h2') document.execCommand('formatBlock', false, 'h2');
      if (block === 'quote') document.execCommand('formatBlock', false, 'blockquote');
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

  function collect(partners) {
    var desc = document.getElementById('ab-desc');
    var appHtml = document.getElementById('ab-app-html');
    var principles = [0, 1, 2, 3].map(function (i) {
      return {
        title: ((document.getElementById('ab-pr-t-' + i) || {}).value || '').trim(),
        text: ((document.getElementById('ab-pr-x-' + i) || {}).value || '').trim(),
      };
    });
    var contacts = [0, 1, 2].map(function (i) {
      return {
        label: ((document.getElementById('ab-c-l-' + i) || {}).value || '').trim(),
        value: ((document.getElementById('ab-c-v-' + i) || {}).value || '').trim(),
        href: ((document.getElementById('ab-c-h-' + i) || {}).value || '').trim(),
      };
    }).filter(function (c) { return c.label; });
    return {
      eyebrow: ((document.getElementById('ab-eye') || {}).value || '').trim(),
      titleHtml: ((document.getElementById('ab-title') || {}).value || '').trim(),
      cover: ((document.getElementById('ab-cover') || {}).value || '').trim(),
      descriptionHtml: desc ? desc.innerHTML : '',
      principlesTitle: ((document.getElementById('ab-pr-title') || {}).value || '').trim(),
      principles: principles,
      donate: {
        eyebrow: ((document.getElementById('ab-don-eye') || {}).value || '').trim(),
        titleHtml: ((document.getElementById('ab-don-title') || {}).value || '').trim(),
        text: ((document.getElementById('ab-don-text') || {}).value || '').trim(),
        mailto: ((document.getElementById('ab-don-mail') || {}).value || '').trim(),
      },
      app: {
        eyebrow: ((document.getElementById('ab-app-eye') || {}).value || '').trim(),
        title: ((document.getElementById('ab-app-title') || {}).value || '').trim(),
        html: appHtml ? appHtml.innerHTML : '',
        photo: ((document.getElementById('ab-app-photo') || {}).value || '').trim(),
      },
      partnersTitle: ((document.getElementById('ab-par-title') || {}).value || '').trim(),
      partners: partners || collectPartners(),
      contacts: contacts,
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

  function render(ctx) {
    var d = current();
    var partners = (d.partners || []).slice();
    if (!partners.length) partners = [{ name: '', href: '' }];
    var contacts = d.contacts || [];
    while (contacts.length < 3) contacts.push({ label: '', value: '', href: '' });

    ctx.viewEl.innerHTML =
      '<div class="topbar"><div><h1>О проекте</h1><p>Обложка, текст, принципы, поддержка, приложение, партнёры и контакты.</p></div>' +
      '<div class="topbar-actions">' +
      '<a class="btn btn-ghost" href="' + PORTAL + 'page.html" target="_blank" rel="noopener">На сайте</a>' +
      '<button type="button" class="btn btn-primary" id="ab-pub">Опубликовать</button>' +
      '</div></div>' +

      '<div class="panel" style="margin-bottom:12px">' +
      '<div class="form-grid">' +
      '<label class="field">Надзаголовок<input class="input" id="ab-eye" value="' + esc(d.eyebrow || '') + '" /></label>' +
      '<label class="field">Заголовок (можно с &lt;br&gt; и &lt;em&gt;)<textarea class="textarea" id="ab-title" rows="3">' + esc(d.titleHtml || '') + '</textarea></label>' +
      '</div>' +
      '<div class="field"><label>Обложка</label>' +
      '<div class="cover-frame' + (d.cover ? '' : ' is-empty') + '" id="ab-cover-frame">' +
      (d.cover ? '<img src="' + esc(d.cover) + '" alt="" />' : '<span>Нет фото</span>') + '</div>' +
      '<input type="hidden" id="ab-cover" value="' + esc(d.cover || '') + '" />' +
      '<button type="button" class="btn btn-ghost" id="ab-cover-up">Загрузить обложку</button>' +
      '<input type="file" id="ab-cover-file" accept="image/*" hidden /></div>' +
      '<div class="field"><label>Описание</label>' + rteBar('ab-desc') + '</div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Во что мы верим</h2></div>' +
      '<label class="field">Заголовок блока<input class="input" id="ab-pr-title" value="' + esc(d.principlesTitle || '') + '" /></label>' +
      '<div class="form-grid">' +
      [0, 1, 2, 3].map(function (i) {
        var p = d.principles[i] || { title: '', text: '' };
        return (
          '<div class="field"><label>Блок ' + (i + 1) + '</label>' +
          '<input class="input" id="ab-pr-t-' + i + '" value="' + esc(p.title) + '" placeholder="Подзаголовок" />' +
          '<textarea class="textarea" id="ab-pr-x-' + i + '" rows="3" placeholder="Текст">' + esc(p.text) + '</textarea></div>'
        );
      }).join('') +
      '</div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Поддержите нас</h2></div>' +
      '<p class="hint-note">Этот блок на сайте стоит выше приложения.</p>' +
      '<div class="form-grid">' +
      '<label class="field">Надзаголовок<input class="input" id="ab-don-eye" value="' + esc(d.donate.eyebrow || '') + '" /></label>' +
      '<label class="field">Заголовок<textarea class="textarea" id="ab-don-title" rows="2">' + esc(d.donate.titleHtml || '') + '</textarea></label>' +
      '<label class="field">Текст<textarea class="textarea" id="ab-don-text" rows="3">' + esc(d.donate.text || '') + '</textarea></label>' +
      '<label class="field">Ссылка кнопки<input class="input" id="ab-don-mail" value="' + esc(d.donate.mailto || '') + '" /></label>' +
      '</div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Приложение</h2></div>' +
      '<div class="form-grid">' +
      '<label class="field">Надзаголовок<input class="input" id="ab-app-eye" value="' + esc(d.app.eyebrow || '') + '" /></label>' +
      '<label class="field">Заголовок<input class="input" id="ab-app-title" value="' + esc(d.app.title || '') + '" /></label>' +
      '</div>' +
      '<div class="field"><label>Текст</label>' + rteBar('ab-app-html') + '</div>' +
      '<div class="field"><label>Фото блока</label>' +
      '<div class="cover-frame' + (d.app.photo ? '' : ' is-empty') + '" id="ab-app-frame">' +
      (d.app.photo ? '<img src="' + esc(d.app.photo) + '" alt="" />' : '<span>Нет фото</span>') + '</div>' +
      '<input type="hidden" id="ab-app-photo" value="' + esc(d.app.photo || '') + '" />' +
      '<button type="button" class="btn btn-ghost" id="ab-app-up">Загрузить фото</button>' +
      '<input type="file" id="ab-app-file" accept="image/*" hidden /></div></div>' +

      '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Партнёры</h2>' +
      '<button type="button" class="btn btn-ghost" id="ab-par-add">+ Партнёр</button></div>' +
      '<label class="field">Заголовок<input class="input" id="ab-par-title" value="' + esc(d.partnersTitle || '') + '" /></label>' +
      '<div id="ab-partners">' + partnersHtml(partners) + '</div></div>' +

      '<div class="panel"><div class="panel-head"><h2>Контакты</h2></div>' +
      '<p class="hint-note">Блок «Сотрудничество» убран. Три оставшихся поля редактируются здесь.</p>' +
      [0, 1, 2].map(function (i) {
        var c = contacts[i] || { label: '', value: '', href: '' };
        return (
          '<div class="form-grid" style="margin-bottom:8px">' +
          '<input class="input" id="ab-c-l-' + i + '" value="' + esc(c.label) + '" placeholder="Подпись" />' +
          '<input class="input" id="ab-c-v-' + i + '" value="' + esc(c.value) + '" placeholder="Текст" />' +
          '<input class="input" id="ab-c-h-' + i + '" value="' + esc(c.href) + '" placeholder="mailto: или https://" />' +
          '</div>'
        );
      }).join('') +
      '</div>';

    document.getElementById('ab-desc').innerHTML = d.descriptionHtml || '';
    document.getElementById('ab-app-html').innerHTML = d.app.html || '';
    mountRTE('ab-desc', ctx.toast);
    mountRTE('ab-app-html', ctx.toast);
    bindPhoto('ab-cover-up', 'ab-cover-file', 'ab-cover', 'ab-cover-frame', 'about', ctx.toast);
    bindPhoto('ab-app-up', 'ab-app-file', 'ab-app-photo', 'ab-app-frame', 'about', ctx.toast);

    function bindPartnerDel() {
      ctx.viewEl.querySelectorAll('[data-del-partner]').forEach(function (btn) {
        btn.onclick = function () {
          partners = collectPartners();
          var i = Number(btn.getAttribute('data-del-partner'));
          partners.splice(i, 1);
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

    document.getElementById('ab-pub').onclick = function () {
      var data = collect(collectPartners());
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
