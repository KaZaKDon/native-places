import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { conversationsApi } from "../../../../shared/api/conversationsApi";
import { useAuth } from "../../../../shared/auth/useAuth";
import { MessageDialogModal } from "./MessageDialogModal";

import "./AccountMessageCard.css";

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
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function AccountMessageCard({ conversation, onDelete, onRead }) {
    const { user } = useAuth();

    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [messagesError, setMessagesError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    const currentUserId = Number(user?.id ?? 0);

    const [conversationMeta, setConversationMeta] = useState(conversation);


    const lastMessage = useMemo(() => {
         if (messages.length > 0) {
            return messages[messages.length - 1];
        }

        if (conversationMeta.lastMessageText) {
            return {
                senderId: conversationMeta.lastSenderId,
                senderName: conversationMeta.lastSenderName,
                text: conversationMeta.lastMessageText,
                createdAt: conversationMeta.lastMessageAt,
            };
        }

        return null;
    }, [conversationMeta, messages]);

    const messageCount = conversationMeta.messageCount || messages.length;
    const unreadCount = conversationMeta.unreadCount || 0;

    function handleOpenDialog() {
        setDialogOpen(true);

        if (unreadCount > 0) {
            setConversationMeta((currentConversation) => ({
                ...currentConversation,
                unreadCount: 0,
            }));
            onRead?.(conversation.id);
        }
    }

    const loadMessages = useCallback(async () => {
        setMessagesLoading(true);
        setMessagesError("");

        try {
            const data = await conversationsApi.getMessages(conversation.id, {
                markRead: dialogOpen,
            });
            setMessages(data.messages);

            if (dialogOpen && conversationMeta.unreadCount > 0) {
                setConversationMeta((currentConversation) => ({
                    ...currentConversation,
                    unreadCount: 0,
                }));
                onRead?.(conversation.id);
            }
        } catch (error) {
            console.error(error);
            setMessagesError(error.message || "Не удалось загрузить диалог.");
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    }, [conversation.id, conversationMeta.unreadCount, dialogOpen, onRead]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadMessages();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [loadMessages]);

    return (
        <>
            <article
                className={
                    unreadCount > 0
                        ? "account-message-card account-message-card--unread"
                        : "account-message-card"
                }
            >
                <button
                    className="account-message-card__open"
                    type="button"
                    onClick={handleOpenDialog}
                >
                    <div className="account-message-card__head">
                        <span>
                            {conversation.lastMessageAt
                                ? formatMessageTime(conversation.lastMessageAt)
                                : "Дата не указана"}
                        </span>

                        <strong>{messageCount} сообщ.</strong>
                    </div>

                    <h2>{conversation.placeTitle || "Объект не указан"}</h2>

                    {unreadCount > 0 && (
                        <span className="account-message-card__unread">
                            {unreadCount} новых
                        </span>
                    )}

                    {conversation.ownerName && (
                        <p className="account-message-card__meta">
                            Автор: {conversation.ownerName}
                        </p>
                    )}

                    <div className="account-message-card__preview">
                        {messagesLoading ? (
                            <p>Загружаем диалог...</p>
                        ) : messagesError ? (
                            <p>{messagesError}</p>
                        ) : lastMessage ? (
                            <>
                                <strong>
                                    {Number(lastMessage.senderId) === currentUserId
                                        ? "Вы"
                                        : lastMessage.senderName}
                                </strong>
                                <p>{lastMessage.text}</p>
                            </>
                        ) : (
                            <p>В диалоге пока нет сообщений.</p>
                        )}
                    </div>
                </button>

                <div className="account-message-card__actions">
                    {conversation.placeSlug && (
                        <Link
                            className="account-book-place__action"
                            to={`/place/${conversation.placeSlug}`}
                        >
                            Открыть объект
                        </Link>
                    )}

                    <button
                        className="account-book-place__action"
                        type="button"
                        onClick={handleOpenDialog}
                    >
                        Открыть диалог
                    </button>

                    <button
                        className="account-book-place__action account-book-place__action--danger"
                        type="button"
                        onClick={() => onDelete(conversation.id)}
                    >
                        Удалить
                    </button>
                </div>
            </article>

            {dialogOpen && (
                <MessageDialogModal
                    conversation={conversation}
                    messages={messages}
                    currentUserId={currentUserId}
                    onClose={() => setDialogOpen(false)}
                    onMessagesChange={setMessages}
                    onReloadMessages={loadMessages}
                />
            )}
        </>
    );
}