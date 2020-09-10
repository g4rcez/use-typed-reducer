import { useMemo, useState } from "react";
import { Dispatch } from "./typings";

export const useReducer: <State, Reducers extends Dispatch<State, Reducers>>(
    state: State,
    reducers: Reducers
) => [State, Dispatch<State, Reducers>] = <State, Reducers>(state: State, reducers: Reducers) => {
    const [localState, setLocalState] = useState(state);
    const dispatches = useMemo(() => {
        return Object.entries(reducers).reduce(
            (acc, [name, dispatch]) => ({
                ...acc,
                [name]: (...params: unknown[]) => setLocalState((st: State) => dispatch(...params)(st))
            }),
            reducers
        );
    }, [reducers]);
    return [localState, dispatches] as never;
};

export default useReducer;
