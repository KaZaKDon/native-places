import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";

export function PlacePlacementCard({ placement }) {
    const paymentStatusLabel =
        placement.paymentStatus === "paid"
            ? "Оплачено"
            : "Ожидает оплаты";

    return (
        <article className="place-section">
            <h3>Размещение</h3>

            <div className="place-info-list">
                <div>
                    <span>Тип размещения</span>
                    <strong>
                        {placement.publicationType === "paid"
                            ? "Платное"
                            : "Бесплатное"}
                    </strong>
                </div>

                <div>
                    <span>Тариф</span>
                    <strong>{placement.planTitle}</strong>
                </div>

                <div>
                    <span>Оплата</span>

                    <StatusBadge
                        status={
                            placement.paymentStatus === "paid"
                                ? "paid"
                                : "waiting"
                        }
                        label={paymentStatusLabel}
                    />
                </div>

                <div>
                    <span>Подано</span>
                    <strong>{placement.submittedAt}</strong>
                </div>

                <div>
                    <span>Оплачено</span>
                    <strong>{placement.paidAt || "—"}</strong>
                </div>

                <div>
                    <span>Опубликовано</span>
                    <strong>{placement.publishedAt || "Ещё не опубликовано"}</strong>
                </div>

                <div>
                    <span>Активно до</span>
                    <strong>{placement.expiresAt || "Не рассчитано"}</strong>
                </div>

                <div>
                    <span>Осталось дней</span>
                    <strong>
                        {placement.daysLeft ?? "Начнётся после публикации"}
                    </strong>
                </div>
            </div>
        </article>
    );
}