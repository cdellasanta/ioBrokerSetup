/**
 * Listings for UniFi devices (to use with Material Design Widgets)
 *
 * Requirements:
 *  - UniFi controller running on your network
 *  - UniFi ioBroker adapter >= 0.5.8 (https://www.npmjs.com/package/iobroker.unifi)
 *  - Libraries on ioBroker: cd /opt/iobroker && npm install mathjs moment
 *  - Some programming skills
 *
 * @license http://www.opensource.org/licenses/mit-license.html  MIT License
 * @author  Scrounger <Scrounger@gmx.net>
 * @author  web4wasch @WEB4WASCH
 * @author  cdellasanta <70055566+cdellasanta@users.noreply.github.com>
 * @link    https://forum.iobroker.net/topic/30875/material-design-widgets-unifi-netzwerk-status
 */

// Script configuration
const statePrefix = '0_userdata.0.vis.unifiNetworkState'; // If you need compatibility with original script/view, set '0_userdata.0.vis.NetzwerkDevicesStatus'
const locale = 'it'; // On change make sure you drop all states (delete statePrefix directory)

const lastDays = 7;       // Show devices that tave been seen in the network within the last X days
const updateInterval = 1; // Lists update interval in minutes (modulo on current minutes, therefore more than 30 beans once per hour, more then 60 means never)

const imagePath = '/vis.0/images/unifi/'; // Path for images
const sortReset = 'name';                 // Value for default and reset sort
const sortResetAfter = 120;               // Reset sort value after X seconds (0=disabled)
const filterResetAfter = 120;             // Reset filter after X seconds (0=disabled)

// New/Optional: display links into a separate view, instead of new navigation window (set false to disable this feature)
// If set, two additional states are registered:
//  - The selected link: to be displayed in an iFrame
//  - The list of devices having a link: to be used in jsonList materials design. List is an array of following elements:
//    {name: <(string) device name>, value: <(string) the link URL>, icon: <(string) see https://materialdesignicons.com>}
const devicesView = {currentViewState: '0_userdata.0.vis.currentView', devicesViewKey: 1};

const speedIconSize = 20;
const speedTextSize = 14;
const trafficIconSize = 14;
const trafficTextSize = 14;
const experienceIconSize = 20;
const experienceTextSize = 14;
const offlineTextSize = 14;

// **********************************************************************************************************************************************************************
const mathjs = require('mathjs');
const moment = require('moment');

// States
const listState = statePrefix + '.jsonList';
const sortModeState = statePrefix + '.sortMode';
const filterModeState = statePrefix + '.filterMode';
const sortersListState = statePrefix + '.sortersJsonList';
const filtersListState = statePrefix + '.filtersJsonList';
const translationsState = statePrefix + '.translations';
const linksListState = statePrefix + '.linksJsonList';
const viewUrlState = statePrefix + '.selectedUrl';

// Sates are registered automatically if prefix directory does not exists (delete directory to recreate them)
setup();

// Create lists on script startup
createList();

// Refresh lists every updateInterval minutes
schedule('*/' + updateInterval + ' * * * *', createList);

// Change on sort mode triggers list generation and reset of sort-timer-reset
on({id: sortModeState, change: 'any'}, () => { Promise.all([createList(), resetSortTimer()]); });

// Change on filter mode triggers list generation and reset of filter-timer-reset
on({id: filterModeState, change: 'any'}, () => { Promise.all([createList(), resetFilterTimer()]); });

if (devicesView) {
    // On selected device change, go to "Devices" view
    on({id: viewUrlState, change: 'any'}, () => { setState(devicesView.currentViewState, devicesView.devicesViewKey); });
}

