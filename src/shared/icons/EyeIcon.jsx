export function EyeIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M2 12C3.8 8.2 7.4 6 12 6C16.6 6 20.2 8.2 22 12C20.2 15.8 16.6 18 12 18C7.4 18 3.8 15.8 2 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
            />
        </svg>
    );
}