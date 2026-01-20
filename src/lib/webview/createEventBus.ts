/* eslint-disable @typescript-eslint/no-explicit-any */
export function createEventBus() {
    type eventListener = (event: any) => void;

    type listeners = {
        send: eventListener[];
        receive: eventListener[];
        ready: eventListener[];
    };

    const _listeners: listeners = {
        send: [],
        receive: [],
        ready: [],
    };

    type listenersKey = keyof typeof _listeners;

    function addEventListener(name: string, cb: eventListener) {
        if (name in Object.keys(_listeners)) {
            const fns = _listeners[name as listenersKey];
            if (fns.indexOf(cb) < 0) {
                fns.push(cb);
            }
        }
    }

    function removeEventListener(name: string, cb: eventListener) {
        if (name in Object.keys(_listeners)) {
            const fns = _listeners[name as listenersKey];
            const idx = fns.indexOf(cb);
            if (idx >= 0) {
                fns.splice(idx, 1);
            }
        }
    }

    function emitEvent(name: string, event: any) {
        if (name in Object.keys(_listeners)) {
            _listeners[name as listenersKey].forEach((fn) => fn(event));
        }
    }

    return { addEventListener, removeEventListener, emitEvent };
}
