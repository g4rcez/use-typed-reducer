/**
 * Default CSS definition for typescript,
 * will be overridden with file-specific definitions by rollup
 */

type Act<Actions, State> = {
	[key in keyof Actions]: (...args: any) => (state: State) => Keys<State>;
};

type Reducer<State, Function extends (...args: any) => (state: State) => Keys<State>> = (
	...args: Parameters<Function>
) => (state: State) => Keys<State>;

export type Dispatch<ST, Actions extends Act<Actions, ST>> = {
	[key in keyof Actions]: Reducer<ST, Actions[key]>;
};

type Keys<State> = Partial<Readonly<State>>;
