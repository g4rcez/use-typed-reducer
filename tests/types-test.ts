import { useReducer } from "../src";

const [state, dispatcher] = useReducer(
    {
        count: 0,
        name: "Untitled"
    },
    (arg) => ({
        upperCaseName: (name: string) => ({ name: name ?? arg.props().name }),
        changeName: (name?: string) => ({ name: name ?? arg.props().name }),
        sum: (a: number, b: number) => ({ count: arg.state().count + (a + b) }),
        inc: () => ({ count: arg.state().count + 1 })
    }),
    {
        name: "Fulano"
    }
);

console.log(typeof state.count === "number");
console.log(dispatcher.inc());
console.log(dispatcher.sum(1, 1));
// @ts-expect-error
console.log(dispatcher.sum(1));
// @ts-expect-error
console.log(dispatcher.sum("1", 1));
// @ts-expect-error
console.log(dispatcher.sum([], []));
console.log(dispatcher.changeName("Name"));
console.log(dispatcher.changeName());
