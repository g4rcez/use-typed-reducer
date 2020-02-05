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

```tsx
import React, { Fragment } from "react";
import useReducer, { Keys } from "use-typed-reducer";

type State = Keys<{
  name: string;
  age: number;
  points: number;
  isApproved: boolean;
}>;

const initialState: State = {
  name: "",
  age: 0,
  points: 0,
  isApproved: false
};

const reducer = {
  onChangeName: (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    return (): State => ({ name: value });
  },
  onChangeNumber: (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    return (): Partial<State> => ({
      [name as "age" | "points"]: Number.parseFloat(value)
    });
  },
  onChangeCheckbox: (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    return (): Partial<State> => ({ isApproved: checked });
  }
};

const App = () => {
  // if the third argument is true, the previous state will be merged
  // with the new state. Otherwise, you may return the entire state
  const [state, actions] = useReducer(initialState, reducer, true);
  return (
    <Fragment>
      <input name="name" onChange={actions.onChangeName} value={state.name} />
      <input
        type="number"
        name="age"
        onChange={actions.onChangeNumber}
        value={state.age}
      />
      <input
        type="number"
        name="points"
        onChange={actions.onChangeNumber}
        value={state.points}
      />
      <input
        type="checkbox"
        name="isApproved"
        onChange={actions.onChangeCheckbox}
        checked={state.isApproved}
      />
    </Fragment>
  );
};
```

