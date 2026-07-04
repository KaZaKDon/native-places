import { useState } from "react";

export function PlaceModeration({ onPublish, onReject, isLoading = false }) {
    const [comment, setComment] = useState("");
    const [error, setError] = useState("");

    function handlePublish() {
        setError("");
        onPublish?.();
    }

    function handleReject() {
        const trimmedComment = comment.trim();

        if (trimmedComment === "") {
            setError("Укажите причину отклонения объявления");
            return;
        }

        setError("");
        onReject?.(trimmedComment);
    }

    return (
        <article className="place-section place-moderation">
            <h3>Модерация</h3>

            <p className="place-moderation__text">
                После проверки объявления модератор может опубликовать его либо
                отклонить с указанием причины.
            </p>

            <label className="place-moderation__field">
                <span>Комментарий модератора</span>

                <textarea
                    className="place-moderation__comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Например: нужно заменить фотографии, исправить описание или указать контакты..."
                />
            </label>

            {error && <p className="place-moderation__error">{error}</p>}

            <div className="place-moderation__actions">
                <button
                    type="button"
                    className="moderation-button moderation-button--publish"
                    onClick={handlePublish}
                    disabled={isLoading}
                >
                    {isLoading ? "Сохраняем..." : "Опубликовать"}
                </button>

                <button
                    type="button"
                    className="moderation-button moderation-button--reject"
                    onClick={handleReject}
                    disabled={isLoading}
                >
                    Отклонить
                </button>
            </div>
        </article>
    );
}