import {
    useEffect,
    useState
} from "react";
import {
    applyTheme,
    getInitialTheme
} from "../utils/theme";

export function useTheme() {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    function toggleTheme() {
        setTheme((currentTheme) =>
            currentTheme === "dark" ? "light" : "dark"
        );
    }

    return {
        theme,
        setTheme,
        toggleTheme,
    };
}