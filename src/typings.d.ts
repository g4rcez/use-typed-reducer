/**
 * Default CSS definition for typescript,
 * will be overridden with file-specific definitions by rollup
 */

type Keys<State> = Partial<Readonly<State>>;

type OptionalAct<Actions, State> = {
	[key in keyof Actions]: (...args: any) => (state: State) => Keys<State>;
};
type Act<Actions, State> = {
	[key in keyof Actions]: (...args: any) => (state: State) => Readonly<State>;
};

type OptionalReducer<State, Function extends (...args: any) => (state: State) => Keys<State>> = (
	...args: Parameters<Function>
) => (state: State) => Keys<State>;

type Reducer<State, Function extends (...args: any) => (state: State) => State> = (
	...args: Parameters<Function>
) => (state: State) => Readonly<State>;

export type OptionalDispatch<ST, Actions extends OptionalAct<Actions, ST>> = {
	[key in keyof Actions]: OptionalReducer<ST, Actions[key]>;
};

export type Dispatch<ST, Actions extends Act<Actions, ST>> = {
	[key in keyof Actions]: Reducer<ST, Actions[key]>;
};
