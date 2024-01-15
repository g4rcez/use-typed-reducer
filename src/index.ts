import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import { clone, entries, isPromise, shallowCompare } from "./lib";
import {
    Dispatch,
    MapReducers,
    FnMap,
    Action,
    Callback,
    Listener,
    UseReducer,
    ReducerArgs,
    MappedReducers,
    ReducerActions,
    MapReducerReturn,
    ReducerMiddleware
} from "./types";

export * from "./types";

export const useTypedReducer = <State extends {}, Reducers extends Dispatch<State, Props, Reducers>, Props extends {}>(
    initialState: State,
    reducers: Reducers,
    props?: Props
): [state: State, dispatch: MapReducers<State, Props, Reducers>] => {
    const [state, setState] = useState(initialState);
    const refProps = useMutable<Props>((props as never) ?? {});
    const getProps = useCallback(() => refProps.current, [refProps]);

    const dispatches = useMemo<any>(
        () =>
            entries<Reducers, Action<State, Props>>(reducers).reduce(
                (acc, [name, dispatch]) => ({
                    ...acc,
                    [name]: async (...params: unknown[]) => {
                        const dispatcher = await dispatch(...params);
                        return setState((previousState: State) => dispatcher(previousState, getProps()));
                    }
                }),
                reducers
            ),
        [reducers, getProps]
    );
    return [state, dispatches];
};

export const useMutable = <T extends {}>(state: T): MutableRefObject<T> => {
    const mutable = useRef(state ?? {});
    useEffect(() => void (mutable.current = state), [state]);
    return mutable;
};

export const dispatchCallback = <Prev extends any, T extends Callback<Prev>>(prev: Prev, setter: T) =>
    typeof setter === "function" ? setter(prev) : setter;

const reduce = <State extends {}, Middlewares extends Array<(state: State, key: string, prev: State) => State>>(
    state: State,
    prev: State,
    middleware: Middlewares,
    key: string
) => {
    const initial = Array.isArray(state)
        ? state
        : state.constructor.name === Object.name
        ? { ...prev, ...state }
        : state;
    return middleware.reduce<State>((acc, fn) => fn(acc, key, prev), initial);
};

export const useReducer = <
    State extends {},
    Reducers extends ReducerActions<State, Props>,
    Props extends object,
    Middlewares extends ReducerMiddleware<State, Props, Reducers>
>(
    initialState: State,
    reducer: Reducers,
    props?: Props,
    middlewares?: Middlewares
): UseReducer<State, State, Props, Reducers> => {
    const [state, setState] = useState<State>(() => initialState);
    const mutableState = useMutable(state);
    const mutableProps = useMutable(props ?? ({} as Props));
    const mutableReducer = useMutable(reducer);
    const middleware = useMutable<Middlewares>(middlewares ?? ([] as unknown as Middlewares));
    const savedInitialState = useRef(initialState);

    const dispatchers = useMemo<MapReducerReturn<State, ReturnType<Reducers>>>(() => {
        const reducers = mutableReducer.current({
            state: () => mutableState.current,
            props: () => mutableProps.current,
            initialState: savedInitialState.current
        });

        return entries<string, any>(reducers as any).reduce(
            (acc, [name, dispatch]: any) => ({
                ...acc,
                [name]: (...params: any[]) => {
                    const result = dispatch(...params);
                    const set = (newState: State) =>
                        setState((prev) => reduce(newState, prev, middleware.current, name));
                    return isPromise<State>(result) ? void result.then(set) : set(result);
                }
            }),
            {} as MapReducerReturn<State, ReturnType<Reducers>>
        );
    }, [mutableProps, mutableReducer, mutableState]);
    return [state, dispatchers] as const;
};

export const createReducer =
    <State extends {} = {}, Props extends object = {}>() =>
    <Reducer extends (args: ReducerArgs<State, Props>) => MappedReducers<State, FnMap<State>>>(reducer: Reducer) =>
        reducer;

export const createGlobalReducer = <
    State extends {},
    Reducers extends ReducerActions<State, Props>,
    Props extends object,
    Middlewares extends ReducerMiddleware<State, Props, Reducers>
>(
    initialState: State,
    reducer: Reducers,
    props?: Props,
    middlewares?: Middlewares
): (<Selector extends (state: State) => any>(
    selector?: Selector,
    comparator?: (a: any, b: any) => boolean
) => UseReducer<Selector extends (state: State) => State ? State : ReturnType<Selector>, State, Props, Reducers>) & {
    dispatchers: MapReducerReturn<State, ReturnType<Reducers>>;
} => {
    let state = initialState;
    const getSnapshot = () => state;
    const listeners = new Set<Listener<State>>();
    const addListener = (listener: Listener<State>) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };
    const setState = (callback: (arg: State) => State) => {
        const previousState = { ...state };
        const newState = callback(state);
        state = newState;
        listeners.forEach((exec) => exec(newState, previousState));
    };

    const getProps = () => (props as Props) || ({} as Props);
    const args = { state: getSnapshot, props: getProps, initialState };
    const middlewareList: Middlewares = middlewares || ([] as unknown as Middlewares);
    const dispatchers: MapReducerReturn<State, ReturnType<Reducers>> = entries(reducer(args)).reduce<any>(
        (acc, [name, fn]: any) => ({
            ...acc,
            [name]: (...args: any[]) => {
                const result = fn(...args);
                const set = (newState: State) => setState((prev) => reduce(newState, prev, middlewareList, name));
                return isPromise<State>(result) ? result.then(set) : set(result);
            }
        }),
        {}
    );

    const defaultSelector = (state: State) => state;

    return Object.assign(
        function useStore<Selector extends (state: State) => any>(selector?: Selector, comparator = shallowCompare) {
            const state = useSyncExternalStoreWithSelector(
                addListener,
                getSnapshot,
                getSnapshot,
                selector || defaultSelector,
                comparator
            );
            return [state, dispatchers] as const;
        },
        { dispatchers }
    );
};

export const useClassReducer = <T extends object>(instance: T) => {
    const [proxy, setProxy] = useState(
        new Proxy(
            instance,
            Object.assign({}, Reflect, {
                set: (obj: any, prop: any, value: any) => {
                    (obj as any)[prop] = value;
                    setProxy(clone(obj));
                    return true;
                }
            })
        )
    );
    return proxy;
};

export default useTypedReducer;
