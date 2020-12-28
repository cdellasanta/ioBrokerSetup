/**
 * Listings for UniFi devices (to use with Material Design Widgets)
 *
 * Requirements:
 *  - UniFi controller running on your network
 *  - UniFi ioBroker adapter >= 0.5.8 (https://www.npmjs.com/package/iobroker.unifi)
 *  - Library "moment" in the "Additional npm modules" of the javascript.0 adapter configuration
 *  - Some programming skills
 *
 * @license http://www.opensource.org/licenses/mit-license.html  MIT License
 * @author  Scrounger <Scrounger@gmx.net>
 * @author  web4wasch @WEB4WASCH
 * @author  cdellasanta <70055566+cdellasanta@users.noreply.github.com>
 * @link    https://forum.iobroker.net/topic/30875/material-design-widgets-unifi-netzwerk-status
 */

// Script configuration
const statePrefix = '0_userdata.0.vis.unifiNetworkState'; // Might be better to use an english statePrefix (e.g. '0_userdata.0.vis.unifiNetworkState'), but then remember to adapt the Views too
const locale = 'it'; // On change make sure you drop all states (delete statePrefix directory)

const lastDays = 7;       // Show devices that have been seen in the network within the last X days
const updateInterval = 1; // Lists update interval in minutes (modulo on current minutes, therefore more than 30 means once per hour, more than 60 means never)

const imagePath = '/vis.0/myImages/networkDevices/'; // Path for images

const byteDecimals = 2;
const byteUnits = 'SI'; // SI units use the Metric representation based on 10^3 (1'000) as a order of magnitude
                        // IEC units use 2^10 (1'024) as an order of magnitude  

const defaultSortMode = 'name'; // Value for default and reset sort
const sortResetAfter = 120;     // Reset sort value after X seconds (0=disabled)
const filterResetAfter = 120;   // Reset filter after X seconds (0=disabled)

// Optional: display links into a separate view, instead of new navigation window (set false to disable this feature)
const devicesView = {currentViewState: '0_userdata.0.vis.currentView', devicesViewKey: 3};

const speedIconSize = 20;
const speedTextSize = 14;
const trafficIconSize = 14;
const trafficTextSize = 14;
const experienceIconSize = 20;
const experienceTextSize = 14;
const offlineTextSize = 14;
const levelMaps = {
	none: { 
		color: 'gray', 
		experience: 'mdi-speedometer',
		speedLan: 'mdi-network-off',
		speedWifi: 'mdi-wifi-off'
	},
	fast: { 
		color: 'green', 
		experience: 'mdi-speedometer',
		speedLan: 'mdi-network',
		speedWifi: 'mdi-signal-cellular-3'
	},
	medium: { 
		color: '#ff9800', 
		experience: 'mdi-speedometer-medium',
		speedLan: 'mdi-network',
		speedWifi: 'mdi-signal-cellular-2'
	},
	slow: { 
		color: 'FireBrick',
		experience: 'mdi-speedometer-slow',
		speedLan: 'mdi-network',		
		speedWifi: 'mdi-signal-cellular-1'
	}
};


// **********************************************************************************************************************************************************************
// Libss, should not need to 'require' them (ref: https://github.com/ioBroker/ioBroker.javascript/blob/c2725dcd9772627402d0e5bc74bf69b5ed6fe375/docs/en/javascript.md#require---load-some-module),
// but to avoid TypeScript inspection errors, doing it anyway ...
// @ts-ignore
const moment = require('moment');

// Initialization create/delete states, register listeners
// Using my global functions `initializeState` and `runAfterInitialization` (see global script common-states-handling )
declare function runAfterInitialization(callback: CallableFunction): void;
declare function initializeState(stateId: string, defaultValue: any, common: object, listenerProps?: boolean, listenerCallback?: CallableFunction): void;
declare function getStateIfExists(stateId: string): any;
declare function getStateValue(stateId: string): any;


// States are registered automatically if statePrefix directory does not exists (delete directory to recreate them)
setup();

// Create lists on script startup
createList();

// Refresh lists every updateInterval minutes
schedule(`*/${updateInterval} * * * *`, createList);

// Change on sort mode triggers list generation and reset of sort-timer-reset
on({id: `${statePrefix}.sortMode`, change: 'any'}, () => { createList(); resetSortTimer(); });

// Change on filter mode triggers list generation and reset of filter-timer-reset
on({id: `${statePrefix}.filterMode`, change: 'any'}, () => { createList(); resetFilterTimer(); });

