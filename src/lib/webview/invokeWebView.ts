/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable import/no-anonymous-default-export */
import { createInvokeBridge } from './createInvokeBridge';

interface ReactNativeWindow extends Window {
    webkit: Webkit;
    ReactNativeWebView: {
        postMessage(...args: any[]): void;
    };
    isVreedaWebView?: boolean;
}

interface Webkit {
    messageHandlers: {
        ReactNativeWebView: {
            postMessage(...args: any[]): void;
        }
        ReactNativeHistoryShim: {
            postMessage(...args: any[]): void;
        }
    }
}

declare const window: ReactNativeWindow;

let _postMessage: ((...args: any[]) => any) | null = null;

const isBrowser = typeof window !== 'undefined';

const { bind, define, listener, ready, fn, addEventListener, removeEventListener, isConnect } = createInvokeBridge(
    data => isBrowser && _postMessage && _postMessage(JSON.stringify(data))
)

const handleMessage = (message: any) => {
    let jsonMessage = undefined;

    if (typeof message === 'object') {
        jsonMessage = message;
    } else if (typeof message === 'string') {
        try {
            jsonMessage = JSON.parse(message)
        } catch (error) { }
    }

    if ((jsonMessage) && (jsonMessage.command || jsonMessage.reply)) {
        listener(jsonMessage);
    }
}

if (isBrowser) {
    // react-native-webview
    let ReactNativeWebView = window.ReactNativeWebView;

    if (ReactNativeWebView) {
        _postMessage = (...args) => window.ReactNativeWebView.postMessage(...args);
        ready();
    }

    // onMessage react-native-webview
    window.addEventListener('message', (e: MessageEvent) => handleMessage(e.data));
    // onMessage react-native-webview with android
    window.document.addEventListener('message', (e: Event) => {
        const messageEvent: MessageEvent = e as MessageEvent;
        handleMessage(messageEvent.data);
    });
}

export default {
    bind,
    define,
    fn,
    addEventListener,
    removeEventListener,
    isConnect
}
