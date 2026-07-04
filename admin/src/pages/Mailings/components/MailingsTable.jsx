import { EmptyState } from "../../../components/EmptyState/EmptyState";

const statusTitles = {
    draft: "Черновик",
    sending: "Отправляется",
    sent: "Отправлена",
    failed: "Ошибка",
};

const audienceTitles = {
    all: "Все пользователи",
    moderators: "Модераторы",
    category: "Категория",
    plan: "Тариф",
    role: "Роль",
};

function formatAudience(mailing) {
    const title = audienceTitles[mailing.audience_type] || mailing.audience_type;

    if (!mailing.audience_value) {
        return title;
    }

    return `${title}: ${mailing.audience_value}`;
}

export function MailingsTable({ mailings, isLoading, onDelete }) {
    if (isLoading) {
        return (
            <EmptyState className="mailings-empty">
                Загружаем историю рассылок...
            </EmptyState>
        );
    }

    if (!mailings.length) {
        return (
            <EmptyState className="mailings-empty">
                Рассылок пока нет.
            </EmptyState>
        );
    }

    return (
        <div className="mailings-table-wrap">
            <table className="mailings-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Дата</th>
                        <th>Тема</th>
                        <th>Аудитория</th>
                        <th>Получателей</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {mailings.map((mailing) => {
                        const canDelete = mailing.status === "draft";

                        return (
                            <tr key={mailing.id}>
                                <td>
                                    <span className="mailing-id">
                                        #{mailing.id}
                                    </span>
                                </td>

                                <td>{mailing.created_at}</td>

                                <td>
                                    <strong>{mailing.subject}</strong>
                                </td>

                                <td>{formatAudience(mailing)}</td>

                                <td>{mailing.recipients_count}</td>

                                <td>
                                    <span className={`mailing-status mailing-status--${mailing.status}`}>
                                        {statusTitles[mailing.status] || mailing.status}
                                    </span>
                                </td>

                                <td>
                                    {canDelete ? (
                                        <button
                                            className="mailings-table__delete"
                                            type="button"
                                            onClick={() => onDelete(mailing)}
                                        >
                                            Удалить
                                        </button>
                                    ) : (
                                        <span className="mailings-table__muted">
                                            Недоступно
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}