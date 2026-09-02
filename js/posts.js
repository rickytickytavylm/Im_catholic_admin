/**
 * Записи: новости, статьи, голоса.
 * Список + редактор лучше классического WordPress.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function textOf(html) {
    var n = document.createElement('div');
    n.innerHTML = html || '';
    return (n.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function statusLabel(id) {
    if (id === 'published') return 'Опубликовано';
    if (id === 'scheduled') return 'Запланировано';
    if (id === 'review') return 'На модерации';
    if (id === 'rework') return 'На доработке';
    if (id === 'unpublished') return 'Снято';
    return 'Черновик';
  }

  function statusTone(id) {
    if (id === 'published') return 'ok';
    if (id === 'scheduled') return 'info';
    if (id === 'review') return 'warn';
    if (id === 'rework') return 'rose';
    return 'muted';
  }

  function authorSuggestions() {
    var out = [];
    var seen = {};
    function add(name) {
      name = String(name || '').trim();
      if (!name || seen[name.toLowerCase()]) return;
      seen[name.toLowerCase()] = 1;
      out.push(name);
    }
    (AdminStore.listTags() || []).forEach(function (t) {
      if (t.kind === 'author') add(t.name);
    });
    var authors = (global.YakAuthors && (YakAuthors.list || YakAuthors.items || YakAuthors)) || [];
    if (Array.isArray(authors)) {
      authors.forEach(function (a) { add(a.name || a.title); });
    } else if (authors && typeof authors === 'object') {
      Object.keys(authors).forEach(function (k) { add(authors[k].name || k); });
    }
    return out;
  }

  function tagSuggestions() {
    return (AdminStore.listTags() || [])
      .filter(function (t) { return t.kind !== 'author'; })
      .map(function (t) { return t.name; });
  }

  function cycleSuggestions() {
    return (AdminStore.listPages() || []).map(function (p) {
      return { id: p.id, title: p.title, slug: p.slug };
    });
  }

  function galleryPhotos() {
    var out = [];
    var seen = {};
    function add(url, title) {
      if (!url || seen[url]) return;
      seen[url] = 1;
      out.push({ url: url, title: title || '' });
    }
    (AdminStore.publicImages() || []).forEach(function (p) { add(p.url || p.thumb, p.title); });
    (AdminStore.listPhotos() || []).forEach(function (p) { add(p.url || p.thumb, p.title); });
    if (global.AdminDesk && AdminDesk.allPhotos) {
      AdminDesk.allPhotos().forEach(function (p) { add(p.url || p.thumb, p.title || (p.tags || []).join(', ')); });
    }
    return out;
  }

  function portalBase() {
    var b = (global.AdminConfig && AdminConfig.PORTAL_URL) || '../Ave_Maria/';
    return b.slice(-1) === '/' ? b : b + '/';
  }

  function findRelated(url) {
    var slug = '';
    try {
      var u = new URL(url, location.href);
      slug = u.searchParams.get('slug') || u.pathname.split('/').pop() || '';
    } catch (e) {
      slug = String(url || '').split('slug=')[1] || '';
    }
    slug = decodeURIComponent(String(slug).split('&')[0] || '').replace(/\.html$/, '');
    var mats = AdminStore.listMaterials().map(AdminStore.normalizePost);
    var hit = mats.filter(function (m) { return m.slug === slug || m.id === slug; })[0];
    if (hit) return { title: hit.title, url: url, excerpt: hit.excerpt || textOf(hit.body).slice(0, 140) };
    var page = AdminStore.getPageBySlug && AdminStore.getPageBySlug(slug);
    if (page) return { title: page.title, url: url, excerpt: textOf(page.body).slice(0, 140) };
    return { title: slug || url, url: url, excerpt: '' };
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function datalist(id, items) {
    return '<datalist id="' + id + '">' + items.map(function (x) {
      var v = typeof x === 'string' ? x : x.title;
      return '<option value="' + esc(v) + '"></option>';
    }).join('') + '</datalist>';
  }

  function renderList(ctx) {
    var session = ctx.session;
    var toast = ctx.toast;
    var go = ctx.go;
    var viewEl = ctx.viewEl;
    var rows = AdminStore.visibleMaterials(session).slice().sort(function (a, b) {
      return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
    });

    viewEl.innerHTML =
      '<div class="topbar"><div><h1>Записи</h1><p>Новости, статьи и голоса.</p></div></div>' +
      '<div class="panel">' +
      '<div class="posts-toolbar">' +
      '<input class="input" id="post-q" placeholder="Поиск по записям" />' +
      '<button type="button" class="btn btn-primary" id="post-add">Добавить запись</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="data posts-table"><thead><tr>' +
      '<th>Заголовок</th><th>Раздел</th><th>Рубрика</th><th>Статус</th><th></th>' +
      '</tr></thead><tbody id="post-body"></tbody></table></div></div>';

    function paint() {
      var q = (document.getElementById('post-q').value || '').toLowerCase();
      var list = rows.filter(function (m) {
        if (!q) return true;
        var hay = [m.title, m.slug, m.authorName, (m.rubrics || []).join(' '), m.section, textOf(m.body)].join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      var body = document.getElementById('post-body');
      if (!list.length) {
        body.innerHTML = '<tr><td colspan="5"><div class="empty">Нет записей</div></td></tr>';
        return;
      }
      body.innerHTML = list.map(function (m) {
        var rubs = (m.rubrics || []).map(AdminStore.postRubricTitle).filter(Boolean).join(', ') || '—';
        return (
          '<tr data-id="' + esc(m.id) + '">' +
          '<td><a class="title-link" href="#editor/' + esc(m.id) + '">' + esc(m.title || 'Без названия') + '</a></td>' +
          '<td>' + esc(AdminStore.postSectionTitle(m.section)) + '</td>' +
          '<td>' + esc(rubs) + '</td>' +
          '<td><span class="badge ' + statusTone(m.status) + '">' + esc(statusLabel(m.status)) + '</span></td>' +
          '<td class="row-actions">' +
          '<a class="btn btn-ghost" href="#editor/' + esc(m.id) + '">Редактировать</a>' +
          '<button type="button" class="btn btn-ghost" data-del="' + esc(m.id) + '">Удалить</button>' +
          '</td></tr>'
        );
      }).join('');
      body.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('Удалить запись?')) return;
          AdminStore.trashMaterial(btn.getAttribute('data-del'), session.email);
          toast('Удалено');
          rows = AdminStore.visibleMaterials(session);
          paint();
        };
      });
    }

    document.getElementById('post-q').oninput = paint;
    document.getElementById('post-add').onclick = function () { createPost(ctx); };
    paint();
  }

  function createPost(ctx) {
    var allowed = AdminStore.allowedPostRubrics(ctx.session);
    var first = allowed[0] || { id: 'columns', section: 'articles' };
    var mat = AdminStore.upsertMaterial({
      id: AdminStore.uid('mat'),
      title: '',
      slug: '',
      authorEmail: ctx.session.email,
      authorName: ctx.session.name,
      authorTag: ctx.session.name,
      section: first.section,
      rubrics: [],
      rubric: first.id,
      status: 'draft',
      excerpt: '',
      body: '<p></p>',
      cover: '',
      tags: [],
      seoTitle: '',
      seoDescription: '',
    }, ctx.session.email);
    ctx.go('editor', mat.id);
  }

  function renderEditor(ctx, id) {
    var session = ctx.session;
    var role = ctx.role;
    var toast = ctx.toast;
    var viewEl = ctx.viewEl;
    var mat = AdminStore.getMaterial(id);
    if (!mat) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Запись не найдена. <a href="#materials">Назад</a></div></div>';
      return;
    }
    if (session.role === 'author' && mat.authorEmail !== session.email) {
      viewEl.innerHTML = '<div class="panel"><div class="empty">Нет доступа к чужой записи.</div></div>';
      return;
    }

    var allowed = AdminStore.allowedPostRubrics(session);
    var authors = authorSuggestions();
    var tags = tagSuggestions();
    var cycles = cycleSuggestions();
    var slugLocked = !!mat.slugLocked;
    var seoManual = !!mat.seoManual;
    var canPublish = !!(role.canPublish || role.canModerate);
    var canSchedule = canPublish;
    var canReview = !canPublish;

    var groups = {};
    allowed.forEach(function (r) {
      if (!groups[r.section]) groups[r.section] = [];
      groups[r.section].push(r);
    });

    viewEl.innerHTML =
      '<div class="post-editor">' +
      '<div class="post-editor-bar">' +
      '<a class="btn btn-ghost" href="#materials">Назад</a>' +
      '<span class="autosave" id="post-save-state">Черновик</span>' +
      '</div>' +
      '<div class="post-layout">' +
      '<div class="post-main panel">' +
      '<input class="editor-title" id="p-title" value="' + esc(mat.title) + '" placeholder="Заголовок записи" />' +
      '<div class="field slug-row"><label>Адрес</label>' +
      '<span class="slug-prefix">/</span>' +
      '<input class="input" id="p-slug" value="' + esc(mat.slug || '') + '" />' +
      '</div>' +
      '<div class="rte">' +
      '<div class="rte-bar" id="rte-bar">' +
      '<button type="button" data-cmd="bold" title="Жирный">Ж</button>' +
      '<button type="button" data-cmd="italic" title="Курсив">К</button>' +
      '<button type="button" data-block="h2" title="Подзаголовок">H2</button>' +
      '<button type="button" data-block="h3" title="Мелкий заголовок">H3</button>' +
      '<button type="button" data-block="quote" title="Цитата">« »</button>' +
      '<button type="button" data-cmd="insertUnorderedList" title="Список">•</button>' +
      '<button type="button" data-cmd="insertOrderedList" title="Нумерация">1.</button>' +
      '<button type="button" data-act="link" title="Ссылка">Ссылка</button>' +
      '<span class="rte-sep"></span>' +
      '<button type="button" data-act="image" title="Изображение">Фото</button>' +
      '<button type="button" data-act="gallery" title="Галерея">Галерея</button>' +
      '<button type="button" data-act="embed" title="Плеер">Плеер</button>' +
      '<button type="button" data-act="related" title="Другая публикация">Превью</button>' +
      '</div>' +
      '<div class="rte-body" id="p-body" contenteditable="true" data-placeholder="Текст записи"></div>' +
      '<input type="file" id="p-inline-file" accept="image/*" hidden multiple />' +
      '</div></div>' +
      '<aside class="post-side">' +
      '<div class="panel post-card">' +
      '<h3>Обложка</h3>' +
      '<div class="cover-frame' + (mat.cover ? '' : ' is-empty') + '" id="p-cover-frame">' +
      (mat.cover ? '<img src="' + esc(mat.cover) + '" alt="" />' : '<span>16:9 · подгон по кадру</span>') +
      '</div>' +
      '<input type="hidden" id="p-cover" value="' + esc(mat.cover || '') + '" />' +
      '<div class="post-side-actions">' +
      '<button type="button" class="btn btn-ghost" id="p-cover-up">С устройства</button>' +
      '<button type="button" class="btn btn-ghost" id="p-cover-gal">Из галереи</button>' +
      '</div>' +
      '<input type="file" id="p-cover-file" accept="image/*" hidden />' +
      '</div>' +
      '<div class="panel post-card">' +
      '<h3>Рубрики <em>обязательно</em></h3>' +
      '<div class="rubric-groups" id="p-rubrics">' +
      Object.keys(groups).map(function (sec) {
        return (
          '<div class="rubric-group" data-section="' + sec + '">' +
          '<strong>' + esc(AdminStore.postSectionTitle(sec)) + '</strong>' +
          groups[sec].map(function (r) {
            var on = (mat.rubrics || []).indexOf(r.id) !== -1;
            return '<label class="check-row"><input type="checkbox" value="' + esc(r.id) + '" data-section="' + esc(r.section) + '"' +
              (on ? ' checked' : '') + ' /> ' + esc(r.title) + '</label>';
          }).join('') +
          '</div>'
        );
      }).join('') +
      '</div></div>' +
      '<div class="panel post-card">' +
      '<h3>Автор</h3>' +
      '<input class="input" id="p-author" list="p-author-list" value="' + esc(mat.authorTag || mat.authorName || '') + '" placeholder="Начните вводить имя" />' +
      datalist('p-author-list', authors) +
      '</div>' +
      '<div class="panel post-card">' +
      '<h3>Цикл публикаций</h3>' +
      '<input class="input" id="p-cycle" list="p-cycle-list" value="' + esc(mat.cycleTitle || '') + '" placeholder="Название страницы цикла" />' +
      datalist('p-cycle-list', cycles) +
      '<input class="input" id="p-cycle-n" type="number" min="1" placeholder="Номер в цикле" value="' + esc(mat.cycleOrder || '') + '" />' +
      '</div>' +
      '<div class="panel post-card">' +
      '<h3>Другие теги</h3>' +
      '<input class="input" id="p-tags" list="p-tag-list" value="' + esc((mat.tags || []).join(', ')) + '" placeholder="Теги через запятую" />' +
      datalist('p-tag-list', tags) +
      '</div>' +
      '<div class="panel post-card">' +
      '<h3>SEO</h3>' +
      '<label class="check-row"><input type="checkbox" id="p-seo-manual"' + (seoManual ? ' checked' : '') + ' /> Задать вручную</label>' +
      '<label>Title<input class="input" id="p-seo-title" maxlength="70" value="' + esc(mat.seoTitle || '') + '" /></label>' +
      '<small class="seo-count" id="p-seo-title-n"></small>' +
      '<label>Description<textarea class="textarea" id="p-seo-desc" maxlength="180" rows="3">' + esc(mat.seoDescription || '') + '</textarea></label>' +
      '<small class="seo-count" id="p-seo-desc-n"></small>' +
      '</div>' +
      '<div class="panel post-card post-publish">' +
      '<button type="button" class="btn btn-ghost" id="p-draft">Сохранить как черновик</button>' +
      (canReview ? '<button type="button" class="btn btn-ghost" id="p-review">Отправить на модерацию</button>' : '') +
      (canPublish ? '<button type="button" class="btn btn-primary" id="p-pub">Опубликовать</button>' : '') +
      (canSchedule ? '<button type="button" class="btn btn-ghost" id="p-plan">Запланировать публикацию</button>' +
        '<input class="input" id="p-sched" type="datetime-local" value="' + esc(toLocal(mat.scheduledAt)) + '"' + (mat.status === 'scheduled' ? '' : ' hidden') + ' />' : '') +
      '<button type="button" class="btn btn-ghost" id="p-preview">Предпросмотр</button>' +
      '</div></aside></div></div>';

    var bodyEl = document.getElementById('p-body');
    bodyEl.innerHTML = mat.body || '<p></p>';
    mountRTE(bodyEl, toast);
    bindSlug(slugLocked);
    bindSeo(seoManual);
    bindCover(toast);
    bindRubrics();

    document.getElementById('p-draft').onclick = function () { save(ctx, mat, 'draft'); };
    var reviewBtn = document.getElementById('p-review');
    if (reviewBtn) reviewBtn.onclick = function () { save(ctx, mat, 'review'); };
    var pubBtn = document.getElementById('p-pub');
    if (pubBtn) pubBtn.onclick = function () { save(ctx, mat, 'published'); };
    var planBtn = document.getElementById('p-plan');
    if (planBtn) {
      planBtn.onclick = function () {
        var sched = document.getElementById('p-sched');
        sched.hidden = false;
        if (!sched.value) {
          var d = new Date(Date.now() + 3600000);
          sched.value = toLocal(d.toISOString());
        }
        sched.focus();
      };
      document.getElementById('p-sched').onchange = function () {
        if (this.value) save(ctx, mat, 'scheduled');
      };
    }
    document.getElementById('p-preview').onclick = function () { preview(collect(mat)); };

    if (global.AdminPosts._onKey) document.removeEventListener('keydown', global.AdminPosts._onKey);
    global.AdminPosts._onKey = function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        save(ctx, mat, mat.status || 'draft', true);
      }
    };
    document.addEventListener('keydown', global.AdminPosts._onKey);
  }

  function bindSlug(locked) {
    var title = document.getElementById('p-title');
    var slug = document.getElementById('p-slug');
    var auto = !locked && !slug.value;
    title.addEventListener('input', function () {
      if (!slug.dataset.locked) slug.value = AdminStore.slugify(title.value);
      refreshSeo();
    });
    slug.addEventListener('input', function () { slug.dataset.locked = '1'; });
    if (auto) slug.value = AdminStore.slugify(title.value);
  }

  function bindSeo(manual) {
    var box = document.getElementById('p-seo-manual');
    var t = document.getElementById('p-seo-title');
    var d = document.getElementById('p-seo-desc');
    function setManual(on) {
      t.readOnly = !on;
      d.readOnly = !on;
      t.classList.toggle('is-auto', !on);
      d.classList.toggle('is-auto', !on);
    }
    setManual(manual);
    box.onchange = function () {
      setManual(box.checked);
      if (!box.checked) refreshSeo();
    };
    t.oninput = d.oninput = countSeo;
    refreshSeo();
  }

  function refreshSeo() {
    if (document.getElementById('p-seo-manual').checked) {
      countSeo();
      return;
    }
    var title = document.getElementById('p-title').value.trim();
    var body = textOf(document.getElementById('p-body').innerHTML);
    document.getElementById('p-seo-title').value = title.slice(0, 70);
    document.getElementById('p-seo-desc').value = body.slice(0, 180);
    countSeo();
  }

  function countSeo() {
    var t = document.getElementById('p-seo-title').value;
    var d = document.getElementById('p-seo-desc').value;
    document.getElementById('p-seo-title-n').textContent = t.length + ' / 70';
    document.getElementById('p-seo-desc-n').textContent = d.length + ' / 180';
  }

  function bindCover(toast) {
    var file = document.getElementById('p-cover-file');
    document.getElementById('p-cover-up').onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      readFile(f).then(function (url) { setCover(url); }).catch(function () { toast('Не удалось прочитать файл', true); });
    };
    document.getElementById('p-cover-gal').onclick = function () {
      openGallery(false, function (urls) { if (urls[0]) setCover(urls[0]); });
    };
  }

  function setCover(url) {
    document.getElementById('p-cover').value = url;
    var frame = document.getElementById('p-cover-frame');
    frame.classList.remove('is-empty');
    frame.innerHTML = '<img src="' + esc(url) + '" alt="" />';
  }

  function bindRubrics() {
    var root = document.getElementById('p-rubrics');
    root.addEventListener('change', function (e) {
      var box = e.target;
      if (!box.matches('input[type="checkbox"]')) return;
      if (!box.checked) return;
      var sec = box.getAttribute('data-section');
      root.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
        if (el.getAttribute('data-section') !== sec) el.checked = false;
      });
    });
  }

  function selectedRubrics() {
    return [].map.call(document.querySelectorAll('#p-rubrics input:checked'), function (el) {
      return el.value;
    });
  }

  function collect(mat) {
    var rubrics = selectedRubrics();
    var first = AdminStore.POST_RUBRICS.filter(function (r) { return r.id === rubrics[0]; })[0];
    var title = document.getElementById('p-title').value.trim();
    var body = document.getElementById('p-body').innerHTML;
    var cycleTitle = document.getElementById('p-cycle').value.trim();
    var cycle = cycleSuggestions().filter(function (c) { return c.title === cycleTitle; })[0];
    return Object.assign({}, mat, {
      title: title,
      slug: document.getElementById('p-slug').value.trim() || AdminStore.slugify(title),
      slugLocked: !!document.getElementById('p-slug').dataset.locked,
      body: body,
      excerpt: textOf(body).slice(0, 220),
      cover: document.getElementById('p-cover').value,
      rubrics: rubrics,
      rubric: rubrics[0] || mat.rubric,
      section: first ? first.section : mat.section,
      authorTag: document.getElementById('p-author').value.trim(),
      authorName: document.getElementById('p-author').value.trim() || mat.authorName,
      cycleTitle: cycleTitle,
      cycleId: cycle ? cycle.id : '',
      cycleOrder: document.getElementById('p-cycle-n').value,
      tags: document.getElementById('p-tags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      seoManual: document.getElementById('p-seo-manual').checked,
      seoTitle: document.getElementById('p-seo-title').value.trim(),
      seoDescription: document.getElementById('p-seo-desc').value.trim(),
      scheduledAt: (document.getElementById('p-sched') && document.getElementById('p-sched').value)
        ? fromLocal(document.getElementById('p-sched').value)
        : mat.scheduledAt,
    });
  }

  function save(ctx, mat, status, silent) {
    var next = collect(mat);
    if (!next.title) { ctx.toast('Укажите заголовок', true); return; }
    if (!next.rubrics.length) { ctx.toast('Выберите хотя бы одну рубрику', true); return; }
    next.status = status;
    if (status === 'scheduled' && !next.scheduledAt) {
      ctx.toast('Укажите дату публикации', true);
      return;
    }
    AdminStore.upsertMaterial(next, ctx.session.email);
    Object.assign(mat, next);
    var state = document.getElementById('post-save-state');
    if (state) {
      state.textContent = status === 'published' ? 'Опубликовано' : status === 'scheduled' ? 'Запланировано' : status === 'review' ? 'На модерации' : 'Сохранено';
      state.classList.add('ok');
    }
    if (!silent) {
      ctx.toast(status === 'published' ? 'Опубликовано' : status === 'review' ? 'Отправлено на модерацию' : status === 'scheduled' ? 'Запланировано' : 'Черновик сохранён');
    }
    if (status === 'published' && ctx.push) ctx.push(next);
  }

  function preview(mat) {
    try { sessionStorage.setItem('yak_preview_post', JSON.stringify(mat)); } catch (e) {}
    window.open('preview.html?id=' + encodeURIComponent(mat.id), '_blank', 'noopener');
  }

  function toLocal(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function fromLocal(val) {
    if (!val) return '';
    var d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  function mountRTE(el, toast) {
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var html = (e.clipboardData && (e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain'))) || '';
      document.execCommand('insertHTML', false, sanitize(html));
    });
    el.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      if (![].some.call(files, function (f) { return f.type.indexOf('image') === 0; })) return;
      e.preventDefault();
      [].forEach.call(files, function (f) {
        if (f.type.indexOf('image') !== 0) return;
        readFile(f).then(function (url) { insertHtml(el, imgBlock(url)); });
      });
    });
    el.addEventListener('input', refreshSeo);

    document.getElementById('rte-bar').onclick = function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      el.focus();
      var cmd = btn.getAttribute('data-cmd');
      var block = btn.getAttribute('data-block');
      var act = btn.getAttribute('data-act');
      if (cmd) document.execCommand(cmd, false, null);
      if (block === 'h2' || block === 'h3') document.execCommand('formatBlock', false, block);
      if (block === 'quote') document.execCommand('formatBlock', false, 'blockquote');
      if (act === 'link') {
        var href = prompt('Ссылка', 'https://');
        if (href) document.execCommand('createLink', false, href);
      }
      if (act === 'image') openMediaPick(false, function (urls) {
        urls.forEach(function (u) { insertHtml(el, imgBlock(u)); });
      }, toast);
      if (act === 'gallery') openMediaPick(true, function (urls) {
        if (!urls.length) return;
        insertHtml(el, '<figure class="rte-gallery">' + urls.map(imgBlock).join('') + '</figure>');
      }, toast);
      if (act === 'embed') {
        var code = prompt('Код плеера или ссылка на видео', '<iframe src=""></iframe>');
        if (!code) return;
        insertHtml(el, wrapEmbed(code));
      }
      if (act === 'related') {
        var url = prompt('Адрес публикации на сайте', portalBase() + 'article.html?slug=');
        if (!url) return;
        var rel = findRelated(url);
        insertHtml(el,
          '<aside class="rte-related" data-url="' + esc(rel.url) + '">' +
          '<strong>' + esc(rel.title) + '</strong>' +
          (rel.excerpt ? '<small>' + esc(rel.excerpt) + '</small>' : '') +
          '<em>' + esc(rel.url) + '</em></aside>'
        );
      }
    };
  }

  function imgBlock(url) {
    return '<figure class="rte-figure"><img src="' + esc(url) + '" alt="" /></figure>';
  }

  function wrapEmbed(code) {
    var html = code;
    if (/^https?:\/\//i.test(code.trim())) {
      var src = code.trim();
      if (/youtube\.com|youtu\.be/.test(src)) {
        var id = (src.match(/[?&]v=([^&]+)/) || src.match(/youtu\.be\/([^?]+)/) || [])[1] || '';
        html = '<iframe src="https://www.youtube.com/embed/' + esc(id) + '" allowfullscreen></iframe>';
      } else if (/\.(mp4|webm)(\?|$)/i.test(src)) {
        html = '<video controls src="' + esc(src) + '"></video>';
      } else {
        html = '<iframe src="' + esc(src) + '"></iframe>';
      }
    }
    return '<figure class="rte-embed"><div class="rte-embed-inner">' + html + '</div></figure>';
  }

  function insertHtml(el, html) {
    el.focus();
    document.execCommand('insertHTML', false, html);
  }

  function sanitize(raw) {
    var box = document.createElement('div');
    if (/<[a-z][\s\S]*>/i.test(raw)) box.innerHTML = raw;
    else box.innerHTML = '<p>' + esc(raw).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
    box.querySelectorAll('script,style,meta,link').forEach(function (n) { n.remove(); });
    box.querySelectorAll('*').forEach(function (n) {
      [].forEach.call(n.attributes, function (a) {
        if (/^on/i.test(a.name) || a.name === 'style') n.removeAttribute(a.name);
      });
    });
    return box.innerHTML;
  }

  function openMediaPick(multi, done, toast) {
    var choice = confirm('OK — галерея сайта. Отмена — загрузить с устройства.');
    if (!choice) {
      var input = document.getElementById('p-inline-file');
      input.multiple = !!multi;
      input.onchange = function () {
        var files = [].slice.call(input.files || []);
        Promise.all(files.map(readFile)).then(done).catch(function () { toast('Не удалось прочитать файл', true); });
        input.value = '';
      };
      input.click();
      return;
    }
    openGallery(multi, done);
  }

  function openGallery(multi, done) {
    var photos = galleryPhotos();
    var overlay = document.createElement('div');
    overlay.className = 'gal-overlay';
    overlay.innerHTML =
      '<div class="gal-modal">' +
      '<header><strong>' + (multi ? 'Галерея' : 'Выберите снимок') + '</strong>' +
      '<button type="button" class="btn btn-ghost" data-x>Закрыть</button></header>' +
      '<div class="gal-grid">' +
      (photos.map(function (p, i) {
        return '<button type="button" class="gal-item" data-i="' + i + '"><img src="' + esc(p.url) + '" alt="" /></button>';
      }).join('') || '<p class="empty">Галерея пуста</p>') +
      '</div>' +
      (multi ? '<footer><button type="button" class="btn btn-primary" data-ok>Вставить выбранные</button></footer>' : '') +
      '</div>';
    document.body.appendChild(overlay);
    var picked = {};
    overlay.querySelectorAll('.gal-item').forEach(function (btn) {
      btn.onclick = function () {
        var i = Number(btn.getAttribute('data-i'));
        if (!multi) {
          overlay.remove();
          done([photos[i].url]);
          return;
        }
        picked[i] = !picked[i];
        btn.classList.toggle('is-on', picked[i]);
      };
    });
    overlay.querySelector('[data-x]').onclick = function () { overlay.remove(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var ok = overlay.querySelector('[data-ok]');
    if (ok) ok.onclick = function () {
      overlay.remove();
      done(Object.keys(picked).filter(function (k) { return picked[k]; }).map(function (k) { return photos[k].url; }));
    };
  }

  global.AdminPosts = {
    renderList: renderList,
    renderEditor: renderEditor,
    createPost: createPost,
  };
})(window);
