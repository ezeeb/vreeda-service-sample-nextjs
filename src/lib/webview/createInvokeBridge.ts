/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {createEventBus} from './createEventBus';

const SYNC_COMMAND = 'RNWV:sync';
const STATUS_SUCCESS = 'success';
const STATUS_FAIL = 'fail';
let _count = 0;

class Deferred {
    promise: Promise<any>;
    resolve!: (value: any) => void;
    reject!: (reason?: any) => void;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

type Payload = {
    id: number;
    command: string;
    data: any[];
    reply: boolean;
    status: string;
};

function getTransactionKey(data: Payload): string {
    return `${data.command}(${data.id})`;
}

function createPayload(command: string, data: any[]): Payload {
    return {
        id: _count++,
        command,
        data,
        reply: false,
        status: STATUS_SUCCESS,
    };
}

export function createInvokeBridge(sendHandler: (data: Payload) => void) {
    let needWait: Array<Payload> | undefined;
    const eventBus = createEventBus();
    const transactions = new Map<string, Deferred>();
    const callbacks = new Map<string, (args: any[]) => any>();
    const fn = new Map<string, (args: any[]) => any>();

    function isConnect() {
        return !needWait;
    }

    function bind(name: string): (...args: any[]) => any {
        return (...args: any[]) => send(name, args);
    }

    function define(name: string, func: (...args: any[]) => void) {
        callbacks.set(name, (args: any[]) => {
            return func(...args);
        });
        !needWait && sync();
        return { define, bind };
    }

    /** sender parts */
    function sender(data: Payload) {
        const force = data.command === SYNC_COMMAND; // force send the message when the message is the sync message
        if (!force && needWait) {
            needWait.push(data);
        } else {
            sendHandler(data);
        }
        eventBus.emitEvent('send', data);
    }

    function initialize() {
        if (needWait) {
            const waiting = needWait;
            needWait = undefined;
            waiting.forEach(function (payload) {
                sender(payload);
            });
            eventBus.emitEvent('ready', null);
        }
    }

    function send(command: string, data: any): Promise<any> {
        const payload = createPayload(command, data);
        const defer = new Deferred();
        transactions.set(getTransactionKey(payload), defer);
        sender(payload);
        return defer.promise;
    }

    function reply(data: Payload, result: any[], status: string) {
        data.reply = true;
        data.data = result;
        data.status = status;
        sender(data);
    }

    /** listener parts */
    function listener(data: Payload) {
        if (data.reply) {
            const key = getTransactionKey(data);
            if (transactions.has(key)) {
                if (data.status === STATUS_FAIL) {
                    transactions.get(key)?.reject(data.data);
                } else {
                    transactions.get(key)?.resolve(data.data);
                }
            }
        } else {
            if (callbacks.has(data.command)) {
                const result = callbacks.get(data.command)?.(data.data);
                if (result && result.then) {
                    result
                        .then(function (d: any) {
                            reply(data, d, STATUS_SUCCESS);
                        })
                        .catch(function (e: any) {
                            reply(data, e, STATUS_FAIL);
                        });
                } else {
                    reply(data, result, STATUS_SUCCESS);
                }
            } else {
                reply(data, [`function ${data.command} is not defined`], STATUS_FAIL);
            }
        }
        eventBus.emitEvent('receive', data);
    }

    const __sync = bind(SYNC_COMMAND);
    function sync() {
        __sync(callbacks.keys()).then(_sync);
    }

    function _sync(defines: string[] = []) {
        if (defines && defines.filter) {
            defines
                .filter(function (d: string) {
                    return !fn.has(d);
                })
                .map(function (d) {
                    return fn.set(d, bind(d));
                });
        }
        initialize();
        return Object.keys(callbacks);
    }
    define(SYNC_COMMAND, _sync);

    return {
        bind,
        define,
        listener,
        ready: sync,
        fn,
        addEventListener: eventBus.addEventListener,
        removeEventListener: eventBus.removeEventListener,
        isConnect,
    };
}
