import { useEffect, useState } from "react";

import "./AccountBookPager.css";

export function AccountBookPager({
    items = [],
    children,
    onPageChange,
}) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const maxIndex = Math.max(items.length - 1, 0);
    const safeIndex = Math.min(currentIndex, maxIndex);

    const hasPrevious = safeIndex > 0;
    const hasNext = safeIndex < items.length - 1;
    const currentItem = items[safeIndex];

    useEffect(() => {
        if (!currentItem || !onPageChange) {
            return;
        }

        onPageChange(currentItem);
    }, [currentItem, onPageChange]);

    if (!currentItem) {
        return null;
    }

    function goPrevious() {
        setCurrentIndex((index) => {
            return Math.max(Math.min(index, maxIndex) - 1, 0);
        });
    }

    function goNext() {
        setCurrentIndex((index) => {
            return Math.min(index + 1, maxIndex);
        });
    }

    return (
        <div className="account-book-pager">
            <div className="account-book-pager__content">
                {children(currentItem, safeIndex)}
            </div>

            <div className="account-book-pager__controls">
                <button
                    className="account-book-pager__arrow"
                    type="button"
                    onClick={goPrevious}
                    disabled={!hasPrevious}
                    aria-label="Предыдущая страница"
                >
                    ←
                </button>

                <span className="account-book-pager__counter">
                    {safeIndex + 1} / {items.length}
                </span>

                <button
                    className="account-book-pager__arrow"
                    type="button"
                    onClick={goNext}
                    disabled={!hasNext}
                    aria-label="Следующая страница"
                >
                    →
                </button>
            </div>
        </div>
    );
}