import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useReducer } from "../src";

class TestClass {
    constructor(public name: string) {}

    change(name: string) {
        this.name = name;
    }
}

describe("Should test useReducer using classes", () => {
    test("Should create class Class", async () => {
        const { result } = renderHook(() =>
            useReducer(new TestClass("Test"), (get) => ({
                greeting: (hello: string) => {
                    const instance = get.state();
                    expect((instance as any).constructor.name).toBe(new TestClass("TEST").constructor.name);
                    instance.change(hello);
                    return instance;
                }
            }))
        );
        const [state, dispatch] = result.current;
        expect(state.name).toBe("Test");
        act(() => dispatch.greeting("Bar"));
        expect(result.current[0].name).toBe("Bar");
        expect(typeof result.current[0].change).toBe("function");
    });
});
