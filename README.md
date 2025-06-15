# use-typed-reducer

A powerful, type-safe React hook alternative to `useReducer` with built-in support for async actions, middleware, debugging, and global state management.

[![npm version](https://badge.fury.io/js/use-typed-reducer.svg)](https://badge.fury.io/js/use-typed-reducer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔷 **Full TypeScript support** - Complete type safety for state and actions
- ⚡ **Async actions** - Built-in support for Promise-based reducers
- 🔧 **Middleware system** - Extensible middleware for side effects and transformations
- 🌍 **Global state management** - Create global stores with selectors
- 🐛 **Development tools** - Built-in debugging with performance metrics
- 💾 **Storage plugins** - localStorage and sessionStorage integration
- 🔄 **Legacy compatibility** - Drop-in replacement for standard useReducer

## Installation

```bash
npm install use-typed-reducer
```

```bash
yarn add use-typed-reducer
```

```bash
pnpm add use-typed-reducer
```

## Quick Start

### Basic Usage

```typescript
import useReducer, { ReducerArgs } from 'use-typed-reducer';

interface CounterState {
  count: number;
}

const initialState: CounterState = { count: 0 };

function Counter() {
  const [state, actions] = useReducer(initialState, (get) => ({
    reset: () => initialState,
    increment: () => ({ count: state.count + 1 }),
    decrement: () => ({ count: state.count - 1 }),
    setCount: (value: number) => ({ count: value })
  }));

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => actions.increment()}>+</button>
      <button onClick={() => actions.decrement()}>-</button>
      <button onClick={() => actions.reset()}>Reset</button>
      <button onClick={() => actions.setCount(10)}>Set to 10</button>
    </div>
  );
}
```

### Async Actions

```typescript
const asyncReducer = (get) => ({
  fetchUser: async (userId: string) => {
    const user = await fetch(`/api/users/${userId}`).then(res => res.json());
    return ({ ...get.state(), user, loading: false });
  },
  // you can omit properties to merge with the previous state
  setLoading: (loading: boolean) => ({ loading })
});
```

### With Props and State Access

```typescript
const reducerWithContext = ({ state, props, initialState, previousState }) => ({
  updateWithProps: () => (currentState: State) => ({
    ...currentState,
    value: props().multiplier * currentState.value
  }),
  revertToPrevious: () => () => previousState(),
  resetToInitial: () => () => initialState
});
```

## Advanced Usage

### Global State Management

Create a global store that can be accessed from any component:

```typescript
import { createGlobalReducer } from 'use-typed-reducer';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
}

const globalStore = createGlobalReducer(
  { user: null, theme: 'light' },
  () => ({
    setUser: (user: User) => ({ user }),
    toggleTheme: () => ({
      theme: state.theme === 'light' ? 'dark' : 'light'
    })
  })
);

// Use in any component
function UserProfile() {
  const [state, actions] = globalStore(
    state => ({ user: state.user }), // selector
    (a, b) => a.user?.id === b.user?.id // custom comparator
  );

  return (
    <div>
      {state.user ? (
        <p>Welcome, {state.user.name}!</p>
      ) : (
        <button onClick={() => actions.setUser({ id: 1, name: 'John' })}>
          Login
        </button>
      )}
    </div>
  );
}
```

### Middleware and Debugging

```typescript
import { createLoggerPlugin, createLocalStoragePlugin } from 'use-typed-reducer';

const [state, actions] = useReducer(
  initialState,
  reducer,
  {
    debug: true, // Enable performance debugging
    postMiddleware: [
      createLoggerPlugin('MyComponent'), // Console logging
      createLocalStoragePlugin('app-state') // Auto-save to localStorage
    ]
  }
);
```

### Custom Middleware

```typescript
const customMiddleware = (state, previousState, debug) => {
  console.log(`Action "${debug.method}" took ${debug.time}ms`);

  // Transform state
  return {
    ...state,
    lastUpdated: Date.now()
  };
};

const [state, actions] = useReducer(initialState, reducer, {
  postMiddleware: [customMiddleware]
});
```

### Storage Plugins

```typescript
import {
  createLocalStoragePlugin,
  createSessionStoragePlugin,
  createStoragePlugin
} from 'use-typed-reducer';

// Built-in plugins
const localStorage = createLocalStoragePlugin('my-app-state');
const sessionStorage = createSessionStoragePlugin('temp-state');

// Custom storage plugin
const customStorage = createStoragePlugin(() => ({
  set: (key, value) => {
    // Custom storage logic
    myCustomStorage.save(key, value);
  }
}));

const [state, actions] = useReducer(initialState, reducer, {
  postMiddleware: [localStorage('user-preferences')]
});
```

## API Reference

### `useReducer(initialState, reducer, options?)`

The main hook for local state management.

**Parameters:**
- `initialState: State` - Initial state object
- `reducer: ReducerActions<State, Props>` - Function returning action creators
- `options?: Options` - Configuration options

**Options:**
```typescript
{
  props?: Props;              // Props passed to reducer
  debug?: boolean;            // Enable debug mode
  postMiddleware?: Array;     // Middleware functions
  interceptor?: Array;        // State interceptors
}
```

**Returns:** `[state, actions, props]`

### `createGlobalReducer(initialState, reducer, options?)`

Creates a global store accessible from any component.

**Returns:** A hook function with additional properties:
- `dispatchers` - Direct access to action dispatchers
- `getState()` - Get current state snapshot

### `useLegacyReducer(initialState, reducers, props?)`

Legacy compatibility mode that mimics standard `useReducer` behavior.

### Utility Hooks

- `usePrevious<T>(value: T): T` - Get the previous value
- `useMutable<T>(state: T): RefObject<T>` - Create a mutable ref that updates with state

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the library
pnpm build

# Format code
pnpm format
```

## Requirements

- React >= 16.8.3
- TypeScript >= 4.0 (for TypeScript projects)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [g4rcez](https://github.com/g4rcez)

