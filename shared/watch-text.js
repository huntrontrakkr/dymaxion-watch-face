// The words the watch face draws, in each language it can show. The watch
// keeps English built in; every other language is a resource made from this
// table by tools/generate-watch-text.mjs, with the glyphs its words need. The
// wire index of a language is its position in LANGUAGES: append only.
//
// Everything is upper case: the watch's lettering is capitals only. Patterns
// fill {w} weekday, {d} day, {dd} two-digit day, {m} and {m2} months, {y} year.
export const LANGUAGES = Object.freeze([
  {code: 'en', name: 'English'},
  {code: 'es', name: 'Español'},
  {code: 'fr', name: 'Français'},
  {code: 'de', name: 'Deutsch'},
  {code: 'it', name: 'Italiano'},
  {code: 'pt', name: 'Português'},
  {code: 'nl', name: 'Nederlands'},
  {code: 'pl', name: 'Polski'},
  {code: 'tr', name: 'Türkçe'},
  {code: 'id', name: 'Bahasa Indonesia'},
  {code: 'ru', name: 'Русский'},
  {code: 'uk', name: 'Українська'},
  {code: 'el', name: 'Ελληνικά'},
  {code: 'zh-Hans', name: '简体中文'},
  {code: 'zh-Hant', name: '繁體中文'},
  {code: 'ja', name: '日本語'},
  {code: 'ko', name: '한국어'},
  // The settings page only: the watch's lettering cannot yet join Arabic or
  // shape Devanagari, so the face itself stays in English.
  {code: 'ar', name: 'العربية', watch: false},
  {code: 'hi', name: 'हिन्दी', watch: false}
]);
export const WATCH_LANGUAGES = LANGUAGES.filter(l => l.watch !== false).map(l => l.code);

// Order is the resource's string order (watchface/src/c/generated/watch_text.h).
export const WATCH_TEXT_KEYS = Object.freeze([
  'weekdays', 'months', 'initials', 'date', 'calendarTitle', 'calendarSpan',
  'tide', 'humidity', 'weather', 'health', 'setUpTides', 'enableWeather', 'expired', 'unavailable', 'waiting',
  'allowHealth', 'mapUnavailable', 'old', 'rain', 'max', 'rh', 'steps', 'hr', 'typical'
]);
// Drawn only by the previews (the watch has its own health data and city).
export const PREVIEW_TEXT_KEYS = Object.freeze(['healthPreview', 'yourCity']);

