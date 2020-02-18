import { useMemo, useState } from "react";

export type PropState<State> = Partial<Readonly<State>>;

type OptionalAct<Actions, State> = {
	[key in keyof Actions]: (...args: any) => (state: State) => PropState<State>;
};
type Act<Actions, State> = {
	[key in keyof Actions]: (...args: any) => (state: State) => Readonly<State>;
};

type OptionalReducer<State, Function extends (...args: any) => (state: State) => PropState<State>> = (
	...args: Parameters<Function>
) => (state: State) => PropState<State>;

type Reducer<State, Function extends (...args: any) => (state: State) => State> = (
	...args: Parameters<Function>
) => (state: State) => Readonly<State>;

export type OptionalDispatch<ST, Actions extends OptionalAct<Actions, ST>> = {
	[key in keyof Actions]: OptionalReducer<ST, Actions[key]>;
};

export type Dispatch<ST, Actions extends Act<Actions, ST>> = {
	[key in keyof Actions]: Reducer<ST, Actions[key]>;
};

const useReducer: (<State, Reducers extends Dispatch<State, Reducers>>(
	state: State,
	reducers: Reducers,
	mergeWithPreviousState?: false
) => [State, Dispatch<State, Reducers>]) &
	(<State, Reducers extends OptionalDispatch<State, Reducers>>(
		state: State,
		reducers: Reducers,
		mergeWithPreviousState?: true
	) => [State, OptionalDispatch<State, Reducers>]) = <State, Reducers>(
	state: State,
	reducers: Reducers,
	mergeWithPreviousState: boolean = false
) => {
	const [localState, setLocalState] = useState(state);
	const dispatches = useMemo(() => {
		return Object.entries(reducers).reduce(
			(acc, [name, dispatch]) => ({
				...acc,
				[name]: (...params: unknown[]) => {
					const event = dispatch(...params);
					setLocalState((currentState: State) => {
						if (mergeWithPreviousState) {
							return {
								...currentState,
								...event(currentState)
							};
						}
						return event(currentState);
					});
				}
			}),
			{}
		);
	}, [reducers, mergeWithPreviousState]);
	return [localState, dispatches] as never;
};

export default useReducer;
