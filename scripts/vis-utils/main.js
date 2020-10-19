const defaultLocale = 'en';
const statePrefix = '0_userdata.0.vis';

const getLocale = () => existsState(`${statePrefix}.locale`) ? getState(`${statePrefix}.locale`).val : defaultLocale;

// Initialization create/delete states, register listeners
// Using my global functions `initializeState` and `runAfterInitialization` (see global script common-states-handling )

initializeState(`${statePrefix}.locale`, defaultLocale, {name: 'Selected locale', type: 'string'},  {change: 'ne'}, setup);
initializeState(`${statePrefix}.translations`, '{}', {name: 'View translations', type: 'string', write: false});

runAfterInitialization(setup);

function setup() {
    setViewTranslations();
}

function setViewTranslations() {
    setState(
        `${statePrefix}.translations`,
        JSON.stringify([
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

function translate(locale, enText) {
    const map = { // For translations used https://translator.iobroker.in (that uses Google translator)
        "Language": {
            "en": "Language",
            "de": "Sprache",
            "ru": "Язык",
            "pt": "Língua",
            "nl": "Taal",
            "fr": "Langue",
            "it": "linguaggio",
            "es": "Idioma",
            "pl": "Język",
            "zh-cn": "语言"
        },
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
            "it": "dispositivi",
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
        }
    };

    return (map[enText] || {})[getLocale()] || enText;
}
