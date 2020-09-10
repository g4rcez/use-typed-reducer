export type PropState<State> = Partial<Readonly<State>>;

type Act<Actions, State> = {
    [key in keyof Actions]: (...args: any) => (state: State) => Readonly<State>;
};

type Reducer<State, Function extends (...args: any) => (state: Readonly<State>) => State> = (
    ...args: Parameters<Function>
) => (state: State) => Readonly<State>;

export type Dispatch<ST, Reducers extends Act<Reducers, ST>> = {
    [reducer in keyof Reducers]: Reducer<ST, Reducers[reducer]>;
};
