/**
 * Афиша ЯКатолик — пилотные данные (ТЗ).
 * Анонс снимается на следующий день после даты события (publishedEvents).
 */
(function (global) {
  'use strict';

  var CATEGORIES = [
    { id: 'concert', label: 'Концерты' },
    { id: 'meeting', label: 'Встречи' },
    { id: 'lecture', label: 'Лекции' },
    { id: 'pilgrimage', label: 'Паломничества' },
    { id: 'retreat', label: 'Реколлекции' },
    { id: 'charity', label: 'Благотворительные акции' }
  ];

  var COST = [
    { id: 'free', label: 'Бесплатно' },
    { id: 'paid', label: 'Платный вход' },
    { id: 'donation', label: 'Пожертвование' }
  ];

  var REG = [
    { id: 'none', label: 'Не требуется' },
    { id: 'required', label: 'Требуется' }
  ];

  var ORGANIZERS = [
    {
      id: 'pokrovskie-vorota',
      name: 'Культурный центр «Покровские ворота»',
      short: 'Покровские ворота',
      city: 'Москва',
      blurb:
        'Католический культурный центр: лекции, встречи, кино, выставки и разговоры о вере и культуре.',
      address: 'Москва',
      phone: '',
      email: 'info@pokrovskie-vorota.ru',
      website: 'https://pokrovskie-vorota.ru',
      socials: [
        { label: 'Сайт', href: 'https://pokrovskie-vorota.ru' }
      ],
      coverTone: '#5c5346',
      partnerTitle: 'Все мероприятия Культурного центра «Покровские ворота»'
    },
    {
      id: 'iskusstvo-dobra',
      name: 'Благотворительный фонд «Искусство добра»',
      short: 'Искусство добра',
      city: 'Москва',
      blurb:
        'Фонд поддерживает культурные и благотворительные проекты, в том числе концерты в католических храмах.',
      address: 'Москва',
      phone: '',
      email: '',
      website: 'https://artofgood.ru',
      socials: [
        { label: 'Сайт', href: 'https://artofgood.ru' }
      ],
      coverTone: '#6b2d3c',
      partnerTitle: 'Все концерты Благотворительного фонда «Искусство добра»'
    },
    {
      id: 'cathedral-msk',
      name: 'Кафедральный собор Непорочного Зачатия',
      short: 'Кафедральный собор',
      city: 'Москва',
      blurb: 'Главный католический храм России на Малой Грузинской — концерты, Мессы, приходская жизнь.',
      address: 'ул. Малая Грузинская, 27/13',
      phone: '',
      email: '',
      website: 'https://www.cathedral.ru',
      socials: [
        { label: 'Сайт', href: 'https://www.cathedral.ru' }
      ],
      coverTone: '#2f5d8c',
      partnerTitle: 'Анонсы Кафедрального собора'
    },
    {
      id: 'archdiocese',
      name: 'Архиепархия Божией Матери в Москве',
      short: 'Архиепархия',
      city: 'Москва',
      blurb: 'Официальные анонсы архиепархии: пастырские визиты, престольные праздники, паломничества.',
      address: '',
      phone: '',
      email: '',
      website: 'https://cathmos.ru',
      socials: [
        { label: 'Сайт', href: 'https://cathmos.ru' }
      ],
      coverTone: '#3d6b4f',
      partnerTitle: 'Анонсы Архиепархии Божией Матери'
    }
  ];

  /** Пилотные события августа 2026 + запас на месяц */
  var EVENTS = [
    {
      id: 'organ-msk',
      date: '2026-08-08',
      time: '20:00',
      title: 'Летний вечер в соборе: орган и скрипка',
      desc: 'Концерт в Римско-католическом кафедральном соборе Непорочного Зачатия.',
      city: 'Москва',
      venue: 'Кафедральный собор Непорочного Зачатия',
      place: 'ул. Малая Грузинская, 27/13',
      category: 'concert',
      cost: 'donation',
      registration: 'none',
      organizerId: 'iskusstvo-dobra',
      href: 'https://artofgood.ru',
      coverTone: '#8a5a2b'
    },
    {
      id: 'dubinin-nw',
      date: '2026-08-08',
      endDate: '2026-08-09',
      time: '',
      title: 'Паломничество по Северо-Западу',
      desc: 'Участие епископа Николая Дубинина в паломничестве по Северо-Западу.',
      city: 'Санкт-Петербург',
      venue: 'Архиепархия Божией Матери',
      place: 'Санкт-Петербург и регион',
      category: 'pilgrimage',
      cost: 'free',
      registration: 'required',
      organizerId: 'archdiocese',
      href: 'https://cathmos.ru/curia_message/raspisanie-episkopa-nikolaya-dubinina-na-avgust-4/',
      coverTone: '#3d6b4f'
    },
    {
      id: 'pokrov-lecture-faith',
      date: '2026-08-12',
      time: '19:00',
      title: 'Лекция: «Вера и культура сегодня»',
      desc: 'Открытая встреча в Культурном центре «Покровские ворота».',
      city: 'Москва',
      venue: 'Культурный центр «Покровские ворота»',
      place: 'Москва',
      category: 'lecture',
      cost: 'free',
      registration: 'required',
      organizerId: 'pokrovskie-vorota',
      href: 'https://pokrovskie-vorota.ru',
      coverTone: '#5c5346'
    },
    {
      id: 'pokrov-meeting-youth',
      date: '2026-08-14',
      time: '18:30',
      title: 'Встреча молодёжи: разговор о призвании',
      desc: 'Неформальная встреча и молитва.',
      city: 'Москва',
      venue: 'Культурный центр «Покровские ворота»',
      place: 'Москва',
      category: 'meeting',
      cost: 'free',
      registration: 'none',
      organizerId: 'pokrovskie-vorota',
      href: 'https://pokrovskie-vorota.ru',
      coverTone: '#4a3f6b'
    },
    {
      id: 'assumption-spb',
      date: '2026-08-15',
      time: '19:00',
      title: 'Торжественная Месса — престольный праздник Успения',
      desc: 'По расписанию епископа Николая Дубинина.',
      city: 'Санкт-Петербург',
      venue: 'Приход Успения ПДМ',
      place: 'Санкт-Петербург',
      category: 'meeting',
      cost: 'free',
      registration: 'none',
      organizerId: 'archdiocese',
      href: 'https://cathmos.ru/curia_message/raspisanie-episkopa-nikolaya-dubinina-na-avgust-4/',
      coverTone: '#c4a35a'
    },
    {
      id: 'art-charity-concert',
      date: '2026-08-15',
      time: '20:00',
      title: 'Благотворительный концерт «Искусство добра»',
      desc: 'Сбор средств на социальные проекты фонда. Вход — пожертвование.',
      city: 'Москва',
      venue: 'Кафедральный собор Непорочного Зачатия',
      place: 'ул. Малая Грузинская, 27/13',
      category: 'charity',
      cost: 'donation',
      registration: 'none',
      organizerId: 'iskusstvo-dobra',
      href: 'https://artofgood.ru',
      coverTone: '#6b2d3c'
    },
    {
      id: 'hyacinth-vyborg',
      date: '2026-08-16',
      time: '12:00',
      title: 'Престольный праздник св. Гиацинта',
      desc: 'Торжественная Святая Месса в престольный праздник прихода.',
      city: 'Выборг',
      venue: 'Приход св. Гиацинта',
      place: 'Выборг',
      category: 'meeting',
      cost: 'free',
      registration: 'none',
      organizerId: 'archdiocese',
      href: 'https://cathmos.ru/curia_message/raspisanie-episkopa-nikolaya-dubinina-na-avgust-4/',
      coverTone: '#2f5d8c'
    },
    {
      id: 'cathedral-organ-22',
      date: '2026-08-22',
      time: '20:00',
      title: 'Органный концерт в соборе',
      desc: 'Вечер органной музыки.',
      city: 'Москва',
      venue: 'Кафедральный собор Непорочного Зачатия',
      place: 'ул. Малая Грузинская, 27/13',
      category: 'concert',
      cost: 'paid',
      registration: 'required',
      organizerId: 'cathedral-msk',
      href: 'https://www.cathedral.ru',
      coverTone: '#2f5d8c'
    },
    {
      id: 'retreat-aug',
      date: '2026-08-23',
      endDate: '2026-08-24',
      time: '10:00',
      title: 'Выходные реколлекции: тишина и Lectio Divina',
      desc: 'Короткие реколлекции для мирян. Регистрация обязательна.',
      city: 'Москва',
      venue: 'Культурный центр «Покровские ворота»',
      place: 'Москва',
      category: 'retreat',
      cost: 'donation',
      registration: 'required',
      organizerId: 'pokrovskie-vorota',
      href: 'https://pokrovskie-vorota.ru',
      coverTone: '#3d4f5c'
    },
    {
      id: 'lecture-kolbe',
      date: '2026-08-14',
      time: '19:30',
      title: 'Лекция о св. Максимилиане Кольбе',
      desc: 'К дню памяти святого — рассказ о жизни и свидетельстве.',
      city: 'Москва',
      venue: 'Культурный центр «Покровские ворота»',
      place: 'Москва',
      category: 'lecture',
      cost: 'free',
      registration: 'none',
      organizerId: 'pokrovskie-vorota',
      href: 'https://pokrovskie-vorota.ru',
      coverTone: '#5c5346'
    },
    {
      id: 'charity-food',
      date: '2026-08-20',
      time: '11:00',
      title: 'Благотворительный сбор продуктов',
      desc: 'Сбор помощи нуждающимся семьям.',
      city: 'Москва',
      venue: 'Кафедральный собор Непорочного Зачатия',
      place: 'ул. Малая Грузинская, 27/13',
      category: 'charity',
      cost: 'donation',
      registration: 'none',
      organizerId: 'cathedral-msk',
      href: 'events.html?date=2026-08-20',
      coverTone: '#6d8b3e'
    },
    {
      id: 'meeting-bible',
      date: '2026-08-19',
      time: '19:00',
      title: 'Библейский кружок',
      desc: 'Совместное чтение и обсуждение Евангелия.',
      city: 'Москва',
      venue: 'Культурный центр «Покровские ворота»',
      place: 'Москва',
      category: 'meeting',
      cost: 'free',
      registration: 'none',
      organizerId: 'pokrovskie-vorota',
      href: 'https://pokrovskie-vorota.ru',
      coverTone: '#4a3f6b'
    },
    {
      id: 'iskusstvo-strings',
      date: '2026-08-29',
      time: '19:30',
      title: 'Концерт камерной музыки',
      desc: 'Благотворительный вечер фонда «Искусство добра».',
      city: 'Москва',
      venue: 'Кафедральный собор Непорочного Зачатия',
      place: 'ул. Малая Грузинская, 27/13',
      category: 'concert',
      cost: 'paid',
      registration: 'required',
      organizerId: 'iskusstvo-dobra',
      href: 'https://artofgood.ru',
      coverTone: '#8a5a2b'
    },
    {
      id: 'pilgrim-day',
      date: '2026-08-30',
      time: '09:00',
      title: 'Однодневное паломничество',
      desc: 'Выезд к святилищу. Места ограничены.',
      city: 'Москва',
      venue: 'Архиепархия Божией Матери',
      place: 'Москва и область',
      category: 'pilgrimage',
      cost: 'donation',
      registration: 'required',
      organizerId: 'archdiocese',
      href: 'https://cathmos.ru',
      coverTone: '#3d6b4f'
    }
  ];

  var PARTNER_IDS = ['pokrovskie-vorota', 'iskusstvo-dobra'];

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function eventEnd(e) {
    return e.endDate || e.date;
  }

  /** Анонс виден, пока не наступил день после окончания события */
  function isPublished(e, today) {
    var t = today || todayIso();
    return eventEnd(e) >= t;
  }

  function publishedEvents(today) {
    return EVENTS.filter(function (e) { return isPublished(e, today); });
  }

  function byId(id) {
    for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i];
    return null;
  }

  function organizerById(id) {
    for (var i = 0; i < ORGANIZERS.length; i++) if (ORGANIZERS[i].id === id) return ORGANIZERS[i];
    return null;
  }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].label;
    return id || '';
  }

  function categoryLabel(id) { return labelOf(CATEGORIES, id); }
  function costLabel(id) { return labelOf(COST, id); }
  function regLabel(id) { return labelOf(REG, id); }

  function eventsOn(iso) {
    return publishedEvents().filter(function (e) {
      var end = eventEnd(e);
      return e.date <= iso && end >= iso;
    });
  }

  function upcomingEvents(fromIso) {
    var from = fromIso || todayIso();
    return publishedEvents(from).slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });
  }

  function byOrganizer(orgId, limit) {
    return upcomingEvents().filter(function (e) { return e.organizerId === orgId; }).slice(0, limit || 12);
  }

  function monthDays(year, monthIndex) {
    var days = [];
    var n = new Date(year, monthIndex + 1, 0).getDate();
    var names = ['вскр', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    for (var d = 1; d <= n; d++) {
      var dt = new Date(year, monthIndex, d);
      var iso =
        year + '-' + String(monthIndex + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      days.push({
        date: iso,
        day: d,
        weekday: names[dt.getDay()],
        hasEvents: eventsOn(iso).length > 0
      });
    }
    return days;
  }

  var COVERS = {
    concert: 'assets/cards/event-concert.webp',
    meeting: 'assets/cards/event-meeting.webp',
    lecture: 'assets/cards/event-lecture.webp',
    pilgrimage: 'assets/cards/pil-places.webp',
    retreat: 'assets/cards/retreat-what.webp',
    charity: 'assets/cards/event-charity.webp'
  };

  global.YakAfisha = {
    CATEGORIES: CATEGORIES,
    covers: COVERS,
    COST: COST,
    REG: REG,
    ORGANIZERS: ORGANIZERS,
    EVENTS: EVENTS,
    PARTNER_IDS: PARTNER_IDS,
    todayIso: todayIso,
    isPublished: isPublished,
    publishedEvents: publishedEvents,
    byId: byId,
    organizerById: organizerById,
    categoryLabel: categoryLabel,
    costLabel: costLabel,
    regLabel: regLabel,
    eventsOn: eventsOn,
    upcomingEvents: upcomingEvents,
    byOrganizer: byOrganizer,
    monthDays: monthDays,
    eventEnd: eventEnd
  };
})(typeof window !== 'undefined' ? window : globalThis);
