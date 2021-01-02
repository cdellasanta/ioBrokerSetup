const defaultLocale = 'en';
const statePrefix = '0_userdata.0.vis';

const getLocale = () =>  getStateValue(`${statePrefix}.locale`).val || defaultLocale;

// Initialization create/delete states, register listeners
// Using my global functions `initializeState` and `runAfterInitialization` (see global script common-states-handling )

initializeState(`${statePrefix}.locale`, defaultLocale, {name: 'Selected locale', type: 'string'}, 'ne', setup);
initializeState(`${statePrefix}.languages`, '[]', {name: 'Localizzed languages list', type: 'string'});
initializeState(`${statePrefix}.translations`, '{}', {name: 'View translations', type: 'string', write: false});

runAfterInitialization(setup);

// Handle light/dark modes
setState('vis-materialdesign.0.colors.darkTheme', !isAstroDay()); // On script startup
schedule({astro: 'sunrise'}, () => setState('vis-materialdesign.0.colors.darkTheme', false));
schedule({astro: 'sunset'}, () => setState('vis-materialdesign.0.colors.darkTheme', true));

function setup() {
    setLanguages();
    setViewTranslations();
}

function setViewTranslations() {
    setState(
        `${statePrefix}.translations`,
        JSON.stringify([
            'light',
            'dark',
            'Language',
            'Sandbox',
            'Meteo',
            'Radar',
            'Devices',
            'Network'
        ].reduce((o, key) => ({...o, [key]: translate(key)}), {})),
        true
    );
}

function setLanguages() {
    const getText = (enText, locale) => `${translate(enText)}${getLocale() === locale ? '' : ( ' - ' + translate(enText, locale))}`;

    setState(
        `${statePrefix}.languages`,
        JSON.stringify(
            Object.entries({
                en: 'English',
                de: 'German',
                ru: 'Russian',
                pt: 'Portuguese',
                nl: 'Dutch',
                fr: 'French',
                it: 'Italian',
                es: 'Spanish',
                pl: 'Polnisch',
                'zh-cn': 'Chinese',
            }).map(([key, value]) => ({value: key, text: getText(value, key)}))
        ),
        true
    );

    // Old simple listing
    // [
    //     {"value":"en", "text":"english"},
    //     {"value":"de", "text":"deutsch"},
    //     {"value":"ru", "text":"русский"},
    //     {"value":"pt", "text":"português"},
    //     {"value":"nl", "text":"dutsh"},
    //     {"value":"fr", "text":"français"},
    //     {"value":"it", "text":"italiano"},
    //     {"value":"es", "text":"español"},
    //     {"value":"pl", "text":"polerowany"},
    //     {"value":"zh-cn", "text":"中国人"}
    // ]
}

