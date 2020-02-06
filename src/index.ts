import { useMemo, useState } from "react";
import { Dispatch, OptionalDispatch } from "./typings";
export { PropState } from "./typings";

const useReducer: (<State, Reducers extends Dispatch<State, Reducers>>(
	state: State,
	reducers: Reducers,
	mergeWithPreviousState: false
) => [State, Dispatch<State, Reducers>]) &
	(<State, Reducers extends OptionalDispatch<State, Reducers>>(
		state: State,
		reducers: Reducers,
		mergeWithPreviousState: true
	) => [State, OptionalDispatch<State, Reducers>]) = <State, Reducers>(
	state: State,
	reducers: Reducers,
	mergeWithPreviousState: boolean = false
) => {
	const [localState, setLocalState] = useState(state);
	const dispatches = useMemo(
		() =>
			Object.entries(reducers).reduce(
				(acc, [name, dispatch]) => ({
					...acc,
					[name]: (...params: unknown[]) => {
						const event = dispatch(...params);
						setLocalState((currentState: State) => {
							if (mergeWithPreviousState) {
								return {
									...currentState,
									...event(...params)
								};
							}
							return event(...params);
						});
					}
				}),
				{}
			),
		[reducers, mergeWithPreviousState]
	);
	return [localState, dispatches] as never;
};

export default useReducer;
