import { useEffect, useMemo, useState } from "react";

import { PlanForm } from "./components/PlanForm";
import { PlansStats } from "./components/PlansStats";
import { PlansTable } from "./components/PlansTable";

import { plansApi } from "../../shared/api/plansApi";

import "./PlansPage.css";

const emptyPlanForm = {
    title: "",
    code: "",
    description: "",
    price: "",
    durationDays: "",
    placesLimit: "",
    status: "active",
};

const planStatusItems = [
    { value: "active", title: "Активен" },
    { value: "disabled", title: "Отключён" },
];

function mapPlanFromApi(plan) {
    const isActive = Number(plan.is_active) === 1;

    return {
        ...plan,
        id: Number(plan.id),
        price: Number(plan.price || 0),
        durationDays: Number(plan.duration_days || 0),
        placesLimit: Number(plan.max_places || 0),
        usersCount: Number(plan.users_count || 0),
        status: isActive ? "active" : "disabled",
    };
}

export function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [form, setForm] = useState(emptyPlanForm);
    const [editingPlanId, setEditingPlanId] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const isEditing = editingPlanId !== null;

    useEffect(() => {
        let isMounted = true;

        async function loadInitialPlans() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await plansApi.getPlans();

                if (isMounted) {
                    setPlans((data.plans || []).map(mapPlanFromApi));
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить тарифы");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadInitialPlans();

        return () => {
            isMounted = false;
        };
    }, []);

    async function reloadPlans() {
        const data = await plansApi.getPlans();
        setPlans((data.plans || []).map(mapPlanFromApi));
    }

    const stats = useMemo(() => ({
        total: plans.length,
        active: plans.filter((plan) => plan.status === "active").length,
        disabled: plans.filter((plan) => plan.status === "disabled").length,
        archived: 0,
    }), [plans]);

    function handleFormChange(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function resetForm() {
        setForm(emptyPlanForm);
        setEditingPlanId(null);
    }

    function handleEdit(plan) {
        setEditingPlanId(plan.id);

        setForm({
            title: plan.title || "",
            code: plan.code || "",
            description: plan.description || "",
            price: String(plan.price),
            durationDays: String(plan.durationDays),
            placesLimit: String(plan.placesLimit),
            status: plan.status,
        });
    }

    async function handleChangeStatus(plan, status) {
        try {
            setIsSaving(true);
            setErrorMessage("");

            await plansApi.updatePlan({
                id: plan.id,
                code: plan.code,
                title: plan.title,
                description: plan.description || "",
                max_places: plan.placesLimit,
                duration_days: plan.durationDays,
                price: plan.price,
                is_active: status === "active" ? 1 : 0,
            });

            if (editingPlanId === plan.id) {
                handleFormChange("status", status);
            }

            await reloadPlans();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось изменить статус тарифа");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setIsSaving(true);
            setErrorMessage("");

            const payload = {
                title: form.title,
                code: form.code,
                description: form.description,
                price: Number(form.price || 0),
                duration_days: Number(form.durationDays || 0),
                max_places: Number(form.placesLimit || 0),
                is_active: form.status === "active" ? 1 : 0,
            };

            if (isEditing) {
                await plansApi.updatePlan({
                    id: editingPlanId,
                    ...payload,
                });
            } else {
                await plansApi.createPlan(payload);
            }

            resetForm();
            await reloadPlans();
        } catch (error) {
            setErrorMessage(error.message || "Не удалось сохранить тариф");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="page plans-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Тарифы</p>

                    <h2>Тарифные планы Native Places</h2>

                    <p>
                        Управление тарифами для частных пользователей, риэлторов и
                        бизнеса. Цены, лимиты и сроки можно менять без переписывания кода.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="plans-empty">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="plans-empty">
                    Загружаем тарифы...
                </div>
            ) : (
                <>
                    <PlansStats stats={stats} />

                    <PlansTable
                        plans={plans}
                        statusItems={planStatusItems}
                        onEdit={handleEdit}
                        onChangeStatus={handleChangeStatus}
                    />
                </>
            )}

            <PlanForm
                form={form}
                statusItems={planStatusItems}
                isEditing={isEditing}
                isSaving={isSaving}
                onChange={handleFormChange}
                onSubmit={handleSubmit}
                onCancel={resetForm}
            />
        </section>
    );
}