import React, { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import { entries, isPromise, shallowCompare } from "./lib";
import {
    Dispatch,
    MapReducers,
    Action,
    Listener,
    UseReducer,
    ReducerActions,
    MapReducerReturn,
    ReducerMiddleware,
    Debug
} from "./types";
import { useMutable, usePrevious } from "./hooks";

export const useLegacyReducer = <State extends {}, Reducers extends Dispatch<State, Props, Reducers>, Props extends {}>(
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


const reduce = <State extends {}>(state: State, prev: State) => {
    if (prev === state) return state;
    return state.constructor.name === Object.name ? { ...prev, ...state } : state;
};

const debugFunc =
    <State extends {}, Props extends object>(
        name: string,
        dispatch: (...args: any[]) => any,
        setState: React.Dispatch<SetStateAction<State>>,
        getProps: () => Props,
        debug: React.MutableRefObject<Debug<Props> | null>
    ) =>
    (...params: any[]) => {
        const now = performance.now();
        const result = dispatch(...params);
        const set = (newState: State) => setState((prev) => reduce(newState, prev));
        if (isPromise<State>(result)) {
            return result.then((resolved) => {
                set(resolved);
                debug.current = {
                    method: name,
                    props: getProps(),
                    time: performance.now() - now
                };
            });
        }
        set(result);
        debug.current = {
            method: name,
            props: getProps(),
            time: performance.now() - now
        };
        return;
    };

const optimizedFunc =
    <State extends {}, Props extends object>(
        name: string,
        dispatch: (...args: any[]) => any,
        setState: React.Dispatch<SetStateAction<State>>,
        getProps: () => Props,
        debug: React.MutableRefObject<Debug<Props> | null>
    ) =>
    (...params: any[]) => {
        debug.current = { method: name, time: 0, props: getProps() };
        const result = dispatch(...params);
        const set = (newState: State) => setState((prev) => reduce(newState, prev));
        if (isPromise<State>(result)) {
            return result.then((resolved) => set(resolved));
        }
        return set(result);
    };

export const useReducer = <
    State extends {},
    Reducers extends ReducerActions<State, Props>,
    Props extends object,
    Middlewares extends ReducerMiddleware<State, Props>,
    UseDebug extends boolean
>(
    initialState: State,
    reducer: Reducers,
    options?: Partial<{
        middlewares: Middlewares;
        props: Props;
        debug: UseDebug;
    }>
): UseReducer<State, State, Props, Reducers> => {
    const [state, setState] = useState<State>(() => initialState);
    const mutableState = useMutable(state);
    const mutableProps = useMutable(options?.props ?? ({} as Props));
    const mutableReducer = useMutable(reducer);
    const middleware = useMutable<Middlewares>(options?.middlewares ?? ([] as unknown as Middlewares));
    const savedInitialState = useRef(initialState);
    const previous = usePrevious(state);
    const previousRef = useMutable(previous);
    const debug = useRef<Debug<Props> | null>(null);

    useEffect(() => {
        if (debug.current === null) return;
        const d = debug.current!;
        middleware.current.forEach((middle) => {
            middle(state, previous, d);
        });
    }, [state, middleware, previous]);

    const [dispatchers] = useState<MapReducerReturn<State, ReturnType<Reducers>>>(() => {
        const getProps = () => mutableProps.current;
        const reducers = mutableReducer.current({
            props: getProps,
            state: () => mutableState.current,
            initialState: savedInitialState.current,
            previousState: () => previousRef.current
        });
        return entries<string, any>(reducers as any).reduce(
            (acc, [name, dispatch]: any) => ({
                ...acc,
                [name]: options?.debug
                    ? debugFunc(name, dispatch, setState, getProps, debug)
                    : optimizedFunc(name, dispatch, setState, getProps, debug)
            }),
            {} as MapReducerReturn<State, ReturnType<Reducers>>
        );
    });
    return [state, dispatchers] as const;
};

export const createGlobalReducer = <State extends {}, Reducers extends ReducerActions<State, {}>>(
    initialState: State,
    reducer: Reducers
): (<Selector extends (state: State) => any, Middlewares extends ReducerMiddleware<State, {}>>(
    selector?: Selector,
    comparator?: (a: any, b: any) => boolean,
    middleware?: Middlewares
) => UseReducer<Selector extends (state: State) => State ? State : ReturnType<Selector>, State, {}, Reducers>) & {
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

    const args = {
        initialState,
        props: {} as any,
        state: getSnapshot,
        previousState: getSnapshot
    };

    const dispatchers: MapReducerReturn<State, ReturnType<Reducers>> = entries(reducer(args)).reduce<any>(
        (acc, [name, fn]: any) => ({
            ...acc,
            [name]: (...args: any[]) => {
                const result = fn(...args);
                const set = (newState: State) => setState((prev) => reduce(newState, prev));
                return isPromise<State>(result) ? result.then(set) : set(result);
            }
        }),
        {}
    );

    const defaultSelector = (state: State) => state;

    return Object.assign(
        function useStore<Selector extends (state: State) => any, Middlewares extends ReducerMiddleware<State, {}>>(
            selector?: Selector,
            comparator = shallowCompare,
            middleware?: Middlewares
        ) {
            const state = useSyncExternalStoreWithSelector(
                addListener,
                getSnapshot,
                getSnapshot,
                selector || defaultSelector,
                comparator
            );
            const previous = usePrevious(state);
            useEffect(() => {
                if (!middleware) return;
                middleware.forEach((middle) => {
                    middle(state, previous, { method: "@globalState@", time: -1, props: {} });
                });
            }, [state, previous]);
            return [state, dispatchers] as const;
        },
        { dispatchers }
    );
};

