/**
 * Meteo localized texts and vars
 * 
 */
const locale = 'it';
const forecastDays = 7;
const statePrefix = '0_userdata.0.vis.weather';
const defaultRadarView = 'rain';
const rotateRadarViewInterval = 120; /** @todo implement? */
const resetOnReload = true; // Enable only when actively developing

const temperatureColorByValue = [
    {value: -20, color: '#5b2c6f'},
    {value: 0, color: '#2874a6'},
    {value: 14, color: '#73c6b6'},
    {value: 22, color: '#008000'},
    {value: 27, color: '#FFA500'},
    {value: 35, color: '#FF0000'}
];

const precipitationChanceColor = '#0d47a1';
const precipitationColor = '#6dd600';    

const chromaJs = require("chroma-js");
const moment = require("moment");
const suncalc = require('suncalc');

const configuration = getObject('system.config');
const latitude = configuration.common.latitude;
const longitude = configuration.common.longitude;
const temperatureGradientColors = getGradientColors(-20, 40, temperatureColorByValue);

moment.locale(locale);

// Create states
if (!existsState(statePrefix) || resetOnReload) {
    createState(`${statePrefix}.weekForecastIconList`, '[]',{name: 'Icon list for week forecast', type: 'string'});
    createState(`${statePrefix}.weekForecastChartJson`, '[]',{name: 'Json forecast chart data for week', type: 'string'});
    createState(`${statePrefix}.dayForecastChartJson`, '[]',{name: 'Json forecast chart data for day (24 hours)', type: 'string'});
}

// On every script start
refrashData();

// Everiday, but after sources have updated 
schedule('30 0 * * *', refrashData);

function refrashData() {
    createWeekForecastItemList(forecastDays);
    createWeekForecastGraph(forecastDays);

    createDayForecastGraph();
}

function createWeekForecastGraph(maxDays) {
    let axisLabels = []
    let temperatureMax = [];
    let temperatureMin = [];
    let temperatureMaxColors = [];
    let temperatureMinColors = [];
    let temperatureAxisMax = 0;
    let temperatureAxisMin = 100;
    let precipitationChance = []; 
    let precipitation = []; 
    let precipitationMaxVal = 0;

    for (let day = 1; day <= maxDays; day++) {
        let mainDayForecastState = `swiss-weather-api.0.WeekForecast.day${day - 1}`;
        let secondaryDayForecastState = `weatherunderground.0.forecast.${day - 1}d`;

        if (existsState(`${mainDayForecastState}.formatted_date`)) {
            axisLabels.push(getDayName(day, `${mainDayForecastState}.formatted_date`));
                
            // temperature Max 
            let temperatureMaxVal = parseFloat(getState(`${mainDayForecastState}.ttx`).val);
            if (temperatureMaxVal > temperatureAxisMax) {
                temperatureAxisMax = temperatureMaxVal;
            }
            if (temperatureMaxVal < temperatureAxisMin) {
                temperatureAxisMin = temperatureMaxVal;
            }
            temperatureMax.push(temperatureMaxVal);
            temperatureMaxColors.push(temperatureGradientColors.getColorByValue(temperatureMaxVal));

            // temperature Min 
            let temperatureMinVal = parseFloat(getState(`${mainDayForecastState}.ttn`).val);
            if (temperatureMinVal > temperatureAxisMax) {
                temperatureAxisMax = temperatureMinVal;
            }
            if (temperatureMinVal < temperatureAxisMin) {
                temperatureAxisMin = temperatureMinVal;
            }
            temperatureMin.push(temperatureMinVal);
            temperatureMinColors.push(temperatureGradientColors.getColorByValue(temperatureMinVal));

            if (existsState(`${secondaryDayForecastState}.precipitationAllDay`)) {
                let precipitationVal = getState(`${secondaryDayForecastState}.precipitationAllDay`).val;
            
                if (precipitationVal > precipitationMaxVal) { 
                    precipitationMaxVal = precipitationVal;
                } 
            
                precipitation.push(precipitationVal);
            } else {
                precipitation.push(0);
            }

            if (existsState(`${secondaryDayForecastState}.precipitationChance`)) {
                precipitationChance.push(getState(`${secondaryDayForecastState}.precipitationChance`).val);
            } else {
                precipitationChance.push(0);
            }
        } else {
            console.warn(`[createWeekForecastGraph] No data for day ${day-1}!`);
        }
    }

    populateChartData(
        `${statePrefix}.weekForecastChartJson`,
        axisLabels, 
        temperatureMin, 
        temperatureMax, 
        temperatureAxisMin, 
        temperatureAxisMax, 
        temperatureMinColors, 
        temperatureMaxColors,
        precipitationChance,
        precipitationMaxVal,
        precipitation
    );
}

function createDayForecastGraph() {
    let axisLabels = []
    let temperature = [];
    let temperatureMin = [];
    let temperatureColors = [];
    let temperatureMinColors = [];
    let temperatureAxisMax = 0;
    let temperatureAxisMin = 100;

    let precipitationChance = []; 
    
    let precipitation = []; 
    let precipitationMaxVal = 0;

    for (let hour = 1; hour <= 8; hour++) {
        let hourForecastState = `swiss-weather-api.0.24hForecast.hour${hour -1}`;

        if (existsState(`${hourForecastState}.date`)) {
            let date = new Date(getState(`${hourForecastState}.date`).val); // A real Date object
            let pushWithDate = (array, data) => array.push({t:date.getTime(), y:data});
            
            //pushWithDate(axisLabels, formatDate(date, 'hh:mm'));
            
            // temperature Max 
            let temperatureVal = parseFloat(getState(`${hourForecastState}.values.ttt`).val);
            if (temperatureVal > temperatureAxisMax) {
                temperatureAxisMax = temperatureVal;
            }
            if (temperatureVal < temperatureAxisMin) {
                temperatureAxisMin = temperatureVal;
            }
            pushWithDate(temperature, temperatureVal);

            temperatureColors.push(temperatureGradientColors.getColorByValue(temperatureVal));

            let precipitationVal = getState(`${hourForecastState}.values.rr3`).val;
        
            if (precipitationVal > precipitationMaxVal) { 
                precipitationMaxVal = precipitationVal;
            } 
        
            pushWithDate(precipitation, precipitationVal);
            pushWithDate(precipitationChance, getState(`${hourForecastState}.values.pr3`).val);
        } else {
            console.warn(`[createWeekForecastGraph] No data for hour ${hour-1}!`);
        }
    }

    populateChartData(
        `${statePrefix}.dayForecastChartJson`,
        axisLabels, 
        temperature, 
        false,  // No temperature max
        temperatureAxisMin, 
        temperatureAxisMax, 
        temperatureColors, 
        false, // No temperature max colors
        precipitationChance,
        precipitationMaxVal,
        precipitation  
    );
}

