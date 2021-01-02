/**
 * Shutter texts and vars
 *
 * Requirements:
 *  - Shuttercontrol adapter
 *  - Some programming skills
 *
 * @license http://www.opensource.org/licenses/mit-license.html MIT License
 * @author  cdellasanta <70055566+cdellasanta@users.noreply.github.com>
 */

// Script configuration
const statePrefix = '0_userdata.0.vis.shutters';
const defaultLocale = 'de';

// Initialization create/delete states, register listeners
// Using my global functions (see global script common-states-handling )
declare function runAfterInitialization(callback: CallableFunction): void;
declare function initializeState(stateId: string, defaultValue: any, common: object, listenerChangeType?: string, listenerCallback?: CallableFunction): void;
declare function getStateIfExists(stateId: string): any;
declare function getStateValue(stateId: string): any;

const getLocale = () => getStateValue('0_userdata.0.vis.locale') || defaultLocale;

initializeState(`${statePrefix}.autoLivingArea`, true, {name: 'Automatic shutter control in living area', type: 'boolean'});
initializeState(`${statePrefix}.autoSleepingArea`, true, {name: 'Automatic shutter control in sleep area', type: 'boolean'});
initializeState(`${statePrefix}.autoChildArea`, true, {name: 'Automatic shutter control in child area', type: 'boolean'});
initializeState(`${statePrefix}.translations`, '{}', {name: 'Shutters view: viewTranslations', type: 'string', read: true, write: false});

// On locale change, setup correct listings
if (existsState('0_userdata.0.vis.locale')) {
    runAfterInitialization(() => on('0_userdata.0.vis.locale', 'ne', setup));
}

runAfterInitialization(
    () => {
        setup();

        // Reset automatic switches to true
        ['autoLivingArea', 'autoSleepingArea', 'autoChildArea'].forEach(
            id => setState(`${statePrefix}.${id}`, true, true)
        );
    }
);

function setup(): void {
    setViewTranslations();
}

function setViewTranslations(): void {
    setState(
        `${statePrefix}.translations`,
        JSON.stringify([
            '',
        ].reduce((o, key) => ({...o, [key]: translate(key)}), {})),
        true
    );
}

function translate(enText) {
    const map = { // Used https://translator.iobroker.in for translations that uses google translator
        // View translations
        '': {}
    };

    return (map[enText] || {})[getLocale()] || enText;
}