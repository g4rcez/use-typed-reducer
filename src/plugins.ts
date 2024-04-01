import { Debug } from "./types";

export type StoragePluginManager = {
    set: (key: string, value: any) => void;
};

export const createStoragePlugin =
    (storage: () => StoragePluginManager) =>
    (key: string) =>
    <T>(state: T, _: T, debug: Debug) => {
        if (!debug.selector) {
            storage().set(key, JSON.stringify(state));
        }
        return state;
    };

export const createLocalStoragePlugin = createStoragePlugin(() => ({
    set: (k: string, v: any) => localStorage.setItem(k, v)
}));

export const createSessionStoragePlugin = createStoragePlugin(() => ({
    set: (k: string, v: any) => sessionStorage.setItem(k, v)
}));

export const createLoggerPlugin =
    (groupName: string) =>
    <State, Props extends object>(state: State, prev: State, debug: Debug<Props>) => {
        console.group(groupName);
        console.info(`%cAction %c- "${debug.method}" ${debug.time}ms\n`, "color: gold", "color: white", prev);
        console.info("%cPrevious state\n", "color: silver", prev);
        console.info("%cCurrent state\n", "color: green", state);
        console.info("Props\n", debug.props);
        console.groupEnd();
        return state;
    };
