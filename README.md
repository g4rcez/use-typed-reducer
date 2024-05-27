# use-typed-reducer

Another way to use [useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer) hook, with strongly type rules
defined by you.

**Now you can control your local state or global state using the same API**. Check
the [createGlobalReducer](#createglobalreducer) for global state.

<!-- TOC -->

* [use-typed-reducer](#use-typed-reducer)
* [Install](#install)
* [Why use *use-typed-reducer*](#why-use-use-typed-reducer)
* [Using](#using)
    * [useReducer (default import) or `useTypedReducer`](#usereducer-default-import-or-usetypedreducer)
    * [useReducerWithProps](#usereducerwithprops)
* [useReducer](#usereducer)
* [createGlobalReducer](#createglobalreducer)
* [Middlewares](#middlewares)
* [Tips and Tricks](#tips-and-tricks)
    * [Save at LocalStorage](#save-at-localstorage)
    * [State logger](#state-logger)

<!-- TOC -->

# Install

With npm:

```bash
npm install use-typed-reducer
```

With yarn:

```bash
yarn add use-typed-reducer
```

# Why use *use-typed-reducer*

The original useReducer forces you to use the well-known redux pattern. We need to pass the parameters in an object and
a mandatory "type" to identify the action being performed.

With useTypedReducer, you can use your function the way you prefer, it will infer the parameters and return a new
function with the current state so that you can make the changes you want to the new state

# Using

## useReducer (default import) or `useTypedReducer`

`useTypedReducer` receive the initialState and dictionary/object with all reducers and return tuple with state and
dispatch. Dispatch has the same key and functions of given dictionary in `useTypedReducer`, but return a new function to
update state. This void `dispatch({ type: "ACTION" })`

```tsx
import { useTypedReducer, UseReducer } from "./index";

const initialState = {
    numbers: 0,
    something: ""
}

type State = typeof initialState;

type Reducers = {
    reset: UseReducer.Reducer<State, () => any>;
    onChange: UseReducer.Reducer<State, (e: React.ChangeEvent<HTMLInputElement>) => any>;
    increment: UseReducer.Reducer<State, () => any>;
};

const reducers: Reducers = {
    increment: () => (state) => ({ ...state, numbers: state.numbers + 1 }),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.valueAsNumber
        return (state) => ({ ...state, numbers: value })
    },
    reset: () => (state) => ({ ...state, numbers: 0 })
};


const Component = () => {
    const [state, dispatch] = useTypedReducer(initialState, reducers)

    return (
        <>
            <button onClick={dispatch.increment}>+Increment</button>
            <input onChange={dispatch.onChange} value={state.numbers}/>
            <button onClick={dispatch.reset}>Reset</button>
        </>
    )
}
```

## useReducerWithProps

The same of useTypedReducer, but receive a `getProps` as second argument in the second function.

```typescript jsx
import { useReducerWithProps, UseReducer } from "./index";

const initialState = { numbers: 0, something: "" };

type State = typeof initialState;

type Reducers = {
    reset: UseReducer.Reducer<State, () => any>;
    onChange: UseReducer.Reducer<State, (e: React.ChangeEvent<HTMLInputElement>) => any>;
    increment: UseReducer.Reducer<State, () => any>;
};

type Props = {
    list: number[];
}

const reducers: Reducers = {
    increment: () => (state) => ({ ...state, numbers: state.numbers + 1 }),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.valueAsNumber;
        return (state, props) => {
            const find = props.list.find(x => x === value);
            return find === undefined ? ({ ...state, numbers: value }) : ({ ...state, numbers: find * 2 });
        };
    },
    reset: () => (state) => ({ ...state, numbers: 0 })
};


const Component = (props: Props) => {
    const [state, dispatch] = useReducerWithProps(initialState, props, reducers);

    return (
        <Fragment>
            <button onClick={dispatch.increment}>+Increment</button>
            <input onChange={dispatch.onChange} value={state.numbers}/>
            <button onClick={dispatch.reset}>Reset</button>
        </Fragment>
    );
};
```

# useReducer

This is the new way to control your state, but with the old way of use-typed-reducer. Now you have a function to
getState and a function to get the props. With this you can avoid to take a function that return a function to update
state.

```typescript
export const useMath = () => {
    return useReducer({ count: 0 }, (getState) => ({
        sum: (n: number) => ({ count: n + getState().count }),
        diff: (n: number) => ({ count: n - getState().count })
    }));
};
```

# createGlobalReducer

If you need a way to create a global state, you can use this function. This enables you to create a global state without
a Context provider. The API is the same API of `useReducer`, but returns a hook to use the global context.

```typescript jsx
const useStore = createGlobalReducer({ count: 0 }, (arg) => ({
    increment: () => ({ count: arg.state().count + 1 }),
    decrement: () => ({ count: arg.state().count - 1 }),
}));

export default function App() {
    const [state, dispatch] = useStore();
    return (
        <div>
            <button onClick={dispatch.increment}>Increment</button>
            <button onClick={dispatch.decrement}>Decrement</button>
            <p>{state.count}</p>
        </div>
    );
}
```

You can pass a selector to `useStore` to get only the part of state that you need. This will optimize your components
render, doing the re-render only when the selector get a different value from the previous state.

```typescript jsx
const useStore = createGlobalReducer({ count: 0 }, (arg) => ({
    increment: () => ({ count: arg.state().count + 1 }),
    decrement: () => ({ count: arg.state().count - 1 }),
}));

export default function App() {
    const [count] = useStore(state => state.count);
    return (
        <div>
            <button onClick={dispatch.increment}>Increment</button>
            <button onClick={dispatch.decrement}>Decrement</button>
            <p>{count}</p>
        </div>
    );
}
```

# Middlewares

There are two types of middleware in use-typed-reducer

- `interceptors`: that can mutate the state and executes immediately after your function
- `postMiddleware`: execute after useTypedReducer updates the state, like a `useEffect(fn, [state])`

## Using interceptors

```typescript
type State = { filter: string; };
const [state, dispatch] = useReducer({ filter: "" }, () => {
    setFilter: (f: string) => ({ filter: f });
}, {
    interceptors: [
        (state: State, prev: State) => {
            console.log(prev, state);
            return state;
        },
    ],
});
```

## Why use interceptors?

Interceptors are great when you need to execute functions that use previous and current state in the same shoot. You can
use interceptors to create a history of your state. Saving the previous state plus your current state, making a timeline
of user actions.

## Using postMiddleware

While interceptors are good to execute actions during the state update, postMiddleware are great to update your state
after the
dispatch of newer state. This is useful to update other states from your middleware.

## Why interceptors and postMiddleware are necessary?

If you try to update external states using `interceptors`, maybe you will have a React warning about update state from
an useState. Because of this you will need to move your update logic from `interceptors` to `postMiddleware`, that acts
like useEffect

# Tips and Tricks

You need to store your state at LocalStorage? Do you need a logger for each change in state? Okay, let's go

## Save at LocalStorage

````typescript
import * as React from "react";
import { useReducer } from "use-typed-reducer"

const App = () => {
    const [state, dispatch] = useReducer(
        { name: "", topics: [] as string [] },
        (get) => ({
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                const name = e.target.name;
                return { ...get.state(), [name]: value }
            }
        }),
        undefined, // no props used,
        // this is your middleware to store state at localStorage
        [
            (state) => {
                localStorage.setItem("myState", state);
                return state;
            }
        ]
    );
}
````

## State logger

Maybe you miss the `redux-logger` behaviour. I you help you to recovery this behaviour using use-typed-reducer

````typescript
import * as React from "react";
import { useReducer } from "use-typed-reducer"

const App = () => {
    const [state, dispatch] = useReducer(
        { name: "", topics: [] as string [] },
        (get) => ({
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                const name = e.target.name;
                return { ...get.state(), [name]: value }
            }
        }),
        undefined, // no props used,
        // this is your middleware to log your state
        [
            (state, key, previousState) => {
                console.group("My State");
                // the method that updated your state
                console.info("Update by", method);
                console.info("Previous state", prev);
                console.info(state);
                console.groupEnd();
                return state;
            }
        ]
    );
}
````
