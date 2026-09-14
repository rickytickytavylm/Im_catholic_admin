/** Подкасты портала. Выпуски подмешиваются из пака yak-podcasts-data. */
(function (global) {
  'use strict';

  var SHOWS = [
    {
      id: 'ruscatholic-podcast',
      title: 'Рускатолик Podcast',
      host: 'Николай Сыров',
      authorSlug: 'nikolay-syirov',
      blurb: 'Авторский подкаст Николая Сырова выходил с октября 2017 по март 2019 года на портале Рускатолик под девизом «обо всем на свете, сквозь призму пристального христианского взгляда». Актуальные новости, волнующие темы, интересные гости — всё это Рускатолик Podcast.',
      cover: 'assets/cards/articles-spirituality.webp',
      updated: '2019-03-26',
      episodes: []
    }
  ];

  var listeners = [];

  function cloneShow(show) {
    var next = Object.assign({}, show);
    next.episodes = (show.episodes || []).map(function (ep) { return Object.assign({}, ep); });
    return next;
  }

  function sortEpisodes(list) {
    return (list || []).slice().sort(function (a, b) {
      var sa = Number(a.season) || 0;
      var sb = Number(b.season) || 0;
      if (sa !== sb) return sb - sa;
      var ea = Number(a.episode) || 0;
      var eb = Number(b.episode) || 0;
      if (ea !== eb) return eb - ea;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function epLabel(n) {
    n = Number(n) || 0;
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return n + ' эпизод';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return n + ' эпизода';
    return n + ' эпизодов';
  }

  function latestDate(show) {
    var best = String(show.updated || '');
    (show.episodes || []).forEach(function (ep) {
      if (ep && ep.date && String(ep.date) > best) best = String(ep.date);
    });
    return best;
  }

  function latestEpisode(show) {
    return sortEpisodes(show.episodes || [])[0] || show.latest || null;
  }

  function upsertShow(incoming) {
    if (!incoming || !incoming.id) return;
    var i = -1;
    for (var n = 0; n < SHOWS.length; n++) {
      if (SHOWS[n].id === incoming.id) { i = n; break; }
    }
    var next = i === -1 ? cloneShow(incoming) : Object.assign(cloneShow(SHOWS[i]), incoming);
    if (incoming.episodes) next.episodes = incoming.episodes.map(function (ep) { return Object.assign({}, ep); });
    next.episodes = sortEpisodes(next.episodes);
    next.updated = latestDate(next);
    var last = latestEpisode(next);
    if (last) next.latest = { title: last.title, date: last.date };
    if (i === -1) SHOWS.push(next);
    else SHOWS[i] = next;
  }

  function mergePack(pack) {
    if (!pack) return SHOWS;
    var list = Array.isArray(pack) ? pack : pack.shows;
    if (Array.isArray(list)) list.forEach(upsertShow);
    return SHOWS;
  }

  function byId(id) {
    id = String(id || '');
    for (var i = 0; i < SHOWS.length; i++) {
      if (SHOWS[i].id === id) return SHOWS[i];
    }
    return null;
  }

  function forAuthor(slug) {
    slug = String(slug || '').toLowerCase();
    if (!slug) return [];
    return SHOWS.filter(function (s) {
      return String(s.authorSlug || '').toLowerCase() === slug;
    });
  }

  function latestShows(limit) {
    return SHOWS.slice().sort(function (a, b) {
      return latestDate(b).localeCompare(latestDate(a));
    }).slice(0, limit || 4);
  }

  function onPack(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function notifyPack() {
    listeners.forEach(function (fn) {
      try { fn(SHOWS); } catch (e) {}
    });
  }

  function countOf(show) {
    if (show && show.episodes && show.episodes.length) return show.episodes.length;
    return Number(show && show.episodeCount) || 0;
  }

  global.YakPodcasts = {
    shows: SHOWS,
    byId: byId,
    forAuthor: forAuthor,
    latestShows: latestShows,
    latestEpisode: latestEpisode,
    sortEpisodes: sortEpisodes,
    epLabel: epLabel,
    countOf: countOf,
    mergePack: mergePack,
    onPack: onPack,
    notifyPack: notifyPack
  };
})(typeof window !== 'undefined' ? window : this);