function translate(enText, forcedLocale = false) {
    const map = { // For translations used https://translator.iobroker.in (that uses Google translator)
        "light": {
            "en": "light",
            "de": "hell",
            "ru": "яркий",
            "pt": "brilhante",
            "nl": "helder",
            "fr": "brillant",
            "it": "chiaro",
            "es": "brillante",
            "pl": "jasny",
            "zh-cn": "亮"
        },
        "dark": {
            "en": "dark",
            "de": "dunkel",
            "ru": "тьма",
            "pt": "Sombrio",
            "nl": "donker",
            "fr": "foncé",
            "it": "scuro",
            "es": "oscuro",
            "pl": "ciemny",
            "zh-cn": "黑暗"
        },
        "Language": {
            "en": "Language",
            "de": "Sprache",
            "ru": "Язык",
            "pt": "Língua",
            "nl": "Taal",
            "fr": "Langue",
            "it": "Lingua",
            "es": "Idioma",
            "pl": "Język",
            "zh-cn": "语言"
        },
        // menu
        "Sandbox": {
            "en": "Sandbox",
            "de": "Sandkasten",
            "ru": "Песочница",
            "pt": "Caixa de areia",
            "nl": "Sandbox",
            "fr": "bac à sable",
            "it": "Sandbox",
            "es": "Salvadera",
            "pl": "Piaskownica",
            "zh-cn": "沙盒"
        },
        "Meteo": {
            "en": "Meteo",
            "de": "Meteo",
            "ru": "Метео",
            "pt": "Meteo",
            "nl": "Meteo",
            "fr": "Météo",
            "it": "Meteo",
            "es": "Meteo",
            "pl": "Meteo",
            "zh-cn": "流星"
        },
        "Radar": {
            "en": "Radar",
            "de": "Radar",
            "ru": "Радар",
            "pt": "Radar",
            "nl": "Radar",
            "fr": "Radar",
            "it": "Radar",
            "es": "Radar",
            "pl": "Radar",
            "zh-cn": "雷达"
        },
        "Devices": {
            "en": "Devices",
            "de": "Geräte",
            "ru": "Устройства",
            "pt": "Dispositivos",
            "nl": "Apparaten",
            "fr": "Dispositifs",
            "it": "Dispositivi",
            "es": "Dispositivos",
            "pl": "Urządzenia",
            "zh-cn": "设备"
        },
        "Network": {
            "en": "Network",
            "de": "Netzwerk",
            "ru": "Сеть",
            "pt": "Rede",
            "nl": "Netwerk",
            "fr": "Réseau",
            "it": "Rete",
            "es": "Red",
            "pl": "Sieć",
            "zh-cn": "网络"
        },
        // languages:
        "English": {
            "en": "English",
            "de": "Englisch",
            "ru": "Английский",
            "pt": "Inglês",
            "nl": "Engels",
            "fr": "Anglais",
            "it": "Inglese",
            "es": "Inglés",
            "pl": "Język angielski",
            "zh-cn": "英语"
        },
        "German": {
            "en": "German",
            "de": "Deutsch",
            "ru": "Немецкий",
            "pt": "alemão",
            "nl": "Duitse",
            "fr": "allemand",
            "it": "Tedesco",
            "es": "alemán",
            "pl": "Niemiecki",
            "zh-cn": "德语"
        },
        "Russian": {
            "en": "Russian",
            "de": "Russisch",
            "ru": "русский",
            "pt": "russo",
            "nl": "Russisch",
            "fr": "russe",
            "it": "russo",
            "es": "ruso",
            "pl": "Rosyjski",
            "zh-cn": "俄语"
        },
        "Portuguese": {
            "en": "Portuguese",
            "de": "Portugiesisch",
            "ru": "португальский",
            "pt": "Português",
            "nl": "Portugees",
            "fr": "Portugais",
            "it": "portoghese",
            "es": "portugués",
            "pl": "portugalski",
            "zh-cn": "葡萄牙语"
        },
        "Dutch": {
            "en": "Dutch",
            "de": "Niederländisch",
            "ru": "нидерландский язык",
            "pt": "holandês",
            "nl": "Nederlands",
            "fr": "néerlandais",
            "it": "olandese",
            "es": "holandés",
            "pl": "holenderski",
            "zh-cn": "荷兰语"
        },
        "French": {
            "en": "French",
            "de": "Französisch",
            "ru": "французский язык",
            "pt": "francês",
            "nl": "Frans",
            "fr": "français",
            "it": "francese",
            "es": "francés",
            "pl": "Francuski",
            "zh-cn": "法文"
        },
        "Italian": {
            "en": "Italian",
            "de": "Italienisch",
            "ru": "Итальянский",
            "pt": "italiano",
            "nl": "Italiaans",
            "fr": "italien",
            "it": "italiano",
            "es": "italiano",
            "pl": "Włoski",
            "zh-cn": "义大利文"
        },
        "Spanish": {
            "en": "Spanish",
            "de": "Spanisch",
            "ru": "испанский язык",
            "pt": "espanhol",
            "nl": "Spaans",
            "fr": "Espagnol",
            "it": "spagnolo",
            "es": "Español",
            "pl": "hiszpański",
            "zh-cn": "西班牙文"
        },
        "Polnisch": {
            "en": "Polnisch",
            "de": "Polnisch",
            "ru": "Polnisch",
            "pt": "Polnisch",
            "nl": "Polnisch",
            "fr": "Polnisch",
            "it": "Polnisch",
            "es": "Polnisch",
            "pl": "Polnisch",
            "zh-cn": "波尔尼施"
        },
        "Chinese": {
            "en": "Chinese",
            "de": "Chinesisch",
            "ru": "китайский язык",
            "pt": "chinês",
            "nl": "Chinese",
            "fr": "chinois",
            "it": "Cinese",
            "es": "chino",
            "pl": "chiński",
            "zh-cn": "中文"
        }
   };

    return (map[enText] || {})[forcedLocale || getLocale()] || enText;
}