function populateChartData(stateName, axisLabels, temperatureMin, temperatureMax, temperatureAxisMin, temperatureAxisMax, temperatureMinColors,  temperatureMaxColors, precipitationChance, precipitationMaxVal, precipitation) {
    let graphs = [];

    if (temperatureMax) {
        graphs.push(
            {
                data: temperatureMax,
                type: 'line',
                legendText: 'max. temperature',
                line_pointSizeHover: 5,
                line_pointSize: 0,
                line_Tension: 0.3,
                yAxis_id: 0,
                yAxis_show: false,
                yAxis_gridLines_show: false,
                yAxis_gridLines_ticks_length: 5,
                yAxis_min: (temperatureAxisMin < 5) ? Math.ceil((temperatureAxisMin - 5) / 5) * 5 : 0,
                yAxis_max: Math.ceil((temperatureAxisMax + 5) / 5) * 5,
                yAxis_step: 5,
                yAxis_position: 'left',
                yAxis_appendix: ' °C',
                yAxis_zeroLineWidth: 0.1,
                yAxis_zeroLineColor: 'black',
                displayOrder: 0,
                tooltip_AppendText: ' °C',
                datalabel_backgroundColor: temperatureMaxColors,
                datalabel_color: 'white',
                datalabel_offset: -10,
                datalabel_fontFamily: 'RobotoCondensed-Light',
                datalabel_fontSize: 12,
                datalabel_borderRadius: 6,
                line_PointColor: temperatureMaxColors,
                line_PointColorBorder: temperatureMaxColors,
                line_PointColorHover: temperatureMaxColors,
                line_PointColorBorderHover: temperatureMaxColors,
                use_gradient_color: true,
                line_FillBetweenLines: '+1',
                gradient_color: temperatureColorByValue,
                use_line_gradient_fill_color: true,
                line_gradient_fill_color: temperatureGradientColors.getGradientWithOpacity(40)
            }
        );
    }

    graphs.push(
        {
            data: temperatureMin,
            type: 'line',
            legendText: temperatureMax ? 'min. temperature' : 'temperature',
            line_pointSizeHover: 5,
            line_pointSize: 0,
            line_Tension: 0.3,
            yAxis_id: 0,
            yAxis_show: false,
            yAxis_gridLines_show: false,
            yAxis_gridLines_ticks_length: 5,
            yAxis_min: (temperatureAxisMin < 5) ? Math.ceil((temperatureAxisMin - 5) / 5) * 5 : 0,
            yAxis_max: Math.ceil((temperatureAxisMax + 5) / 5) * 5,
            yAxis_step: 5,
            yAxis_position: 'left',
            yAxis_appendix: ' °C',
            yAxis_zeroLineWidth: 0.1,
            yAxis_zeroLineColor: 'black',
            displayOrder: 0,
            tooltip_AppendText: ' °C',
            datalabel_backgroundColor: temperatureMinColors,
            datalabel_color: 'white',
            datalabel_offset: -10,
            datalabel_fontFamily: 'RobotoCondensed-Light',
            datalabel_fontSize: 12,
            datalabel_borderRadius: 6,
            line_PointColor: temperatureMinColors,
            line_PointColorBorder: temperatureMinColors,
            line_PointColorHover: temperatureMinColors,
            line_PointColorBorderHover: temperatureMinColors,
            use_gradient_color: true,
            gradient_color: temperatureColorByValue,
            xAxis_min: 0,
            xAxis_bounds: 'ticks',
            xAxis_time_unit: 'minutes',
            xAxis_tooltip_timeFormats: 'HH:MM'
        }
    );

    if (precipitationChance) {
        graphs.push(
            {
                data: precipitationChance,
                type: 'line',
                color: precipitationChanceColor,
                legendText: 'precipitationChance',
                line_UseFillColor: true,
                line_pointSize: 0,
                line_pointSizeHover: 5,
                yAxis_min: 0,
                yAxis_max: 100,
                yAxis_maxSteps: 10,
                yAxis_position: 'left',
                yAxis_gridLines_show: false,
                yAxis_gridLines_border_show: true,
                yAxis_distance: 10,
                yAxis_zeroLineWidth: 0.1,
                yAxis_zeroLineColor: 'black',
                yAxis_appendix: ' %',
                displayOrder: 1,
                tooltip_AppendText: ' %',
                datalabel_show: false
            }
        );
    }

    if (precipitationMaxVal > 0) {
        graphs.push(
            {
                data: precipitation,
                type: 'bar',
                color: precipitationColor,
                legendText: 'precipitation',
                yAxis_min: 0,
                yAxis_max: Math.ceil((precipitationMaxVal + 5) / 5) * 5,
                yAxis_maxSteps: 10,
                yAxis_position: 'right',
                yAxis_gridLines_show: false,
                yAxis_appendix: ' mm',
                yAxis_gridLines_border_show: false,
                yAxis_distance: 10,
                yAxis_zeroLineWidth: 0.1,
                yAxis_zeroLineColor: 'black',
                displayOrder: 1,
                tooltip_AppendText: ' mm',
                datalabel_show: false
            }
        );
    }

    setState(stateName, JSON.stringify({axisLabels: axisLabels, graphs: graphs}), true);
}

