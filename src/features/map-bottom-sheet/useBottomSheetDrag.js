import { useRef } from "react";

import { MAP_SHEET_STATES } from "../map-state/mapStateConstants";

const DRAG_THRESHOLD = 42;

const NEXT_STATE_UP = {
    [MAP_SHEET_STATES.COLLAPSED]: MAP_SHEET_STATES.HALF,
    [MAP_SHEET_STATES.HALF]: MAP_SHEET_STATES.FULL,
    [MAP_SHEET_STATES.FULL]: MAP_SHEET_STATES.FULL,
};

const NEXT_STATE_DOWN = {
    [MAP_SHEET_STATES.COLLAPSED]: MAP_SHEET_STATES.COLLAPSED,
    [MAP_SHEET_STATES.HALF]: MAP_SHEET_STATES.COLLAPSED,
    [MAP_SHEET_STATES.FULL]: MAP_SHEET_STATES.HALF,
};

export function useBottomSheetDrag({ state, onStateChange }) {
    const startYRef = useRef(null);

    function handlePointerDown(event) {
        startYRef.current = event.clientY;
    }

    function handlePointerUp(event) {
        if (startYRef.current === null) {
            return;
        }

        const deltaY = event.clientY - startYRef.current;
        startYRef.current = null;

        if (Math.abs(deltaY) < DRAG_THRESHOLD) {
            return;
        }

        if (deltaY < 0) {
            onStateChange(NEXT_STATE_UP[state]);
            return;
        }

        onStateChange(NEXT_STATE_DOWN[state]);
    }

    return {
        handlePointerDown,
        handlePointerUp,
    };
}
