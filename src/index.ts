import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import sync from "use-sync-external-store/with-selector";

type Listener<State> = (state: State, previous: State) => void;

type VoidableFn<Fn extends (...any: any[]) => any> = ReturnType<Fn> extends Promise<any>
    ? (...a: Parameters<Fn>) => Promise<void>
    : (...a: Parameters<Fn>) => void;

type Action<State> = (...args: any) => Promise<(state: State) => State> | ((state: State) => State);

type Actions<Actions, State> = { [key in keyof Actions]: Action<State> };

export type Dispatch<ST, Fns extends Actions<Fns, ST>> = {
    [R in keyof Fns]: (...args: any[]) => Promise<(state: ST) => ST> | ((state: ST) => ST);
};

type MapArray<T, F> = { [K in keyof T]: [K, F] };

type MapReducers<State extends {}, Reducers extends Dispatch<State, Reducers>> = {
    [R in keyof Reducers]: VoidableFn<Reducers[R]>;
};

type ReducerArgs<State extends {}, Props extends object> = {
    state: () => State;
    props: () => Props;
    initialState: State;
};

type FnMap<State> = { [k: string]: (...args: any[]) => Partial<State> | Promise<Partial<State>> };

type MappedReducers<State extends {}, Fns extends FnMap<State>> = {
    [F in keyof Fns]: (...args: Parameters<Fns[F]>) => Promise<Partial<State>> | Partial<State>;
};

type MapReducerReturn<State extends {}, Fns extends FnMap<State>> = { [F in keyof Fns]: VoidableFn<Fns[F]> };

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

const entries = <T extends {}, F>(t: T): MapArray<T[], F> => Object.entries(t) as any;

export const useTypedReducer = <State extends {}, Reducers extends Dispatch<State, Reducers>>(
    initialState: State,
    reducers: Reducers
): [state: State, dispatch: MapReducers<State, Reducers>] => {
    const [state, setState] = useState(initialState);
    const dispatches = useMemo<any>(
        () =>
            entries<Reducers, Action<State>>(reducers).reduce(
                (acc, [name, dispatch]) => ({
                    ...acc,
                    [name]: async (...params: unknown[]) => {
                        const dispatcher = await dispatch(...params);
                        return setState((previousState: State) => dispatcher(previousState));
                    }
                }),
                reducers
            ),
        [reducers]
    );
    return [state, dispatches];
};

export const useMutable = <T extends {}>(state: T): MutableRefObject<T> => {
    const mutable = useRef(state ?? {});
    useEffect(() => void (mutable.current = state), [state]);
    return mutable;
};

export const dispatchCallback = <Prev extends any, T extends Prev | ((prev: Prev) => Prev)>(prev: Prev, setter: T) =>
    typeof setter === "function" ? setter(prev) : setter;

export type DispatchCallback<T extends any> = T | ((prev: T) => T);

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
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: (...params: any[]) => {
                    const result = dispatch(...params);
                    const set = (newState: State) =>
                        setState((prev) => reduceMiddleware(newState, prev, middleware.current, name as any));
                    return result instanceof Promise ? void result.then(set) : set(result);
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
    selector?: Selector
) => UseReducer<Selector extends (state: State) => State ? State : ReturnType<Selector>, State, Props, Reducers>) => {
    let state = { ...initialState };
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
                return result instanceof Promise ? result.then(set) : set(result);
            }
        }),
        {}
    );

    const defaultSelector = (state: State) => state;

    return function useStore(selector) {
        const state = sync.useSyncExternalStoreWithSelector(
            addListener,
            getSnapshot,
            getSnapshot,
            selector || (defaultSelector as any),
            Object.is
        );
        return [state, dispatchers] as const;
    };
};

export default useTypedReducer;