function createWeekForecastItemList(maxDays) {
    let iconList = [];

    for (let day = 1; day <= maxDays; day++) {
        let mainDayForecastState = `swiss-weather-api.0.WeekForecast.day${day - 1}`;
        let secondaryDayForecastState = `weatherunderground.0.forecast.${day - 1}d`;

        let title = getDayName(day, `${mainDayForecastState}.formatted_date`);
        let forecastText = getSymbolText(getState(`${mainDayForecastState}.smbd`).val);
        let temperatures = `${getState(`${mainDayForecastState}.ttn`).val}°C &nbsp; | &nbsp; ${getState(`${mainDayForecastState}.ttx`).val}°C`;
        let precipitationChance = existsState(`${secondaryDayForecastState}.precipitationChance`) ? `${getState(`${secondaryDayForecastState}.precipitationChance`).val} %` : 'N/A';
        let sunTimes = suncalc.getTimes(
            moment(getState(`${mainDayForecastState}.formatted_date`).val, 'DD.MM.YYYY').toDate(),
            latitude,
            longitude
        ); // Properties: solarNoon, nadir, sunrise, sunset, sunriseEnd, sunsetStart, dawn, dusk,  nauticalDawn, nauticalDusk, nightEnd, night, goldenHourEnd, goldenHour

        let subTexts = [];
        let addSub = (labelEn, value) => subTexts.push(
            `<div style="display: flex; align-items: center; margin: 0 4px;">
                <div style="flex: 1;text-align: left;font-family: RobotoCondensed-Light; font-size: 11px;">${translate(labelEn)}</div>
                <div style="color: gray; font-family: RobotoCondensed-LightItalic; font-size: 10px;">${value}</div>
            </div>`);

        [
            {id: 'humidity', label: 'Air humidity', postfix: '%'},
            {id: 'precipitationAllDay', label: 'Rain', postfix: 'mm'},
            {id: 'windSpeed', label: 'Wind', postfix: 'km/h'},
            {id: 'mslp', label: 'Pressure', postfix: 'hPa'},
            //{id: 'xxx', label: 'Snow limit', postfix: 'm'},
            {id: 'snowAllDay', label: 'Snowfall', postfix: 'cm'}
        ].forEach(item => {
            if (existsState(`${secondaryDayForecastState}.${item.id}`)) {
                addSub(item.label, getState(`${secondaryDayForecastState}.${item.id}`).val + ' ' + item.postfix);
            }
        });
        
        addSub('Sunrise', formatDate(sunTimes.sunrise, 'hh:mm')); 
        addSub('Sunset', formatDate(sunTimes.sunset, 'hh:mm')); 

        iconList.push({
            text: `
                <div style="margin: 0 4px; text-align: center;">${title}
                    <div style="height: 1px; background: #44739e;"></div>
                    <div style="color: grey; font-size: 11px; font-family: RobotoCondensed-Light; white-space: break-spaces; margin-top: 5px; text-align: center;">${forecastText}</div>
                    <div style="color: #44739e; font-family: RobotoCondensed-Regular; font-size: 16px; margin-top: 5px; text-align: center;">${temperatures}</div>
                    <div style="color: grey; font-size: 11px; font-family: RobotoCondensed-Light; white-space: break-spaces; margin-top: 5px; text-align: center;">${precipitationChance}</div>
                </div>`,
            image: getState(`${mainDayForecastState}.icon-url`).val,
            subText: subTexts.join(''),
            listType: 'text',
            showValueLabel: false
        });
    }

    setState(`${statePrefix}.weekForecastIconList`, JSON.stringify(iconList), true);
}

function getGradientColors(min, max, colorValArray) {
    let delta = max - min;
    let chromaColors = []
    let chromaDomains = [];

    for (const item of colorValArray) {
        chromaColors.push(item.color);
        chromaDomains.push(item.value / delta);
    }

    let chroma = chromaJs.scale(chromaColors).domain(chromaDomains);

    return {
        getColorByValue: function (val) {
            if (val > max) {
                return chroma(1).hex();
            } else if (val < min) {
                return chroma(0).hex();
            } else {
                return chroma(val / delta).hex();
            }
        },
        getGradientWithOpacity: function (opacity) {
            colorValArray.forEach(item => {
                item.color = chromaJs(item.color).alpha(opacity / 100).hex();
            });
            return colorValArray;
        }
    }
}

function getDayName(dayIndex, state) {
    switch (dayIndex) {
        case 1: return translate('today');
        case 2: return translate('tomorrow');
        default: return moment(getState(state).val, 'DD.MM.YYYY').format('dddd');
    }
}

