# use-typed-reducer

Another way to use [useReducer](https://reactjs.org/docs/hooks-reference.html#usereducer) hook, with strongly type rules defined by you

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
            <input onChange={dispatch.onChange} value={state.numbers} />
            <button onClick={dispatch.reset}>Reset</button>
        </>
    )
}
```


### useReducerWithProps

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
      <input onChange={dispatch.onChange} value={state.numbers} />
      <button onClick={dispatch.reset}>Reset</button>
    </Fragment>
  );
};
```

## useReducer

This is the new way to control your state, but with the old way of use-typed-reducer. Now you have a function to getState and a function to get the props. With this you can avoid to take a function that return a function to update state.

```typescript
export const useMath = () => {
  return useReducer({ count: 0 }, (getState) => ({
    sum: (n: number) => ({ count: n + getState().count }),
    diff: (n: number) => ({ count: n - getState().count })
  }));
};
```
