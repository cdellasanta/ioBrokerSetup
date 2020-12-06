// My global functions for state and listener intilialization
// see doc https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#global-functions
// It works like PHP traits
// In the script you need to declare tham:

const resetStatesOnReload = true; // Enable only when actively developing

let statesInitializing = 0; // Semaphore for runAfterInitialization, handled by initializeState

// Helper function for states setup
function runAfterInitialization(callback) {
    log(`States initializing: ${statesInitializing}`, 'silly');

    if (statesInitializing <= 0) {
        callback();
        return;
    }

    // Important use timout instead of wait!
    setTimeout(() => runAfterInitialization(callback), 100);
}

function initializeState(stateId, defaultValue, common, listenerProps = false, listenerCallback = undefined) {
    const registerListener = () => {
        if (listenerProps) {
            listenerProps['id'] = stateId;

            // Register listener only after all states are initialized
            runAfterInitialization(() => {
                on(listenerProps, listenerCallback);
                log(`Registered listener on ${stateId}`, 'debug');
            });
        }
    };
    const myCreateState = () => {
        statesInitializing++;
        log(`myCreateState: inreased states initializing: ${statesInitializing}`, 'silly');

        createState(stateId, defaultValue , common, () => {
            log(`Created state ${stateId}`, 'debug');

            registerListener();

            statesInitializing--;
            log(`myCreateState: reduced states initializing: ${statesInitializing}`, 'silly');
        });
    };
    const resetState = () => {
        statesInitializing++;
        log(`resetState: inreased states initializing: ${statesInitializing}`, 'silly');

        deleteState(stateId, () => {
            log(`Deleted state ${stateId}`, 'debug');

            myCreateState();

            statesInitializing--;
            log(`resetState: reduced states initializing: ${statesInitializing}`, 'silly');
        });
    }

    if (!existsState(stateId)) {
        myCreateState();
    } else if (resetStatesOnReload) {
        resetState();
    } else {
        registerListener();
    }
}