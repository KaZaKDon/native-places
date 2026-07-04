import { useState } from "react";

import "./RouteCreateModal.css";

const initialForm = {
    title: "",
    description: "",
    isPublic: false,
};

export function RouteCreateModal({ onClose, onCreate }) {
    const [form, setForm] = useState(initialForm);

    function handleFormChange(event) {
        const { name, value, type, checked } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (!form.title.trim()) {
            return;
        }

        onCreate({
            title: form.title.trim(),
            description: form.description.trim(),
            isPublic: form.isPublic,
        });

        setForm(initialForm);
    }

    return (
        <div className="route-create-modal" role="dialog" aria-modal="true">
            <div className="route-create-modal__card">
                <button
                    className="route-create-modal__close"
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть окно"
                >
                    ×
                </button>

                <h2>Создать маршрут</h2>

                <form className="route-create-form" onSubmit={handleSubmit}>
                    <label>
                        <span>Название маршрута</span>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            placeholder="Например, Дома в Вёшенской на просмотр"
                            onChange={handleFormChange}
                        />
                    </label>

                    <label>
                        <span>Описание</span>
                        <textarea
                            name="description"
                            rows="4"
                            value={form.description}
                            placeholder="Кратко опишите маршрут"
                            onChange={handleFormChange}
                        />
                    </label>

                    <label>
                        <span>Доступ</span>

                        <label>
                            <input
                                type="checkbox"
                                name="isPublic"
                                checked={form.isPublic}
                                onChange={handleFormChange}
                            />
                            Публичный маршрут
                        </label>
                    </label>

                    <button
                        className="route-create-form__submit"
                        type="submit"
                        disabled={!form.title.trim()}
                    >
                        Создать маршрут
                    </button>
                </form>
            </div>
        </div>
    );
}