function getSymbolText(id) {
    const map = { 
        /** @todo Should refactor descriptions, currently taken from 
         *       https://github.com/baerengraben/iobroker.swiss-weather-api/raw/master/doc/SRG-SSR%20-%20Weather%20API%20Translations.pdf
         */
        1: {
            name: 'so',
            description: 'sun',
            descriptionDe: 'Sonne'
        },
        2: {
            name: 'so_ne',
            description: 'sun, fog',
            descriptionDe: 'Sonne, Nebel'
        },
        3: {
            name: 'so_grhe',
            description: 'sun, large light grey cloud',
            descriptionDe: 'Sonne, grosse hellgraue Wolke'
        },
        4: {
            name: 'so_grhe_shra',
            description: 'sun, large light grey cloud Rain showers',
            descriptionDe: 'Sonne, grosse hellgraue Wolke Regenschauer'
        },
        5: {
            name: 'so_grhe_shra_bl',
            description: 'sun, big light grey cloud, rain shower, lightning',
            descriptionDe: 'Sonne, grosse hellgraue Wolke, Regenschauer, Blitz'
        },
        6: {
            name: 'so_grhe_shsn',
            description: 'sun, large light grey cloud, snow shower',
            descriptionDe: 'Sonne, grosse hellgraue Wolke, Schneeschauer'
        },
        7: {
            name: 'so_grhe_shsn_bl',
            description: 'sun, big light grey cloud, snow shower, lightning',
            descriptionDe: 'Sonne, grosse hellgraue Wolke, Schneeschauer, Blitz'
        },
        8: {
            name: 'so_grhe_shsr',
            description: 'sun, big light grey cloud, snow showers',
            descriptionDe: 'Sonne, grosse hellgraue Wolke, Schneeregenschauer'
        },
        9: {
            name: 'so_grhe_shsr_bl',
            description: 'sun, big light grey cloud, snow showers, lightning',
            descriptionDe: 'Sonne, grosse hellgraue Wolke, Schneeregenschauer, Blitz'
        },
        10: {
            name: 'so_klhe',
            description: 'sun, small white cloud',
            descriptionDe: 'Sonne, kleine weisse Wolke'
        },
        11: {
            name: 'so_klhe_shra',
            description: 'sun, small white cloud, rain shower',
            descriptionDe: 'Sonne, kleine weisse Wolke, Regenschauer'
        },
        12: {
            name: 'so_klhe_shra_bl',
            description: 'sun, small white cloud, rain shower, lightning',
            descriptionDe: 'Sonne, kleine weisse Wolke, Regenschauer, Blitz'
        },
        13: {
            name: 'so_klhe_shsn',
            description: 'sun, small white cloud, snow shower',
            descriptionDe: 'Sonne, kleine weisse Wolke, Schneeschauer'
        },
        14: {
            name: 'so_klhe_shsn_bl',
            description: 'sun, small white cloud, snow shower, lightning',
            descriptionDe: 'Sonne, kleine weisse Wolke, Schneeschauer, Blitz'
        },
        15: {
            name: 'so_klhe_shsr',
            description: 'sun, small white cloud, snow showers',
            descriptionDe: 'Sonne, kleine weisse Wolke, Schneeregenschauer'
        },
        16: {
            name: 'so_klhe_shsr_bl',
            description: 'sunny, small white cloud, snow shower, lightning',
            descriptionDe: 'Sonner, kleine weisse Wolke, Schneeregenschauer, Blitz'
        },
        17: {
            name: 'ne',
            description: 'fog',
            descriptionDe: 'Nebel'
        },
        18: {
            name: 'grdu',
            description: 'large dark cloud',
            descriptionDe: 'Grosse dunkle Wolke'
        },
        19: {
            name: 'grhe',
            description: 'large light grey cloud',
            descriptionDe: 'Grosse hellgraue Wolke'
        },
        20: {
            name: 'grdu_ra',
            description: 'big dark cloud, rain',
            descriptionDe: 'Grosse dunkle Wolke, Regen'
        },
        21: {
            name: 'grdu_sn',
            description: 'big dark cloud, snow',
            descriptionDe: 'Grosse dunkle Wolke, Schnee'
        },
        22: {
            name: 'grdu_sr',
            description: 'big dark cloud, snow rain',
            descriptionDe: 'Grosse dunkle Wolke, Schneeregen'
        },
        23: {
            name: 'grdu_ra3',
            description: 'big dark, heavy rain',
            descriptionDe: 'Grosse dunkle, starker Regen'
        },
        24: {
            name: 'grdu_sn3',
            description: 'big dark, heavy snowfall',
            descriptionDe: 'Grosse dunkle, starker Schneefall'
        },
        25: {
            name: 'grdu_shra',
            description: 'big dark cloud, rain shower',
            descriptionDe: 'Grosse dunkle Wolke, Regenschauer'
        },
        26: {
            name: 'grdu_shra_bl',
            description: 'big dark cloud, rain shower, lightning',
            descriptionDe: 'Grosse dunkle Wolke, Regenschauer, Blitz'
        },
        27: {
            name: 'grdu_shsn',
            description: 'big dark cloud, snow shower',
            descriptionDe: 'Grosse dunkle Wolke, Schneeschauer'
        },
        28: {
            name: 'grdu_shsn_bl',
            description: 'big dark cloud, snow showers, lightning',
            descriptionDe: 'Grosse dunkle Wolke, Schneeschauer, Blitz'
        },
        29: {
            name: 'grdu_shsr',
            description: 'large dark cloud, snow showers',
            descriptionDe: 'Grosse dunkle Wolke, Schneeregenschauer'
        },
        30: {
            name: 'grdu_shsr_bl',
            description: 'big dark cloud, snow showers, lightning',
            descriptionDe: 'Grosse dunkle Wolke, Schneeregenschauer, Blitz'
        },
        '-1': {
            name: 'mo',
            description: 'moon',
            descriptionDe: 'Mond'
        },
        '-2': {
            name: 'mo_ne',
            description: 'moon, fog',
            descriptionDe: 'Mond, Nebel'
        },
        '-3': {
            name: 'mo_grhe',
            description: 'moon, large light grey cloud',
            descriptionDe: 'Mond, grosse hellgraue Wolke'
        },
        '-4': {
            name: 'mo_grhe_shra',
            description: 'moon, big light grey cloud rain showers',
            descriptionDe: 'Mond, grosse hellgraue Wolke Regenschauer'
        },
        '-5': {
            name: 'mo_grhe_shra_bl',
            description: 'moon, large light grey cloud, rain shower, lightning',
            descriptionDe: 'Mond, grosse hellgraue Wolke, Regenschauer, Blitz'
        },
        '-6': {
            name: 'mo_grhe_shsn',
            description: 'moon, large light grey cloud, snow shower',
            descriptionDe: 'Mond, grosse hellgraue Wolke, Schneeschauer'
        },
        '-7': {
            name: 'mo_grhe_shsn_bl',
            description: 'moon, big light grey cloud, snow shower, lightning',
            descriptionDe: 'Mond, grosse hellgraue Wolke, Schneeschauer, Blitz'
        },
        '-8': {
            name: 'mo_grhe_shsr',
            description: 'moon, big light grey cloud, snow showers',
            descriptionDe: 'Mond, grosse hellgraue Wolke, Schneeregenschauer'
        },
        '-9': {
            name: 'mo_grhe_shsr_bl',
            description: 'moon, big light grey cloud, snow shower, lightning',
            descriptionDe: 'Mond, grosse hellgraue Wolke, Schneeregenschauer, Blitz'
        },
        '-10': {
            name: 'mo_klhe',
            description: 'moon, small white cloud',
            descriptionDe: 'Mond, kleine weisse Wolke'
        },
        '-11': {
            name: 'mo_klhe_shra',
            description: 'moon, small white cloud, rain shower',
            descriptionDe: 'Mond, kleine weisse Wolke, Regenschauer'
        },
        '-12': {
            name: 'mo_klhe_shra_bl',
            description: 'moon, small white cloud, rain shower, lightning',
            descriptionDe: 'Mond, kleine weisse Wolke, Regenschauer, Blitz'
        },
        '-13': {
            name: 'mo_klhe_shsn',
            description: 'moon, small white cloud, snow shower',
            descriptionDe: 'Mond, kleine weisse Wolke, Schneeschauer'
        },
        '-14': {
            name: 'mo_klhe_shsn_bl',
            description: 'moon, small white cloud, snow shower, lightning',
            descriptionDe: 'Mond, kleine weisse Wolke, Schneeschauer, Blitz'
        },
        '-15': {
            name: 'mo_klhe_shsr',
            description: 'moon, small white cloud, snow showers',
            descriptionDe: 'Mond, kleine weisse Wolke, Schneeregenschauer'
        },
        '-16': {
            name: 'mo_klhe_shsr_bl',
            description: 'moon, small white cloud, snow showers, lightning',
            descriptionDe: 'Mond, kleine weisse Wolke, Schneeregenschauer, Blitz'
        }
    };

    return translate((map[id] || {}).description || 'N/A');
}

