import { Debug } from "./types";

export const createStoragePlugin =
    (storage: typeof localStorage | typeof sessionStorage) =>
    (key: string) =>
    <T>(state: T) => {
        storage.setItem(key, JSON.stringify(state));
        return state;
    };

export const createLocalStoragePlugin = createStoragePlugin(localStorage);
export const createSessionStoragePlugin = createStoragePlugin(sessionStorage);

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
