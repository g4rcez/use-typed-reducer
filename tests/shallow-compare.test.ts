import { describe } from "vitest";
import { shallowCompare } from "../src/lib";

describe("Should test shallow compare", () => {
    test("✅ string equals", () => expect(shallowCompare("a", "a")).toBe(true));

    test("✅ number equals", () => expect(shallowCompare(1, 1)).toBe(true));

    test("✅ boolean equals", () => expect(shallowCompare(false, false)).toBe(true));

    test("✅ empty object equals", () => expect(shallowCompare({}, {})).toBe(true));

    test("✅ null is null", () => expect(shallowCompare(null, null)).toBe(true));

    test("✅ NaN is NaN", () => expect(shallowCompare(NaN, NaN)).toBe(true));

    test("✅ empty with properties", () => expect(shallowCompare({ a: 1 }, { a: 1 })).toBe(true));

    test("✅empty array equals", () => expect(shallowCompare([], [])).toBe(true));

    test("✅diff instances empty", () => {
        class Test {
            public constructor(public value: string) {}
        }
        expect(shallowCompare(new Test(""), new Test(""))).toBe(true);
    });

    test("🚨diff object", () => expect(shallowCompare({ a: 2 }, { a: 1 })).toBe(false));

    test("🚨diff object with empty array", () => expect(shallowCompare({ a: [] }, { a: [] })).toBe(false));

    test("🚨diff array", () => expect(shallowCompare([2], [1])).toBe(false));
});
