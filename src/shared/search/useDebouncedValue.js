import { useEffect, useState } from "react";

export function useDebouncedValue(value, delay = 250) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [value, delay]);

    return debouncedValue;
}