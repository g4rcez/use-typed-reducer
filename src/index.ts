import { useMemo, useState } from "react";
import { Dispatch } from "./typings";

export const useReducer: <State, Reducers extends Dispatch<State, Reducers>>(
    state: State,
    reducers: Reducers,
    middlewares: ((state: State) => State)[]
) => [State, Dispatch<State, Reducers>] = <State, Reducers>(
    state: State,
    reducers: Reducers,
    middlewares: ((state: State) => State)[] = []
) => {
    const [localState, setLocalState] = useState(state);
    const dispatches = useMemo(() => {
        return Object.entries(reducers).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: (...params: unknown[]) =>
                    setLocalState((st: State) => {
                        const newSt = dispatch(...params)(st);
                        return middlewares.reduce((acc, el) => el(acc), newSt);
                    })
            }),
            reducers
        );
    }, [reducers, middlewares]);
    return [localState, dispatches] as never;
};

export default useReducer;