if (devicesView) {
    // On selected device change, go to "Devices" view
    on({id: `${statePrefix}.selectedUrl`, change: 'any'}, () => { setState(devicesView.currentViewState, devicesView.devicesViewKey); });
}

function createList() {
    const getNote = (idDevice, name, mac, ip) => {
        try {
            return JSON.parse(getStateValue(`${idDevice}.note`) || '{}');
        } catch (ex) {
            console.error(`${name} (ip: ${ip}, mac: ${mac}): ${ex.message}`);
        }

        return {};
    }

    try {
        let devices = $('[id=unifi\.0\.default\.clients\.*\.mac]'); // Query every time function is called (for new devices)
        let deviceList = [];
      
        for (var i = 0; i <= devices.length - 1; i++) {
            let idDevice = devices[i].replace('.mac', '');
            let isWired = getStateValue(`${idDevice}.is_wired`);
            let lastSeen = new Date(getStateValue(`${idDevice}.last_seen`));

            // If lastSeen deifference is bigger than lastDays, then skip the device
            if ((new Date().getTime() - lastSeen.getTime()) > lastDays * 86400 * 1000) {
                continue;
            }

            // Values for both WLAN and LAN
            let isConnected = getStateValue(`${idDevice}.is_online`);
            let ip = getStateValue(`${idDevice}.ip`) || '';
            let mac = idDevice.split('.').pop();
            let name = getStateValue(`${idDevice}.name`) || getStateValue(`${idDevice}.hostname`) || ip || mac;
            let isGuest = getStateValue(`${idDevice}.is_guest`);
            let note = getNote(idDevice, name, mac, ip);
            let experience = getStateValue(`${idDevice}.satisfaction`) || (isConnected ? 100 : 0); // For LAN devices I got null as expirience .. file a bug?
			let experienceLevel = !isConnected ? 'none' : (experience >= 70 ? 'fast' : (experience >= 40 ? 'medium' : 'slow'));

            // Variables for values that are fetched differently depending on device wiring
            let received = getStateValue(`${idDevice}.${isWired ? 'wired-' : ''}tx_bytes`) || 0;
            let sent = getStateValue(`${idDevice}.${isWired ? 'wired-' : ''}rx_bytes`) || 0;
            let uptime = getStateValue(`${idDevice}.uptime`);
            let speedText = '';
            let speedLevel = 'none';

            if (isWired) {
                // If exists prefer uptime on switch port
                uptime = getStateValue(`${idDevice}.uptime_by_usw`) || uptime;

                let switchMac = getStateValue(`${idDevice}.sw_mac`) || false;
                let switchPort = getStateValue(`${idDevice}.sw_port`) || false;

                if (switchMac && switchPort) {
                    let speed = getStateValue(`unifi.0.default.devices.${switchMac}.port_table.port_${switchPort}.speed`);
                    speedText = Number(speed).toString().replace('1000', '1.000') + ' MBit/s';
                    speedLevel = !isConnected ? 'none' : (speed == 1000 ? 'fast' : 'medium');
                }

                // Do not consider fiber ports
                if (switchPort > 24) {
                    continue; // Skip device
                }
            } else {
                let channel = getStateValue(`${idDevice}.channel`);
                let signal = getStateValue(`${idDevice}.signal`);
                speedText = channel === null ? '' : (channel > 13 ? '5G' : '2G');
                speedLevel = !isConnected ? 'none' : (signal >= -55 ? 'fast' : (signal >= -70 ? 'medium' : 'slow'));
            }

            deviceList.push({
                // Visualization data (tplVis-materialdesign-Icon-List)
                statusBarColor: isConnected ? 'green' : 'FireBrick',
                text: isGuest ? `<span class="mdi mdi-account-box" style="color: #ff9800;">${name}</span>` : name,
                subText: `
                    ${ip}
                    <div style="display: flex; flex-direction: row; padding-left: 8px; padding-right: 8px; align-items: center; justify-content: center;">
                        <span style="color: gray; font-size: ${offlineTextSize}px; line-height: 1.3; font-family: RobotoCondensed-LightItalic;">
                            ${translate(isConnected ? 'online' : 'offline')} ${(isConnected ? moment().subtract(uptime, 's') : moment(lastSeen)).fromNow()}
                        </span>
                    </div>
                    <div style="display: flex; flex-direction: row; padding-left: 8px; padding-right: 8px; margin-top: 10px; align-items: center;">
                        <div style="display: flex; flex: 1; text-align: left; align-items: center; position: relative;">
                            <span class="mdi ${levelMaps[speedLevel][isWired ? 'speedLan' : 'speedWifi']}" style="color: ${levelMaps[speedLevel].color}; font-size: ${speedIconSize}px"></span>
                            <span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${speedTextSize}px; margin-left: 4px;">${speedText}</span>
                        </div>                       
                        <span class="mdi mdi-arrow-down" style="font-size: ${trafficIconSize}px; color: #44739e;"></span><span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${trafficTextSize}px; margin-left: 2px; margin-right: 4px">${formatBytes(received, byteDecimals, byteUnits)}</span>
                        <span class="mdi mdi-arrow-up" style="font-size: ${trafficIconSize}px; color: #44739e;"></span><span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${trafficTextSize}px; margin-left: 2px;">${formatBytes(sent, byteDecimals, byteUnits)}</span>
                        <div style="display: flex; margin-left: 8px; align-items: center;">
                            <span class="mdi mdi-speedometer${levelMaps[experienceLevel].experience}" style="color: ${levelMaps[experienceLevel].color}; font-size: ${experienceIconSize}px;"></span>
                            <span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${experienceTextSize}px; margin-left: 4px;">${experience} %</span>
                        </div>
                    </div>
                `,
                listType: !note.link ? 'text' : 'buttonLink',
                buttonLink: !note.link ? '' : (['http', 'https'].includes(note.link) ? `${note.link}://${ip}` : note.link),
                image: imagePath + ((note && note.image) ? note.image : ((isWired ? 'lan' : 'wlan') + '_noImage')) + '.png',
                icon: note.icon || '',
                
                // Additional data for sorting
                name: name,
                ip: ip,
                connected: isConnected,
                received: received,
                sent: sent,
                experience: experience,
                uptime: uptime,
                isWired: isWired
            });
        }

        // Sorting
        let sortMode = getStateValue(`${statePrefix}.sortMode`) || defaultSortMode;

        deviceList.sort((a, b) => {
            switch (sortMode) {
                case 'ip':
                    const na = Number(a['ip'].split(".").map(v => `000${v}`.slice(-3)).join(''));
                    const nb = Number(b['ip'].split(".").map(v => `000${v}`.slice(-3)).join(''));
                    return na - nb;
                case 'connected':
                case 'received':
                case 'sent':
                case 'experience':
                case 'uptime':
                    return a[sortMode] === b[sortMode] ? 0 : +(a[sortMode] < b[sortMode]) || -1;
                case 'name':
                default:
                    return a['name'].localeCompare(b['name'], locale, {sensitivity: 'base'});
            }
        });

        if (devicesView) {
            // Create links list (before filtering)
            let linkList = [];

            deviceList.forEach(obj => {
                if (obj.listType === 'buttonLink') {
                    linkList.push({
                        // Visualization data (tplVis-materialdesign-Select)
                        text: obj.name,
                        value: obj.buttonLink,
                        icon: obj.icon
                         /** @todo Add some props (connected, ip, received, sent, experience, ...)? */
                    });

                    // Change behaviour to buttonState, a listener on the state change on objectId will trigger the jump to that view
                    obj['listType'] = 'buttonState';
                    obj['objectId'] = `${statePrefix}.selectedUrl`;
                    obj['showValueLabel'] = false;
                    obj['buttonStateValue'] = obj.buttonLink;
                    delete obj['buttonLink'];
                }
            });

            let linkListString = JSON.stringify(linkList);

            if (getStateValue(`${statePrefix}.linksJsonList`) !== linkListString) {
                setState(`${statePrefix}.linksJsonList`, linkListString, true);
            }
        }

        // Filtering
        let filterMode = getStateValue(`${statePrefix}.filterMode`) || '';

        if (filterMode && filterMode !== '') {
            deviceList = deviceList.filter(item => {
                switch (filterMode) {
                    case 'connected':
                        return item.connected;
                    case 'disconnected':
                        return !item.connected;
                    case 'lan':
                        return item.isWired;
                    case 'wlan':
                        return !item.isWired;
                    default:
                        return false; // Unknown filter, return no item
                }
            });
        }

        let result = JSON.stringify(deviceList);

        if (getStateValue(`${statePrefix}.jsonList`) !== result) {
            setState(`${statePrefix}.jsonList`, result, true);
        }
    } catch (err) {
        console.error(`[createList] error: ${err.message}`);
        console.error(`[createList] stack: ${err.stack}`);
    }
}

