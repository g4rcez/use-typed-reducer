import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import { shallowCompare } from "./shallow-compare";

type Listener<State> = (state: State, previous: State) => void;

type PromiseBox<T> = T | Promise<T>;

type VoidFn<Fn extends (...any: any[]) => any> = ReturnType<Fn> extends Promise<any>
    ? (...a: Parameters<Fn>) => Promise<void>
    : (...a: Parameters<Fn>) => void;

type Action<State, Props> = (...args: any) => PromiseBox<(state: State, Props: Props) => State>;

export type Dispatch<State, Props extends {}, Fns extends { [key in keyof Fns]: Action<State, Props> }> = {
    [R in keyof Fns]: (...args: any[]) => PromiseBox<(state: State, Props: Props) => State>;
};

type MapArray<T, F> = { [K in keyof T]: [K, F] };

type MapReducers<State extends {}, Props extends {}, Reducers extends Dispatch<State, Props, Reducers>> = {
    [R in keyof Reducers]: VoidFn<Reducers[R]>;
};

type ReducerArgs<State extends {}, Props extends object> = {
    state: () => State;
    props: () => Props;
    initialState: State;
};

type FnMap<State> = { [k: string]: (...args: any[]) => PromiseBox<Partial<State>> };

type MappedReducers<State extends {}, Fns extends FnMap<State>> = {
    [F in keyof Fns]: (...args: Parameters<Fns[F]>) => PromiseBox<Partial<State>>;
};

type MapReducerReturn<State extends {}, Fns extends FnMap<State>> = { [F in keyof Fns]: VoidFn<Fns[F]> };

type UseReducerReduce<State extends object, Props extends object> = (
    args: ReducerArgs<State, Props>
) => MappedReducers<State, FnMap<State>>;

type UseReducer<
    Selector,
    State extends {},
    Props extends {},
    Reducers extends UseReducerReduce<State, Props>
> = readonly [state: Selector, dispatchers: MapReducerReturn<State, ReturnType<Reducers>>];

type ReducerMiddleware<
    State extends object,
    Props extends object,
    Reducers extends (args: ReducerArgs<State, Props>) => MappedReducers<State, FnMap<State>>
> = Array<(state: State, key: keyof ReturnType<Reducers>) => State>;

type Callback<T> = T | ((prev: T) => T);

const entries = <T extends {}, F>(t: T): MapArray<T[], F> => Object.entries(t) as any;

const isPromise = <T>(promise: any): promise is Promise<T> => promise instanceof Promise;

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

export type DispatchCallback<T extends any> = Callback<T>;

const reduceMiddleware = <State extends {}, Middlewares extends Array<(state: State, key: string) => State>>(
    state: State,
    prev: State,
    middleware: Middlewares,
    key: string
) => middleware.reduce<State>((acc, fn) => fn(acc, key), { ...prev, ...state });

export const useReducer = <
    State extends {},
    Reducers extends UseReducerReduce<State, Props>,
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
                        setState((prev) => reduceMiddleware(newState, prev, middleware.current, name));
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
    Reducers extends UseReducerReduce<State, Props>,
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
                const set = (newState: State) =>
                    setState((prev) => reduceMiddleware(newState, prev, middlewareList, name));
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

export default useTypedReducer;
