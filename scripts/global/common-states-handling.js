// My global functions for state and listener initialization
// see doc https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#global-functions
// It works like PHP traits
// In TypeScript  you need to declare them:
//   declare function runAfterInitialization(callback: CallableFunction): void;
//   declare function initializeState(stateId: string, defaultValue: any, common: object, listenerChangeType?: string, listenerCallback?: CallableFunction): void;
//   declare function getStateIfExists(stateId: string): any;
//   declare function getStateValue(stateId: string): any;

const resetStatesOnReload = true; // Enable only when actively developing

let statesInitializing = 0; // Semaphore for runAfterInitialization, handled by initializeState

// Helper function for states setup
function runAfterInitialization(callback) {
    log(`States initializing: ${statesInitializing}`, 'silly');

    if (statesInitializing <= 0) {
        callback();
        return;
    }

    // Important: use timout instead of wait!
    this.setTimeout(() => runAfterInitialization(callback), 100);
}

function initializeState(stateId, defaultValue, common, listenerChangeType = null, listenerCallback = null) {
    const registerListener = () => {
        if (listenerChangeType) {
            // Register listener only after all states are initialized
            runAfterInitialization(() => {
                on(stateId, listenerChangeType, listenerCallback);
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

function getStateIfExists(stateId) {
    if (!existsState(stateId)) {
        return null;
    }

    return getState(stateId);
}

function getStateValue(stateId) {
    return (getStateIfExists(stateId) || {}).val || null;
}
