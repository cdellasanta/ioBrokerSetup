/**
 * This script register states for the recognition of human interaction on switch inputs.
 * 
 * For each registered device (see constant afterwards) registers a state "0_userdata.0.auto.<device>" 
 * toggler that is set to true on script start and every day at midnight.
 * 
 * If a change in value on the device listener is detected, the "0_userdata.0.auto.<device>" toggler
 * is set to false.
 * 
 * The states "0_userdata.0.auto.<device>" are to be used with the blind-sun-shading program.
 */
const statePrefix = '0_userdata.0.auto.';
const devices = {         // Event counter on a Shelly, counts the manual inputs
    'studio-light': {
       name: 'Studio light',
       listeners: ['shelly.0.SHDM-2#D8BFC019CDBD#1.lights.EventCount1']
    },
    // Blinds: because the Relay[01].EventCount are not updated when in "shutter" mode, we need to know then an 
    //         atomatic action is beeing performed. 

    'studio-blind': {
        name: 'Studio blind',
        // listeners: ['shelly.0.SHSW-25#68C63AFB12A1#1.Relay0.EventCount', 'shelly.0.SHSW-25#68C63AFB12A1#1.Relay1.EventCount']
        listeners: ['shelly.0.SHSW-25#68C63AFB12A1#1.Shutter.state'],
        autoState: '0_userdata.0.blinds.studio-blind.running'
    }
};

for (const deviceName in devices) {
    let stateName = statePrefix + deviceName;

    // Create and set to "auto" mode    
    createState(
        stateName, 
        true, 
        {name: devices[deviceName].name + ' auto handling', type: 'boolean'},
        () => {
            log(stateName + ': created', 'debug');
            on(
                {id: stateName, change: 'ne'}, 
                obj => { 
                    log(stateName + ': changed from ' + obj.oldState.val + ' to ' + obj.state.val, 'info');
                }
            );
    
            // On any change  on a listener, set to "manual" mode
            devices[deviceName].listeners.forEach(listenerName => {
                on(
                    {id: listenerName, change: 'ne'},
                    obj => { 
                        if (typeof devices[deviceName].autoState !== 'string' // If autoState does not exists 
                            || !getState(devices[deviceName].autoState).val // OR if exists is not currently true
                        ) {
                            // @todo Might need to exclude if obj.state.val === 0 (a reset of the event counter might not be a manual input)
                            setState(stateName, false, true);
                        }
                    }
                );
            });
        }
    );

    // Set auto on start
    setState(stateName, true, true);
}

// Set all to 'auto' mode on midnight
schedule("0 0 * * *",  () => {
    for (const deviceName in devices) {
        let stateName = statePrefix + deviceName;

        setState(stateName, true, true);
    }
});
