/**
 * Sun positioning, uses API of https://www.sonnenverlauf.de and adds clipping of tools and adverts
 *
 * Requirements:
 *  - Some programming skills
 *
 * @license http://www.opensource.org/licenses/mit-license.html MIT License
 * @author  cdellasanta <70055566+cdellasanta@users.noreply.github.com>
 */

// Script configuration
const statePrefix = '0_userdata.0.vis.sun';
const defaultLocale = 'de';

const customCoordinetes = {
    continent: {lat: 50.102223, lon: 9.254419, zoom: 5}, // Old center of EU (corresponds to the headquarters of the European Central Bank)
    world: {lat: 0, lon: 0, zoom: 3}
};
const homeBuildingHeight = 10; // Height in meters, to correct display the shadow line

// Initialization create/delete states, register listeners
// Using my global functions (see global script common-states-handling )
declare function runAfterInitialization(callback: CallableFunction): void;
declare function initializeState(stateId: string, defaultValue: any, common: object, listenerChangeType?: string, listenerCallback?: CallableFunction): void;
declare function getStateIfExists(stateId: string): any;
declare function getStateValue(stateId: string): any;

const configuration = getObject('system.config');
const getLocale = () => getStateValue('0_userdata.0.vis.locale') || defaultLocale;
const coordinates = {
    // @ts-ignore
    home: {lat: configuration.common.latitude, lon: configuration.common.longitude, zoom: 17},
    ...customCoordinetes
};

initializeState(`${statePrefix}.completeOriginalPages`, true, {name: 'Clip sonnenverlauf.de tools and adverts', type: 'boolean'});
initializeState(`${statePrefix}.url`, true, {name: 'Url for sonnenverlauf.de including coordinates zoom and map type', type: 'string'});
initializeState(`${statePrefix}.viewTarget`, 'home', {name: 'Target for view (home|continent|world)', type: 'string'}, 'any', setTarget);
initializeState(`${statePrefix}.selectedMap`, '0', {name: 'Map to show', type: 'string'}, 'ne', setTarget);
initializeState(`${statePrefix}.mapList`, '[]', {name: 'List of available maps', type: 'string'});
initializeState(`${statePrefix}.translations`, '{}', {name: 'Sun view: viewTranslations', type: 'string', read: true, write: false});

// On locale change, setup correct listings
if (existsState('0_userdata.0.vis.locale')) {
    runAfterInitialization(() => on('0_userdata.0.vis.locale', 'ne', setup));
}

runAfterInitialization(
    () => {
        setup();
        setTarget();
    }
);

function setup(): void {
    setMapListItems();
    setViewTranslations();
}

function setTarget(): void {
    let coord = Object.values(coordinates[getStateValue(`${statePrefix}.viewTarget` || 'home')] || coordinates.home).join(',');
    let map = getStateValue(`${statePrefix}.selectedMap`) || 0;

    // URL: https://sonnenverlauf.de/#/lat,lon,zoom/date/time/objectlevel/maptype  (ref: https://www.torsten-hoffmann.de/apis/suncalcmooncalc/link_de.html)
    setState(
        `${statePrefix}.url`,
        `https://sonnenverlauf.de/#/${coord}/null/null/${homeBuildingHeight}/${map}`,
        true
    );
}

function setMapListItems(): void {
    setState(
        `${statePrefix}.mapList`,
        JSON.stringify([
            // Ref: https://www.torsten-hoffmann.de/apis/suncalcmooncalc/link_de.html
            {
                text: translate('OpenStreetMap'), // OpenStreetMap
                value: '0'
            },
            {
                text: translate('Esri Satellite Map'), // Esri-Satellite
                value: '1'
            },
            {
                text: translate('Humanitarian OpenStreetMap'), // OSM-Humanitarian
                value: '2'
            },
            {
                text: translate('Esri Street Map'), // Esri-Street
                value: '3'
            }
        ]),
        true
    );
}

function setViewTranslations(): void {
    setState(
        `${statePrefix}.translations`,
        JSON.stringify([
        'Original page',
        'Map type',
        'Home',
        'Continent',
        'World'
        ].reduce((o, key) => ({...o, [key]: translate(key)}), {})),
        true
    );
}

function translate(enText) {
    const map = { // Used https://translator.iobroker.in for translations that uses google translator
        // View translations
        'Original page': {de: "Originalseite", ru: "Исходная страница", pt: "Página original", nl: "Originele pagina", fr: "Page originale", it: "Pagina originale", es: "Página original", pl: "Oryginalna strona", 'zh-cn': "原始页面"},
        'Map type': {de: "Kartentyp", ru: "Тип карты", pt: "Tipo de mapa", nl: "Kaartsoort", fr: "Type de carte", it: "Tipo di mappa", es: "Tipo de mapa", pl: "Typ mapy", 'zh-cn': "地图类型"},
        'Home': {de: "Zuhause", ru: "Главная", pt: "Casa", nl: "Huis", fr: "Accueil", it: "Casa", es: "Casa", pl: "Dom", 'zh-cn': "家"},
        'Continent': {de: "Kontinent", ru: "Континент", pt: "Continente", nl: "Continent", fr: "Continent", it: "Continente", es: "Continente", pl: "Kontynent", 'zh-cn': "大陆"},
        'World': {de: "Welt", ru: "Мир", pt: "Mundo", nl: "Wereld", fr: "Monde", it: "Mondo", es: "Mundo", pl: "Świat", 'zh-cn': "世界"},
        //Maps
        'OpenStreetMap': {de: "OpenStreetMap", ru: "OpenStreetMap", pt: "OpenStreetMap", nl: "OpenStreetMap", fr: "OpenStreetMap", it: "OpenStreetMap", es: "OpenStreetMap", pl: "OpenStreetMap", 'zh-cn': "OpenStreetMap"},
        'Esri Satellite Map': {de: "Esri Satellitenkarte", ru: "Спутниковая карта Esri", pt: "Mapa de satélite Esri", nl: "Esri-satellietkaart", fr: "Carte satellite d'Esri", it: "Mappa satellitare Esri", es: "Mapa satelital de Esri", pl: "Mapa satelitarna Esri", 'zh-cn': "埃斯里卫星地图"},
        'Humanitarian OpenStreetMap': {de: "Humanitäre OpenStreetMap", ru: "Гуманитарная OpenStreetMap", pt: "OpenStreetMap humanitário", nl: "Humanitaire OpenStreetMap", fr: "OpenStreetMap humanitaire", it: "OpenStreetMap umanitario", es: "OpenStreetMap humanitario", pl: "Humanitarian OpenStreetMap", 'zh-cn': "人道主义开放街地图"},
        'Esri Street Map': {de: "Esri Straßenkarte", ru: "Карта Esri Street", pt: "Esri Street Map", nl: "Esri-stratenplan", fr: "Plan des rues d'Esri", it: "Mappa stradale di Esri", es: "Callejero de Esri", pl: "Mapa ulic Esri", 'zh-cn': "埃斯里街地图"}
    };

    return (map[enText] || {})[getLocale()] || enText;
}