function createList() {
    try {
        let devices = $('[id=unifi.0.default.clients.*.mac]'); // Query every time function is called (for new devices)
        let deviceList = [];

        for (var i = 0; i <= devices.length - 1; i++) {
            let idDevice = devices[i].replace('.mac', '');
            let isWired = getState(idDevice + '.is_wired').val;
            let lastSeen = new Date(getState(idDevice + '.last_seen').val);

            if (isInRange(lastSeen)) {
                // Values for both WLAN and LAN
                let isConnected = getState(idDevice + '.is_online').val;
                let ip = existsState(idDevice + '.ip') ? getState(idDevice + '.ip').val : '';
                let mac = idDevice;
                let name = getName(idDevice, ip, mac);
                let isGuest = getState(idDevice + '.is_guest').val;
                let experience = (existsState(idDevice + '.satisfaction') && isConnected) ? (getState(idDevice + '.satisfaction').val || 100) : 0; // For LAN devices I got null as expirience .. file a bug?
                let note = parseNote(idDevice, name, mac, ip);
                let icon = (note && note.icon) || '';

                let listType = 'text';
                let buttonLink = '';
                setLink();

                // Variables for values that are fetched differntly depending on device wireing
                let receivedRaw = getTraffic(isWired, idDevice)
                let received = formatTraffic(receivedRaw).replace('.', ',');
                let sentRaw = getTraffic(isWired, idDevice, true);
                let sent = formatTraffic(sentRaw).replace('.', ',');

                let speed = '';
                let uptime = 0;
                let image = '';
                let wlanSignal = '';

                if (isWired) {
                    let swPort = getState(idDevice + '.sw_port').val;

                    // Do not consider fiber ports
                    if (swPort > 24) {
                        continue; // Skip add
                    }

                    speed = getState(`unifi.0.default.devices.${getState(idDevice + '.sw_mac').val}.port_table.port_${swPort}.speed`).val;
                    uptime = getState(idDevice + '.uptime_by_usw').val;
                    image = (note && note.image) ? `${imagePath}${note.image}.png` : `${imagePath}lan_noImage.png`
                } else {
                    speed = existsState(idDevice + '.channel') ? (getState(idDevice + '.channel').val > 13) ? '5G' : '2G' : '';
                    uptime = getState(idDevice + '.uptime').val;
                    wlanSignal = getState(idDevice + '.signal').val;
                    image = (note && note.image) ? `${imagePath}${note.image}.png` : `${imagePath}wlan_noImage.png`
                }
               
                addToList();

                function setLink() {
                    if (note && note.link) {
                        listType = 'buttonLink';

                        if (note.link === 'http') {
                            buttonLink = `http://${ip}`;
                        } else if (note.link === 'https') {
                            buttonLink = `https://${ip}`;
                        } else {
                            buttonLink = note.link;
                        }
                    }
                }

                function addToList() {
                    let statusBarColor = isConnected ? 'green' : 'FireBrick';
                    let text = isGuest ? `<span class="mdi mdi-account-box" style="color: #ff9800;"> ${name}</span>` : name;
                    let speedElement = '';

                    if (speed === 1000 || speed === 100) {
                        speedElement = `<div style="display: flex; flex: 1; text-align: left; align-items: center; position: relative;">
                                           ${getLanSpeed(speed, speedIconSize, isConnected)}
                                           <span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${speedTextSize}px; margin-left: 4px;">${speed.toString().replace('1000', '1.000')} MBit/s</span>
                                       </div>`
                    } else {
                        speedElement = `<div style="display: flex; flex: 1; text-align: left; align-items: center; position: relative;">
                                           ${getWifiStrength(wlanSignal, speedIconSize, isConnected)}
                                           <span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${speedTextSize}px; margin-left: 4px;">${speed}</span>
                                       </div>`;
                    }

                    let receivedElement = `<span class="mdi mdi-arrow-down" style="font-size: ${trafficIconSize}px; color: #44739e;"></span><span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${trafficTextSize}px; margin-left: 2px; margin-right: 4px">${received}</span>`
                    let sentElement = `<span class="mdi mdi-arrow-up" style="font-size: ${trafficIconSize}px; color: #44739e;"></span><span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${trafficTextSize}px; margin-left: 2px;">${sent}</span>`

                    let experienceElement = `<div style="display: flex; margin-left: 8px; align-items: center;">${getExperience(experience, experienceIconSize, isConnected)}<span style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: ${experienceTextSize}px; margin-left: 4px;">${experience} %</span></div>`

                    let subText = `
                               ${ip}
                               <div style="display: flex; flex-direction: row; padding-left: 8px; padding-right: 8px; align-items: center; justify-content: center;">
                                   ${getOnOffTime(isConnected, uptime, lastSeen)}
                               </div>
                               <div style="display: flex; flex-direction: row; padding-left: 8px; padding-right: 8px; margin-top: 10px; align-items: center;">
                                   ${speedElement}${receivedElement}${sentElement}${experienceElement}
                               </div>
                               `

                    deviceList.push({
                        text: text,
                        subText: subText,
                        listType: listType,
                        buttonLink: buttonLink,
                        image: image,
                        icon: icon,
                        statusBarColor: statusBarColor,
                        name: name,
                        ip: ip,
                        connected: isConnected,
                        received: receivedRaw,
                        sent: sentRaw,
                        experience: experience,
                        uptime: uptime,
                        isWired: isWired
                    });
                }
            }
        }

        // Sorting
        let sortMode = existsState(sortModeState) ? getState(sortModeState).val : '';

        if (sortMode === 'name') {
            deviceList.sort(function (a, b) {
                return a[sortMode].toLowerCase() == b[sortMode].toLowerCase() ? 0 : +(a[sortMode].toLowerCase() > b[sortMode].toLowerCase()) || -1;
            });
        } else if (sortMode === 'ip') {
            deviceList.sort(function (a, b) {
                return a[sortMode].split('.')[0] - b[sortMode].split('.')[0] || a[sortMode].split('.')[1] - b[sortMode].split('.')[1] || a[sortMode].split('.')[2] - b[sortMode].split('.')[2] || a[sortMode].split('.')[3] - b[sortMode].split('.')[3]
            });
        } else if (sortMode === 'connected' || sortMode === 'received' || sortMode === 'sent' || sortMode === 'experience' || sortMode === 'uptime') {
            deviceList.sort(function (a, b) {
                return a[sortMode] == b[sortMode] ? 0 : +(a[sortMode] < b[sortMode]) || -1;
            });
        } else {
            sortMode = 'name' // Default order by name
            deviceList.sort(function (a, b) {
                return a[sortMode].toLowerCase() == b[sortMode].toLowerCase() ? 0 : +(a[sortMode].toLowerCase() > b[sortMode].toLowerCase()) || -1;
            });
        }

        if (devicesView) {
            // Create links list (before filtering)
            let linkList = [];

            deviceList.forEach(obj => {
                if (obj.listType === 'buttonLink') {
                    linkList.push({
                        text: obj.name, /** @todo Add some props (connected, ip, recived, sent, expirience, ...)? */
                        value: obj.buttonLink,
                        icon: obj.icon
                    });

                    // Change behaviour to buttonState, a listener on the state change on objectId will trigger the jump to that view
                    obj['listType'] = 'buttonState';
                    obj['objectId'] = viewUrlState;
                    obj['showValueLabel'] = false;
                    obj['buttonStateValue'] = obj.buttonLink,
                    delete obj['buttonLink'];
                }
            });

            let linkListString = JSON.stringify(linkList);

            if (existsState(linksListState) && getState(linksListState).val !== linkListString) {
                setState(linksListState, linkListString, true);
            }
        }

        // Filtering
        let filterMode = existsState(filterModeState) ? getState(filterModeState).val : '';

        if (filterMode && filterMode !== '') {
            if (filterMode === 'connected') {
                deviceList = deviceList.filter(item => item.connected);
            } else if (filterMode === 'disconnected') {
                deviceList = deviceList.filter(item => !item.connected);
            } else if (filterMode === 'lan') {
                deviceList = deviceList.filter(item => item.isWired);
            } else if (filterMode === 'wlan') {
                deviceList = deviceList.filter(item => !item.isWired);
            }
        }

        let result = JSON.stringify(deviceList);

        if (existsState(listState) && getState(listState).val !== result) {
            setState(listState, result, true);
        }
    } catch (err) {
        console.error(`[createList] error: ${err.message}`);
        console.error(`[createList] stack: ${err.stack}`);
    }

    // Functions **************************************************************************************************************************************
    function getTraffic(isWired, idDevice, isSent = false) {
        if (!isSent) {
            // Received
            if (isWired) {
                if (existsState(idDevice + '.wired-tx_bytes')) {
                    return getState(idDevice + '.wired-tx_bytes').val;
                }
            } else {
                if (existsState(idDevice + '.tx_bytes')) {
                    return getState(idDevice + '.tx_bytes').val;
                }
            }
        } else {
            // Sent
            if (isWired) {
                if (existsState(idDevice + '.wired-rx_bytes')) {
                    return getState(idDevice + '.wired-rx_bytes').val;
                }
            } else {
                if (existsState(idDevice + '.rx_bytes')) {
                    return getState(idDevice + '.rx_bytes').val;
                }
            }
        }

        return 0;
    }

    function formatTraffic(traffic) {
        if (traffic > 0) {
            traffic = parseFloat(traffic) / 1048576;
            if (traffic < 100) {
                return `${mathjs.round(traffic, 0)} MB`
            } else {
                return `${mathjs.round(traffic / 1024, 2)} GB`
            }
        }

        return 'N/A';
    }

    function getName(idDevice, ip, mac) {
        let deviceName = '';

        if (existsState(idDevice + '.name')) {
            deviceName = getState(idDevice + '.name').val;
        }

        if (deviceName === null || deviceName === undefined || deviceName === '') {
            if (existsState(idDevice + '.hostname')) {
                deviceName = getState(idDevice + '.hostname').val;
            }
        }

        if (deviceName === null || deviceName === undefined || deviceName === '') {
            if (ip !== null && ip !== undefined && ip !== '') {
                deviceName = ip;
            } else {
                deviceName = mac;
            }
        }

        return deviceName;
    }

    function isInRange(lastSeen) {
        let diff = new Date().getTime() - lastSeen.getTime() * 1000;

        return (diff < lastDays * 86400 * 1000) ? true : false;
    }

    function getWifiStrength(signal, size, isConnected) {
        if (!isConnected) {
            return `<span class="mdi mdi-wifi-off" style="color: gray; font-size: ${size}px"></span>`
        }

        if (signal < -70) {
            return `<span class="mdi mdi-signal-cellular-1" style="color: FireBrick; font-size: ${size}px"></span>`
        } else if (signal >= -70 && signal < -55) {
            return `<span class="mdi mdi-signal-cellular-2" style="color: #ff9800; font-size: ${size}px"></span>`
        } else {
            return `<span class="mdi mdi-signal-cellular-3" style="color: green; font-size: ${size}px"></span>`
        }
    }

    function getLanSpeed(speed, size, isConnected) {
        if (!isConnected) {
            return `<span class="mdi mdi-network-off" style="color: gray; font-size: ${size}px;"></span>`
        }

        if (speed === 1000) {
            return `<span class="mdi mdi-network" style="color: green; font-size: ${size}px;"></span>`
        } else {
            return `<span class="mdi mdi-network" style="color: #ff9800; font-size: ${size}px;"></span>`
        }
    }

    function getExperience(experience, size, isConnected) {
        if (!isConnected) {
            return `<span class="mdi mdi-speedometer" style="color: gray; font-size: ${size}px;"></span>`
        }

        if (experience >= 70) {
            return `<span class="mdi mdi-speedometer" style="color: green; font-size: ${size}px;"></span>`
        } else if (experience < 70 && experience >= 40) {
            return `<span class="mdi mdi-speedometer-medium" style="color: #ff9800; font-size: ${size}px;"></span>`
        } else {
            return `<span class="mdi mdi-speedometer-slow" style="color: FireBrick; font-size: ${size}px;"></span>`
        }
    }

    function parseNote(idDevice, name, mac, ip) {
        try {
            if (existsState(idDevice + '.note')) {
                return JSON.parse(getState(idDevice + '.note').val);
            }
        } catch (ex) {
            console.error(`${name} (ip: ${ip}, mac: ${mac}): ${ex.message}`);
        }

        return undefined;
    }

    function getOnOffTime(isConnected, uptime, lastSeen) {
        if (isConnected) {
            return `<span style="color: gray; font-size: ${offlineTextSize}px; line-height: 1.3; font-family: RobotoCondensed-LightItalic;">online ${moment().subtract(uptime, 's').fromNow()}</span>`
        } else {
            let now = moment(new Date());
            let start = moment(lastSeen);
            let offlineDuration = (moment.duration(now.diff(start)));
            return `<span style="color: gray; font-size: ${offlineTextSize}px; line-height: 1.3; font-family: RobotoCondensed-LightItalic;">offline ${moment().subtract(offlineDuration, 's').fromNow()}</span>`
        }
    }
}