let sortTimeoutID;

function resetSortTimer() {
    if (sortResetAfter > 0) {
        this.clearTimeout(sortTimeoutID); // Clear previous timer, if set

        sortTimeoutID = this.setTimeout(() => setState(`${statePrefix}.sortMode`, defaultSortMode), sortResetAfter * 1000);
    }
}

let filterTimeoutID;

function resetFilterTimer() {
    if (filterResetAfter > 0) {
        this.clearTimeout(filterTimeoutID); // Clear previous timer, if set

        filterTimeoutID = this.setTimeout(() => setState(`${statePrefix}.filterMode`, ''), filterResetAfter * 1000);
    }
}

function setup() {
    moment.locale(locale);
    moment.updateLocale(locale, {
        relativeTime: {
            future: translate('in %s'),
            past: translate('since %s'), // Default for past is '%s ago'
            s: translate('a few seconds'),
            ss: translate('%d seconds'),
            m: translate('a minute'),
            mm: translate('%d minutes'),
            h: translate('an hour'),
            hh: translate('%d hours'),
            d: translate('a day'),
            dd: translate('%d days'),
            w: translate('a week'),
            ww: translate('%d weeks'),
            M: translate('a month'),
            MM: translate('%d months'),
            y: translate('a year'),
            yy: translate('%d years')
        }
    });

    // Create states
    if (!existsState(statePrefix)) { // Check on statePrefix (the directory)
        const sortItems = [
            {
                text: translate('Name'),
                value: 'name',
                icon: 'sort-alphabetical'
            },
            {
                text: translate('IP address'),
                value: 'ip',
                icon: 'information-variant'
            },
            {
                text: translate('Connected'),
                value: 'connected',
                icon: 'check-network'
            },
            {
                text: translate('Received data'),
                value: 'received',
                icon: 'arrow-down'
            },
            {
                text: translate('Sent data'),
                value: 'sent',
                icon: 'arrow-up'
            },
            {
                text: translate('Experience'),
                value: 'experience',
                icon: 'speedometer'
            },
            {
                text: translate('Uptime'),
                value: 'uptime',
                icon: 'clock-check-outline'
            }
        ];

        const filterItems = [
            {
                text: translate('connected'),
                value: 'connected',
                icon: 'check-network'
            },
            {
                text: translate('disconnected'),
                value: 'disconnected',
                icon: 'network-off'
            },
            {
                text: translate('LAN connection'),
                value: 'lan',
                icon: 'network'
            },
            {
                text: translate('WLAN connection'),
                value: 'wlan',
                icon: 'wifi'
            }
        ];

        const viewTranslations = [
            'Sort by',
            'Filter by',
            'Device'
        ].reduce((o, key) => ({ ...o, [key]: translate(key)}), {});

        createState(`${statePrefix}.jsonList`, '[]', {name: 'UniFi devices listing: jsonList', type: 'string'});
        createState(`${statePrefix}.sortMode`, defaultSortMode, {name: 'UniFi device listing: sortMode', type: 'string'});
        createState(`${statePrefix}.filterMode`, '', {name: 'UniFi device listing: filterMode', type: 'string'});

        // Sorters, filters and some additional translations are saved in states to permit texts localization
        createState(`${statePrefix}.sortersJsonList`, JSON.stringify(sortItems), {name: 'UniFi device listing: sortersJsonList', type: 'string', read: true, write: false});
        createState(`${statePrefix}.filtersJsonList`, JSON.stringify(filterItems), {name: 'UniFi device listing: filtersJsonList', type: 'string', read: true, write: false});
        createState(`${statePrefix}.translations`, JSON.stringify(viewTranslations), {name: 'UniFi device listing: viewTranslations', type: 'string', read: true, write: false});

        if (devicesView) {
            createState(`${statePrefix}.linksJsonList`, '[]', {name: 'Device links listing: linksJsonList', type: 'string'});
            createState(`${statePrefix}.selectedUrl`, '', {name: 'Selected device link: selectedUrl', type: 'string'});
        }
    }
}

