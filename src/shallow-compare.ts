const isPrimitive = (a: any): a is string | number | boolean => {
    const type = typeof a;
    return type === "string" || type === "number" || type === "bigint" || type === "boolean" || type === "undefined" || type === null
}

export const shallowCompare = (left: any, right: any): boolean => {
    if (left === right || Object.is(left, right)) return true;
    if (Array.isArray(left) && Array.isArray(right)) {
        if (left.length !== right.length) return false
    }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
        if (left.constructor !== right.constructor) return false;
        if (left.valueOf !== Object.prototype.valueOf) return left.valueOf() === right.valueOf();
        const keys = Object.keys(left);
        length = keys.length;
        if (length !== Object.keys(right).length) return false;
        let i = length
        for (; i-- !== 0;) {
            if (!Object.prototype.hasOwnProperty.call(right, keys[i])) return false;
        }
        i = length
        for (let i = length; i-- !== 0;) {
            const key = keys[i];
            if (!(isPrimitive(left[key]) && isPrimitive(right[key]) && (right[key] === left[key]))) return false;
        }
        return true;
    }
    return left !== left && right !== right;
}
