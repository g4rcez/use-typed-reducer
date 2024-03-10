import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useLegacyReducer as useReducer } from "../src";

type State = { name: string };

type Props = { firstName: string };

describe("Should test useReducer", () => {
    test("Should create hook", async () => {
        const { result } = renderHook(() =>
            useReducer(
                { name: "Foo" },
                {
                    greeting:
                        (name?: string) =>
                        (state: State, props: Props): State => ({ ...state, name: name ?? props.firstName })
                },
                { firstName: "Joe" }
            )
        );
        const [state, dispatch] = result.current;
        expect(state.name).toBe("Foo");
        act(async () => {
            dispatch.greeting();
        }).then(() => {
            expect(result.current[0].name).toBe("Joe");
        });
        act(() => {
            dispatch.greeting("Foo");
            expect(result.current[0].name).toBe("Foo");
        });
    });
});
