/// <reference types='node' />
import { EventEmitter } from 'events';

// Special channels
export const IPCBUS_CHANNEL: string = '/electron-ipc-bus';
export const IPCBUS_CHANNEL_QUERY_STATE: string = `${IPCBUS_CHANNEL}/queryState`;
export const IPCBUS_CHANNEL_SERVICE_AVAILABLE = `${IPCBUS_CHANNEL}/serviceAvailable`;
// Special events
export const IPCBUS_SERVICE_EVENT_START = 'service-event-start';
export const IPCBUS_SERVICE_EVENT_STOP = 'service-event-stop';

// Log en vars
export const ELECTRON_IPC_BROKER_LOGPATH_ENV_VAR = 'ELECTRON_IPC_BROKER_LOGPATH';
export const ELECTRON_IPC_BRIDGE_LOGPATH_ENV_VAR = 'ELECTRON_IPC_BRIDGE_LOGPATH';

export type IpcBusProcessType = 'browser' | 'renderer' | 'node' | 'native' | string;

export interface IpcBusProcess {
    type: IpcBusProcessType;
    pid: number;    // Process Id
    rid?: number;   // Renderer Id
    wcid?: number;  // WebContent Id
}

export interface IpcBusPeer {
    id: string;
    name: string;
    process: IpcBusProcess;
}

export interface IpcBusRequest {
    resolve(payload: Object | string): void;
    reject(err: string): void;
}

export interface IpcBusRequestResponse {
    event: IpcBusEvent;
    payload?: Object | string;
    err?: string;
}

export interface IpcBusEvent {
    channel: string;
    sender: IpcBusPeer;
    request?: IpcBusRequest;
}

export interface IpcBusListener {
    (event: IpcBusEvent, ...args: any[]): void;
}

export interface IpcTimeoutOptions {
    timeoutDelay?: number;
}

export interface IpcSocketBufferingOptions {
    socketBuffer?: number;
}

export interface IpcNetOptions {
    port?: number;
    host?: string;
    path?: string;
}

export namespace IpcBusClient {
    export interface ConnectOptions extends IpcTimeoutOptions, IpcSocketBufferingOptions {
        peerName?: string;
    }
    export interface CloseOptions extends IpcTimeoutOptions {
    }

    export interface CreateOptions extends IpcNetOptions {
    }

    export interface CreateFunction {
        (options: CreateOptions): IpcBusClient | null ;
        (port: number, hostname?: string): IpcBusClient | null ;
        (path: string): IpcBusClient | null ;
    }
}

export interface IpcBusClient extends EventEmitter {
    peer: IpcBusPeer;

    connect(options?: IpcBusClient.ConnectOptions): Promise<void>;
    close(options?: IpcBusClient.CloseOptions): Promise<void>;

    send(channel: string, ...args: any[]): void;
    request(channel: string, timeoutDelay: number, ...args: any[]): Promise<IpcBusRequestResponse>;

    // EventEmitter API
    addListener(channel: string, listener: IpcBusListener): this;
    removeListener(channel: string, listener: IpcBusListener): this;
    on(channel: string, listener: IpcBusListener): this;
    once(channel: string, listener: IpcBusListener): this;
    off(channel: string, listener: IpcBusListener): this;

    // EventEmitter API - Added in Node 6...
    prependListener(channel: string, listener: IpcBusListener): this;
    prependOnceListener(channel: string, listener: IpcBusListener): this;
}

export namespace IpcBusBroker {
    export interface StartOptions extends IpcTimeoutOptions {
    }

    export interface StopOptions extends IpcTimeoutOptions {
    }

    export interface CreateOptions extends IpcNetOptions {
    }

    export interface CreateFunction {
        (options: CreateOptions): IpcBusBroker | null ;
        (port: number, hostname?: string): IpcBusBroker | null ;
        (path: string): IpcBusBroker | null ;
    }
}

export interface IpcBusBroker {
    start(options?: IpcBusBroker.StartOptions): Promise<void>;
    stop(options?: IpcBusBroker.StopOptions): Promise<void>;
    queryState(): Object;
    isServiceAvailable(serviceName: string): boolean;
}

export namespace IpcBusBridge {
    export interface StartOptions extends IpcTimeoutOptions {
    }

    export interface StopOptions extends IpcTimeoutOptions {
    }

    export interface CreateOptions extends IpcNetOptions {
    }

    export interface CreateFunction {
        (options: CreateOptions): IpcBusBridge | null ;
        (port: number, hostname?: string): IpcBusBridge | null ;
        (path: string): IpcBusBridge | null ;
    }
}

export interface IpcBusBridge {
    start(options?: IpcBusBridge.StartOptions): Promise<void>;
    stop(options?: IpcBusBridge.StopOptions): Promise<void>;
}

export interface IpcBusServiceCall {
    handlerName: string;
    args: any[];
}

export interface IpcBusServiceCallHandler {
    (event: IpcBusEvent, call: IpcBusServiceCall): void;
}

export interface ServiceStatus {
    started: boolean;
    callHandlers: string[];
    supportEventEmitter: boolean;
}

export interface IpcBusService {
    start(): void;
    stop(): void;
    registerCallHandler(name: string, handler: IpcBusServiceCallHandler): void;
    sendEvent(eventName: string, ...args: any[]): void;
}

export interface IpcBusServiceEvent {
    eventName: string;
    args: any[];
}

export interface IpcBusServiceEventHandler {
    (event: IpcBusServiceEvent): void;
}

export namespace IpcBusServiceProxy {
    export interface ConnectOptions extends IpcTimeoutOptions {
    }
}

export interface IpcBusServiceProxy extends EventEmitter {
    readonly isStarted: boolean;
    readonly wrapper: Object;

    connect<T>(options?: IpcBusServiceProxy.ConnectOptions): Promise<T>;
    getStatus(): Promise<ServiceStatus>;
    getWrapper<T>(): T;

    // Kept for backward
    call<T>(name: string, ...args: any[]): Promise<T>;
    apply<T>(name: string, args: any[]): Promise<T>;

    // Do wait for the stub response, equivalent to call/apply.
    requestCall<T>(name: string, ...args: any[]): Promise<T>;
    requestApply<T>(name: string, args: any[]): Promise<T>;

    // Do not wait for the stub response, more efficient.
    sendCall(name: string, ...args: any[]): void;
    sendApply(name: string, args: any[]): void;

    // onServiceStart(handler: () => void);
    // onServiceStop(handler: () => void);
}
