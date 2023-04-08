import { useEffect, useMemo, useRef, useState } from "react";

type Action<State> = (...args: any) => Promise<(state: State) => State> | ((state: State) => State);

type Actions<Actions, State> = { [key in keyof Actions]: Action<State> };

export type Dispatch<ST, Fns extends Actions<Fns, ST>> = {
    [R in keyof Fns]: (...args: any[]) => Promise<(state: ST) => ST> | ((state: ST) => ST);
};

type ActionPropState<S, P> = (...args: any) => Promise<(state: S, props: P) => S> | ((state: S, props: P) => S);

type ActionPropsState<A, S, P> = { [K in keyof A]: ActionPropState<S, P> };

type DispatchProps<ST extends {}, P, Reducers extends ActionPropsState<Reducers, ST, P>> = {
    [K in keyof Reducers]: (...args: any[]) => Promise<(state: ST, props: P) => ST> | ((state: ST, props: P) => ST);
};

type DefaultReducer<S extends {}> = (state: S) => S;

type WithProps<S extends {}, P> = (state: S, props: P) => S;

export type Reducer<S extends {}, A extends (...args: any) => DefaultReducer<S>> = (
    ...params: Parameters<A>
) => DefaultReducer<S>;

export type ReducerWithProps<S extends {}, P extends {}, A extends (...args: any) => WithProps<S, P>> = (
    ...params: Parameters<A>
) => WithProps<S, P>;

type MapArray<T, F> = { [K in keyof T]: [K, F] };

const entries = <T extends {}, F>(t: T): MapArray<T[], F> => Object.entries(t) as any;

export const useTypedReducer = <State extends {}, Reducers extends Dispatch<State, Reducers>>(
    initialState: State,
    reducers: Reducers
): [state: State, dispatch: Reducers] => {
    const [state, setState] = useState(initialState);
    const dispatches = useMemo(() => {
        return entries<Reducers, Action<State>>(reducers).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: async (...params: unknown[]) => {
                    const dispatcher = await dispatch(...params);
                    setState((previousState: State) => dispatcher(previousState));
                }
            }),
            reducers
        );
    }, [reducers]);
    return [state, dispatches];
};

export const useReducerWithProps = <
    State extends {},
    Props extends {},
    Reducers extends DispatchProps<State, Props, Reducers>
>(
    initialState: State,
    props: Props,
    reducers: Reducers
): [state: State, dispatch: Reducers] => {
    const [state, setState] = useState(initialState);
    const refProps = useRef<Props>(props);

    useEffect(() => {
        refProps.current = props;
    }, [props]);

    const dispatches = useMemo(() => {
        return entries<Reducers, ActionPropState<State, Props>>(reducers).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: async (...params: unknown[]) => {
                    const dispatcher = await dispatch(...params);
                    setState((previousState: State) => dispatcher(previousState, refProps.current));
                }
            }),
            reducers
        );
    }, [reducers]);

    return [state, dispatches];
};

type FnMap<State> = { [k: string]: (...args: any[]) => Partial<State> | Promise<Partial<State>> };

type MappedReducers<State extends {}, Fns extends FnMap<State>> = {
    [F in keyof Fns]: (...args: Parameters<Fns[F]>) => State | Promise<State>;
};

const useMutable = <T extends {}>(state: T) => {
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
): [state: State, dispatchers: MappedReducers<State, ReturnType<Reducers>>] => {
    const [state, setState] = useState<State>(() => initialState);
    const mutableState = useMutable(state);
    const mutableProps = useMutable(props ?? {});

    const dispatchers = useMemo(() => {
        const reducers = reducer(
            () => mutableState.current,
            () => (mutableProps.current as Props) ?? ({} as Props)
        );
        return entries<string, Function>(reducers as any).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: async (...params: unknown[]) => {
                    const newState = await dispatch(...params);
                    setState((previousState: State) => ({ ...previousState, ...newState }));
                }
            }),
            reducers
        );
    }, []);
    return [state, dispatchers as any];
};

export default useTypedReducer;
