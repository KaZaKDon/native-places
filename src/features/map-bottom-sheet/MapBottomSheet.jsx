import { MAP_SHEET_STATES } from "../map-state/mapStateConstants";
import { useBottomSheetDrag } from "./useBottomSheetDrag";

import "./MapBottomSheet.css";

export function MapBottomSheet({ state = MAP_SHEET_STATES.COLLAPSED, onStateChange, children }) {
    const { handlePointerDown, handlePointerUp } = useBottomSheetDrag({
        state,
        onStateChange,
    });

    const isFull = state === MAP_SHEET_STATES.FULL;

    return (
        <section className={`map-bottom-sheet map-bottom-sheet--${state}`} aria-label="Панель карты">
            <div
                className="map-bottom-sheet__handle-zone"
                role="button"
                tabIndex={0}
                aria-label="Изменить высоту панели"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onClick={() => {
                    onStateChange(isFull ? MAP_SHEET_STATES.COLLAPSED : MAP_SHEET_STATES.FULL);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onStateChange(isFull ? MAP_SHEET_STATES.COLLAPSED : MAP_SHEET_STATES.FULL);
                    }
                }}
            >
                <span className="map-bottom-sheet__handle" />
            </div>

            <div className="map-bottom-sheet__content">{children}</div>
        </section>
    );
}
