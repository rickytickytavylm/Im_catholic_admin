/**
 * Каталог видео: собственные ролики Fides + каналы партнёров (VK / RuTube).
 */
(function (global) {
  'use strict';

  var BUCKET = 'https://storage.yandexcloud.net/fidesetratio/';

  /* YouTube в России без VPN не открывается — в каталоге только своё видео и VK/RuTube партнёров. */

  var OWN_SHORTS = [
    {
      id: 1,
      title: 'Стоит ли стучаться в закрытые двери?',
      description: 'о. Юрий Дорогин — о цели желаний, которые может открыть только Он.',
      speaker: 'о. Юрий Дорогин',
      duration: 69,
    },
    {
      id: 2,
      title: 'Легко ли тебе прощать 70×7 раз?',
      description: 'с. Даша о словах, которые освобождают.',
      speaker: 'с. Даша',
      duration: 65,
    },
    {
      id: 3,
      title: 'Сколько нужно молиться настоящему христианину?',
      description: 'о. Юрий OP — на чём стоит молитва.',
      speaker: 'о. Юрий OP',
      duration: 81,
    },
    {
      id: 4,
      title: 'Почему не во всех орденах есть третий орден?',
      description: 'о. Юрий OP — об общинах мирян.',
      speaker: 'о. Юрий OP',
      duration: 49,
    },
    {
      id: 5,
      title: 'Что такое ходатайственная молитва?',
      description: 'с. Даша: просить нужно даже за тех, кто тебе не рад.',
      speaker: 'с. Даша',
      duration: 37,
    },
    {
      id: 6,
      title: 'Большой взрыв = креационизм?',
      description: 'с. Анастасия — космологический аргумент.',
      speaker: 'с. Анастасия',
      duration: 53,
    },
    {
      id: 7,
      title: 'Что если я сомневаюсь в Иисусе?',
      description: 'с. Иоанна Павла — короткое слово при сомнении.',
      speaker: 'с. Иоанна Павла',
      duration: 71,
    },
    {
      id: 8,
      title: 'Библия написана не обо мне, но для меня?',
      description: 'Блаженны слышащие слово Божие и соблюдающие его.',
      speaker: '',
      duration: 45,
    },
    {
      id: 9,
      title: 'Песня в храме — молитва?',
      description: 'Если сомневаешься, петь ли на Мессе.',
      speaker: '',
      duration: 52,
    },
  ].map(function (v) {
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      speaker: v.speaker,
      duration: v.duration,
      type: 'short',
      videoUrl: BUCKET + 'video' + v.id + '.mp4',
      thumb: 'assets/video/short-' + v.id + '.webp',
      channelId: '',
    };
  });

  var OWN_LONGS = [
    {
      id: 10,
      slug: '01-svyatost',
      thumbId: 'long-01',
      title: 'Святость',
      description: 'Фильм из цикла «Океан милосердия» — о святости как пути.',
      duration: 723,
    },
    {
      id: 11,
      slug: '02-bog-molchit',
      thumbId: 'long-02',
      title: 'Бог молчит',
      description: 'Когда кажется, что небо пусто: тишина Бога и ответ веры.',
      duration: 738,
    },
    {
      id: 12,
      slug: '03-tsarskoe-ditya',
      thumbId: 'long-03',
      title: 'Царское дитя',
      description: 'О достоинстве человека, которое нельзя заслужить и нельзя отменить.',
      duration: 525,
    },
    {
      id: 13,
      slug: '04-v-diapazone',
      thumbId: 'long-04',
      title: 'В диапазоне',
      description: 'Вера не в одной ноте: как слышать Бога в разной жизни.',
      duration: 697,
    },
    {
      id: 14,
      slug: '05-vsem-serdcem',
      thumbId: 'long-05',
      title: 'Всем сердцем',
      description: 'Любовь к Богу, которая не делит сердце на «церковное» и остальное.',
      duration: 649,
    },
  ].map(function (v) {
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      speaker: 'Океан милосердия',
      duration: v.duration,
      type: 'long',
      videoUrl: BUCKET + 'ocean-mercy/' + v.slug + '.mp4',
      thumb: 'assets/video/' + v.thumbId + '-mercy.webp?v=2026090701',
      channelId: 'ocean-mercy',
      cycle: 'Океан милосердия',
    };
  });

  /* ——— Партнёры: контент с их площадок ——— */

  var PARTNER_SHORTS = [];

  var PARTNER_LONGS = [
    /* Универсальная Церковь — отдельные ролики с VK */
    {
      id: 201,
      title: 'Видео на VK',
      speaker: 'Вселенская Церковь по-русски',
      channelId: 'unasancta',
      thumb: 'assets/video/partners/unasancta.svg',
      externalUrl: 'https://vkvideo.ru/video-64334109_456240116',
    },
    {
      id: 202,
      title: 'Видео на VK',
      speaker: 'Вселенская Церковь по-русски',
      channelId: 'unasancta',
      thumb: 'assets/video/partners/unasancta.svg',
      externalUrl: 'https://vkvideo.ru/video-64334109_456240070',
    },
    /* МАМА */
    {
      id: 301,
      title: 'Видео на VK',
      speaker: 'Киностудия «МАМА»',
      channelId: 'mama',
      thumb: 'assets/video/partners/mama.svg',
      externalUrl: 'https://vkvideo.ru/video-26685443_456239124',
    },
  ].map(function (v) {
    return {
      id: v.id,
      title: v.title,
      description: v.description || '',
      speaker: v.speaker,
      type: 'long',
      channelId: v.channelId,
      cycle: v.cycle || '',
      thumb: v.thumb || '',
      externalUrl: v.externalUrl || '',
      embedUrl: '',
      videoUrl: '',
    };
  });

  var CHANNELS = [
    {
      id: 'unasancta',
      name: 'Вселенская Церковь по-русски',
      logo: 'assets/video/partners/unasancta.svg',
      bio:
        'Проект «Вселенская Церковь по-русски» — лучшие зарубежные католические проповедники и мыслители современности на русском языке. Основное направление — перевод видео проповедей и лекций о Католической Церкви. Автор проекта Александр Баранов также переводит статьи, книги и послания Римских Пап.',
      links: [
        { label: 'ВК', href: 'https://vk.ru/unasancta' },
        { label: 'RuTube', href: 'https://rutube.ru/channel/60130973/' },
        { label: 'ТГ', href: 'https://t.me/CathRus' },
        { label: 'Дзен', href: 'https://dzen.ru/unasancta' },
      ],
      cycles: [],
    },
    {
      id: 'mama',
      name: 'Киностудия «МАМА»',
      logo: 'assets/video/partners/mama.svg',
      bio:
        'Киностудия «МАМА» занимается созданием документального и игрового кино. Цель — духовное просвещение, помощь в укреплении веры, воспитание духовных ценностей. Производство: Давид Чебан и Яна Чебан. Директор: Роланд Жакенуд.',
      links: [
        { label: 'Vimeo', href: 'https://vimeo.com/userstudiomama' },
        { label: 'ВК', href: 'https://vk.ru/studiomama' },
      ],
      cycles: [
        {
          title: 'Символ веры',
          href: 'https://vkvideo.ru/playlist/-26685443_13',
          thumb: 'assets/video/partners/mama.svg',
        },
        {
          title: 'Семь даров Святого Духа',
          href: 'https://vkvideo.ru/playlist/-26685443_2',
          thumb: 'assets/video/partners/mama.svg',
        },
      ],
    },
    {
      id: 'tvkana',
      name: 'ТВ Кана',
      logo: 'assets/video/partners/tvkana.svg',
      bio:
        'Сибирское католическое телевидение «Кана» работает для католиков России, Казахстана и других государств бывшего СССР. Студия освящена 2 февраля 1996 года епископом Иосифом Вертом. По решению Конференции католических епископов РФ служение предназначено не только для Преображенской епархии в Новосибирске, но и для других российских епархий и русскоязычных верующих.',
      links: [
        { label: 'ВК', href: 'https://vk.ru/tvkana' },
      ],
      cycles: [],
    },
    {
      id: 'ocean-mercy',
      name: 'Океан милосердия',
      logo: 'assets/video/long-01-mercy.webp?v=2026090701',
      bio: 'Цикл фильмов о милосердии, святости и достоинстве человека на портале ЯКатолик.',
      links: [{ label: 'Смотреть на портале', href: 'video-channel.html?id=ocean-mercy' }],
      cycles: [],
    },
  ];

  global.YakVideos = {
    bucket: BUCKET,
    items: OWN_LONGS.concat(OWN_SHORTS).concat(PARTNER_LONGS).concat(PARTNER_SHORTS),
    channels: CHANNELS,
  };
})(window);
