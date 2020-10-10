/**
 * This script is intended to act a wraper on Shelly relay direct events to fix 2 things:
 *  - tilt on the blind
 *  - differenciate user interaction from atumatic one (see auto-handling)
 * 
 * It registers "0_userdata.0.blinds.<device>" events, each contaning:
 *  - 'running': boolean value, set to true when this script is actively controlling the running blind
 *  - 'position': 0-100 value
 *  - 'tilt': 0-90 degrees value
 *  - .... @todo IDEA pram to accept position and tilt together? e.g. '55@30'
 */
const statePrefix = '0_userdata.0.blinds.';
const blinds = {
    'studio-blind': {
        name: 'Studio blind',
        shutterControl: 'shelly.0.SHSW-25#68C63AFB12A1#1.Shutter.',
        tiltDelayMs: 100
    }
};

for (const blindName in blinds) {
    let runningState = statePrefix + blindName + '.running';
    let positionState = statePrefix + blindName + '.position';
    let tiltState = statePrefix + blindName + '.tilt';
    let shutterControlPosition = blinds[blindName].shutterControl + 'Position';

    // Create 'running' state   
    createState(
        runningState, 
        true, 
        {name: blinds[blindName].name + ' controller is running', type: 'boolean'},
        () => {
            log(runningState + ': created', 'debug');
        }
    );    
            
    // Create 'position' state and listener
    createState(
        positionState, 
        50, 
        {name: blinds[blindName].name + ' position', role: 'level.blind', type: 'number', read: true, write: true, unit: '%', min: 0, max: 100},
        () => {
            log(positionState + ': created', 'debug');  

            // Handle changes on positionState    
            on(
                {id: positionState, change: 'any', ack: false}, // Only commands (ack => false)
                obj => { 
                    log(positionState + ': changed from ' + obj.oldState.val + ' to ' + obj.state.val, 'info');

                    // Set running
                    setState(runningState, true, true);

                    let previousValue = getState(shutterControlPosition).val;

                    setState(shutterControlPosition, obj.state.val, false, async () => { // false for "not aknowledged" => perform action
                        // Wait an aknowledged but not previousValue on shutter
                        let state = null;

                        do {
                            if (state !== null) await sleep(200);

                            state = getState(shutterControlPosition);
                            log(shutterControlPosition + ': ' + state.val + ' -> ' + state.ack, 'silly'); 
                        } while (!state.ack || state.val === previousValue);
                        
                        // No more running
                        setState(runningState, false, true);

                        // Note: the aknowledged value is reflected by the listener afterwards
                        //setState(positionState, obj.state.val, true /* ack */);
                    });
                }
            );
        
            // Reflect awnowledged values of shutterControlPosition
            on(
                {id: shutterControlPosition, change: 'any', ack: true}, 
                obj => { 
                    log(shutterControlPosition + ': changed from ' + obj.oldState.val + ' to ' + obj.state.val, 'debug');
                    setState(positionState, obj.state.val, true);
                }
            );  
        }
    );

    // @todo implement tilt
}
