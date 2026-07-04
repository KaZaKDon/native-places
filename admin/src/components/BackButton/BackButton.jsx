import { useLocation, useNavigate } from "react-router-dom";
import "./BackButton.css";

export function BackButton({
    fallbackTo = "/",
    label = "← Назад",
}) {
    const navigate = useNavigate();
    const location = useLocation();

    function handleBack() {
        const from = location.state?.from;

        if (from) {
            navigate(from);
            return;
        }

        navigate(fallbackTo);
    }

    return (
        <button
            type="button"
            className="back-link"
            onClick={handleBack}
        >
            {label}
        </button>
    );
}