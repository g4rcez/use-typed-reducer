import { useEffect, useMemo, useRef, useState } from "react";

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
    [F in keyof Fns]: (
        ...args: Parameters<Fns[F]>
    ) => State | Promise<State> | Partial<State> | Promise<Partial<State>>;
};

type MapReducerReturn<State extends {}, Fns extends FnMap<State>> = { [F in keyof Fns]: VoidableFn<Fns[F]> };

export const useMutable = <T extends {}>(state: T) => {
    const mutable = useRef(state ?? {});
    useEffect(() => void (mutable.current = state), [state]);
    return mutable;
};

export const useReducer = <
    State extends {},
    Reducers extends (getState: () => State, getProps: () => Props) => MappedReducers<State, FnMap<State>>,
    Props extends {}
>(
    initialState: State,
    reducer: Reducers,
    props?: Props
): [state: State, dispatchers: MapReducerReturn<State, ReturnType<Reducers>>] => {
    const [state, setState] = useState<State>(() => initialState);
    const mutableState = useMutable(state);
    const mutableProps = useMutable(props ?? {});
    const mutableReducer = useMutable(reducer);

    const dispatchers = useMemo(() => {
        const reducers = mutableReducer.current(
            () => mutableState.current,
            () => (mutableProps.current as Props) ?? ({} as Props)
        );
        return entries<string, Function>(reducers as any).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: (...params: unknown[]) => {
                    const newState = dispatch(...params);
                    return newState instanceof Promise
                        ? void newState.then((state) => void setState((prev) => ({ ...prev, ...state })))
                        : setState((prev) => ({ ...prev, ...newState }));
                }
            }),
            reducers
        );
    }, []);

    return [state, dispatchers as any];
};

export default useTypedReducer;