function resetSortTimer() {
    let sortMode = existsState(sortModeState) ? getState(sortModeState).val : '';

    if (sortResetAfter > 0) {
        setTimeout(() => {
            if (existsState(sortModeState) && sortMode === getState(sortModeState).val) {
                setState(sortModeState, sortReset);
            }
        }, sortResetAfter * 1000);
    }
}

function resetFilterTimer() {
    let filterMode = existsState(filterModeState) ? getState(filterModeState).val : '';

    if (filterResetAfter > 0) {
        setTimeout(() => {
            if (existsState(filterModeState) && filterMode === getState(filterModeState).val) {
                setState(filterModeState, '');
            }
        }, filterResetAfter * 1000);
    }
}

function setup() {
    const translationMap = {
        // Sort items
        'Name': {de: 'Name', fr: 'Nom', it: 'Nome'},
        'IP address': {de: 'IP Adresse', fr: 'Adresse IP', it: 'Indirizzo IP'},
        'Connected': {de: 'Verbunden', fr: 'Connecté', it: 'Connesso'},
        'Received data': {de: 'Daten empfangen', fr: 'Données réçu', it: 'Dati ricevuti'},
        'Sent data': {de: 'Daten gesendet', fr: 'Données envojées', it: 'Dati inviati'},
        'Experience': {de: 'Erlebnis', fr: 'Expérience', it: 'Esperienza'},
        'Uptime': {de: 'Betriebszeit', fr: 'Disponibilité', it: 'Disponibilità'},

        // Filter Items
        'connected': {de: 'verbunden', fr: 'connecté', it: 'connesso'},
        'disconnected': {de: 'nicht verbunden', fr: 'pas connecté', it: 'disconnesso'},
        'LAN connection': {de: 'LAN Verbindungen', fr: 'connexion LAN', it: 'connessione LAN'},
        'WLAN connection': {de: 'WLAN Verbindungen', fr: 'connexion WLAN', it: 'connessione WLAN'},

        // Additional view translations
        'Order by': {de: 'Ordnen nach', fr: 'Sorter par', it: 'Ordinare per'},
        'Filter by': {de: 'Filtern nach', fr: 'Filtrer par', it: 'Fitrare per'},
        'Device': {de: 'Gerät', fr: 'Équipement', it: 'Dispositivo'},

        // Relative times
        'in %s': {de: 'in %s', fr: 'd`s %s', it: 'in %s'},
        'since %s': {de: 'seit %s', fr: 'depuis %s', it: 'da %s'},
        'a few seconds': {de: 'ein paar Sekunden', fr: 'quelques secondes', it: 'un paio di secondi'},
        '%d seconds': {de: '%d Sekunden', fr: '%d secondes', it: '%d secondi'},
        'a minute': {de: 'eine Minute', fr: 'une minute', it: 'un minuto'},
        '%d minutes': {de: '%d Minuten', fr: '%d minutes', it: '%d minuti'},
        'an hour': {de: 'eine Stunde', fr: 'une heure', it: 'un ora'},
        '%d hours': {de: '%d Stunden', fr: '%s heures', it: '%d ore'},
        'a day': {de: 'ein Tag', fr: 'un jour', it: 'un giorno'},
        '%d days': {de: '%d Tagen', fr: '%d jours', it: '%d giorni'},
        'a week': {de: 'eine Woche', fr: 'une semaine', it: 'una settimana'},
        '%d weeks': {de: '%d Wochen', fr: '%d semaines', it: '%d settimane'},
        'a month': {de: 'ein Monat', fr: 'un mois', it: 'un mese'},
        '%d months': {de: '%d Monate', fr: '%d mois', it: '%d mesi'},
        'a year': {de: 'ein Jahr', fr: 'une année', it: 'un anno'},
        '%d years': {de: '%d Jahre', fr: '%s ans', it: '%d anni'}
    };
    const translate = enText => (translationMap[enText] || {})[locale] || enText;

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
    if (!existsState(statePrefix)) { // Check on prefix (the directory)
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

        const viewTranslations = {
            'Order by': translate('Order by'),
            'Filter by': translate('Filter by'),
            'Device': translate('Device')
        };

        createState(listState, '[]', {name: 'UniFi devices listing: jsonList', type: 'string'});
        createState(sortModeState, sortReset, {name: 'UniFi device listing: sortMode', type: 'string'});
        createState(filterModeState, '', {name: 'UniFi device listing: filterMode', type: 'string'});

        // Sorters, filters and some additional translations are saved in states to permit texts localization
        createState(sortersListState, JSON.stringify(sortItems), {name: 'UniFi device listing: sortersJsonList', type: 'string', read: true, write: false});
        createState(filtersListState, JSON.stringify(filterItems), {name: 'UniFi device listing: filtersJsonList', type: 'string', read: true, write: false});
        createState(translationsState, JSON.stringify(viewTranslations), {name: 'UniFi device listing: viewTranslations', type: 'string', read: true, write: false});

        if (devicesView) {
            createState(linksListState, '[]', {name: 'Device links listing: linksJsonList', type: 'string'});
            createState(viewUrlState, '', {name: 'Selected device link: selectedUrl', type: 'string'});
        }
    }
}
