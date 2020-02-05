import { useState, useMemo } from "react";
import { Dispatch } from "./typings";

export type Keys<State> = Partial<Readonly<State>>;

const useReducer = <State, Reducers extends Dispatch<State, Reducers>>(initialState: State, reducers: Reducers) => {
	const [state, setState] = useState(initialState);
	const dispatches = useMemo(
		() =>
			Object.entries(reducers).reduce(
				(acc, [name, dispatch]: [string, any]) => ({
					...acc,
					[name]: (...params: any) => {
						const event = dispatch(...params);
						setState((currentState: State) => ({
							...currentState,
							...event(...params)
						}));
					}
				}),
				{} as Dispatch<State, Reducers>
			),
		[reducers]
	);
	return [state, dispatches] as [State, Dispatch<State, Reducers>];
};

export default useReducer;
