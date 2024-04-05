import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { createGlobalReducer } from "../src";

describe("Should test createGlobalReducer", () => {
    test("Should test useStore hook", async () => {
        const calls = {
            fn: (state: any) => ({ ...state, n: state.n + 1 })
        };
        const testCalled = vi.spyOn(calls, "fn");
        const useStore = createGlobalReducer({ name: "Foo", n: 0 }, (args) => ({
            greeting: (hello: string) => ({ name: `hello: ${hello} ${args.state().name}` }),
            inc: () => {
                const state = args.state();
                return { n: state.n + 1 };
            }
        }));
        const { result } = renderHook(() =>
            useStore(undefined, undefined, {
                middlewares: [calls.fn]
            })
        );
        const [state, dispatch] = result.current;
        expect(state.name).toBe("Foo");
        act(() => {
            dispatch.greeting("Bar");
        });
        expect(result.current[0].name).toBe("hello: Bar Foo");
        expect(testCalled).toBeCalledTimes(2);
    });

    test("Should compare the useStore.dispatchers and useStore()[1]", () => {
        const useStore = createGlobalReducer({ n: 0 }, (args) => ({
            inc: () => ({ n: args.state().n + 1 })
        }));
        const { result } = renderHook(() => useStore());
        const [state, dispatch] = result.current;
        expect(state.n).toBe(0);
        expect(dispatch).toStrictEqual(useStore.dispatchers);
    });

    test("Should mutate global state", () => {
        const useStore = createGlobalReducer(
            { n: 0 },
            (args) => ({
                inc: () => ({ n: args.state().n + 1 })
            }),
            {
                mutations: [(state) => ({ ...state, n: state.n + 1 })]
            }
        );
        const { result } = renderHook(() => useStore());
        const [state, dispatch] = result.current;
        expect(state.n).toBe(0);
        expect(dispatch).toStrictEqual(useStore.dispatchers);
        act(() => {
            dispatch.inc();
        });
        expect(result.current[0].n).toBe(2);
    });
});
