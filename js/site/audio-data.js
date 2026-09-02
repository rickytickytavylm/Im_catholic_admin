/** Каталог проповедей о. Павла Крупы. audio_key = ключ в бакете fidesetratio. */
(function (global) {
  'use strict';

  var ARTIST = 'о. Павел Крупа';
  var ALBUM = 'Проповеди';
  var COVER_DEFAULT = 'assets/cards/articles-sermons.webp';
  var COVERS = [
    'assets/cards/articles-sermons.webp',
    'assets/cards/spirit-liturgy.webp',
    'assets/cards/spirit-prayer.webp',
    'assets/cards/church-first-visit.webp',
    'assets/cards/articles-saints.webp',
    'assets/cards/spirit-retreats.webp',
    'assets/cards/church-deepen.webp',
    'assets/cards/articles-spirituality.webp',
    'assets/cards/church-return-liturgy.webp',
    'assets/cards/spirit-sacraments.webp'
  ];

  var RAW = [
    ['Проповедь в I Воскресенье Адвента 30.11.2025.mp3', '26:43'],
    ['Проповедь в II Воскресенье Адвента 07.12.2025.mp3', '24:45'],
    ['Проповедь в XIX Рядовое Воскресенье 10.08.2025.mp3', '32:54'],
    ['Проповедь в XVIII Рядовое Воскресенье 03.08.2025.mp3', '28:11'],
    ['Проповедь в XX Рядовое Воскресенье 17.08.2025.mp3', '28:47'],
    ['Проповедь в XXI Рядовое Воскресенье 24.08.2025.mp3', '35:55'],
    ['Проповедь в XXVII Рядовое Воскресенье 05.10.2025.mp3', '35:29'],
    ['Проповедь в XXVIII Рядовое Воскресенье 12.10.2025.mp3', '21:33'],
    ['Проповедь в XXX Рядовое Воскресенье 26.10.2025.mp3', '26:08'],
    ['Проповедь в XXXIII Рядовое Воскресенье 16.11.2025.mp3', '22:01'],
    ['Проповедь в День освящения храма 19.10.2025.mp3', '31:14'],
    ['Проповедь в Праздник Освящения Латеранской Базилики 09.11.2025.mp3', '17:32'],
    ['Проповедь в Праздник Преображения Господня 06.08.2025.mp3', '19:11'],
    ['Проповедь в Торжество Всех Святых 01.11.2025.mp3', '23:30'],
    ['Проповедь в Торжество Непорочного Зачатия Пресвятой Девы Марии.mp3', '31:20'],
    ['Проповедь в Торжество Св.Доминика 08.08.2025.mp3', '35:01'],
    ['Проповедь на Поминовение Всех Усопших Верных 02.11.2025.mp3', '34:28']
  ];

  function parseDate(name) {
    var m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(name);
    if (!m) return '';
    return m[3] + '-' + m[2] + '-' + m[1];
  }

  function titleOf(name) {
    return String(name || '')
      .replace(/\.mp3$/i, '')
      .replace(/\s+\d{2}\.\d{2}\.\d{4}$/, '')
      .replace(/^Проповедь\s+(в|на)\s+/i, '')
      .trim();
  }

  function coverFor(title, i) {
    var t = String(title || '').toLowerCase();
    if (/адвент/.test(t)) return 'assets/cards/church-first-time.webp';
    if (/всех святых/.test(t)) return 'assets/cards/articles-saints.webp';
    if (/усопш/.test(t)) return 'assets/cards/spirit-retreats.webp';
    if (/непорочн/.test(t)) return 'assets/cards/church-deepen.webp';
    if (/доминик/.test(t)) return 'assets/cards/articles-biographies.webp';
    if (/преображен/.test(t)) return 'assets/cards/spirit-liturgy.webp';
    if (/латеран|освящен/.test(t)) return 'assets/cards/church-first-visit.webp';
    return COVERS[i % COVERS.length] || COVER_DEFAULT;
  }

  var tracks = RAW.map(function (pair, i) {
    var file = pair[0];
    var title = titleOf(file);
    return {
      id: 'krupa-' + String(i + 1).padStart(3, '0'),
      title: title,
      artist: ARTIST,
      audio_key: 'crupa/' + file,
      duration: pair[1],
      date: parseDate(file),
      cover: coverFor(title, i)
    };
  }).sort(function (a, b) {
    return String(b.date || '').localeCompare(String(a.date || ''));
  });

  global.YakAudio = {
    artist: ARTIST,
    album: ALBUM,
    cover: COVER_DEFAULT,
    publicBase: 'https://storage.yandexcloud.net/fidesetratio/',
    tracks: tracks
  };
})(typeof window !== 'undefined' ? window : this);
