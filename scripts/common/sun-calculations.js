/**
 * This script registers states "0_userdata.0.sun.*" relative
 * to the geographic position of the house.
 * 
 * The states are updated on startup and every minute.
 * 
 * The states are to be used with the blind-sun-shading program.
 */
const suncalc = require('suncalc'); // npm install suncalc
const configuration = getObject('system.config');
const latitude = configuration.common.latitude;
const longitude = configuration.common.longitude;
const statePrefix = '0_userdata.0.sun.';
const radToDeg = 180 / Math.PI;

log("Latitude : " + latitude, 'debug');
log("Longitude: " + longitude, 'debug');

if (!existsState(statePrefix + 'sunrise') 
    || !existsState(statePrefix + 'sunset')
    || !existsState(statePrefix + 'altitude')
    || !existsState(statePrefix + 'azimuth')
) {
    createState(statePrefix + 'sunrise', 0, {name: 'Localized sunrise time', type: 'string', unit: 'hh:mm'});
    createState(statePrefix + 'sunset', 0, {name: 'Localized sunset time', type: 'string', unit: 'hh:mm'});
    createState(statePrefix + 'altitude', 0, {name: 'Localized sun altitude', type: 'number', unit: '°'});
    createState(statePrefix + 'azimuth', 0, {name: 'Localized sun azimuth', type: 'number', unit: '°'});
}

function setLocalizedSunTimes () {
    let sunTimes = suncalc.getTimes(new Date(), latitude, longitude);
    // Properties: solarNoon, nadir, sunrise, sunset, sunriseEnd, sunsetStart, dawn, dusk, 
    //             nauticalDawn, nauticalDusk, nightEnd, night, goldenHourEnd, goldenHour

    log("Sunrise : " + sunTimes.sunrise.toLocaleTimeString(), 'debug');
    log("Sunset: " + sunTimes.sunset.toLocaleTimeString(), 'debug');

    setState(statePrefix + 'sunrise', formatDate(sunTimes.sunrise, 'hh:mm'), true);
    setState(statePrefix + 'sunset', formatDate(sunTimes.sunset, 'hh:mm'), true);
}

function setLocalizedSunPositionDeg () {
    let sunPosition = suncalc.getPosition(new Date(), latitude, longitude);
    let altitude = sunPosition.altitude * radToDeg;
    let azimuth = sunPosition.azimuth * radToDeg + 180;

    log("Altitude : " + altitude, 'debug');
    log("Azimuth: " + azimuth, 'debug');

    setState(statePrefix + 'altitude', Math.round(10 * altitude) / 10, true);
    setState(statePrefix + 'azimuth', Math.round(azimuth), true);
}

// On startup
setLocalizedSunTimes();
setLocalizedSunPositionDeg();

schedule("0 0 * * *", setLocalizedSunTimes); // Every day at midnight
schedule("* * * * *", setLocalizedSunPositionDeg); // Every minute
