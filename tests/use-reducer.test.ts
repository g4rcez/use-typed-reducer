import { act, renderHook } from "@testing-library/react";
import { useReducer } from "../src";
import { describe, expect, test } from "vitest";

describe("Should test useReducer", () => {
    test("Should create hook", async () => {
        type State = { name: string };
        const reducer = (_getState: () => State) => ({
            greeting: (hello: string) => ({ name: `hello: ${hello} ${_getState().name}` })
        });
        const { result } = renderHook(() => useReducer({ name: "Foo" }, reducer));
        expect(result.current[0].name).toBe("Foo");
        act(() => {
            result.current[1].greeting("Bar");
        });
        expect(result.current[0].name).toBe("hello: Bar Foo");
    });

    test("Should test hook with promise", async () => {
        type State = { sleep: string };
        const reducer = (_getState: () => State) => ({
            sleep: async (ms: number) => {
                await (async () => {
                    console.log(ms);
                })();
                return { sleep: `Sleep for ${ms}ms` };
            }
        });
        const { result, rerender } = renderHook(() => useReducer({ sleep: "Wake up!" }, reducer));
        expect(result.current[0].sleep).toBe("Wake up!");
        act(() => {
            result.current[1].sleep(1000);
        });
        rerender();
        expect(result.current[0].sleep).toBe("Sleep for 1000ms");
    });
});
