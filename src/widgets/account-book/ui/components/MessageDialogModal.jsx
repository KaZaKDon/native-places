import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { conversationsApi } from "../../../../shared/api/conversationsApi";

import "./MessageDialogModal.css";

function formatMessageTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function MessageDialogModal({
    conversation,
    messages,
    currentUserId,
    onClose,
    onMessagesChange,
    onReloadMessages,
}) {
    const [replyText, setReplyText] = useState("");
    const [replySending, setReplySending] = useState(false);
    const [error, setError] = useState("");

    const messagesEndRef = useRef(null);

    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            onReloadMessages();
        }, 45000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [onReloadMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [messages.length]);

    async function handleSendReply() {
        const text = replyText.trim();

        if (!text || replySending) {
            return;
        }

        setReplySending(true);
        setError("");

        try {
            const result = await conversationsApi.sendMessage({
                conversationId: conversation.id,
                text,
            });

            if (result.item) {
                onMessagesChange((currentMessages) => [
                    ...currentMessages,
                    result.item,
                ]);
            } else {
                await onReloadMessages();
            }

            setReplyText("");
        } catch (requestError) {
            console.error(requestError);
            setError(requestError.message || "Не удалось отправить сообщение.");
        } finally {
            setReplySending(false);
        }
    }

    return (
        <div className="message-dialog-modal" role="dialog" aria-modal="true">
            <div className="message-dialog-modal__card">
                <header className="message-dialog-modal__header">
                    <div>
                        <p>Диалог по объявлению</p>
                        <h2>{conversation.placeTitle || "Объект не указан"}</h2>

                        {conversation.ownerName && (
                            <span>Автор: {conversation.ownerName}</span>
                        )}
                    </div>

                    <button
                        className="message-dialog-modal__close"
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть диалог"
                    >
                        ×
                    </button>
                </header>

                <div className="message-dialog-modal__body">
                    {messages.length > 0 ? (
                        messages.map((message) => {
                            const isMyMessage =
                                Number(message.senderId) === currentUserId;

                            return (
                                <div
                                    className={
                                        isMyMessage
                                            ? "message-dialog-modal__bubble message-dialog-modal__bubble--mine"
                                            : "message-dialog-modal__bubble"
                                    }
                                    key={message.id}
                                >
                                    <strong>
                                        {isMyMessage
                                            ? "Вы"
                                            : message.senderName}
                                    </strong>

                                    <p>{message.text}</p>

                                    <time dateTime={message.createdAt}>
                                        {formatMessageTime(message.createdAt)}
                                    </time>
                                </div>
                            );
                        })
                    ) : (
                        <p className="message-dialog-modal__empty">
                            В диалоге пока нет сообщений.
                        </p>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <footer className="message-dialog-modal__footer">
                    {error && (
                        <p className="message-dialog-modal__error">{error}</p>
                    )}

                    <textarea
                        rows="4"
                        value={replyText}
                        placeholder="Напишите ответ..."
                        onChange={(event) => {
                            setReplyText(event.target.value);
                            setError("");
                        }}
                    />

                    <div className="message-dialog-modal__actions">
                        {conversation.placeSlug && (
                            <Link
                                className="account-book-place__action"
                                to={`/place/${conversation.placeSlug}`}
                                onClick={onClose}
                            >
                                Открыть объект
                            </Link>
                        )}

                        <button
                            className="account-book-place__action"
                            type="button"
                            onClick={handleSendReply}
                            disabled={replySending || replyText.trim() === ""}
                        >
                            {replySending ? "Отправляем..." : "Отправить"}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}