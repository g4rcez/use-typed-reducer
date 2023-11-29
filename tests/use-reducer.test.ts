import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useReducer } from "../src";

describe("Should test useReducer", () => {
    test("Should create hook", async () => {
        const { result } = renderHook(() =>
            useReducer({ name: "Foo" }, (args) => ({
                greeting: (hello: string) => ({ name: `${hello} ${args.state().name}` })
            }))
        );
        const [state, dispatch] = result.current;
        expect(state.name).toBe("Foo");
        act(() => {
            dispatch.greeting("Bar");
        });
        expect(result.current[0].name).toBe("Bar Foo");
    });

    test("Should test hook with promise", async () => {
        const { result, rerender } = renderHook(() =>
            useReducer({ message: "Wake up!" }, () => ({
                sleep: async (ms: number) =>
                    new Promise((res) => {
                        return res({ message: `Sleep for ${ms}ms` });
                    })
            }))
        );
        expect(result.current[0].message).toBe("Wake up!");
        await act(async () => {
            await result.current[1].sleep(1000);
        });
        rerender();
        expect(result.current[0].message).toBe("Sleep for 1000ms");
    });
});
