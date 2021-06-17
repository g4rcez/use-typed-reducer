import { useEffect, useMemo, useRef, useState } from "react";

type Action<State> = (...args: any) => Promise<(state: State) => State> | ((state: State) => State);

type Actions<Actions, State> = {
    [key in keyof Actions]: Action<State>;
};

export type Dispatch<ST, Fns extends Actions<Fns, ST>> = {
    [R in keyof Fns]: (...args: unknown[]) => Promise<(state: ST) => ST> | ((state: ST) => ST);
};

type ActionPropState<S, P> = (
    ...args: any
) => Promise<(state: S, getProps: () => P) => S> | ((state: S, getProps: () => P) => S);

type ActionPropsState<A, S, P> = {
    [K in keyof A]: ActionPropState<S, P>;
};

type DispatchProps<ST extends object, P, Reducers extends ActionPropsState<Reducers, ST, P>> = {
    [K in keyof Reducers]: (
        ...args: unknown[]
    ) => Promise<(state: ST, getProps: () => P) => ST> | ((state: ST, getProps: () => P) => ST);
};

type DefaultReducer<S extends object> = (state: S) => S;

type WithProps<S extends object, P> = (state: S, getProps: () => P) => S;

export type Reducer<S extends object, A extends (...args: any) => DefaultReducer<S>> = (
    ...params: Parameters<A>
) => DefaultReducer<S>;

export type WithPropsReducer<S extends object, P extends object, A extends (...args: any) => WithProps<S, P>> = (
    ...params: Parameters<A>
) => WithProps<S, P>;

type MapArray<T, F> = {
    [k in keyof T]: [k, F];
};

const entries = <T, F>(t: T): MapArray<T[], F> => Object.entries(t) as never;

export const useTypedReducer = <State extends object, Reducers extends Dispatch<State, Reducers>>(
    initialState: State,
    reducers: Reducers
): [state: State, dispatch: Reducers] => {
    const [state, setState] = useState(initialState);
    const dispatches = useMemo(() => {
        return entries<Reducers, Action<State>>(reducers).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: async (...params: unknown[]) => {
                    const result = await dispatch(...params);
                    setState((st: State) => result(st));
                }
            }),
            reducers
        );
    }, [reducers]);
    return [state, dispatches];
};

export const useReducerWithProps = <
    State extends object,
    Props extends object,
    Reducers extends DispatchProps<State, Props, Reducers>
>(
    initialState: State,
    props: Props,
    reducers: Reducers
): [state: State, dispatch: Reducers] => {
    const [state, setState] = useState(initialState);
    const getProps = useRef<() => Props>(() => props);
    useEffect(() => {
        getProps.current = () => props;
    }, [props]);
    const dispatches = useMemo(() => {
        return entries<Reducers, ActionPropState<State, Props>>(reducers).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: async (...params: unknown[]) => {
                    const result = await dispatch(...params);
                    setState((st: State) => result(st, getProps.current));
                }
            }),
            reducers
        );
    }, [reducers]);
    return [state, dispatches];
};

export default useTypedReducer;