function translate(enText) {
    const map = { // For translations used https://translator.iobroker.in (that uses Google translator)
        // Sort items
        'Name': {de: 'Name', ru: 'имя', pt: 'Nome', nl: 'Naam', fr: 'Nom', it: 'Nome', es: 'Nombre', pl: 'Nazwa','zh-cn': '名称'},
        'IP address': {de: 'IP Adresse', ru: 'Aйпи адрес', pt: 'Endereço de IP', nl: 'IP adres', fr: 'Adresse IP', it: 'Indirizzo IP', es: 'Dirección IP', pl: 'Adres IP','zh-cn': 'IP地址'},
        'Connected': {de: 'Verbunden', ru: 'Связано', pt: 'Conectado', nl: 'Verbonden', fr: 'Connecté', it: 'Collegato', es: 'Conectado', pl: 'Połączony','zh-cn': '连接的'},
        'Received data': {de: 'Daten empfangen', ru: 'Полученные данные', pt: 'Dados recebidos', nl: 'Ontvangen data', fr: 'Données reçues', it: 'Dati ricevuti', es: 'Datos recibidos', pl: 'Otrzymane dane','zh-cn': '收到资料'},
        'Sent data': {de: 'Daten gesendet', ru: 'Отправленные данные', pt: 'Dados enviados', nl: 'Verzonden gegevens', fr: 'Données envoyées', it: 'Dati inviati', es: 'Datos enviados', pl: 'Wysłane dane','zh-cn': '发送数据'},
        'Experience': {de: 'Erlebnis', ru: 'Опыт', pt: 'Experiência', nl: 'Ervaring', fr: 'Expérience', it: 'Esperienza', es: 'Experiencia', pl: 'Doświadczenie','zh-cn': '经验'},
        'Uptime': {de: 'Betriebszeit', ru: 'Время безотказной работы', pt: 'Tempo de atividade', nl: 'Uptime', fr: 'Disponibilité', it: 'Disponibilità', es: 'Tiempo de actividad', pl: 'Dostępność','zh-cn': '正常运行时间'},
        // Filter Items
        'connected': {de: 'verbunden', ru: 'связано', pt: 'conectado', nl: 'verbonden', fr: 'connecté', it: 'collegato', es: 'conectado', pl: 'połączony','zh-cn': '连接的'},
        'disconnected': {de: 'nicht verbunden', ru: 'отключен', pt: 'desconectado', nl: 'losgekoppeld', fr: 'débranché', it: 'disconnesso', es: 'desconectado', pl: 'niepowiązany','zh-cn': '断开连接'},
        'LAN connection': {de: 'LAN Verbindungen', ru: 'подключение по локальной сети', pt: 'conexão LAN', nl: 'lAN-verbinding', fr: 'connexion LAN', it: 'connessione LAN', es: 'coneccion LAN', pl: 'Połączenie LAN','zh-cn': '局域网连接'},
        'WLAN connection': {de: 'WLAN Verbindungen', ru: 'Соединение WLAN', pt: 'Conexão WLAN', nl: 'WLAN-verbinding', fr: 'Connexion WLAN', it: 'Connessione WLAN', es: 'Conexión WLAN', pl: 'Połączenie WLAN','zh-cn': 'WLAN连接'},
        // Additional view translations
        'Sort by': {de: 'Sortieren nach', ru: 'Сортировать по', pt: 'Ordenar por', nl: 'Sorteer op', fr: 'Trier par', it: 'Ordina per', es: 'Ordenar por', pl: 'Sortuj według', 'zh-cn': '排序方式'},
        'Filter by': {de: 'Filtern nach', ru: 'Сортировать по', pt: 'Filtrar por', nl: 'Filteren op', fr: 'Filtrer par', it: 'Filtra per', es: 'Filtrado por', pl: 'Filtruj według','zh-cn': '过滤'},
        'Device': {de: 'Gerät', ru: 'Устройство', pt: 'Dispositivo', nl: 'Apparaat', fr: 'Dispositif', it: 'Dispositivo', es: 'Dispositivo', pl: 'Urządzenie','zh-cn': '设备'},
        // On/off times
        'online': {de: 'online', ru: 'онлайн', pt: 'conectados', nl: 'online', fr: 'en ligne', it: 'in linea', es: 'en línea', pl: 'online', 'zh-cn': "线上"},
        'offline': {de: 'offline', ru: 'не в сети', pt: 'desligada', nl: 'offline', fr: 'hors ligne', it: 'disconnesso', es: 'desconectado', pl: 'offline', 'zh-cn': "离线"},
        // Relative times
        'in %s': {de: 'in %s', ru: 'через %s', pt: 'em %s', nl: 'in %s', fr: 'en %s', it: 'in %s', es: 'en %s', pl: 'w %s','zh-cn': '在％s中'},
        'since %s': {de: 'seit %s', ru: 'поскольку %s', pt: 'desde %s', nl: 'sinds %s', fr: 'depuis %s', it: 'da %s', es: 'desde %s', pl: 'od %s','zh-cn': '自％s'},
        'a few seconds': {de: 'ein paar Sekunden', ru: 'несколько секунд', pt: 'alguns segundos', nl: 'een paar seconden', fr: 'quelques secondes', it: 'pochi secondi', es: 'unos pocos segundos', pl: 'kilka sekund','zh-cn': '几秒钟'},
        '%d seconds': {de: '%d Sekunden', ru: '%d секунд', pt: '%d segundos', nl: '%d seconden', fr: '%d secondes', it: '%d secondi', es: '%d segundos', pl: '%d sekund','zh-cn': '％d秒'},
        'a minute': {de: 'eine Minute', ru: 'минута', pt: 'um minuto', nl: 'een minuut', fr: 'une minute', it: 'un minuto', es: 'un minuto', pl: 'minutę','zh-cn': '一分钟'},
        '%d minutes': {de: '%d Minuten', ru: '%d минут', pt: '%d minutos', nl: '%d minuten', fr: '%d minutes', it: '%d minuti', es: '%d minutos', pl: '%d minut','zh-cn': '％d分钟'},
        'an hour': {de: 'eine Stunde', ru: 'час', pt: 'uma hora', nl: 'een uur', fr: 'une heure', it: 'un\'ora', es: 'una hora', pl: 'godzina','zh-cn': '一小时'},
        '%d hours': {de: '%d Stunden', ru: '%d часов', pt: '%d horas', nl: '%d uur', fr: '%d heures', it: '%d ore', es: '%d horas', pl: '%d godzin','zh-cn': '％d小时'},
        'a day': {de: 'ein Tag', ru: 'день', pt: 'um dia', nl: 'een dag', fr: 'un jour', it: 'un giorno', es: 'un día', pl: 'dzień','zh-cn': '一天'},
        '%d days': {de: '%d Tage', ru: '%d дней', pt: '%d dias', nl: '%d dagen', fr: '%d jours', it: '%d giorni', es: '%d días', pl: '%d dni','zh-cn': '％d天'},
        'a week': {de: 'eine Woche', ru: 'неделя', pt: 'uma semana', nl: 'een week', fr: 'une semaine', it: 'una settimana', es: 'una semana', pl: 'tydzień','zh-cn': '一周'},
        '%d weeks': {de: '%d Wochen', ru: '%d недель', pt: '%d semanas', nl: '%d weken', fr: '%d semaines', it: '%d settimane', es: '%d semanas', pl: '%d tygodni','zh-cn': '％d周'},
        'a month': {de: 'ein Monat', ru: 'месяц', pt: 'um mês', nl: 'een maand', fr: 'un mois', it: 'un mese', es: 'un mes', pl: 'miesiąc','zh-cn': '一个月'},
        '%d months': {de: '%d Monate', ru: '%d месяцев', pt: '%d meses', nl: '%d maanden', fr: '%d mois', it: '%d mesi', es: '%d meses', pl: '%d miesięcy','zh-cn': '％d个月'},
        'a year': {de: 'ein Jahr', ru: 'год', pt: 'um ano', nl: 'een jaar', fr: 'une année', it: 'un anno', es: 'un año', pl: 'rok','zh-cn': '一年'},
        '%d years': {de: '%d Jahre', ru: '%d лет', pt: '%d anos', nl: '%d jaar', fr: '%d années', it: '%d anni', es: '%d años', pl: '%d lat','zh-cn': '％d年'}
    };

    return (map[enText] || {})[locale] || enText;
}

function formatBytes(bytes, decimals?: number, unit?: 'SI' | 'IEC') : string  {
    if (bytes === 0) return 'N/A';

    const orderOfMagnitude = unit === 'SI' ? Math.pow(10, 3) : Math.pow(2, 10);
    const abbreviations = unit === 'SI' ?
        ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] :
        ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(orderOfMagnitude));

    return parseFloat((bytes / Math.pow(orderOfMagnitude, i)).toFixed(decimals || 2)) + ' ' + abbreviations[i];
}
