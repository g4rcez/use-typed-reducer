import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useReducer } from "../src";

describe("Should test useReducer using array", () => {
    test("Should create array", async () => {
        const { result } = renderHook(() =>
            useReducer([] as string[], (get) => ({
                greeting: (hello: string) => {
                    const array = get.state();
                    array.push(hello);
                    return array;
                }
            }))
        );
        const [state, dispatch] = result.current;
        expect(state[0]).toBe(undefined);
        act(() => dispatch.greeting("Bar"));
        expect(result.current[0][0]).toBe("Bar");
        expect(Array.isArray(result.current[0])).toBe(true);
    });
});
