/**
 * Вставка в любые поля редакции: жирный, курсив, ссылки, абзацы, списки
 * остаются; шрифт, размер, цвет и заливка снимаются.
 */
(function (global) {
  'use strict';

  var KEEP = {
    A: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, P: 1, DIV: 1,
    UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, H1: 1, H2: 1, H3: 1, H4: 1,
    FIGURE: 1, FIGCAPTION: 1, IMG: 1, SUB: 1, SUP: 1
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function unwrap(n) {
    var parent = n.parentNode;
    if (!parent) return;
    while (n.firstChild) parent.insertBefore(n.firstChild, n);
    parent.removeChild(n);
  }

  function sanitizePastedHtml(raw, opts) {
    opts = opts || {};
    var box = document.createElement('div');
    var html = String(raw || '');
    if (/<[a-z][\s\S]*>/i.test(html)) box.innerHTML = html;
    else {
      box.innerHTML = '<p>' + esc(html).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
    }
    box.querySelectorAll('script,style,meta,link,xml,o\\:p').forEach(function (n) { n.remove(); });
    [].slice.call(box.querySelectorAll('*')).forEach(function (n) {
      var tag = n.tagName;
      [].slice.call(n.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        if (name === 'href' && tag === 'A') return;
        if (name === 'src' && tag === 'IMG') return;
        if (name === 'alt' && tag === 'IMG') return;
        n.removeAttribute(attr.name);
      });
      if (tag === 'FONT' || tag === 'SPAN' || tag === 'O:P') {
        unwrap(n);
        return;
      }
      if (!KEEP[tag]) unwrap(n);
      if (tag === 'H1') {
        var h = document.createElement('h2');
        h.innerHTML = n.innerHTML;
        n.parentNode.replaceChild(h, n);
      }
    });
    if (opts.plain) {
      var text = (box.innerText || box.textContent || '').replace(/\u00a0/g, ' ');
      return text.replace(/\n{3,}/g, '\n\n').trim();
    }
    return box.innerHTML;
  }

  function insertAtCursor(el, text) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      var start = el.selectionStart || 0;
      var end = el.selectionEnd || 0;
      var val = el.value || '';
      el.value = val.slice(0, start) + text + val.slice(end);
      var pos = start + text.length;
      try { el.setSelectionRange(pos, pos); } catch (e) {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    document.execCommand('insertHTML', false, text);
  }

  function onPaste(e) {
    var t = e.target;
    if (!t) return;
    var editable = t.isContentEditable || (t.closest && t.closest('[contenteditable="true"]'));
    var field = t.tagName === 'TEXTAREA' || t.tagName === 'INPUT';
    if (!editable && !field) return;
    if (t.tagName === 'INPUT' && t.type && t.type !== 'text' && t.type !== 'search' && t.type !== 'url') return;
    var clip = e.clipboardData;
    if (!clip) return;
    var html = clip.getData('text/html') || '';
    var text = clip.getData('text/plain') || '';
    if (!html && !text) return;
    e.preventDefault();
    e.stopPropagation();
    if (editable) {
      insertAtCursor(t, sanitizePastedHtml(html || text));
    } else {
      insertAtCursor(t, sanitizePastedHtml(html || text, { plain: true }));
    }
  }

  document.addEventListener('paste', onPaste, true);

  global.yakSanitizePaste = sanitizePastedHtml;
})(window);
