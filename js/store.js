/**
 * Локальное редакционное хранилище: материалы, страницы, медиа, таксономия.
 * Синхронизация с сервером — где API есть (archive upsert, news admin).
 */
(function (global) {
  'use strict';

  var KEYS = {
    materials: 'yak_admin_materials',
    photos: 'yak_admin_photos',
    books: 'yak_admin_books',
    media: 'yak_admin_media',
    pages: 'yak_admin_pages',
    categories: 'yak_admin_categories',
    tags: 'yak_admin_tags',
    photographers: 'yak_admin_photographers',
    uploadLog: 'yak_admin_photo_uploads',
    trash: 'yak_admin_trash',
  };

  var RUBRICS = [
    { id: 'columns', title: 'Статьи' },
    { id: 'pages', title: 'Страницы (архив WP)' },
    { id: 'materials', title: 'Материалы (черновики архива)' },
    { id: 'news', title: 'Новости' },
    { id: 'announcement', title: 'Анонсы' },
    { id: 'interview', title: 'Голоса / Интервью' },
    { id: 'svidetelstva', title: 'Свидетельства' },
    { id: 'propovedi', title: 'Проповеди' },
  ];

  var STATUSES = [
    { id: 'draft', title: 'Черновик', tone: 'muted' },
    { id: 'review', title: 'На модерации', tone: 'warn' },
    { id: 'rework', title: 'На доработке', tone: 'rose' },
    { id: 'scheduled', title: 'Запланирован', tone: 'info' },
    { id: 'published', title: 'Опубликован', tone: 'ok' },
    { id: 'unpublished', title: 'Снят с публикации', tone: 'muted' },
  ];

  var PAGE_TYPES = [
    { id: 'church', title: 'О Церкви' },
    { id: 'spirit', title: 'Духовная жизнь' },
    { id: 'cycle', title: 'Главная цикла' },
    { id: 'other', title: 'Другое' },
  ];

  var PAGE_STATUSES = [
    { id: 'draft', title: 'Черновик', tone: 'muted' },
    { id: 'scheduled', title: 'Запланирована', tone: 'info' },
    { id: 'published', title: 'Опубликована', tone: 'ok' },
  ];

  var MEDIA_STATUSES = [
    { id: 'pending', title: 'На модерации', tone: 'warn' },
    { id: 'approved', title: 'Одобрено', tone: 'ok' },
    { id: 'rejected', title: 'Отклонено', tone: 'rose' },
  ];

  var DOC_FORMATS = [
    { id: 'pdf', title: 'PDF' },
    { id: 'fb2', title: 'FB2' },
    { id: 'doc', title: 'DOC' },
    { id: 'other', title: 'Другое' },
  ];

  var TAG_KINDS = [
    { id: 'author', title: 'Автор' },
    { id: 'topic', title: 'Тема' },
    { id: 'ideas', title: 'Идеи' },
    { id: 'qa', title: 'Вопрос-ответ' },
    { id: 'city', title: 'Город' },
    { id: 'organizer', title: 'Организатор' },
    { id: 'photostock', title: 'Фотосток' },
    { id: 'other', title: 'Другое' },
  ];

  /* Firefox + file:// + OneDrive часто даёт NS_ERROR_FILE_CORRUPTED на localStorage */
  var mem = Object.create(null);
  var lsOk = true;
  var storageWarned = false;

  function storageDegraded() {
    return !lsOk;
  }

  function warnStorage(err) {
    if (storageWarned) return;
    storageWarned = true;
    console.warn(
      '[AdminStore] localStorage недоступен/повреждён — работаем в памяти этой вкладки. ' +
        'В Firefox: about:preferences#privacy → Куки и данные сайтов → Удалить данные для file:// ' +
        'или откройте админку через локальный http-сервер.',
      err
    );
  }

  function nukeYakStorage() {
    try {
      var kill = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf('yak_admin') === 0 || k.indexOf('yak_') === 0)) kill.push(k);
      }
      kill.forEach(function (k) {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {
      try { localStorage.clear(); } catch (e2) {}
    }
  }

  function probeLs() {
    try {
      var p = '__yak_ls_probe__';
      localStorage.setItem(p, '1');
      localStorage.removeItem(p);
      return true;
    } catch (e) {
      return false;
    }
  }

  function read(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(mem, key)) return mem[key];
    if (!lsOk) return fallback;
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      warnStorage(e);
      nukeYakStorage();
      if (!probeLs()) lsOk = false;
      return fallback;
    }
  }

  function write(key, val) {
    mem[key] = val;
    if (!lsOk) return false;
    var payload;
    try {
      payload = JSON.stringify(val);
    } catch (e) {
      console.warn('[AdminStore] не удалось сериализовать', key, e);
      return false;
    }
    try {
      localStorage.setItem(key, payload);
      return true;
    } catch (e) {
      warnStorage(e);
      nukeYakStorage();
      try {
        localStorage.setItem(key, payload);
        return true;
      } catch (e2) {
        lsOk = false;
        warnStorage(e2);
        return false;
      }
    }
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function slugify(str) {
    var map = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
      и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
      с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
      ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
    };
    return String(str || '')
      .toLowerCase()
      .split('')
      .map(function (ch) { return map[ch] != null ? map[ch] : ch; })
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item';
  }

  function pageTypeTitle(id) {
    var t = PAGE_TYPES.filter(function (x) { return x.id === id; })[0];
    return t ? t.title : id;
  }

  function mediaStatusTitle(id) {
    var s = MEDIA_STATUSES.filter(function (x) { return x.id === id; })[0];
    return s ? s.title : id;
  }

  function tagKindTitle(id) {
    var k = TAG_KINDS.filter(function (x) { return x.id === id; })[0];
    return k ? k.title : id;
  }

  function seedIfEmpty() {
    var now = new Date().toISOString();

    if (!read(KEYS.materials, null)) {
      write(KEYS.materials, [
        {
          id: 'mat_demo_1',
          title: 'Как начать молиться каждый день',
          authorEmail: 'author@yakatolik.local',
          authorName: 'Мария Автор',
          rubric: 'columns',
          status: 'review',
          excerpt: 'Короткая практика утренней молитвы для занятых.',
          body: '<p>Молитва не требует идеальных условий. Достаточно пяти честных минут.</p><p>Начните с «Отче наш» и одного благодарения за день.</p>',
          cover: '',
          updatedAt: now,
          createdAt: now,
          scheduledAt: '',
          editorNote: '',
          tags: ['молитва', 'практика'],
        },
        {
          id: 'mat_demo_2',
          title: 'Папа встретился с молодёжью',
          authorEmail: 'editor@yakatolik.local',
          authorName: 'Пётр Редактор',
          rubric: 'news',
          status: 'scheduled',
          excerpt: 'Краткий репортаж о встрече.',
          body: '<p>В Риме прошла встреча с делегацией молодых католиков.</p>',
          cover: '',
          updatedAt: now,
          createdAt: now,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          editorNote: '',
          tags: ['папа', 'молодёжь'],
        },
        {
          id: 'mat_demo_3',
          title: 'Черновик: о тишине в семье',
          authorEmail: 'author@yakatolik.local',
          authorName: 'Мария Автор',
          rubric: 'columns',
          status: 'draft',
          excerpt: '',
          body: '<p>Текст в работе…</p>',
          cover: '',
          updatedAt: now,
          createdAt: now,
          scheduledAt: '',
          editorNote: '',
          tags: [],
        },
        {
          id: 'mat_demo_4',
          title: 'Вернуть: слишком общий тон',
          authorEmail: 'author@yakatolik.local',
          authorName: 'Мария Автор',
          rubric: 'interview',
          status: 'rework',
          excerpt: 'Интервью с катехизатором',
          body: '<p>Черновой текст интервью.</p>',
          cover: '',
          updatedAt: now,
          createdAt: now,
          scheduledAt: '',
          editorNote: 'Добавьте конкретные примеры из приходской практики и сократите вступление.',
          tags: ['катехизация'],
        },
      ]);
    }

    if (!read(KEYS.photos, null)) {
      write(KEYS.photos, [
        {
          id: 'ph_1',
          title: 'Кафедральный собор, утро',
          ownerEmail: 'shooter@yakatolik.local',
          ownerName: 'Ольга Фотограф',
          url: '',
          tags: ['храм', 'москва', 'архитектура'],
          status: 'pending',
          kind: 'image',
          createdAt: now,
        },
        {
          id: 'ph_2',
          title: 'Розарий на столе',
          ownerEmail: 'photo@yakatolik.local',
          ownerName: 'Илья Фоторед',
          url: '',
          tags: ['розарий', 'натюрморт'],
          status: 'approved',
          kind: 'image',
          createdAt: now,
        },
      ]);
    }

    if (!read(KEYS.books, null)) {
      write(KEYS.books, [
        {
          id: 'bk_1',
          title: 'Laudato Si’',
          author: 'Папа Франциск',
          section: 'Документы Церкви',
          year: '2015',
          format: 'pdf',
          url: '',
          coverTone: '#3d6b4f',
          kind: 'document',
          updatedAt: now,
        },
        {
          id: 'bk_2',
          title: 'Исповедь',
          author: 'Августин',
          section: 'Книги',
          year: '',
          format: 'fb2',
          url: '',
          coverTone: '#5c5346',
          kind: 'document',
          updatedAt: now,
        },
      ]);
    }

    migrateMediaIfNeeded();

    if (!read(KEYS.pages, null)) {
      write(KEYS.pages, [
        {
          id: 'pg_demo_1',
          title: 'О Католической Церкви в России',
          slug: 'o-katolicheskoy-tserkvi',
          type: 'church',
          cover: '',
          hideCoverOnPage: false,
          body: '<p>Краткий обзор присутствия Католической Церкви в России.</p>',
          cycleMaterials: [],
          status: 'published',
          scheduledAt: '',
          seoTitle: 'О Католической Церкви в России',
          seoDescription: 'Обзор присутствия Католической Церкви в России.',
          createdByEmail: 'chief@yakatolik.local',
          createdByName: 'Анна Главред',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'pg_demo_2',
          title: 'Молитва в повседневности',
          slug: 'molitva-v-povsednevnosti',
          type: 'spirit',
          cover: '',
          hideCoverOnPage: true,
          body: '<p>Практические советы о молитве в течение дня.</p><blockquote>Молитесь непрестанно.</blockquote>',
          cycleMaterials: [],
          status: 'draft',
          scheduledAt: '',
          seoTitle: '',
          seoDescription: '',
          createdByEmail: 'super@yakatolik.local',
          createdByName: 'Супер-админ',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'pg_demo_3',
          title: 'Цикл: Великий пост',
          slug: 'cikl-velikiy-post',
          type: 'cycle',
          cover: '',
          hideCoverOnPage: false,
          body: '<p>Главная страница цикла материалов о Великом посте.</p>',
          cycleMaterials: [
            { href: 'article.html?slug=post-day-1', order: 1 },
            { href: 'article.html?slug=post-day-2', order: 2 },
          ],
          status: 'scheduled',
          scheduledAt: new Date(Date.now() + 172800000).toISOString(),
          seoTitle: 'Цикл: Великий пост',
          seoDescription: 'Подборка материалов к Великому посту.',
          createdByEmail: 'chief@yakatolik.local',
          createdByName: 'Анна Главред',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ]);
    }

    if (!read(KEYS.categories, null)) {
      write(KEYS.categories, [
        { id: 'cat_demo_1', name: 'Святой Престол', slug: 'santa-sede', createdAt: now, updatedAt: now },
        { id: 'cat_demo_2', name: 'Проповеди', slug: 'propovedi', createdAt: now, updatedAt: now },
        { id: 'cat_demo_3', name: 'Новости', slug: 'news', createdAt: now, updatedAt: now },
        { id: 'cat_demo_4', name: 'Свидетельства', slug: 'svidetelstva', createdAt: now, updatedAt: now },
      ]);
    }

    if (!read(KEYS.tags, null)) {
      write(KEYS.tags, [
        { id: 'tag_demo_1', name: 'Мария Автор', slug: 'mariya-avtor', kind: 'author', createdAt: now, updatedAt: now },
        { id: 'tag_demo_2', name: 'Пётр Редактор', slug: 'petr-redaktor', kind: 'author', createdAt: now, updatedAt: now },
        { id: 'tag_demo_3', name: 'Молитва', slug: 'molitva', kind: 'topic', createdAt: now, updatedAt: now },
        { id: 'tag_demo_4', name: 'Экуменический диалог', slug: 'ecumenical', kind: 'topic', createdAt: now, updatedAt: now },
        { id: 'tag_demo_5', name: 'Искусственный интеллект', slug: 'iskusstvennyy-intellekt', kind: 'ideas', createdAt: now, updatedAt: now },
        { id: 'tag_demo_6', name: 'Москва', slug: 'moskva', kind: 'city', createdAt: now, updatedAt: now },
        { id: 'tag_demo_7', name: 'Храм', slug: 'hram', kind: 'photostock', createdAt: now, updatedAt: now },
        { id: 'tag_demo_8', name: 'Вопрос о вере', slug: 'vopros-o-vere', kind: 'qa', createdAt: now, updatedAt: now },
        { id: 'tag_demo_9', name: 'Ольга Фотограф', slug: 'olga-fotograf-photos', kind: 'photostock', createdAt: now, updatedAt: now },
      ]);
    }

    if (!read(KEYS.photographers, null)) {
      write(KEYS.photographers, [
        {
          id: 'ph_test_1',
          name: 'Ольга Фотограф',
          slug: 'olga-fotograf',
          email: 'shooter@yakatolik.local',
          photo: '',
          bio: 'Тестовая карточка фотографа. Привязана к shooter@yakatolik.local.',
          social: { vk: '', tg: '', max: '', pinterest: '', site: '' },
          tagSlug: 'olga-fotograf-photos',
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  }

  /** Объединяет старые photos/books в media при первом запуске */
  function migrateMediaIfNeeded() {
    if (read(KEYS.media, null)) return;
    var photos = read(KEYS.photos, []) || [];
    var books = read(KEYS.books, []) || [];
    var media = [];
    photos.forEach(function (p) {
      media.push({
        id: p.id || uid('media'),
        kind: 'image',
        title: p.title || 'Фото',
        url: p.url || '',
        ownerEmail: p.ownerEmail || '',
        ownerName: p.ownerName || p.ownerEmail || '',
        status: p.status || (p.ownerEmail && String(p.ownerEmail).indexOf('shooter') !== -1 ? 'pending' : 'approved'),
        tags: p.tags || [],
        format: '',
        section: '',
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
      });
    });
    books.forEach(function (b) {
      media.push({
        id: b.id || uid('media'),
        kind: 'document',
        title: b.title || 'Документ',
        url: b.url || '',
        ownerEmail: b.ownerEmail || 'books@yakatolik.local',
        ownerName: b.author || b.ownerName || '',
        status: 'approved',
        tags: [],
        format: b.format || 'other',
        section: b.section || 'Книги',
        createdAt: b.createdAt || b.updatedAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
      });
    });
    write(KEYS.media, media);
  }

  try {
    seedIfEmpty();
  } catch (seedErr) {
    console.warn('[AdminStore] seedIfEmpty:', seedErr);
  }

  /* ---------- Materials ---------- */
  function listMaterials() {
    return read(KEYS.materials, []);
  }

  function saveMaterials(list) {
    write(KEYS.materials, list);
  }

  function getMaterial(id) {
    return listMaterials().filter(function (m) { return m.id === id; })[0] || null;
  }

  function upsertMaterial(mat, actor) {
    var list = listMaterials();
    var i = list.findIndex(function (m) { return m.id === mat.id; });
    mat.updatedAt = new Date().toISOString();
    if (i === -1) {
      mat.id = mat.id || uid('mat');
      mat.createdAt = mat.createdAt || mat.updatedAt;
      list.unshift(mat);
    } else {
      list[i] = Object.assign({}, list[i], mat);
      mat = list[i];
    }
    saveMaterials(list);
    if (global.AdminAuth) {
      global.AdminAuth.audit(actor, 'material.save', mat.title || mat.id, { id: mat.id, status: mat.status });
    }
    return mat;
  }

  function setStatus(id, status, actor, note) {
    var m = getMaterial(id);
    if (!m) return null;
    m.status = status;
    if (note != null) m.editorNote = note;
    return upsertMaterial(m, actor);
  }

  function trashMaterial(id, actor) {
    var list = listMaterials();
    var m = null;
    var next = list.filter(function (x) {
      if (x.id === id) {
        m = x;
        return false;
      }
      return true;
    });
    if (!m) return false;
    var trash = read(KEYS.trash, []);
    trash.unshift(Object.assign({}, m, { deletedAt: new Date().toISOString() }));
    write(KEYS.trash, trash);
    saveMaterials(next);
    if (global.AdminAuth) global.AdminAuth.audit(actor, 'material.trash', m.title, { id: id });
    return true;
  }

  function statusTitle(id) {
    var s = STATUSES.filter(function (x) { return x.id === id; })[0];
    return s ? s.title : id;
  }

  function rubricTitle(id) {
    var r = RUBRICS.filter(function (x) { return x.id === id; })[0];
    return r ? r.title : id;
  }

  function visibleMaterials(session) {
    var all = listMaterials();
    if (!session) return [];
    var role = global.AdminAuth.roleOf(session);
    if (role.canSeeAllMaterials || session.role === 'chief' || session.role === 'super') return all;
    if (session.role === 'author') {
      return all.filter(function (m) { return m.authorEmail === session.email; });
    }
    if (session.role === 'rubric_editor') {
      var rubs = session.rubrics || role.rubrics || [];
      return all.filter(function (m) {
        return rubs.indexOf(m.rubric) !== -1 || rubs.indexOf('*') !== -1;
      });
    }
    return [];
  }

  /* ---------- Pages (editorial, separate from WP import materials) ---------- */
  function listPages() {
    return read(KEYS.pages, []);
  }

  function savePages(list) {
    write(KEYS.pages, list);
  }

  function getPage(id) {
    return listPages().filter(function (p) { return p.id === id; })[0] || null;
  }

  function getPageBySlug(slug) {
    return listPages().filter(function (p) { return p.slug === slug; })[0] || null;
  }

  function upsertPage(page, actor) {
    var list = listPages();
    var i = list.findIndex(function (p) { return p.id === page.id; });
    page.updatedAt = new Date().toISOString();
    if (!page.slug) page.slug = slugify(page.title);
    if (!page.seoTitle) page.seoTitle = page.title || '';
    if (!page.seoDescription) {
      var plain = String(page.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      page.seoDescription = plain.slice(0, 160);
    }
    if (!Array.isArray(page.cycleMaterials)) page.cycleMaterials = [];
    if (i === -1) {
      page.id = page.id || uid('pg');
      page.createdAt = page.createdAt || page.updatedAt;
      list.unshift(page);
    } else {
      list[i] = Object.assign({}, list[i], page);
      page = list[i];
    }
    savePages(list);
    if (global.AdminAuth) {
      global.AdminAuth.audit(actor, 'page.save', page.title || page.id, { id: page.id, status: page.status });
    }
    return page;
  }

  function deletePage(id, actor) {
    var list = listPages();
    var page = null;
    var next = list.filter(function (p) {
      if (p.id === id) {
        page = p;
        return false;
      }
      return true;
    });
    if (!page) return false;
    savePages(next);
    if (global.AdminAuth) global.AdminAuth.audit(actor, 'page.delete', page.title, { id: id });
    return true;
  }

  /* ---------- Media (images + documents) ---------- */
  function listMedia() {
    migrateMediaIfNeeded();
    return read(KEYS.media, []);
  }

  function saveMedia(list) {
    write(KEYS.media, list);
    // keep legacy keys loosely in sync for any old code paths
    write(KEYS.photos, list.filter(function (m) { return m.kind === 'image'; }));
    write(KEYS.books, list.filter(function (m) { return m.kind === 'document'; }).map(function (m) {
      return {
        id: m.id,
        title: m.title,
        author: m.ownerName || '',
        section: m.section || '',
        year: '',
        format: m.format || 'other',
        url: m.url || '',
        coverTone: '#5c5346',
        kind: 'document',
        updatedAt: m.updatedAt,
      };
    }));
  }

  function getMedia(id) {
    return listMedia().filter(function (m) { return m.id === id; })[0] || null;
  }

  function upsertMedia(item, actor) {
    var list = listMedia();
    var i = list.findIndex(function (m) { return m.id === item.id; });
    item.updatedAt = new Date().toISOString();
    if (i === -1) {
      item.id = item.id || uid('media');
      item.createdAt = item.createdAt || item.updatedAt;
      list.unshift(item);
    } else {
      list[i] = Object.assign({}, list[i], item);
      item = list[i];
    }
    saveMedia(list);
    if (global.AdminAuth) {
      global.AdminAuth.audit(actor, 'media.save', item.title || item.id, { id: item.id, kind: item.kind, status: item.status });
    }
    return item;
  }

  function deleteMedia(id, actor) {
    var list = listMedia();
    var item = null;
    var next = list.filter(function (m) {
      if (m.id === id) {
        item = m;
        return false;
      }
      return true;
    });
    if (!item) return false;
    saveMedia(next);
    if (global.AdminAuth) global.AdminAuth.audit(actor, 'media.delete', item.title, { id: id });
    return true;
  }

  function listPhotos() {
    return listMedia().filter(function (m) { return m.kind === 'image'; });
  }

  function savePhotos(list) {
    var docs = listMedia().filter(function (m) { return m.kind === 'document'; });
    var images = (list || []).map(function (p) {
      return Object.assign({}, p, { kind: 'image' });
    });
    saveMedia(images.concat(docs));
  }

  function listBooks() {
    return listMedia().filter(function (m) { return m.kind === 'document'; });
  }

  function saveBooks(list) {
    var images = listMedia().filter(function (m) { return m.kind === 'image'; });
    var docs = (list || []).map(function (b) {
      return {
        id: b.id,
        kind: 'document',
        title: b.title,
        url: b.url || '',
        ownerEmail: b.ownerEmail || '',
        ownerName: b.author || b.ownerName || '',
        status: 'approved',
        tags: [],
        format: b.format || 'other',
        section: b.section || 'Книги',
        createdAt: b.createdAt || b.updatedAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
      };
    });
    saveMedia(images.concat(docs));
  }

  function publicImages() {
    return listPhotos().filter(function (p) { return p.status === 'approved'; });
  }

  /* ---------- Photographers ---------- */
  function listPhotographers() {
    seedIfEmpty();
    return read(KEYS.photographers, []);
  }

  function savePhotographers(list) {
    write(KEYS.photographers, list);
  }

  function getPhotographer(id) {
    return listPhotographers().filter(function (p) { return p.id === id; })[0] || null;
  }

  function getPhotographerByEmail(email) {
    email = String(email || '').toLowerCase();
    return listPhotographers().filter(function (p) {
      return String(p.email || '').toLowerCase() === email;
    })[0] || null;
  }

  function upsertPhotographer(ph, actor) {
    var list = listPhotographers();
    var i = list.findIndex(function (p) { return p.id === ph.id; });
    ph.updatedAt = new Date().toISOString();
    if (!ph.slug) ph.slug = slugify(ph.name);
    if (!ph.tagSlug) ph.tagSlug = ph.slug + '-photos';
    ph.social = Object.assign({ vk: '', tg: '', max: '', pinterest: '', site: '' }, ph.social || {});
    if (i === -1) {
      ph.id = ph.id || uid('ph');
      ph.createdAt = ph.createdAt || ph.updatedAt;
      list.unshift(ph);
      // auto tag for photographer
      upsertTag({
        id: uid('tag'),
        name: ph.name,
        slug: ph.tagSlug,
        kind: 'photostock',
      }, actor);
    } else {
      list[i] = Object.assign({}, list[i], ph);
      ph = list[i];
    }
    savePhotographers(list);
    if (global.AdminAuth) {
      global.AdminAuth.audit(actor, 'photographer.save', ph.name || ph.id, { id: ph.id });
    }
    return ph;
  }

  function deletePhotographer(id, actor) {
    var list = listPhotographers();
    var ph = null;
    var next = list.filter(function (p) {
      if (p.id === id) {
        ph = p;
        return false;
      }
      return true;
    });
    if (!ph) return false;
    savePhotographers(next);
    if (global.AdminAuth) global.AdminAuth.audit(actor, 'photographer.delete', ph.name, { id: id });
    return true;
  }

  function uploadsToday(email) {
    var day = new Date().toISOString().slice(0, 10);
    var log = read(KEYS.uploadLog, {}) || {};
    var key = String(email || '') + '|' + day;
    return Number(log[key] || 0);
  }

  function addUploadCount(email, n) {
    var day = new Date().toISOString().slice(0, 10);
    var log = read(KEYS.uploadLog, {}) || {};
    var key = String(email || '') + '|' + day;
    log[key] = Number(log[key] || 0) + (n || 1);
    write(KEYS.uploadLog, log);
    return log[key];
  }

  /* ---------- Categories & Tags ---------- */
  function listCategories() {
    return read(KEYS.categories, []);
  }

  function saveCategories(list) {
    write(KEYS.categories, list);
  }

  function getCategory(id) {
    return listCategories().filter(function (c) { return c.id === id; })[0] || null;
  }

  function upsertCategory(cat, actor) {
    var list = listCategories();
    var i = list.findIndex(function (c) { return c.id === cat.id; });
    cat.updatedAt = new Date().toISOString();
    if (!cat.slug) cat.slug = slugify(cat.name);
    if (i === -1) {
      cat.id = cat.id || uid('cat');
      cat.createdAt = cat.createdAt || cat.updatedAt;
      list.unshift(cat);
    } else {
      list[i] = Object.assign({}, list[i], cat);
      cat = list[i];
    }
    saveCategories(list);
    if (global.AdminAuth) {
      global.AdminAuth.audit(actor, 'category.save', cat.name || cat.id, { id: cat.id });
    }
    return cat;
  }

  function deleteCategory(id, actor) {
    var list = listCategories();
    var cat = null;
    var next = list.filter(function (c) {
      if (c.id === id) {
        cat = c;
        return false;
      }
      return true;
    });
    if (!cat) return false;
    saveCategories(next);
    if (global.AdminAuth) global.AdminAuth.audit(actor, 'category.delete', cat.name, { id: id });
    return true;
  }

  function listTags() {
    return read(KEYS.tags, []);
  }

  function saveTags(list) {
    write(KEYS.tags, list);
  }

  function getTag(id) {
    return listTags().filter(function (t) { return t.id === id; })[0] || null;
  }

  function upsertTag(tag, actor) {
    var list = listTags();
    var i = list.findIndex(function (t) { return t.id === tag.id; });
    tag.updatedAt = new Date().toISOString();
    if (!tag.slug) tag.slug = slugify(tag.name);
    if (!tag.kind) tag.kind = 'other';
    if (i === -1) {
      tag.id = tag.id || uid('tag');
      tag.createdAt = tag.createdAt || tag.updatedAt;
      list.unshift(tag);
    } else {
      list[i] = Object.assign({}, list[i], tag);
      tag = list[i];
    }
    saveTags(list);
    if (global.AdminAuth) {
      global.AdminAuth.audit(actor, 'tag.save', tag.name || tag.id, { id: tag.id, kind: tag.kind });
    }
    return tag;
  }

  function deleteTag(id, actor) {
    var list = listTags();
    var tag = null;
    var next = list.filter(function (t) {
      if (t.id === id) {
        tag = t;
        return false;
      }
      return true;
    });
    if (!tag) return false;
    saveTags(next);
    if (global.AdminAuth) global.AdminAuth.audit(actor, 'tag.delete', tag.name, { id: id });
    return true;
  }

  global.AdminStore = {
    RUBRICS: RUBRICS,
    STATUSES: STATUSES,
    PAGE_TYPES: PAGE_TYPES,
    PAGE_STATUSES: PAGE_STATUSES,
    MEDIA_STATUSES: MEDIA_STATUSES,
    DOC_FORMATS: DOC_FORMATS,
    TAG_KINDS: TAG_KINDS,
    listMaterials: listMaterials,
    getMaterial: getMaterial,
    upsertMaterial: upsertMaterial,
    setStatus: setStatus,
    trashMaterial: trashMaterial,
    visibleMaterials: visibleMaterials,
    listPages: listPages,
    getPage: getPage,
    getPageBySlug: getPageBySlug,
    upsertPage: upsertPage,
    deletePage: deletePage,
    pageTypeTitle: pageTypeTitle,
    listMedia: listMedia,
    getMedia: getMedia,
    upsertMedia: upsertMedia,
    deleteMedia: deleteMedia,
    listPhotos: listPhotos,
    savePhotos: savePhotos,
    listBooks: listBooks,
    saveBooks: saveBooks,
    publicImages: publicImages,
    mediaStatusTitle: mediaStatusTitle,
    listPhotographers: listPhotographers,
    getPhotographer: getPhotographer,
    getPhotographerByEmail: getPhotographerByEmail,
    upsertPhotographer: upsertPhotographer,
    deletePhotographer: deletePhotographer,
    uploadsToday: uploadsToday,
    addUploadCount: addUploadCount,
    listCategories: listCategories,
    getCategory: getCategory,
    upsertCategory: upsertCategory,
    deleteCategory: deleteCategory,
    listTags: listTags,
    getTag: getTag,
    upsertTag: upsertTag,
    deleteTag: deleteTag,
    tagKindTitle: tagKindTitle,
    statusTitle: statusTitle,
    rubricTitle: rubricTitle,
    slugify: slugify,
    uid: uid,
    storageDegraded: storageDegraded,
  };
})(window);
