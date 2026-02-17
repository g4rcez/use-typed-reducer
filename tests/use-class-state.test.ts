import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Store } from "../src/use-class-state";

class CounterStore extends Store<{ count: number }> {
    constructor() {
        super({ count: 0 });
    }

    increment() {
        this.setState({ count: this.state.count + 1 });
    }

    decrement() {
        this.setState({ count: this.state.count - 1 });
    }
}

describe("Store", () => {
    test("should initialize with initial state", () => {
        const store = new CounterStore();
        const { result } = renderHook(() => store.use());
        
        expect(result.current.count).toBe(0);
        expect(result.current).toBeInstanceOf(CounterStore);
    });

    test("should update state using setState", () => {
        const store = new CounterStore();
        const { result } = renderHook(() => store.use());

        act(() => {
            store.increment();
        });

        expect(result.current.count).toBe(1);
    });

    test("should not update if state is shallowly equal", () => {
        const store = new CounterStore();
        const { result } = renderHook(() => store.use());
        const initialSnapshot = result.current;

        act(() => {
            // Calling protected method via any for test
            (store as any).setState({ count: 0 });
        });

        expect(result.current).toBe(initialSnapshot);
    });

    test("should notify listeners on change", () => {
        const store = new CounterStore();
        const listener = vi.fn();
        
        const unsubscribe = (store as any).subscribe(listener);
        
        act(() => {
            store.increment();
        });
        
        expect(listener).toHaveBeenCalledTimes(1);
        unsubscribe();
        
        act(() => {
            store.increment();
        });
        
        expect(listener).toHaveBeenCalledTimes(1);
    });

    test("should handle multiple updates correctly", () => {
        const store = new CounterStore();
        const { result } = renderHook(() => store.use());

        act(() => {
            store.increment();
            store.increment();
        });

        expect(result.current.count).toBe(2);
    });

    test("snapshot should have access to store methods", () => {
        const store = new CounterStore();
        const { result } = renderHook(() => store.use());

        expect(typeof result.current.increment).toBe("function");
        expect(typeof result.current.decrement).toBe("function");

        act(() => {
            result.current.increment();
        });

        expect(result.current.count).toBe(1);
    });

    test("should support complex state objects", () => {
        interface UserState {
            user: {
                id: number;
                name: string;
            };
            loading: boolean;
        }

        class UserStore extends Store<UserState> {
            constructor() {
                super({ user: { id: 1, name: "John" }, loading: false });
            }

            setLoading(loading: boolean) {
                this.setState({ loading });
            }

            setName(name: string) {
                this.setState({ 
                    user: { ...this.state.user, name } 
                });
            }
        }

        const store = new UserStore();
        const { result } = renderHook(() => store.use());

        act(() => {
            store.setLoading(true);
        });
        expect(result.current.loading).toBe(true);
        expect(result.current.user.name).toBe("John");

        act(() => {
            store.setName("Jane");
        });
        expect(result.current.user.name).toBe("Jane");
        expect(result.current.loading).toBe(true);
    });

    test("should unsubscribe correctly", () => {
        const store = new CounterStore();
        const listener = vi.fn();
        const unsubscribe = (store as any).subscribe(listener);
        
        unsubscribe();
        act(() => {
            store.increment();
        });
        
        expect(listener).not.toHaveBeenCalled();
    });
});
