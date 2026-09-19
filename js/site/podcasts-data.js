/** Подкасты портала. Выпуски подмешиваются из пака yak-podcasts-data. */
(function (global) {
  'use strict';

  var SHOWS = [
    {
      "id": "ruscatholic-podcast",
      "title": "Рускатолик Podcast",
      "host": "Николай Сыров",
      "authorSlug": "nikolay-syirov",
      "blurb": "Авторский подкаст Николая Сырова выходил с октября 2017 по март 2019 года на портале Рускатолик под девизом «обо всем на свете, сквозь призму пристального христианского взгляда». Актуальные новости, волнующие темы, интересные гости — всё это Рускатолик Podcast.",
      "cover": "assets/cards/articles-spirituality.webp",
      "episodes": [
        {
          "id": "rcp-01e01-uchites-u-delfinov",
          "season": 1,
          "episode": 1,
          "title": "Учитесь у дельфинов",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375739571-grs78h-s1e1-%D0%A3%D1%87%D0%B8%D1%82%D0%B5%D1%81%D1%8C-%D1%83-%D0%B4%D0%B5%D0%BB%D1%8C%D1%84%D0%B8%D0%BD%D0%BE%D0%B2.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e10-papa-francisk",
          "season": 1,
          "episode": 10,
          "title": "Папа Франциск",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375775245-ihbxqi-s1e10-%D0%9F%D0%B0%D0%BF%D0%B0-%D0%A4%D1%80%D0%B0%D0%BD%D1%86%D0%B8%D1%81%D0%BA.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e11-rozhdestvenskiy-vypusk",
          "season": 1,
          "episode": 11,
          "title": "Рождественский выпуск",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375777572-rchvb4-s1e11-%D0%A0%D0%BE%D0%B6%D0%B4%D0%B5%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D1%81%D0%BA%D0%B8%D0%B9-%D0%B2%D1%8B%D0%BF%D1%83%D1%81%D0%BA.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e02-kak-i-na-chto-zhivut-svyaschenniki",
          "season": 1,
          "episode": 2,
          "title": "Как и на что живут священники",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375784519-olb79s-s1e2-%D0%9A%D0%B0%D0%BA-%D0%B8-%D0%BD%D0%B0-%D1%87%D1%82%D0%BE-%D0%B6%D0%B8%D0%B2%D1%83%D1%82-%D1%81%D0%B2%D1%8F%D1%89%D0%B5%D0%BD%D0%BD%D0%B8%D0%BA%D0%B8.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e03-vzyat-ot-ispovedi-vse",
          "season": 1,
          "episode": 3,
          "title": "Взять от исповеди все!",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375788750-4w0jjp-s1e3-%D0%92%D0%B7%D1%8F%D1%82%D1%8C-%D0%BE%D1%82-%D0%B8%D1%81%D0%BF%D0%BE%D0%B2%D0%B5%D0%B4%D0%B8-%D0%B2%D1%81%D0%B5.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e04-ekumenizm-eto-voobsche-chto",
          "season": 1,
          "episode": 4,
          "title": "Экуменизм - это вообще что",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375790641-d0tnnm-s1e4-%D0%AD%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D0%B8%D0%B7%D0%BC-%D1%8D%D1%82%D0%BE-%D0%B2%D0%BE%D0%BE%D0%B1%D1%89%D0%B5-%D1%87%D1%82%D0%BE.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e05-reformaciya-500-let-spustya",
          "season": 1,
          "episode": 5,
          "title": "Реформация - 500 лет спустя",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375794036-zkc5t3-s1e5-%D0%A0%D0%B5%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D1%8F-500-%D0%BB%D0%B5%D1%82-%D1%81%D0%BF%D1%83%D1%81%D1%82%D1%8F.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e06-zachem-byt-monahom",
          "season": 1,
          "episode": 6,
          "title": "Зачем быть монахом",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375796411-btqzir-s1e6-%D0%97%D0%B0%D1%87%D0%B5%D0%BC-%D0%B1%D1%8B%D1%82%D1%8C-%D0%BC%D0%BE%D0%BD%D0%B0%D1%85%D0%BE%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e07-indulgenciya-chto-gde-kogda",
          "season": 1,
          "episode": 7,
          "title": "Индульгенция что, где, когда",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375862352-1fy097-s1e7-%D0%98%D0%BD%D0%B4%D1%83%D0%BB%D1%8C%D0%B3%D0%B5%D0%BD%D1%86%D0%B8%D1%8F-%D1%87%D1%82%D0%BE-%D0%B3%D0%B4%D0%B5-%D0%BA%D0%BE%D0%B3%D0%B4%D0%B0.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e08-advent",
          "season": 1,
          "episode": 8,
          "title": "Адвент",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375866953-7kw6zb-s1e8-%D0%90%D0%B4%D0%B2%D0%B5%D0%BD%D1%82.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-01e09-rasseyannyy-vypusk-o-chtenii",
          "season": 1,
          "episode": 9,
          "title": "Рассеянный выпуск о чтении",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375870107-vrhk1i-s1e9-%D0%A0%D0%B0%D1%81%D1%81%D0%B5%D1%8F%D0%BD%D0%BD%D1%8B%D0%B9-%D0%B2%D1%8B%D0%BF%D1%83%D1%81%D0%BA-%D0%BE-%D1%87%D1%82%D0%B5%D0%BD%D0%B8%D0%B8.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e01-disput-bogoslovie-i-sakralnye-teksty",
          "season": 2,
          "episode": 1,
          "title": "Диспут, богословие и сакральные тексты",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375873345-ip0xn6-s2e1-%D0%94%D0%B8%D1%81%D0%BF%D1%83%D1%82-%D0%B1%D0%BE%D0%B3%D0%BE%D1%81%D0%BB%D0%BE%D0%B2%D0%B8%D0%B5-%D0%B8-%D1%81%D0%B0%D0%BA%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-%D1%82%D0%B5%D0%BA%D1%81%D1%82%D1%8B.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e02-na-postu",
          "season": 2,
          "episode": 2,
          "title": "На Посту",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375912513-z1kh6y-s2e2-%D0%9D%D0%B0-%D0%9F%D0%BE%D1%81%D1%82%D1%83.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e03-sport-strast-i-fanatizm",
          "season": 2,
          "episode": 3,
          "title": "Спорт, страсть и фанатизм",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789375984506-lrxy3b-s2e3-%D0%A1%D0%BF%D0%BE%D1%80%D1%82-%D1%81%D1%82%D1%80%D0%B0%D1%81%D1%82%D1%8C-%D0%B8-%D1%84%D0%B0%D0%BD%D0%B0%D1%82%D0%B8%D0%B7%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e04-menshe-ada-s-darey-kosincevoy",
          "season": 2,
          "episode": 4,
          "title": "Меньше ада (с Дарьей Косинцевой)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376007221-zzepno-s2e4-%D0%9C%D0%B5%D0%BD%D1%8C%D1%88%D0%B5-%D0%B0%D0%B4%D0%B0-%D1%81-%D0%94%D0%B0%D1%80%D1%8C%D0%B5%D0%B9-%D0%9A%D0%BE%D1%81%D0%B8%D0%BD%D1%86%D0%B5%D0%B2%D0%BE%D0%B9.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e05-garri-potter-i-hristos",
          "season": 2,
          "episode": 5,
          "title": "Гарри Поттер и Христос",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376031017-60ryj4-s2e5-%D0%93%D0%B0%D1%80%D1%80%D0%B8-%D0%9F%D0%BE%D1%82%D1%82%D0%B5%D1%80-%D0%B8-%D0%A5%D1%80%D0%B8%D1%81%D1%82%D0%BE%D1%81.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e06-politika-i-grazhdanskiy-dolg",
          "season": 2,
          "episode": 6,
          "title": "Политика и гражданский долг",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376068232-qdamwc-s2e6-%D0%9F%D0%BE%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%D0%B0-%D0%B8-%D0%B3%D1%80%D0%B0%D0%B6%D0%B4%D0%B0%D0%BD%D1%81%D0%BA%D0%B8%D0%B9-%D0%B4%D0%BE%D0%BB%D0%B3.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e07-liturgiya-s-petrom-saharovym",
          "season": 2,
          "episode": 7,
          "title": "Литургия (с Петром Сахаровым)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376152976-r0pf3g-s2e7-%D0%9B%D0%B8%D1%82%D1%83%D1%80%D0%B3%D0%B8%D1%8F-%D1%81-%D0%9F%D0%B5%D1%82%D1%80%D0%BE%D0%BC-%D0%A1%D0%B0%D1%85%D0%B0%D1%80%D0%BE%D0%B2%D1%8B%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e08-pasha",
          "season": 2,
          "episode": 8,
          "title": "Пасха",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376162672-t1r8jx-s2e8-%D0%9F%D0%B0%D1%81%D1%85%D0%B0.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-02e09-tayna-i-chelovechnost-sakralnoe-i-obydennoe",
          "season": 2,
          "episode": 9,
          "title": "Тайна и человечность, сакральное и обыденное",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376227972-a55eh6-s2e9-%D0%A2%D0%B0%D0%B9%D0%BD%D0%B0-%D0%B8-%D1%87%D0%B5%D0%BB%D0%BE%D0%B2%D0%B5%D1%87%D0%BD%D0%BE%D1%81%D1%82%D1%8C-%D1%81%D0%B0%D0%BA%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B5-%D0%B8-%D0%BE%D0%B1%D1%8B%D0%B4%D0%B5%D0%BD%D0%BD%D0%BE%D0%B5.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e01-pribratsya-v-prihode",
          "season": 3,
          "episode": 1,
          "title": "Прибраться в приходе",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376301596-haned1-s3e1-%D0%9F%D1%80%D0%B8%D0%B1%D1%80%D0%B0%D1%82%D1%8C%D1%81%D1%8F-%D0%B2-%D0%BF%D1%80%D0%B8%D1%85%D0%BE%D0%B4%D0%B5.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e02-katehizaciya-s-dmitriem-kalinkinym",
          "season": 3,
          "episode": 2,
          "title": "Катехизация (с Дмитрием Калинкиным)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376310299-qxkl5s-s3e2-%D0%9A%D0%B0%D1%82%D0%B5%D1%85%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F-%D1%81-%D0%94%D0%BC%D0%B8%D1%82%D1%80%D0%B8%D0%B5%D0%BC-%D0%9A%D0%B0%D0%BB%D0%B8%D0%BD%D0%BA%D0%B8%D0%BD%D1%8B%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e03-tradicionalizm-c-evgeniem-rozenblyumom",
          "season": 3,
          "episode": 3,
          "title": "Традиционализм (c Евгением Розенблюмом)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376333970-tifjeh-s3e3-%D0%A2%D1%80%D0%B0%D0%B4%D0%B8%D1%86%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D0%B8%D0%B7%D0%BC-c-%D0%95%D0%B2%D0%B3%D0%B5%D0%BD%D0%B8%D0%B5%D0%BC-%D0%A0%D0%BE%D0%B7%D0%B5%D0%BD%D0%B1%D0%BB%D1%8E%D0%BC%D0%BE%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e04-kak-stat-svyatym-s-o-georgiem-kromkinym",
          "season": 3,
          "episode": 4,
          "title": "Как стать святым (с о. Георгием Кромкиным)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376600985-bcmy5z-s3e4-%D0%9A%D0%B0%D0%BA-%D1%81%D1%82%D0%B0%D1%82%D1%8C-%D1%81%D0%B2%D1%8F%D1%82%D1%8B%D0%BC-%D1%81-%D0%BE.-%D0%93%D0%B5%D0%BE%D1%80%D0%B3%D0%B8%D0%B5%D0%BC-%D0%9A%D1%80%D0%BE%D0%BC%D0%BA%D0%B8%D0%BD%D1%8B%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e05-cerkov-v-cifrovom-prostranstve",
          "season": 3,
          "episode": 5,
          "title": "Церковь в цифровом пространстве",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376611320-p304dv-s3e5-%D0%A6%D0%B5%D1%80%D0%BA%D0%BE%D0%B2%D1%8C-%D0%B2-%D1%86%D0%B8%D1%84%D1%80%D0%BE%D0%B2%D0%BE%D0%BC-%D0%BF%D1%80%D0%BE%D1%81%D1%82%D1%80%D0%B0%D0%BD%D1%81%D1%82%D0%B2%D0%B5.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e06-kak-podgotovitsya-k-smerti",
          "season": 3,
          "episode": 6,
          "title": "Как подготовиться к смерти",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376650665-kv7ir7-s3e6-%D0%9A%D0%B0%D0%BA-%D0%BF%D0%BE%D0%B4%D0%B3%D0%BE%D1%82%D0%BE%D0%B2%D0%B8%D1%82%D1%8C%D1%81%D1%8F-%D0%BA-%D1%81%D0%BC%D0%B5%D1%80%D1%82%D0%B8.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e07-itogi-2018-goda",
          "season": 3,
          "episode": 7,
          "title": "Итоги 2018 года",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376726374-m12vm2-s3e7-%D0%98%D1%82%D0%BE%D0%B3%D0%B8-2018-%D0%B3%D0%BE%D0%B4%D0%B0.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-03e08-muzyka-i-zvuk-v-sakralnom-prostranstve",
          "season": 3,
          "episode": 8,
          "title": "Музыка и звук в сакральном пространстве",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376751090-78expa-s3e8-%D0%9C%D1%83%D0%B7%D1%8B%D0%BA%D0%B0-%D0%B8-%D0%B7%D0%B2%D1%83%D0%BA-%D0%B2-%D1%81%D0%B0%D0%BA%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%BC-%D0%BF%D1%80%D0%BE%D1%81%D1%82%D1%80%D0%B0%D0%BD%D1%81%D1%82%D0%B2%D0%B5.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-04e01-armyanskiy-obryad-katolicheskoy-cerkvi-s-o-petro",
          "season": 4,
          "episode": 1,
          "title": "Армянский обряд Католической церкви (с о. Петросом Есаяном)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376795988-2vwptz-s4e1-%D0%90%D1%80%D0%BC%D1%8F%D0%BD%D1%81%D0%BA%D0%B8%D0%B9-%D0%BE%D0%B1%D1%80%D1%8F%D0%B4-%D0%9A%D0%B0%D1%82%D0%BE%D0%BB%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%BE%D0%B9-%D1%86%D0%B5%D1%80%D0%BA%D0%B2%D0%B8-%D1%81-%D0%BE.-%D0%9F%D0%B5%D1%82%D1%80%D0%BE%D1%81%D0%BE%D0%BC-%D0%95%D1%81%D0%B0%D1%8F%D0%BD%D0%BE%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-04e02-diskussiya-o-prihodah-s-o-georgiem-kromkinym",
          "season": 4,
          "episode": 2,
          "title": "Дискуссия о приходах (с о. Георгием Кромкиным)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376898808-iejvee-s4e2-%D0%94%D0%B8%D1%81%D0%BA%D1%83%D1%81%D1%81%D0%B8%D1%8F-%D0%BE-%D0%BF%D1%80%D0%B8%D1%85%D0%BE%D0%B4%D0%B0%D1%85-%D1%81-%D0%BE.-%D0%93%D0%B5%D0%BE%D1%80%D0%B3%D0%B8%D0%B5%D0%BC-%D0%9A%D1%80%D0%BE%D0%BC%D0%BA%D0%B8%D0%BD%D1%8B%D0%BC.mp3",
          "duration": "",
          "description": ""
        },
        {
          "id": "rcp-04e03-otvetstvennost-konflikt-molodezh-s-oksanoy-pimen",
          "season": 4,
          "episode": 3,
          "title": "Ответственность, конфликт, молодёжь (с Оксаной Пименовой)",
          "date": "",
          "audioUrl": "https://storage.yandexcloud.net/fidesetratio/desk/podcasts/1789376916454-vdu96d-s4e3-%D0%9E%D1%82%D0%B2%D0%B5%D1%82%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%BE%D1%81%D1%82%D1%8C-%D0%BA%D0%BE%D0%BD%D1%84%D0%BB%D0%B8%D0%BA%D1%82-%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D1%91%D0%B6%D1%8C-%D1%81-%D0%9E%D0%BA%D1%81%D0%B0%D0%BD%D0%BE%D0%B9-%D0%9F%D0%B8%D0%BC%D0%B5%D0%BD%D0%BE%D0%B2%D0%BE%D0%B9.mp3",
          "duration": "",
          "description": ""
        }
      ],
      "updated": "2019-03-26"
    },
    {
      "id": "propovedi-pavla-krupy",
      "title": "Проповеди о. Павла Крупы",
      "host": "о. Павел Крупа",
      "authorSlug": "",
      "blurb": "Проповеди отца Павла Крупы — отдельная папка в аудио, оформленная так же, как Рускатолик Podcast.",
      "cover": "assets/cards/articles-spirituality.webp",
      "episodes": [],
      "updated": ""
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
      if (sa !== sb) return sa - sb;
      var ea = Number(a.episode) || 0;
      var eb = Number(b.episode) || 0;
      if (ea !== eb) return ea - eb;
      return String(a.date || '').localeCompare(String(b.date || ''));
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
    var list = sortEpisodes(show.episodes || []);
    return list[list.length - 1] || show.latest || null;
  }

  function upsertShow(incoming) {
    if (!incoming || !incoming.id) return;
    var i = -1;
    for (var n = 0; n < SHOWS.length; n++) {
      if (SHOWS[n].id === incoming.id) { i = n; break; }
    }
    var next = i === -1 ? cloneShow(incoming) : Object.assign(cloneShow(SHOWS[i]), incoming);
    if (incoming.episodes && incoming.episodes.length) {
      next.episodes = incoming.episodes.map(function (ep) { return Object.assign({}, ep); });
    }
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
