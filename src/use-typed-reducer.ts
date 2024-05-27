import React, { SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import { useMutable, usePrevious } from "./hooks";
import { entries, isPromise, shallowCompare } from "./lib";
import {
    Action,
    Debug,
    Dispatch,
    Listener,
    MapReducerReturn,
    MapReducers,
    ReducerActions,
    ReducerMiddleware,
    UseReducer
} from "./types";

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

const reduce = <State extends {}, Props extends {}>(
    state: State,
    prev: State,
    mutations: Mutators<State, Props>,
    debug: Debug<Props>
) => {
    if (prev === state) return mutations.reduce((acc, el) => el(acc, prev, debug), state);
    return state.constructor.name === Object.name
        ? mutations.reduce((acc, el) => el(acc, prev, debug), { ...prev, ...state })
        : mutations.reduce((acc, el) => el(acc, prev, debug), state);
};

const debugFunc =
    <State extends {}, Props extends object>(
        name: string,
        dispatch: (...args: any[]) => any,
        setState: React.Dispatch<SetStateAction<State>>,
        getProps: () => Props,
        debug: React.MutableRefObject<Debug<Props> | null>,
        mutations: Mutators<State, Props>
    ) =>
    (...params: any[]) => {
        const now = performance.now();
        const result = dispatch(...params);
        const set = (newState: State, debug: Debug<Props>) =>
            setState((prev) => reduce(newState, prev, mutations, debug));
        if (isPromise<State>(result)) {
            return result.then((resolved) => {
                debug.current = {
                    method: name,
                    props: getProps(),
                    time: performance.now() - now
                };
                set(resolved, debug.current);
            });
        }
        debug.current = {
            method: name,
            props: getProps(),
            time: performance.now() - now
        };
        return void set(result, debug.current);
    };

type Mutators<State extends {}, Props extends {}> = Array<(state: State, prev: State, debug: Debug<Props>) => State>;

const optimizedFunc =
    <State extends {}, Props extends object>(
        name: string,
        dispatch: (...args: any[]) => any,
        setState: React.Dispatch<SetStateAction<State>>,
        getProps: () => Props,
        debug: React.MutableRefObject<Debug<Props> | null>,
        mutations: Mutators<State, Props>
    ) =>
    (...params: any[]) => {
        debug.current = { method: name, time: 0, props: getProps() };
        const result = dispatch(...params);
        const set = (newState: State) => setState((prev) => reduce(newState, prev, mutations, debug.current!));
        if (isPromise<State>(result)) {
            return result.then((resolved) => set(resolved));
        }
        return set(result);
    };

type Options<PostMiddleware, Props, Debug, Selector, Interceptor> = Partial<{
    props: Props;
    debug: Debug;
    selector: Selector;
    interceptor: Interceptor;
    postMiddleware: PostMiddleware;
}>;

export const useReducer = <
    State extends {},
    Reducers extends ReducerActions<State, Props>,
    Props extends object,
    Middlewares extends ReducerMiddleware<State, Props>,
    Mutations extends Mutators<State, Props>,
    UseDebug extends boolean
>(
    initialState: State,
    reducer: Reducers,
    options?: Options<Middlewares, Props, UseDebug, undefined, Mutations>
): UseReducer<State, State, Props, Reducers> => {
    const [state, setState] = useState<State>(() => initialState);
    const mutableState = useMutable(state);
    const mutableProps = useMutable(options?.props ?? ({} as Props));
    const mutableReducer = useMutable(reducer);
    const middleware = useMutable<Middlewares>(options?.postMiddleware ?? ([] as unknown as Middlewares));
    const mutations = useMutable<Mutations>(options?.interceptor ?? ([] as unknown as Mutations));
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
                    ? debugFunc(name, dispatch, setState, getProps, debug, mutations.current)
                    : optimizedFunc(name, dispatch, setState, getProps, debug, mutations.current)
            }),
            {} as MapReducerReturn<State, ReturnType<Reducers>>
        );
    });
    return [state, dispatchers, mutableProps.current] as const;
};

export const createGlobalReducer = <
    State extends {},
    Reducers extends ReducerActions<State, {}>,
    Mutations extends Mutators<State, {}>
>(
    initialState: State,
    reducer: Reducers,
    rootOptions?: Pick<Options<[], {}, {}, () => State, Mutations>, "interceptor">
): (<Selector extends (state: State) => any, Middlewares extends ReducerMiddleware<ReturnType<Selector>, {}>>(
    selector?: Selector,
    comparator?: (a: any, b: any) => boolean,
    options?: Options<Middlewares, {}, {}, Selector, []>
) => UseReducer<Selector extends (state: State) => State ? State : ReturnType<Selector>, State, {}, Reducers>) & {
    dispatchers: MapReducerReturn<State, ReturnType<Reducers>>;
} => {
    let state = initialState;
    const rootMutations = rootOptions?.interceptor ?? [];
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

    const debugOptions = { initialState, props: {} as any, state: getSnapshot, previousState: getSnapshot };

    const defaultSelector = (state: State) => state;

    const dispatchers: MapReducerReturn<State, ReturnType<Reducers>> = entries(reducer(debugOptions)).reduce<any>(
        (acc, [method, fn]: any) => ({
            ...acc,
            [method]: (...args: any[]) => {
                const result = fn(...args);
                const set = (newState: State) =>
                    setState((prev) =>
                        reduce(newState, prev, rootMutations, {
                            method,
                            props: {},
                            selector: defaultSelector,
                            time: 0
                        })
                    );
                return isPromise<State>(result) ? result.then(set) : set(result);
            }
        }),
        {}
    );

    return Object.assign(
        function useStore<
            Selector extends (state: State) => any,
            O extends Omit<Options<ReducerMiddleware<ReturnType<Selector>, {}>, {}, {}, Selector, []>, "mutations">
        >(selector?: Selector, comparator = shallowCompare, options?: O) {
            const middleware = useMutable(options?.postMiddleware ?? []);
            const state = useSyncExternalStoreWithSelector(
                addListener,
                getSnapshot,
                getSnapshot,
                selector || defaultSelector,
                comparator
            );
            const previous = usePrevious(state);
            useEffect(() => {
                if (Array.isArray(middleware.current))
                    middleware.current.forEach((middle) => {
                        middle(state, previous, { method: "@globalState@", time: -1, props: {}, selector });
                    });
            }, [state, previous, middleware]);
            return [state, dispatchers, {}] as const;
        },
        { dispatchers }
    );
};
