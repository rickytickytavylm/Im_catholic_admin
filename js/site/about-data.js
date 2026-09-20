/**
 * Страница «О проекте»: дефолт + пак редакции yak-about-data.
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    eyebrow: 'О проекте',
    titleHtml: 'Мы рассказываем о вере<br />языком, которому<br /><em>можно доверять.</em>',
    cover: '',
    coverMobile: 'assets/about-cover-mobile.webp',
    descriptionHtml:
      '<p class="lead-paragraph">ЯКатолик — независимое католическое медиа на русском языке. Мы пишем о Церкви и о людях: о том, что происходит в приходах, о культуре и истории, о вопросах, которые человек задаёт себе сам, когда остаётся в тишине.</p>' +
      '<p>Портал продолжает работу РУСКАТОЛИК.РФ — издания, которое выходит с 2013 года. За это время накопилось почти четыре тысячи публикаций, сотни интервью и свидетельств, архив фотографий и биографий репрессированных католиков. Всё это переносится на новую платформу целиком, без потерь и сокращений.</p>',
    principlesTitle: 'Наша команда',
    principles: [
      { title: 'Точность', text: 'Проверяем факты и называем источники. Не публикуем то, в чём не уверены.', photo: '' },
      { title: 'Спокойствие', text: 'Не торгуем тревогой и не давим на эмоции. Сложное объясняем, а не упрощаем.', photo: '' },
      { title: 'Открытость', text: 'Пишем для верующих и невоцерковлённых одинаково понятно, без внутреннего жаргона.', photo: '' },
      { title: 'Память', text: 'Сохраняем архив: биографии, свидетельства и документы должны остаться доступными.', photo: '' },
    ],
    donate: {
      eyebrow: 'Поддержите нас',
      titleHtml: 'Издание живёт<br />на пожертвования читателей.',
      qrs: [{ image: '', label: 'Портал' }, { image: '', label: 'Приложение' }],
    },
    app: {
      eyebrow: 'Приложение',
      title: 'ЯКатолик уже в телефоне',
      subtitle: '',
      html: '<p>App Store, RuStore и AppGallery. Google Play — скоро. Тот же архив, календарь и «Спросить», что на сайте.</p>',
      photo: '',
      links: [
        { label: 'App Store', href: 'https://apps.apple.com/ru/app/%D1%8F%D0%BA%D0%B0%D1%82%D0%BE%D0%BB%D0%B8%D0%BA/id6742419988' },
        { label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=ru.yacatholic.mobile' },
        { label: 'FAQ', href: 'https://telegra.ph/CHasto-zadavaemye-voprosy-05-09-6' },
        { label: 'Поддержка', href: 'https://t.me/yacatholicapp' },
      ],
      authors: [],
    },
    partnersTitle: 'С кем мы работаем',
    partners: [
      { name: 'Архиепархия Божией Матери в Москве', href: '' },
      { name: 'Издательство «Духовная библиотека»', href: '' },
      { name: 'Фонд поддержки культурных инициатив', href: '' },
      { name: 'Католический институт св. Фомы', href: '' },
      { name: 'Приход св. Людовика Французского', href: '' },
      { name: 'Радио «Мария»', href: '' },
    ],
    contacts: [
      { label: 'Редакция', value: 'red@yacatholic.ru', href: 'mailto:red@yacatholic.ru' },
      { label: 'Прислать новость', value: 'news@yacatholic.ru', href: 'mailto:news@yacatholic.ru' },
      { label: 'Соцсети', value: 'Telegram · ВКонтакте · YouTube', href: '' },
    ],
  };

  var current = clone(DEFAULTS);
  var listeners = [];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function mergePack(pack) {
    if (!pack || typeof pack !== 'object') return current;
    var next = clone(current);
    ['eyebrow', 'titleHtml', 'cover', 'coverMobile', 'descriptionHtml', 'principlesTitle', 'partnersTitle', 'contactsTitle'].forEach(function (k) {
      if (pack[k] != null && pack[k] !== '') next[k] = pack[k];
    });
    if (pack.principles && pack.principles.length) next.principles = pack.principles.filter(function (p) { return p && (p.title || p.text || p.photo); });
    if (pack.donate) {
      next.donate = Object.assign({}, next.donate, pack.donate);
      if (Array.isArray(pack.donate.qrs)) next.donate.qrs = pack.donate.qrs;
    }
    if (pack.app) {
      next.app = Object.assign({}, next.app, pack.app);
      if (Array.isArray(pack.app.links)) next.app.links = pack.app.links;
      if (Array.isArray(pack.app.authors)) next.app.authors = pack.app.authors;
    }
    if (Array.isArray(pack.partners)) next.partners = pack.partners.filter(function (p) { return p && p.name; });
    if (Array.isArray(pack.contacts)) next.contacts = pack.contacts.filter(function (c) { return c && c.label; });
    current = next;
    return current;
  }

  function onPack(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function notifyPack() {
    listeners.forEach(function (fn) {
      try { fn(current); } catch (e) {}
    });
  }

  global.YakAbout = {
    DEFAULTS: DEFAULTS,
    get: function () { return current; },
    mergePack: mergePack,
    onPack: onPack,
    notifyPack: notifyPack,
  };
})(typeof window !== 'undefined' ? window : globalThis);