const months = suffix => Array.from({length: 12}, (_, i) => `${i + 1}${suffix}`);
export const WATCH_TEXT = Object.freeze({
  en: {
    weekdays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    initials: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'TIDE', humidity: 'HUMIDITY', weather: 'WEATHER', health: 'HEALTH',
    setUpTides: 'SET UP TIDES IN SETTINGS', enableWeather: 'ENABLE WEATHER IN SETTINGS', expired: 'FORECAST EXPIRED',
    unavailable: 'DATA UNAVAILABLE', waiting: 'WAITING FOR PHONE', allowHealth: 'ALLOW HEALTH IN THE PEBBLE APP',
    mapUnavailable: 'MAP UNAVAILABLE', old: 'OLD', rain: 'RAIN', max: 'MAX', rh: 'RH', steps: 'STEPS', hr: 'HR', typical: 'TYPICAL',
    healthPreview: 'STEPS AND HEART RATE ARE ON THE WATCH', yourCity: 'YOUR CITY'
  },
  es: {
    weekdays: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
    months: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
    initials: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'MAREA', humidity: 'HUMEDAD', weather: 'TIEMPO', health: 'SALUD',
    setUpTides: 'CONFIGURA LAS MAREAS', enableWeather: 'ACTIVA EL TIEMPO EN AJUSTES', expired: 'PRONÓSTICO CADUCADO',
    unavailable: 'DATOS NO DISPONIBLES', waiting: 'ESPERANDO AL TELÉFONO', allowHealth: 'PERMITE SALUD EN LA APP PEBBLE',
    mapUnavailable: 'MAPA NO DISPONIBLE', old: 'VIEJO', rain: 'LLUVIA', max: 'MÁX', rh: 'HR', steps: 'PASOS', hr: 'FC', typical: 'NORMAL',
    healthPreview: 'PASOS Y PULSO ESTÁN EN EL RELOJ', yourCity: 'TU CIUDAD'
  },
  fr: {
    weekdays: ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'],
    months: ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'],
    initials: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'MARÉE', humidity: 'HUMIDITÉ', weather: 'MÉTÉO', health: 'SANTÉ',
    setUpTides: 'CONFIGUREZ LES MARÉES', enableWeather: 'ACTIVEZ LA MÉTÉO EN RÉGLAGES', expired: 'PRÉVISIONS EXPIRÉES',
    unavailable: 'DONNÉES INDISPONIBLES', waiting: 'EN ATTENTE DU TÉLÉPHONE', allowHealth: 'AUTORISEZ SANTÉ DANS PEBBLE',
    mapUnavailable: 'CARTE INDISPONIBLE', old: 'ANCIEN', rain: 'PLUIE', max: 'MAX', rh: 'HR', steps: 'PAS', hr: 'FC', typical: 'USUEL',
    healthPreview: 'PAS ET POULS SONT SUR LA MONTRE', yourCity: 'VOTRE VILLE'
  },
  de: {
    weekdays: ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'],
    months: ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'],
    initials: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
    date: '{w} {dd}. {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'GEZEITEN', humidity: 'FEUCHTE', weather: 'WETTER', health: 'GESUNDHEIT',
    setUpTides: 'GEZEITEN EINRICHTEN', enableWeather: 'WETTER IN EINSTELLUNGEN AN', expired: 'VORHERSAGE ABGELAUFEN',
    unavailable: 'KEINE DATEN', waiting: 'WARTE AUF TELEFON', allowHealth: 'GESUNDHEIT IN PEBBLE ERLAUBEN',
    mapUnavailable: 'KARTE NICHT VERFÜGBAR', old: 'ALT', rain: 'REGEN', max: 'MAX', rh: 'RF', steps: 'SCHRITTE', hr: 'HF', typical: 'ÜBLICH',
    healthPreview: 'SCHRITTE UND PULS AUF DER UHR', yourCity: 'DEINE STADT'
  },
  it: {
    weekdays: ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'],
    months: ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'],
    initials: ['D', 'L', 'M', 'M', 'G', 'V', 'S'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'MAREA', humidity: 'UMIDITÀ', weather: 'METEO', health: 'SALUTE',
    setUpTides: 'IMPOSTA LE MAREE', enableWeather: 'ATTIVA IL METEO IN IMPOSTAZIONI', expired: 'PREVISIONI SCADUTE',
    unavailable: 'DATI NON DISPONIBILI', waiting: 'IN ATTESA DEL TELEFONO', allowHealth: 'CONSENTI SALUTE IN PEBBLE',
    mapUnavailable: 'MAPPA NON DISPONIBILE', old: 'VECCHIO', rain: 'PIOGGIA', max: 'MAX', rh: 'UR', steps: 'PASSI', hr: 'FC', typical: 'SOLITO',
    healthPreview: 'PASSI E BATTITO SUL TUO OROLOGIO', yourCity: 'LA TUA CITTÀ'
  },
  pt: {
    weekdays: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'],
    months: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
    initials: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'MARÉ', humidity: 'UMIDADE', weather: 'TEMPO', health: 'SAÚDE',
    setUpTides: 'CONFIGURE AS MARÉS', enableWeather: 'ATIVE O TEMPO NOS AJUSTES', expired: 'PREVISÃO EXPIRADA',
    unavailable: 'DADOS INDISPONÍVEIS', waiting: 'AGUARDANDO O CELULAR', allowHealth: 'PERMITA SAÚDE NO APP PEBBLE',
    mapUnavailable: 'MAPA INDISPONÍVEL', old: 'ANTIGO', rain: 'CHUVA', max: 'MÁX', rh: 'UR', steps: 'PASSOS', hr: 'FC', typical: 'NORMAL',
    healthPreview: 'PASSOS E PULSO ESTÃO NO RELÓGIO', yourCity: 'SUA CIDADE'
  },
  nl: {
    weekdays: ['ZO', 'MA', 'DI', 'WO', 'DO', 'VR', 'ZA'],
    months: ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'],
    initials: ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'GETIJ', humidity: 'VOCHTIGHEID', weather: 'WEER', health: 'GEZONDHEID',
    setUpTides: 'STEL DE GETIJDEN IN', enableWeather: 'ZET WEER AAN IN INSTELLINGEN', expired: 'VERWACHTING VERLOPEN',
    unavailable: 'GEEN GEGEVENS', waiting: 'WACHTEN OP TELEFOON', allowHealth: 'STA GEZONDHEID TOE IN PEBBLE',
    mapUnavailable: 'KAART NIET BESCHIKBAAR', old: 'OUD', rain: 'REGEN', max: 'MAX', rh: 'RV', steps: 'STAPPEN', hr: 'HS', typical: 'NORMAAL',
    healthPreview: 'STAPPEN EN HARTSLAG OP HET HORLOGE', yourCity: 'JOUW STAD'
  },
  pl: {
    weekdays: ['NDZ', 'PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB'],
    months: ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'],
    initials: ['N', 'P', 'W', 'Ś', 'C', 'P', 'S'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'PŁYWY', humidity: 'WILGOTNOŚĆ', weather: 'POGODA', health: 'ZDROWIE',
    setUpTides: 'USTAW PŁYWY W USTAWIENIACH', enableWeather: 'WŁĄCZ POGODĘ W USTAWIENIACH', expired: 'PROGNOZA WYGASŁA',
    unavailable: 'DANE NIEDOSTĘPNE', waiting: 'CZEKAM NA TELEFON', allowHealth: 'ZEZWÓL NA ZDROWIE W PEBBLE',
    mapUnavailable: 'MAPA NIEDOSTĘPNA', old: 'STARE', rain: 'DESZCZ', max: 'MAKS', rh: 'WW', steps: 'KROKI', hr: 'TĘTNO', typical: 'ZWYKLE',
    healthPreview: 'KROKI I TĘTNO SĄ NA ZEGARKU', yourCity: 'TWOJE MIASTO'
  },
  tr: {
    weekdays: ['PAZ', 'PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT'],
    months: ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'],
    initials: ['P', 'P', 'S', 'Ç', 'P', 'C', 'C'],
    date: '{dd} {m} {w}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'GELGİT', humidity: 'NEM', weather: 'HAVA', health: 'SAĞLIK',
    setUpTides: 'GELGİTİ AYARLARDAN SEÇİN', enableWeather: 'HAVAYI AYARLARDAN AÇIN', expired: 'TAHMİNİN SÜRESİ DOLDU',
    unavailable: 'VERİ YOK', waiting: 'TELEFON BEKLENİYOR', allowHealth: 'PEBBLE UYGULAMASINDA İZİN VERİN',
    mapUnavailable: 'HARİTA YOK', old: 'ESKİ', rain: 'YAĞMUR', max: 'MAKS', rh: 'BN', steps: 'ADIM', hr: 'NABIZ', typical: 'OLAĞAN',
    healthPreview: 'ADIM VE NABIZ SAATİNİZDE', yourCity: 'ŞEHRİNİZ'
  },
  id: {
    weekdays: ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'],
    months: ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'],
    initials: ['M', 'S', 'S', 'R', 'K', 'J', 'S'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'PASANG SURUT', humidity: 'KELEMBAPAN', weather: 'CUACA', health: 'KESEHATAN',
    setUpTides: 'ATUR PASANG SURUT DI SETELAN', enableWeather: 'AKTIFKAN CUACA DI SETELAN', expired: 'PRAKIRAAN KEDALUWARSA',
    unavailable: 'DATA TIDAK TERSEDIA', waiting: 'MENUNGGU PONSEL', allowHealth: 'IZINKAN KESEHATAN DI PEBBLE',
    mapUnavailable: 'PETA TIDAK TERSEDIA', old: 'LAMA', rain: 'HUJAN', max: 'MAKS', rh: 'RH', steps: 'LANGKAH', hr: 'DJ', typical: 'BIASA',
    healthPreview: 'LANGKAH DAN DENYUT ADA DI JAM', yourCity: 'KOTA ANDA'
  },
  ru: {
    weekdays: ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'],
    months: ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'],
    initials: ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'ПРИЛИВЫ', humidity: 'ВЛАЖНОСТЬ', weather: 'ПОГОДА', health: 'ЗДОРОВЬЕ',
    setUpTides: 'НАСТРОЙТЕ ПРИЛИВЫ', enableWeather: 'ВКЛЮЧИТЕ ПОГОДУ В НАСТРОЙКАХ', expired: 'ПРОГНОЗ УСТАРЕЛ',
    unavailable: 'НЕТ ДАННЫХ', waiting: 'ОЖИДАНИЕ ТЕЛЕФОНА', allowHealth: 'РАЗРЕШИТЕ ЗДОРОВЬЕ В PEBBLE',
    mapUnavailable: 'КАРТА НЕДОСТУПНА', old: 'СТАРОЕ', rain: 'ДОЖДЬ', max: 'МАКС', rh: 'ОВ', steps: 'ШАГИ', hr: 'ПУЛЬС', typical: 'ОБЫЧНО',
    healthPreview: 'ШАГИ И ПУЛЬС ЕСТЬ НА ЧАСАХ', yourCity: 'ВАШ ГОРОД'
  },
  uk: {
    weekdays: ['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'],
    months: ['СІЧ', 'ЛЮТ', 'БЕР', 'КВІ', 'ТРА', 'ЧЕР', 'ЛИП', 'СЕР', 'ВЕР', 'ЖОВ', 'ЛИС', 'ГРУ'],
    initials: ['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'ПРИПЛИВИ', humidity: 'ВОЛОГІСТЬ', weather: 'ПОГОДА', health: 'ЗДОРОВ\'Я',
    setUpTides: 'НАЛАШТУЙТЕ ПРИПЛИВИ', enableWeather: 'УВІМКНІТЬ ПОГОДУ В НАЛАШТУВАННЯХ', expired: 'ПРОГНОЗ ЗАСТАРІВ',
    unavailable: 'НЕМАЄ ДАНИХ', waiting: 'ОЧІКУВАННЯ ТЕЛЕФОНУ', allowHealth: 'ДОЗВОЛЬТЕ ЗДОРОВ\'Я В PEBBLE',
    mapUnavailable: 'КАРТА НЕДОСТУПНА', old: 'СТАРЕ', rain: 'ДОЩ', max: 'МАКС', rh: 'ВВ', steps: 'КРОКИ', hr: 'ПУЛЬС', typical: 'ЗВИЧНО',
    healthPreview: 'КРОКИ Й ПУЛЬС Є НА ГОДИННИКУ', yourCity: 'ВАШЕ МІСТО'
  },
  el: {
    weekdays: ['ΚΥΡ', 'ΔΕΥ', 'ΤΡΙ', 'ΤΕΤ', 'ΠΕΜ', 'ΠΑΡ', 'ΣΑΒ'],
    months: ['ΙΑΝ', 'ΦΕΒ', 'ΜΑΡ', 'ΑΠΡ', 'ΜΑΪ', 'ΙΟΥΝ', 'ΙΟΥΛ', 'ΑΥΓ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕ', 'ΔΕΚ'],
    initials: ['Κ', 'Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ'],
    date: '{w} {dd} {m}', calendarTitle: '{m} {y}', calendarSpan: '{m} / {m2}',
    tide: 'ΠΑΛΙΡΡΟΙΑ', humidity: 'ΥΓΡΑΣΙΑ', weather: 'ΚΑΙΡΟΣ', health: 'ΥΓΕΙΑ',
    setUpTides: 'ΡΥΘΜΙΣΤΕ ΤΙΣ ΠΑΛΙΡΡΟΙΕΣ', enableWeather: 'ΕΝΕΡΓΟΠΟΙΗΣΤΕ ΤΟΝ ΚΑΙΡΟ', expired: 'Η ΠΡΟΓΝΩΣΗ ΕΛΗΞΕ',
    unavailable: 'ΧΩΡΙΣ ΔΕΔΟΜΕΝΑ', waiting: 'ΑΝΑΜΟΝΗ ΓΙΑ ΤΗΛΕΦΩΝΟ', allowHealth: 'ΕΠΙΤΡΕΨΤΕ ΥΓΕΙΑ ΣΤΟ PEBBLE',
    mapUnavailable: 'ΧΑΡΤΗΣ ΜΗ ΔΙΑΘΕΣΙΜΟΣ', old: 'ΠΑΛΙΑ', rain: 'ΒΡΟΧΗ', max: 'ΜΕΓ', rh: 'ΣΥ', steps: 'ΒΗΜΑΤΑ', hr: 'ΠΑΛΜ', typical: 'ΣΥΝΗΘΩΣ',
    healthPreview: 'ΒΗΜΑΤΑ ΚΑΙ ΠΑΛΜΟΙ ΣΤΟ ΡΟΛΟΙ', yourCity: 'Η ΠΟΛΗ ΣΑΣ'
  },
  'zh-Hans': {
    weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    months: months('月'),
    initials: ['日', '一', '二', '三', '四', '五', '六'],
    date: '{m}{d}日 {w}', calendarTitle: '{y}年{m}', calendarSpan: '{m} / {m2}',
    tide: '潮汐', humidity: '湿度', weather: '天气', health: '健康',
    setUpTides: '请在设置中选择潮汐', enableWeather: '请在设置中开启天气', expired: '预报已过期',
    unavailable: '数据不可用', waiting: '等待手机', allowHealth: '请在 PEBBLE 应用中允许健康',
    mapUnavailable: '地图不可用', old: '旧', rain: '雨', max: '最大', rh: '湿度', steps: '步数', hr: '心率', typical: '平常',
    healthPreview: '步数和心率在手表上', yourCity: '你的城市'
  },
  'zh-Hant': {
    weekdays: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
    months: months('月'),
    initials: ['日', '一', '二', '三', '四', '五', '六'],
    date: '{m}{d}日 {w}', calendarTitle: '{y}年{m}', calendarSpan: '{m} / {m2}',
    tide: '潮汐', humidity: '濕度', weather: '天氣', health: '健康',
    setUpTides: '請在設定中選擇潮汐', enableWeather: '請在設定中開啟天氣', expired: '預報已過期',
    unavailable: '資料無法使用', waiting: '等待手機', allowHealth: '請在 PEBBLE 程式中允許健康',
    mapUnavailable: '地圖無法使用', old: '舊', rain: '雨', max: '最大', rh: '濕度', steps: '步數', hr: '心率', typical: '平常',
    healthPreview: '步數和心率在手錶上', yourCity: '你的城市'
  },
  ja: {
    weekdays: ['日', '月', '火', '水', '木', '金', '土'],
    months: months('月'),
    initials: ['日', '月', '火', '水', '木', '金', '土'],
    date: '{m}{d}日（{w}）', calendarTitle: '{y}年{m}', calendarSpan: '{m} / {m2}',
    tide: '潮汐', humidity: '湿度', weather: '天気', health: 'ヘルス',
    setUpTides: '設定で潮汐を選んでください', enableWeather: '設定で天気をオンに', expired: '予報の期限切れ',
    unavailable: 'データなし', waiting: 'スマホを待っています', allowHealth: 'PEBBLEアプリでヘルスを許可',
    mapUnavailable: '地図を表示できません', old: '古い', rain: '雨', max: '最大', rh: '湿度', steps: '歩数', hr: '心拍', typical: 'いつも',
    healthPreview: '歩数と心拍は時計にあります', yourCity: 'あなたの街'
  },
  ko: {
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    months: months('월'),
    initials: ['일', '월', '화', '수', '목', '금', '토'],
    date: '{m} {d}일 {w}', calendarTitle: '{y}년 {m}', calendarSpan: '{m} / {m2}',
    tide: '조석', humidity: '습도', weather: '날씨', health: '건강',
    setUpTides: '설정에서 조석을 선택하세요', enableWeather: '설정에서 날씨를 켜세요', expired: '예보가 만료됨',
    unavailable: '데이터 없음', waiting: '휴대폰 기다리는 중', allowHealth: 'PEBBLE 앱에서 건강을 허용하세요',
    mapUnavailable: '지도를 표시할 수 없음', old: '오래됨', rain: '비', max: '최대', rh: '습도', steps: '걸음', hr: '심박', typical: '평소',
    healthPreview: '걸음과 심박은 시계에 있습니다', yourCity: '내 도시'
  }
});

// The language the face shows: the chosen one, or for 'auto' the first of the
// phone's languages the face has, else English. A settings-page-only language
// shows the face in English.
export function resolveLanguage(choice, preferred = []) {
  const find = tag => {
    if (!tag) return null;
    const lower = String(tag).toLowerCase();
    if (lower.startsWith('zh')) return /hant|tw|hk|mo/.test(lower) ? 'zh-Hant' : 'zh-Hans';
    const base = lower.split(/[-_]/)[0];
    return LANGUAGES.find(l => l.code === base)?.code || null;
  };
  return (choice && choice !== 'auto' ? find(choice) : null) || preferred.map(find).find(Boolean) || 'en';
}
export const watchLanguage = code => WATCH_LANGUAGES.includes(code) ? code : 'en';
export const languageIndex = code => Math.max(0, WATCH_LANGUAGES.indexOf(watchLanguage(code)));
export const watchText = code => WATCH_TEXT[watchLanguage(code)];

// Fills a pattern as the watch does (watch_text_format in watch_text.c).
export function fillPattern(pattern, values) {
  return pattern.replace(/\{(w|dd|d|m2|m|y)\}/g, (_, key) => String(values[key] ?? ''));
}
export function watchDate(text, date) {
  return fillPattern(text.date, {w: text.weekdays[date.getDay()], d: date.getDate(), dd: String(date.getDate()).padStart(2, '0'), m: text.months[date.getMonth()]});
}
export function calendarTitle(text, year, month, endMonth = month) {
  return endMonth !== month ? fillPattern(text.calendarSpan, {m: text.months[month], m2: text.months[endMonth]})
    : fillPattern(text.calendarTitle, {m: text.months[month], y: year});
}

// The watch-language packet: version 1, the language's wire index.
export const encodeLanguage = code => new Uint8Array([1, languageIndex(code)]);