function translate(enText) {
    const map = { // Used https://translator.iobroker.in for translations that uses google translator
        // Days
        'today': {de: 'heute', ru: 'сегодня', pt: 'hoje', nl: 'vandaag', fr: 'aujourd\'hui', it: 'oggi', es: 'hoy', pl: 'dzisiaj', 'zh-cn': '今天'},
        'tomorrow': {de: 'Morgen', ru: 'завтра', pt: 'amanhã', nl: 'morgen', fr: 'demain', it: 'domani', es: 'mañana', pl: 'jutro', 'zh-cn': '明天'},
        // Icon list items
        'Air humidity': {de: 'Luftfeuchtigkeit', ru: 'Влажность воздуха', pt: 'Umidade do ar', nl: 'Lucht vochtigheid', fr: 'Humidité de l\'air', it: 'Umidità dell\'aria', es: 'Humedad del aire', pl: 'Wilgotność powietrza', 'zh-cn': '空气湿度'},
        'Rain': {de: 'Regen', ru: 'Дождь', pt: 'Chuva', nl: 'Regen', fr: 'Pluie', it: 'Pioggia', es: 'Lluvia', pl: 'Deszcz', 'zh-cn': '雨'},
        'Wind': {de: 'Wind', ru: 'ветер', pt: 'Vento', nl: 'Wind', fr: 'Vent', it: 'Vento', es: 'Viento', pl: 'Wiatr', 'zh-cn': '风'},
        'Pressure': {de: 'Druck', ru: 'Давление', pt: 'Pressão', nl: 'Druk', fr: 'Pression', it: 'Pressione', es: 'Presión', pl: 'Ciśnienie', 'zh-cn': '压力'},
        'Snowfall': {de: 'Schneefall', ru: 'Снегопад', pt: 'Queda de neve', nl: 'Sneeuwval', fr: 'Chute de neige', it: 'Nevicata', es: 'Nevada', pl: 'Opad śniegu', 'zh-cn': '降雪'},
        'Sunrise': {de: 'Sonnenaufgang', ru: 'Восход солнца', pt: 'Nascer do sol', nl: 'zonsopkomst', fr: 'lever du soleil', it: 'Alba', es: 'amanecer', pl: 'wschód słońca', 'zh-cn': '日出'},
        'Sunset': {de: 'Sonnenuntergang', ru: 'Закат солнца', pt: 'Sunset', nl: 'Zonsondergang', fr: 'Le coucher du soleil', it: 'Tramonto', es: 'Puesta de sol', pl: 'Zachód słońca', 'zh-cn': '日落'},
        // Symbol forecast
        'sun': {de: 'Sonne', ru: 'солнце', pt: 'Sol', nl: 'zon', fr: 'Soleil', it: 'sole', es: 'Dom', pl: 'słońce', 'zh-cn': '太阳'},
        'sun, fog': {de: 'Sonne, Nebel', ru: 'солнце, туман', pt: 'sol nevoeiro', nl: 'zon, mist', fr: 'soleil, brouillard', it: 'sole, nebbia', es: 'sol, niebla', pl: 'słońce, mgła', 'zh-cn': '太阳雾'},
        'sun, large light grey cloud': {de: 'Sonne, große hellgraue Wolke', ru: 'солнце, большое светло-серое облако', pt: 'sol, grande nuvem cinza claro', nl: 'zon, grote lichtgrijze wolk', fr: 'soleil, gros nuage gris clair', it: 'sole, grande nuvola grigio chiaro', es: 'sol, gran nube gris claro', pl: 'słońce, duża jasnoszara chmura', 'zh-cn': '太阳，大浅灰色云'},
        'sun, large light grey cloud Rain showers': {de: 'Sonne, große hellgraue Wolke Regenschauer', ru: 'солнце, большое светло-серое облако Дождь', pt: 'sol, grande nuvem cinza claro Pancadas de chuva', nl: 'zon, grote lichtgrijze wolk Regenbuien', fr: 'soleil, gros nuage gris clair Averses de pluie', it: 'sole, grande nuvola grigio chiaro Rovesci di pioggia', es: 'sol, gran nube gris claro Lluvia', pl: 'słońce, duża jasnoszara chmura Przelotne opady deszczu', 'zh-cn': '晴间多云'},
        'sun, big light grey cloud, rain shower, lightning': {de: 'Sonne, große hellgraue Wolke, Regendusche, Blitz', ru: 'солнце, большое светло-серое облако, ливень, молния', pt: 'sol, grande nuvem cinza claro, aguaceiro, relâmpago', nl: 'zon, grote lichtgrijze wolk, regenbui, bliksem', fr: 'soleil, gros nuage gris clair, averse de pluie, éclair', it: 'sole, grande nuvola grigio chiaro, acquazzone, fulmini', es: 'sol, gran nube gris claro, lluvia, relámpago', pl: 'słońce, wielka jasnoszara chmura, deszcz, błyskawica', 'zh-cn': '太阳，浅灰色的大云，阵雨，闪电'},
        'sun, large light grey cloud, snow shower': {de: 'Sonne, große hellgraue Wolke, Schneeschauer', ru: 'солнце, большое светло-серое облако, снежный дождь', pt: 'sol, grande nuvem cinza claro, chuva de neve', nl: 'zon, grote lichtgrijze wolk, sneeuwbui', fr: 'soleil, gros nuage gris clair, averse de neige', it: 'sole, grande nuvola grigio chiaro, rovescio di neve', es: 'sol, gran nube gris claro, lluvia de nieve', pl: 'słońce, duża jasnoszara chmura, przelotne opady śniegu', 'zh-cn': '太阳，浅灰色的大云，阵雪'},
        'sun, big light grey cloud, snow shower, lightning': {de: 'Sonne, große hellgraue Wolke, Schneeschauer, Blitz', ru: 'солнце, большое светло-серое облако, снежный дождь, молния', pt: 'sol, grande nuvem cinza claro, chuva de neve, relâmpago', nl: 'zon, grote lichtgrijze wolk, sneeuwbui, bliksem', fr: 'soleil, gros nuage gris clair, averse de neige, éclair', it: 'sole, grande nuvola grigio chiaro, pioggia di neve, fulmini', es: 'sol, gran nube gris claro, lluvia de nieve, relámpago', pl: 'słońce, wielka jasnoszara chmura, przelotne opady śniegu, błyskawice', 'zh-cn': '太阳，浅灰色的大云，阵雪，闪电'},
        'sun, big light grey cloud, snow showers': {de: 'Sonne, große hellgraue Wolke, Schneeschauer', ru: 'солнце, большое светло-серое облако, снегопады', pt: 'sol, grande nuvem cinza claro, pancadas de neve', nl: 'zon, grote lichtgrijze wolk, sneeuwbuien', fr: 'soleil, gros nuage gris clair, averses de neige', it: 'sole, grande nuvola grigio chiaro, rovesci di neve', es: 'sol, gran nube gris claro, chubascos de nieve', pl: 'słońce, duża jasnoszara chmura, przelotne opady śniegu', 'zh-cn': '太阳，浅灰色的大云，阵雪'},
        'sun, big light grey cloud, snow showers, lightning': {de: 'Sonne, große hellgraue Wolke, Schneeschauer, Blitz', ru: 'солнце, большое светло-серое облако, снегопады, молния', pt: 'sol, grande nuvem cinza claro, pancadas de neve, relâmpagos', nl: 'zon, grote lichtgrijze wolk, sneeuwbuien, bliksem', fr: 'soleil, gros nuage gris clair, averses de neige, éclairs', it: 'sole, grande nuvola grigio chiaro, rovesci di neve, fulmini', es: 'sol, gran nube gris claro, chubascos de nieve, relámpagos', pl: 'słońce, wielka jasnoszara chmura, przelotne opady śniegu, błyskawice', 'zh-cn': '太阳，浅灰色的大云，阵雪，闪电'},
        'sun, small white cloud': {de: 'Sonne, kleine weiße Wolke', ru: 'солнце, маленькое белое облачко', pt: 'sol, pequena nuvem branca', nl: 'zon, kleine witte wolk', fr: 'soleil, petit nuage blanc', it: 'sole, piccola nuvola bianca', es: 'sol, pequeña nube blanca', pl: 'słońce, mała biała chmurka', 'zh-cn': '太阳，小白云'},
        'sun, small white cloud, rain shower': {de: 'Sonne, kleine weiße Wolke, Regendusche', ru: 'солнце, маленькое белое облачко, ливневый дождь', pt: 'sol, pequena nuvem branca, aguaceiro', nl: 'zon, kleine witte wolk, regendouche', fr: 'soleil, petit nuage blanc, averse de pluie', it: 'sole, piccola nuvola bianca, doccia a pioggia', es: 'sol, pequeña nube blanca, lluvia', pl: 'słońce, mała biała chmurka, deszcz', 'zh-cn': '太阳，小白云，阵雨'},
        'sun, small white cloud, rain shower, lightning': {de: 'Sonne, kleine weiße Wolke, Regendusche, Blitz', ru: 'солнце, небольшое белое облачко, ливень, молния', pt: 'sol, pequena nuvem branca, aguaceiro, relâmpago', nl: 'zon, kleine witte wolk, regenbui, bliksem', fr: 'soleil, petit nuage blanc, averse de pluie, éclair', it: 'sole, nuvoletta bianca, acquazzone, fulmini', es: 'sol, pequeña nube blanca, lluvia, relámpago', pl: 'słońce, mała biała chmurka, deszcz, błyskawica', 'zh-cn': '太阳，小白云，阵雨，闪电'},
        'sun, small white cloud, snow shower': {de: 'Sonne, kleine weiße Wolke, Schneeschauer', ru: 'солнце, маленькое белое облачко, снежный дождь', pt: 'sol, pequena nuvem branca, chuva de neve', nl: 'zon, kleine witte wolk, sneeuwbui', fr: 'soleil, petit nuage blanc, averse de neige', it: 'sole, nuvoletta bianca, rovescio di neve', es: 'sol, pequeña nube blanca, lluvia de nieve', pl: 'słońce, mała biała chmurka, przelotne opady śniegu', 'zh-cn': '太阳，小白云，阵雪'},
        'sun, small white cloud, snow shower, lightning': {de: 'Sonne, kleine weiße Wolke, Schneeschauer, Blitz', ru: 'солнце, маленькое белое облачко, снежный дождь, молния', pt: 'sol, pequena nuvem branca, chuva de neve, relâmpago', nl: 'zon, kleine witte wolk, sneeuwbui, bliksem', fr: 'soleil, petit nuage blanc, averse de neige, éclair', it: 'sole, nuvoletta bianca, rovescio di neve, fulmini', es: 'sol, pequeña nube blanca, lluvia de nieve, relámpago', pl: 'słońce, mała biała chmurka, przelotne opady śniegu, błyskawice', 'zh-cn': '太阳，小白云，阵雪，闪电'},
        'sun, small white cloud, snow showers': {de: 'Sonne, kleine weiße Wolke, Schneeschauer', ru: 'солнце, маленькое белое облачко, снегопад', pt: 'sol, pequena nuvem branca, pancadas de neve', nl: 'zon, kleine witte wolk, sneeuwbuien', fr: 'soleil, petit nuage blanc, averses de neige', it: 'sole, nuvoletta bianca, rovesci di neve', es: 'sol, pequeña nube blanca, chubascos de nieve', pl: 'słońce, mała biała chmurka, przelotne opady śniegu', 'zh-cn': '太阳，小白云，阵雪'},
        'sunny, small white cloud, snow shower, lightning': {de: 'sonnige, kleine weiße Wolke, Schneeschauer, Blitz', ru: 'солнечно, небольшое белое облачко, снежный дождь, молния', pt: 'ensolarado, pequena nuvem branca, chuva de neve, relâmpago', nl: 'zonnig, kleine witte wolk, sneeuwbui, bliksem', fr: 'ensoleillé, petit nuage blanc, averse de neige, éclair', it: 'soleggiato, piccola nuvola bianca, rovesci di neve, fulmini', es: 'soleado, pequeña nube blanca, lluvia de nieve, relámpago', pl: 'słonecznie, mała biała chmurka, przelotne opady śniegu, błyskawice', 'zh-cn': '晴天，小白云，阵雪，闪电'},
        'fog': {de: 'Nebel', ru: 'туман', pt: 'névoa', nl: 'mist', fr: 'brouillard', it: 'nebbia', es: 'niebla', pl: 'mgła', 'zh-cn': '多雾路段'},
        'large dark cloud': {de: 'große dunkle Wolke', ru: 'большое темное облако', pt: 'grande nuvem escura', nl: 'grote donkere wolk', fr: 'grand nuage sombre', it: 'grande nuvola scura', es: 'gran nube oscura', pl: 'duża ciemna chmura', 'zh-cn': '大乌云'},
        'large light grey cloud': {de: 'große hellgraue Wolke', ru: 'большое светло-серое облако', pt: 'grande nuvem cinza claro', nl: 'grote lichtgrijze wolk', fr: 'gros nuage gris clair', it: 'grande nuvola grigio chiaro', es: 'gran nube gris claro', pl: 'duża jasnoszara chmura', 'zh-cn': '大浅灰云'},
        'big dark cloud, rain': {de: 'große dunkle Wolke, Regen', ru: 'большое темное облако, дождь', pt: 'grande nuvem negra chuva', nl: 'grote donkere wolk, regen', fr: 'gros nuage noir, pluie', it: 'grande nuvola scura, pioggia', es: 'gran nube oscura, lluvia', pl: 'duża ciemna chmura, deszcz', 'zh-cn': '大乌云，雨'},
        'big dark cloud, snow': {de: 'große dunkle Wolke, Schnee', ru: 'большое темное облако, снег', pt: 'grande nuvem escura, neve', nl: 'grote donkere wolk, sneeuw', fr: 'gros nuage noir, neige', it: 'grande nuvola scura, neve', es: 'gran nube oscura, nieve', pl: 'duża ciemna chmura, śnieg', 'zh-cn': '大乌云雪'},
        'big dark cloud, snow rain': {de: 'große dunkle Wolke, Schneeregen', ru: 'большое темное облако, снежный дождь', pt: 'grande nuvem escura, chuva de neve', nl: 'grote donkere wolk, sneeuwregen', fr: 'gros nuage noir, pluie de neige', it: 'grande nuvola scura, pioggia di neve', es: 'gran nube oscura, lluvia de nieve', pl: 'duża ciemna chmura, śnieżny deszcz', 'zh-cn': '大乌云，雪雨'},
        'big dark, heavy rain': {de: 'großer dunkler, starker Regen', ru: 'большой темный, сильный дождь', pt: 'grande escuro, chuva forte', nl: 'grote donkere, zware regen', fr: 'grosse pluie sombre et abondante', it: 'grande pioggia scura e pesante', es: 'gran lluvia oscura y pesada', pl: 'duży ciemny, ulewny deszcz', 'zh-cn': '大黑，大雨'},
        'big dark, heavy snowfall': {de: 'großer dunkler, starker Schneefall', ru: 'большой темный, сильный снегопад', pt: 'grande escuridão, nevasca forte', nl: 'grote donkere, zware sneeuwval', fr: 'grosse chute de neige sombre et abondante', it: 'grande nevicata scura e abbondante', es: 'gran nevada oscura y pesada', pl: 'duże ciemne, obfite opady śniegu', 'zh-cn': '大黑，大雪'},
        'big dark cloud, rain shower': {de: 'große dunkle Wolke, Regenschauer', ru: 'большое темное облако, ливневый дождь', pt: 'grande nuvem escura, aguaceiro', nl: 'grote donkere wolk, regenbui', fr: 'gros nuage sombre, averse de pluie', it: 'grande nuvola scura, doccia a pioggia', es: 'gran nube oscura, lluvia', pl: 'duża ciemna chmura, deszcz', 'zh-cn': '大乌云，阵雨'},
        'big dark cloud, rain shower, lightning': {de: 'große dunkle Wolke, Regenschauer, Blitz', ru: 'большое темное облако, ливневый дождь, молния', pt: 'grande nuvem escura, aguaceiro, relâmpago', nl: 'grote donkere wolk, regenbui, bliksem', fr: 'gros nuage noir, averse de pluie, éclair', it: 'grande nuvola scura, pioggia, fulmini', es: 'gran nube oscura, lluvia, relámpago', pl: 'wielka ciemna chmura, deszcz, błyskawica', 'zh-cn': '大乌云，阵雨，闪电'},
        'big dark cloud, snow shower': {de: 'große dunkle Wolke, Schneeschauer', ru: 'большое темное облако, снежный дождь', pt: 'grande nuvem escura, chuva de neve', nl: 'grote donkere wolk, sneeuwbui', fr: 'gros nuage noir, averse de neige', it: 'grande nuvola scura, pioggia di neve', es: 'gran nube oscura, lluvia de nieve', pl: 'duża ciemna chmura, przelotne opady śniegu', 'zh-cn': '大乌云，阵雪'},
        'big dark cloud, snow showers, lightning': {de: 'große dunkle Wolke, Schneeschauer, Blitz', ru: 'большое темное облако, снегопады, молнии', pt: 'grande nuvem escura, pancadas de neve, relâmpagos', nl: 'grote donkere wolk, sneeuwbuien, bliksem', fr: 'gros nuage noir, averses de neige, éclairs', it: 'grande nuvola scura, rovesci di neve, fulmini', es: 'gran nube oscura, nevadas, relámpagos', pl: 'wielka ciemna chmura, przelotne opady śniegu, błyskawice', 'zh-cn': '乌云密布，阵雪，闪电'},
        'large dark cloud, snow showers': {de: 'große dunkle Wolke, Schneeschauer', ru: 'большое темное облако, снегопады', pt: 'grande nuvem escura, pancadas de neve', nl: 'grote donkere wolk, sneeuwbuien', fr: 'gros nuage sombre, averses de neige', it: 'grande nuvola scura, rovesci di neve', es: 'gran nube oscura, chubascos de nieve', pl: 'duża ciemna chmura, przelotne opady śniegu', 'zh-cn': '乌云密布，阵雪'},
        'moon': {de: 'Mond', ru: 'Луна', pt: 'lua', nl: 'maan', fr: 'lune', it: 'Luna', es: 'Luna', pl: 'księżyc', 'zh-cn': '月亮'},
        'moon, fog': {de: 'Mond, Nebel', ru: 'луна, туман', pt: 'lua, nevoeiro', nl: 'maan, mist', fr: 'lune, brouillard', it: 'luna, nebbia', es: 'luna, niebla', pl: 'księżyc, mgła', 'zh-cn': '月亮，雾'},
        'moon, large light grey cloud': {de: 'Mond, große hellgraue Wolke', ru: 'луна, большое светло-серое облако', pt: 'lua, grande nuvem cinza claro', nl: 'maan, grote lichtgrijze wolk', fr: 'lune, gros nuage gris clair', it: 'luna, grande nuvola grigio chiaro', es: 'luna, gran nube gris claro', pl: 'księżyc, duża jasnoszara chmura', 'zh-cn': '月亮，浅灰色的大云'},
        'moon, big light grey cloud rain showers': {de: 'Mond, große hellgraue Wolkenregenschauer', ru: 'Луна, большие светло-серые облака, ливневые дожди', pt: 'lua, grande nuvem cinza claro, pancadas de chuva', nl: 'maan, grote lichtgrijze wolkenregenbuien', fr: 'lune, grandes averses de pluie nuage gris clair', it: 'luna, grandi piogge nuvolose grigio chiaro', es: 'luna, gran nube gris claro lluvia', pl: 'księżyc, duże, szare chmury, przelotne opady deszczu', 'zh-cn': '月亮，大浅灰色的云阵雨'},
        'moon, large light grey cloud, rain shower, lightning': {de: 'Mond, große hellgraue Wolke, Regendusche, Blitz', ru: 'луна, большое светло-серое облако, ливень, молния', pt: 'lua, grande nuvem cinza claro, aguaceiro, relâmpago', nl: 'maan, grote lichtgrijze wolk, regendouche, bliksem', fr: 'lune, gros nuage gris clair, averse de pluie, éclair', it: 'luna, grande nuvola grigio chiaro, acquazzone, fulmini', es: 'luna, gran nube gris claro, lluvia, relámpago', pl: 'księżyc, duża jasnoszara chmura, deszcz, błyskawica', 'zh-cn': '月亮，浅灰色的大云，阵雨，闪电'},
        'moon, large light grey cloud, snow shower': {de: 'Mond, große hellgraue Wolke, Schneeschauer', ru: 'луна, большое светло-серое облако, снежный дождь', pt: 'lua, grande nuvem cinza claro, chuva de neve', nl: 'maan, grote lichtgrijze wolk, sneeuwbui', fr: 'lune, gros nuage gris clair, averse de neige', it: 'luna, grande nuvola grigio chiaro, rovescio di neve', es: 'luna, gran nube gris claro, lluvia de nieve', pl: 'księżyc, duża jasnoszara chmura, przelotny deszcz', 'zh-cn': '月亮，浅灰色的大云，阵雪'},
        'moon, big light grey cloud, snow shower, lightning': {de: 'Mond, große hellgraue Wolke, Schneeschauer, Blitz', ru: 'луна, большое светло-серое облако, снежный дождь, молния', pt: 'lua, grande nuvem cinza claro, chuva de neve, relâmpago', nl: 'maan, grote lichtgrijze wolk, sneeuwbui, bliksem', fr: 'lune, gros nuage gris clair, averse de neige, éclair', it: 'luna, grande nuvola grigio chiaro, pioggia di neve, fulmini', es: 'luna, gran nube gris claro, lluvia de nieve, relámpago', pl: 'księżyc, duża jasnoszara chmura, przelotne opady śniegu, błyskawice', 'zh-cn': '月亮，浅灰色的大云，阵雪，闪电'},
        'moon, big light grey cloud, snow showers': {de: 'Mond, große hellgraue Wolke, Schneeschauer', ru: 'луна, большое светло-серое облако, снегопады', pt: 'lua, grande nuvem cinza clara, pancadas de neve', nl: 'maan, grote lichtgrijze wolk, sneeuwbuien', fr: 'lune, gros nuage gris clair, averses de neige', it: 'luna, grande nuvola grigio chiaro, rovesci di neve', es: 'luna, gran nube gris claro, chubascos de nieve', pl: 'księżyc, duża jasnoszara chmura, przelotne opady śniegu', 'zh-cn': '月亮，浅灰色的大云，阵雪'},
        'moon, small white cloud': {de: 'Mond, kleine weiße Wolke', ru: 'луна, маленькое белое облако', pt: 'lua, pequena nuvem branca', nl: 'maan, kleine witte wolk', fr: 'lune, petit nuage blanc', it: 'luna, piccola nuvola bianca', es: 'luna, pequeña nube blanca', pl: 'księżyc, mała biała chmurka', 'zh-cn': '月亮，小白云'},
        'moon, small white cloud, rain shower': {de: 'Mond, kleine weiße Wolke, Regenschauer', ru: 'луна, маленькое белое облачко, ливень', pt: 'lua, pequena nuvem branca, aguaceiro', nl: 'maan, kleine witte wolk, regenbui', fr: 'lune, petit nuage blanc, averse de pluie', it: 'luna, piccola nuvola bianca, doccia a pioggia', es: 'luna, pequeña nube blanca, lluvia', pl: 'księżyc, mała biała chmurka, deszcz', 'zh-cn': '月亮，小白云，阵雨'},
        'moon, small white cloud, rain shower, lightning': {de: 'Mond, kleine weiße Wolke, Regenschauer, Blitz', ru: 'луна, маленькое белое облачко, ливень, молния', pt: 'lua, pequena nuvem branca, chuva, relâmpago', nl: 'maan, kleine witte wolk, regenbui, bliksem', fr: 'lune, petit nuage blanc, averse de pluie, éclair', it: 'luna, nuvoletta bianca, acquazzone, fulmini', es: 'luna, pequeña nube blanca, lluvia, relámpago', pl: 'księżyc, mała biała chmurka, deszcz, błyskawica', 'zh-cn': '月亮，小白云，阵雨，闪电'},
        'moon, small white cloud, snow shower': {de: 'Mond, kleine weiße Wolke, Schneeschauer', ru: 'луна, маленькое белое облачко, снежный дождь', pt: 'lua, pequena nuvem branca, chuva de neve', nl: 'maan, kleine witte wolk, sneeuwbui', fr: 'lune, petit nuage blanc, averse de neige', it: 'luna, piccola nuvola bianca, pioggia di neve', es: 'luna, pequeña nube blanca, lluvia de nieve', pl: 'księżyc, mała biała chmurka, deszcz śnieżny', 'zh-cn': '月亮，小白云，阵雪'},
        'moon, small white cloud, snow shower, lightning': {de: 'Mond, kleine weiße Wolke, Schneeschauer, Blitz', ru: 'луна, маленькое белое облачко, снежный дождь, молния', pt: 'lua, pequena nuvem branca, chuva de neve, relâmpago', nl: 'maan, kleine witte wolk, sneeuwbui, bliksem', fr: 'lune, petit nuage blanc, averse de neige, éclair', it: 'luna, piccola nuvola bianca, pioggia di neve, fulmini', es: 'luna, pequeña nube blanca, lluvia de nieve, relámpago', pl: 'księżyc, mała biała chmurka, przelotny deszcz, błyskawica', 'zh-cn': '月亮，小白云，阵雪，闪电'},
        'moon, small white cloud, snow showers': {de: 'Mond, kleine weiße Wolke, Schneeschauer', ru: 'луна, маленькое белое облачко, снегопад', pt: 'lua, pequena nuvem branca, pancadas de neve', nl: 'maan, kleine witte wolk, sneeuwbuien', fr: 'lune, petit nuage blanc, averses de neige', it: 'luna, nuvoletta bianca, rovesci di neve', es: 'luna, pequeña nube blanca, chubascos de nieve', pl: 'księżyc, mała biała chmurka, przelotne opady śniegu', 'zh-cn': '月亮，小白云，阵雪'},
        'moon, small white cloud, snow showers, lightning': {de: 'Mond, kleine weiße Wolke, Schneeschauer, Blitz', ru: 'луна, маленькое белое облачко, снегопады, молния', pt: 'lua, pequena nuvem branca, pancadas de neve, relâmpagos', nl: 'maan, kleine witte wolk, sneeuwbuien, bliksem', fr: 'lune, petit nuage blanc, averses de neige, éclairs', it: 'luna, nuvoletta bianca, rovesci di neve, fulmini', es: 'luna, pequeña nube blanca, chubascos de nieve, relámpagos', pl: 'księżyc, mała biała chmurka, przelotne opady śniegu, błyskawice', 'zh-cn': '月亮，小白云，阵雪，闪电'}
    };

    return (map[enText] || {})[locale] || enText;
}
