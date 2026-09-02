/**
 * Импорт WP pages (~191) из архива API в черновики редакции.
 * На портал эти материалы не публикуются.
 */
(function (global) {
  'use strict';

  var FLAG = 'yak_admin_pages_imported_v1';

  function alreadyImported() {
    try {
      return localStorage.getItem(FLAG) === '1';
    } catch (e) {
      return false;
    }
  }

  function markImported() {
    try {
      localStorage.setItem(FLAG, '1');
    } catch (e) {}
  }

  function pageMaterialId(page) {
    return 'page_wp_' + String(page.id || page.slug || '');
  }

  function toDraft(page, actorEmail) {
    var now = new Date().toISOString();
    return {
      id: pageMaterialId(page),
      title: page.title || page.slug || 'Страница без названия',
      authorEmail: actorEmail || 'archive@yakatolik.local',
      authorName: 'Архив · страница',
      rubric: 'pages',
      status: 'draft',
      excerpt: page.excerpt || '',
      body: page.contentHtml || page.content || '',
      cover: page.image || '',
      updatedAt: page.modified ? String(page.modified).slice(0, 10) + 'T12:00:00.000Z' : now,
      createdAt: page.date ? String(page.date).slice(0, 10) + 'T12:00:00.000Z' : now,
      scheduledAt: '',
      editorNote: 'Импорт из WP pages (без рубрик/тегов). Не публиковать на портал, пока редакция не решит иначе.',
      tags: ['страница', 'архив'],
      kind: 'page',
      archivePageId: page.id,
      slug: page.slug || '',
      linkOriginal: page.linkOriginal || '',
    };
  }

  function listAllPages() {
    var items = [];
    var page = 1;
    var total = Infinity;

    function next() {
      if (items.length >= total) return Promise.resolve(items);
      return AdminApi.getPages({ page: page, limit: 100 }).then(function (pack) {
        total = Number(pack.total) || items.length;
        var batch = pack.items || [];
        items = items.concat(batch);
        if (!batch.length || items.length >= total) return items;
        page += 1;
        return next();
      });
    }

    return next();
  }

  /**
   * Тянет полный HTML пачками, пишет черновики в AdminStore.
   * @returns {Promise<{imported:number, updated:number, total:number}>}
   */
  function importPagesToDrafts(opts) {
    opts = opts || {};
    var actor = opts.actorEmail || 'archive@yakatolik.local';
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};
    var force = !!opts.force;

    if (!force && alreadyImported()) {
      var existing = AdminStore.listMaterials().filter(function (m) {
        return m.rubric === 'pages' || m.kind === 'page';
      });
      return Promise.resolve({
        imported: 0,
        updated: 0,
        total: existing.length,
        skipped: true,
      });
    }

    return listAllPages().then(function (list) {
      var imported = 0;
      var updated = 0;
      var i = 0;

      function step() {
        if (i >= list.length) {
          markImported();
          return { imported: imported, updated: updated, total: list.length };
        }
        var meta = list[i];
        i += 1;
        onProgress(i, list.length, meta.title || meta.slug);
        var id = pageMaterialId(meta);
        var prev = AdminStore.getMaterial(id);
        return AdminApi.getPage(meta.id || meta.slug)
          .then(function (full) {
            var draft = toDraft(full || meta, actor);
            if (prev && prev.status && prev.status !== 'draft' && !force) {
              // Не затираем то, что уже ушло в модерацию/публикацию локально
              draft.status = prev.status;
              draft.editorNote = prev.editorNote || draft.editorNote;
            }
            AdminStore.upsertMaterial(draft, actor);
            if (prev) updated += 1;
            else imported += 1;
          })
          .catch(function () {
            var draft = toDraft(meta, actor);
            if (!draft.body) draft.body = '<p>' + (draft.excerpt || '') + '</p>';
            AdminStore.upsertMaterial(draft, actor);
            if (prev) updated += 1;
            else imported += 1;
          })
          .then(step);
      }

      return step();
    });
  }

  global.AdminImportPages = {
    FLAG: FLAG,
    alreadyImported: alreadyImported,
    importPagesToDrafts: importPagesToDrafts,
  };
})(window);
