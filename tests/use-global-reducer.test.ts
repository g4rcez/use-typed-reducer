import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { createGlobalReducer } from "../src";

describe("Should test createGlobalReducer", () => {
    test("Should test useStore hook", async () => {
        const useStore = createGlobalReducer({ name: "Foo" }, (args) => ({
            greeting: (hello: string) => ({ name: `hello: ${hello} ${args.state().name}` })
        }));
        const { result } = renderHook(() => useStore());
        const [state, dispatch] = result.current;
        expect(state.name).toBe("Foo");
        act(() => {
            dispatch.greeting("Bar");
        });
        expect(result.current[0].name).toBe("hello: Bar Foo");
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
});
