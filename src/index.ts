import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";

type VoidableFn<Fn extends (...any: any[]) => any> = ReturnType<Fn> extends Promise<any>
    ? (...a: Parameters<Fn>) => Promise<void>
    : (...a: Parameters<Fn>) => void;

type Action<State> = (...args: any) => Promise<(state: State) => State> | ((state: State) => State);

type Actions<Actions, State> = { [key in keyof Actions]: Action<State> };

export type Dispatch<ST, Fns extends Actions<Fns, ST>> = {
    [R in keyof Fns]: (...args: any[]) => Promise<(state: ST) => ST> | ((state: ST) => ST);
};

type MapArray<T, F> = { [K in keyof T]: [K, F] };

type RemoveReduceReturns<State extends {}, Reducers extends Dispatch<State, Reducers>> = {
    [R in keyof Reducers]: VoidableFn<Reducers[R]>;
};

const entries = <T extends {}, F>(t: T): MapArray<T[], F> => Object.entries(t) as any;

export const useTypedReducer = <State extends {}, Reducers extends Dispatch<State, Reducers>>(
    initialState: State,
    reducers: Reducers
): [state: State, dispatch: RemoveReduceReturns<State, Reducers>] => {
    const [state, setState] = useState(initialState);
    const dispatches = useMemo<any>(
        () =>
            entries<Reducers, Action<State>>(reducers).reduce(
                (acc, [name, dispatch]) => ({
                    ...acc,
                    [name]: async (...params: unknown[]) => {
                        const dispatcher = await dispatch(...params);
                        setState((previousState: State) => dispatcher(previousState));
                    }
                }),
                reducers
            ),
        [reducers]
    );
    return [state, dispatches];
};

type FnMap<State> = { [k: string]: (...args: any[]) => Partial<State> | Promise<Partial<State>> };

type MappedReducers<State extends {}, Fns extends FnMap<State>> = {
    [F in keyof Fns]: (...args: Parameters<Fns[F]>) => Promise<Partial<State>> | Partial<State>;
};

type MapReducerReturn<State extends {}, Fns extends FnMap<State>> = { [F in keyof Fns]: VoidableFn<Fns[F]> };

export const useMutable = <T extends {}>(state: T): MutableRefObject<T> => {
    const mutable = useRef(state ?? {});
    useEffect(() => void (mutable.current = state), [state]);
    return mutable;
};

export const dispatchCallback = <Prev extends any, T extends Prev | ((prev: Prev) => Prev)>(prev: Prev, setter: T) =>
    typeof setter === "function" ? setter(prev) : setter;

export type DispatchCallback<T extends any> = T | ((prev: T) => T);

export const useReducer = <
    State extends {},
    Reducers extends (
        getState: () => State,
        getProps: () => Props,
        initialState: State
    ) => MappedReducers<State, FnMap<State>>,
    Props extends {},
    Middlewares extends Array<(state: State, key: keyof ReturnType<Reducers>) => State>
>(
    initialState: State,
    reducer: Reducers,
    props?: Props,
    middlewares?: Middlewares
): Readonly<[state: State, dispatchers: MapReducerReturn<State, ReturnType<Reducers>>]> => {
    const [state, setState] = useState<State>(() => initialState);
    const mutableState = useMutable(state);
    const mutableProps = useMutable(props ?? {});
    const mutableReducer = useMutable(reducer);
    const middleware = useMutable<Middlewares>(middlewares ?? ([] as unknown as Middlewares));
    const savedInitialState = useRef(initialState);

    const dispatchers = useMemo<MapReducerReturn<State, ReturnType<Reducers>>>(() => {
        const reducers = mutableReducer.current(
            () => mutableState.current,
            () => (mutableProps.current as Props) ?? ({} as Props),
            savedInitialState.current
        );

        return entries<string, any>(reducers as any).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: (...params: unknown[]): Promise<void> | void => {
                    const st = dispatch(...params);
                    return st instanceof Promise
                        ? void st.then((state) =>
                              setState((prev) =>
                                  middleware.current.reduce<State>((acc, fn) => fn(acc, name), { ...prev, state })
                              )
                          )
                        : setState((prev) =>
                              middleware.current.reduce<State>((acc, fn) => fn(acc, name), { ...prev, ...st })
                          );
                }
            }),
            {} as MapReducerReturn<State, ReturnType<Reducers>>
        );
    }, [mutableProps, mutableReducer, mutableState]);
    return [state, dispatchers] as const;
};

export const createReducer =
    <State extends {} = {}, Props extends {} = {}>() =>
    <
        Reducer extends (
            getState: () => State,
            getProps: () => Props,
            initialState: State
        ) => MappedReducers<State, FnMap<State>>
    >(
        reducer: Reducer
    ) =>
        reducer;

export default useTypedReducer;
