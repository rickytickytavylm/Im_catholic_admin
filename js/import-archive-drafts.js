/**
 * Импорт особых категорий Рускатолика в черновики «Материалы»
 * (day-by-day, children, humor, pod, video, foto) — по ТЗ Анастасии.
 */
(function (global) {
  'use strict';

  var FLAG = 'yak_admin_archive_drafts_imported_v1';

  var DRAFT_CATS = [
    { slug: 'day-by-day', tag: 'Катехизис день за днём', note: 'Черновик: Катехизис день за днём. На фронт не выводить.' },
    { slug: 'children', tag: 'Для детей', note: 'Черновик: Для детей. На фронт не выводить.' },
    { slug: 'humor', tag: 'Юмор', note: 'Черновик: Юмор. На фронт не выводить.' },
    { slug: 'pod', tag: 'Подкасты', note: 'Черновик: Подкасты. На фронт не выводить.' },
    { slug: 'video', tag: 'Видео', note: 'Черновик: Видео. На фронте только если есть ещё новость/статья.' },
    { slug: 'foto', tag: 'Фото', note: 'Черновик: Фото. На фронте только если есть ещё новость/статья.' },
  ];

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

  function materialId(art) {
    return 'arch_draft_' + String(art.id || art.slug || '');
  }

  function toDraft(art, cat, actorEmail) {
    var now = new Date().toISOString();
    var tags = [cat.tag, 'архив'];
    return {
      id: materialId(art),
      title: art.title || art.slug || 'Без названия',
      authorEmail: actorEmail || 'archive@yakatolik.local',
      authorName: art.author || 'Архив',
      rubric: 'materials',
      status: 'draft',
      excerpt: art.excerpt || '',
      body: art.contentHtml || art.content || '',
      cover: art.image || '',
      updatedAt: art.modified ? String(art.modified).slice(0, 10) + 'T12:00:00.000Z' : now,
      createdAt: art.date ? String(art.date).slice(0, 10) + 'T12:00:00.000Z' : now,
      scheduledAt: '',
      editorNote: cat.note,
      tags: tags,
      kind: 'archive-draft',
      archiveArticleId: art.id,
      slug: art.slug || '',
      sourceCategory: cat.slug,
      linkOriginal: art.linkOriginal || '',
    };
  }

  function listCategory(slug) {
    var items = [];
    var page = 1;
    var total = Infinity;

    function next() {
      if (items.length >= total) return Promise.resolve(items);
      return AdminApi.getArticles({
        category: slug,
        page: page,
        limit: 50,
        includeHidden: true,
      }).then(function (pack) {
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

  function importArchiveDrafts(opts) {
    opts = opts || {};
    var actor = opts.actorEmail || 'archive@yakatolik.local';
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function () {};
    var force = !!opts.force;

    if (!force && alreadyImported()) {
      var existing = AdminStore.listMaterials().filter(function (m) {
        return m.rubric === 'materials' || m.kind === 'archive-draft';
      });
      return Promise.resolve({
        imported: 0,
        updated: 0,
        total: existing.length,
        skipped: true,
      });
    }

    var imported = 0;
    var updated = 0;
    var seen = {};
    var catIdx = 0;

    function nextCat() {
      if (catIdx >= DRAFT_CATS.length) {
        markImported();
        return {
          imported: imported,
          updated: updated,
          total: Object.keys(seen).length,
        };
      }
      var cat = DRAFT_CATS[catIdx];
      catIdx += 1;
      onProgress(catIdx, DRAFT_CATS.length, cat.slug);
      return listCategory(cat.slug).then(function (list) {
        var i = 0;
        function stepArt() {
          if (i >= list.length) return nextCat();
          var meta = list[i];
          i += 1;
          var id = materialId(meta);
          if (seen[id]) return stepArt();
          seen[id] = 1;
          var prev = AdminStore.getMaterial(id);
          return AdminApi.getArticle(meta.id || meta.slug)
            .then(function (full) {
              var draft = toDraft(full || meta, cat, actor);
              if (prev && prev.status && prev.status !== 'draft' && !force) {
                draft.status = prev.status;
                draft.editorNote = prev.editorNote || draft.editorNote;
              }
              AdminStore.upsertMaterial(draft, actor);
              if (prev) updated += 1;
              else imported += 1;
            })
            .catch(function () {
              var draft = toDraft(meta, cat, actor);
              if (!draft.body) draft.body = '<p>' + (draft.excerpt || '') + '</p>';
              AdminStore.upsertMaterial(draft, actor);
              if (prev) updated += 1;
              else imported += 1;
            })
            .then(stepArt);
        }
        return stepArt();
      });
    }

    return nextCat();
  }

  global.AdminImportArchiveDrafts = {
    FLAG: FLAG,
    DRAFT_CATS: DRAFT_CATS,
    alreadyImported: alreadyImported,
    importArchiveDrafts: importArchiveDrafts,
  };
})(window);
