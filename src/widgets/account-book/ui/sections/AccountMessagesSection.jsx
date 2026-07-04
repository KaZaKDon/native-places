import { useCallback, useEffect, useState } from "react";

import { conversationsApi } from "../../../../shared/api/conversationsApi";
import { AccountBookPager } from "../components/AccountBookPager";
import { AccountMessageCard } from "../components/AccountMessageCard";

export function AccountMessagesSection() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadConversations = useCallback(async () => {
        setError("");

        try {
            const data = await conversationsApi.getConversations();
            setConversations(data.conversations);
        } catch (requestError) {
            console.error(requestError);
            setError(
                requestError.message || "Не удалось загрузить сообщения."
            );
            setConversations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadConversations();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [loadConversations]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            loadConversations();
        }, 120000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [loadConversations]);

    function handleDeleteConversation() {
        window.alert("Удаление диалогов добавим позже отдельным API.");
    }

    const handleConversationRead = useCallback((conversationId) => {
        setConversations((currentConversations) =>
            currentConversations.map((conversation) =>
                conversation.id === conversationId
                    ? {
                        ...conversation,
                        unreadCount: 0,
                    }
                    : conversation
            )
        );
    }, []);

    return (
        <div className="account-book-section">
            <h1>Сообщения</h1>

            {loading ? (
                <div className="account-book-empty">
                    <h2>Загружаем сообщения</h2>
                    <p>Получаем диалоги из базы.</p>
                </div>
            ) : error ? (
                <div className="account-book-empty">
                    <h2>Не удалось загрузить сообщения</h2>
                    <p>{error}</p>

                    <button
                        className="account-book-place__action"
                        type="button"
                        onClick={loadConversations}
                    >
                        Повторить
                    </button>
                </div>
            ) : conversations.length === 0 ? (
                <div className="account-book-empty">
                    <h2>Сообщений пока нет</h2>
                    <p>Позже сюда попадут обращения со страниц объектов.</p>
                </div>
            ) : (
                <div className="account-book-section__body">
                    <AccountBookPager items={conversations}>
                        {(conversation) => (
                            <AccountMessageCard
                                conversation={conversation}
                                onDelete={handleDeleteConversation}
                                onRead={handleConversationRead}
                            />
                        )}
                    </AccountBookPager>
                </div>
            )}
        </div>
    );
}