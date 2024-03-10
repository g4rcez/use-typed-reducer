export type Listener<State> = (state: State, previous: State) => void;

export type PromiseBox<T> = T | Promise<T>;

export type VoidFn<Fn extends (...any: any[]) => any> = ReturnType<Fn> extends Promise<any>
    ? (...a: Parameters<Fn>) => Promise<void>
    : (...a: Parameters<Fn>) => void;

export type Action<State, Props> = (...args: any) => PromiseBox<(state: State, Props: Props) => State>;

export type Dispatch<State, Props extends {}, Fns extends { [key in keyof Fns]: Action<State, Props> }> = {
    [R in keyof Fns]: (...args: any[]) => PromiseBox<(state: State, Props: Props) => State>;
};

export type MapReducers<State extends {}, Props extends {}, Reducers extends Dispatch<State, Props, Reducers>> = {
    [R in keyof Reducers]: VoidFn<Reducers[R]>;
};

export type ReducerArgs<State extends {}, Props extends object> = {
    state: () => State;
    props: () => Props;
    initialState: State;
    previousState: () => State;
};

export type FnMap<State> = {
    [k: string]: (...args: any[]) => PromiseBox<Partial<State>>;
};

export type MappedReducers<State extends {}, Fns extends FnMap<State>> = {
    [F in keyof Fns]: (...args: Parameters<Fns[F]>) => PromiseBox<Partial<State>>;
};

export type MapReducerReturn<State extends {}, Fns extends FnMap<State>> = {
    [F in keyof Fns]: VoidFn<Fns[F]>;
};

export type ReducerActions<State extends object, Props extends object> = (
    args: ReducerArgs<State, Props>
) => MappedReducers<State, FnMap<State>>;

export type UseReducer<
    Selector,
    State extends {},
    Props extends {},
    Reducers extends ReducerActions<State, Props>
> = readonly [state: Selector, dispatchers: MapReducerReturn<State, ReturnType<Reducers>>];

export type ReducerMiddleware<State extends object, Props extends object> = Array<
    (state: State, prev: State, debug: Debug<Props>) => State
>;

export type Callback<T> = T | ((prev: T) => T);

export type Debug<Props extends object = {}> = {
    method: string;
    time: number;
    props: Props;
};

