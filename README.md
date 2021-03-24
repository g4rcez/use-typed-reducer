# use-typed-reducer

Another way to use [useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer) hook

## Install

With npm:
```bash
npm install use-typed-reducer
```

With yarn:
```bash
yarn add use-typed-reducer
```

## Why use *use-typed-reducer*

The original useReducer forces you to use the well-known redux pattern. We need to pass the parameters in an object and a mandatory "type" to identify the action being performed.

With useTypedReducer, you can use your function the way you prefer, it will infer the parameters and return a new function with the current state so that you can make the changes you want to the new state

## Using

### useReducer (default import) or `useTypedReducer`


`useTypedReducer` receive the initialState and dictionary/object with all reducers and return tuple with state and dispatch. Dispatch has the same key and functions of given dictionary in `useTypedReducer`, but return a new function to update state. This void `dispatch({ type: "ACTION" })`

```tsx
import { useTypedReducer, UseReducer } from "use-typed-reducer";

const initialState = {
    numbers: 0,
    something: ""
}

type State = typeof initialState;

type Reducers = {
    reset: UseReducer.Reducer<State, (n: number) => any>;
};

const reducers: Reducers = {
    increment: () => (state) => ({ ...state, numbers: n + 1 }),
    onChange: (e: React.ChangeEvent<HtmlInputElement>) => {
        const value = e.target.valueAsNumber
        return (state) => ({ ...state, numbers: e })
    },
    reset: () => () => ({ ...state, numbers: 0 })
};


const Component = () => {
    const [state, dispatch] = useTypedReducer(initialState, reducers)

    return (
        <>
            <button onClick={dispatch.increment}>+Increment</button>
            <input onChange={dispatch.onChange} value={state.numbers} />
            <button onClick={dispatch.reset}>Reset</button>
        </input>
    )
}
```
