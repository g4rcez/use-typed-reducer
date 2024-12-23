import { MutableRefObject, useEffect, useRef } from "react";

export const useMutable = <T extends {}>(state: T): MutableRefObject<T> => {
    const mutable = useRef<T>(state ?? {});
    useEffect(() => void (mutable.current = state), [state]);
    return mutable;
};

export const usePrevious = <V>(value: V): V => {
    const ref = useRef<V>(undefined);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current!;
};
