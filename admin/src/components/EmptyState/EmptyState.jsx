export function EmptyState({ children, className = "empty-state" }) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}