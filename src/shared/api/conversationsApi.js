import { apiClient } from "./apiClient.js";
import { getMediaUrl } from "./mediaUrl.js";

function mapConversationFromApi(conversation) {
    return {
        id: Number(conversation.id),
        placeId: Number(conversation.place_id),
        ownerId: Number(conversation.owner_id),
        userId: Number(conversation.user_id),
        lastMessageAt: conversation.last_message_at || "",
        createdAt: conversation.created_at || "",
        placeTitle: conversation.place_title || "",
        placeSlug: conversation.place_slug || "",
        placeImage: conversation.cover_image
            ? getMediaUrl(conversation.cover_image)
            : "",
        ownerName: conversation.owner_name || "Автор объявления",
        messageCount: Number(conversation.message_count ?? 0),
        unreadCount: Number(conversation.unread_count ?? 0),
        lastMessageText: conversation.last_message_text || "",
        lastSenderId: Number(conversation.last_sender_id ?? 0),
        lastSenderName: conversation.last_sender_name || "Пользователь",
        placeStatus: conversation.place_status || "",
    };
}

function mapMessageFromApi(message) {
    return {
        id: Number(message.id),
        conversationId: Number(message.conversation_id),
        senderId: Number(message.sender_id),
        text: message.message_text || "",
        attachmentPath: message.attachment_path || "",
        isRead: Boolean(Number(message.is_read)),
        createdAt: message.created_at || "",
        senderName: message.sender_name || "Пользователь",
        senderAvatar: message.sender_avatar
            ? getMediaUrl(message.sender_avatar)
            : "",
    };
}

export const conversationsApi = {
    async startConversation(placeId) {
        const data = await apiClient.post("/conversations/start.php", {
            place_id: placeId,
        });

        return {
            message: data.message || "",
            conversationId: Number(data.conversation_id),
            created: Boolean(data.created),
            place: data.place || null,
        };
    },

    async getConversations() {
        const data = await apiClient.get("/conversations/index.php");

        const conversations = Array.isArray(data.conversations)
            ? data.conversations.map(mapConversationFromApi)
            : [];

        return {
            conversations,
        };
    },

    async getMessages(conversationId, { markRead = false } = {}) {
        const data = await apiClient.get("/messages/index.php", {
            conversation_id: conversationId,
            mark_read: markRead ? 1 : 0,
        });

        const messages = Array.isArray(data.messages)
            ? data.messages.map(mapMessageFromApi)
            : [];

        return {
            conversationId: Number(data.conversation_id),
            messages,
        };
    },

    async sendMessage({ conversationId, text }) {
        const data = await apiClient.post("/messages/send.php", {
            conversation_id: conversationId,
            message_text: text,
        });

        return {
            message: data.message || "",
            item: data.item ? mapMessageFromApi(data.item) : null,
        };
    },
};