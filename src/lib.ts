export const isObject = <T>(obj: T) => obj && typeof obj === "object";

export const keys = Object.keys as <T>(t: T) => Array<keyof T>;

type MapArray<T, F> = { [K in keyof T]: [K, F] };
export const entries = <T extends {}, F>(t: T): MapArray<T[], F> => Object.entries(t) as any;

export const isPromise = <T>(promise: any): promise is Promise<T> => promise instanceof Promise;

// https://gist.github.com/ahtcx/0cd94e62691f539160b32ecda18af3d6?permalink_comment_id=2930530#gistcomment-2930530
export const merge = <T>(currentState: T, previous: T) => {
    if (!isObject(previous) || !isObject(currentState)) {
        return currentState;
    }
    keys(currentState).forEach((key) => {
        const targetValue = previous[key];
        const sourceValue = currentState[key];
        if (Array.isArray(targetValue) && Array.isArray(sourceValue))
            return ((previous as any)[key] = targetValue.concat(sourceValue));
        if (isObject(targetValue) && isObject(sourceValue))
            return (previous[key] = merge(Object.assign({}, targetValue), sourceValue));
        return (previous[key] = sourceValue);
    });
    return previous;
};

export const isPrimitive = (a: any): a is string | number | boolean => {
    const type = typeof a;
    return (
        type === "string" ||
        type === "number" ||
        type === "bigint" ||
        type === "boolean" ||
        type === "undefined" ||
        type === null
    );
};


export const shallowCompare = (left: any, right: any): boolean => {
    if (left === right || Object.is(left, right)) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
        if (left.length !== right.length) return false;
    }
    if (left && right && typeof left === "object" && typeof right === "object") {
        if (left.constructor !== right.constructor) return false;
        if (left.valueOf !== Object.prototype.valueOf) return left.valueOf() === right.valueOf();
        const keys = Object.keys(left);
        length = keys.length;
        if (length !== Object.keys(right).length) {
            return false;
        }
        let i = length;
        for (; i-- !== 0; ) {
            if (!Object.prototype.hasOwnProperty.call(right, keys[i])) {
                return false;
            }
        }
        i = length;
        for (let i = length; i-- !== 0; ) {
            const key = keys[i];
            if (!(isPrimitive(left[key]) && isPrimitive(right[key]) && right[key] === left[key])) return false;
        }
        return true;
    }
    return left !== left && right !== right;
};
