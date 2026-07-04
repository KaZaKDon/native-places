import { useEffect, useMemo, useState } from "react";

import { DictionaryGroupForm } from "./components/DictionaryGroupForm";
import { DictionaryGroupsTable } from "./components/DictionaryGroupsTable";
import { DictionaryValueForm } from "./components/DictionaryValueForm";
import { DictionaryValuesTable } from "./components/DictionaryValuesTable";

import { dictionariesApi } from "../../shared/api/dictionariesApi";

import "./DictionariesPage.css";

const emptyDictionaryGroupForm = {
    title: "",
    code: "",
};

const emptyDictionaryValueForm = {
    title: "",
    code: "",
};

function mapGroupFromApi(group) {
    return {
        ...group,
        id: Number(group.id),
        usedInAttributes: [],
        valuesCount: Number(group.values_count || 0),
    };
}

function mapValueFromApi(value) {
    return {
        ...value,
        id: Number(value.id),
        groupId: Number(value.group_id),
    };
}

export function DictionariesPage() {
    const [groups, setGroups] = useState([]);
    const [values, setValues] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);

    const [groupForm, setGroupForm] = useState(emptyDictionaryGroupForm);
    const [valueForm, setValueForm] = useState(emptyDictionaryValueForm);

    const [editingGroupId, setEditingGroupId] = useState(null);
    const [editingValueId, setEditingValueId] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const isEditingGroup = editingGroupId !== null;
    const isEditingValue = editingValueId !== null;

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await dictionariesApi.getData();

                if (!isMounted) {
                    return;
                }

                const mappedGroups = (data.groups || []).map(mapGroupFromApi);
                const mappedValues = (data.values || []).map(mapValueFromApi);

                setGroups(mappedGroups);
                setValues(mappedValues);
                setSelectedGroupId(mappedGroups[0]?.id ?? null);
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить справочники");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    const groupsWithCounters = useMemo(() => {
        return groups.map((group) => ({
            ...group,
            valuesCount: values.filter((value) => value.groupId === group.id).length,
        }));
    }, [groups, values]);

    const selectedGroup = useMemo(() => {
        return groupsWithCounters.find((group) => group.id === selectedGroupId) || null;
    }, [groupsWithCounters, selectedGroupId]);

    const selectedValues = useMemo(() => {
        return values.filter((value) => value.groupId === selectedGroupId);
    }, [values, selectedGroupId]);

    function handleGroupFormChange(field, value) {
        setGroupForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function handleValueFormChange(field, value) {
        setValueForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function resetGroupForm() {
        setGroupForm(emptyDictionaryGroupForm);
        setEditingGroupId(null);
    }

    function resetValueForm() {
        setValueForm(emptyDictionaryValueForm);
        setEditingValueId(null);
    }

    function handleOpenGroup(group) {
        setSelectedGroupId(group.id);
        resetValueForm();
    }

    function handleEditGroup(group) {
        setEditingGroupId(group.id);
        setGroupForm({
            title: group.title || "",
            code: group.code || "",
        });
    }

    function handleDeleteGroup() {
        setErrorMessage("Удаление справочников подключим после backend endpoint.");
    }

    function handleEditValue(value) {
        setEditingValueId(value.id);
        setValueForm({
            title: value.title || "",
            code: value.code || "",
        });
    }

    async function handleDeleteValue(value) {
        try {
            await dictionariesApi.deleteValue(value.id);

            const data = await dictionariesApi.getData();

            setGroups(
                (data.groups || []).map(mapGroupFromApi)
            );

            setValues(
                (data.values || []).map(mapValueFromApi)
            );

            resetValueForm();
        } catch (error) {
            setErrorMessage(error.message);
        }
    }

    async function handleGroupSubmit(event) {
        event.preventDefault();

        try {
            if (isEditingGroup) {
                await dictionariesApi.updateGroup({
                    id: editingGroupId,
                    title: groupForm.title,
                    code: groupForm.code,
                });
            } else {
                await dictionariesApi.createGroup({
                    title: groupForm.title,
                    code: groupForm.code,
                });
            }

            const data = await dictionariesApi.getData();

            setGroups(
                (data.groups || []).map(mapGroupFromApi)
            );

            setValues(
                (data.values || []).map(mapValueFromApi)
            );

            resetGroupForm();
        } catch (error) {
            setErrorMessage(error.message);
        }
    }

    async function handleValueSubmit(event) {
        event.preventDefault();

        if (!selectedGroupId) {
            return;
        }

        try {
            if (isEditingValue) {
                await dictionariesApi.updateValue({
                    id: editingValueId,
                    code: valueForm.code,
                });
            } else {
                await dictionariesApi.createValue({
                    group_id: selectedGroupId,
                    title: valueForm.title,
                    code: valueForm.code,
                });
            }

            const data = await dictionariesApi.getData();

            setGroups(
                (data.groups || []).map(mapGroupFromApi)
            );

            setValues(
                (data.values || []).map(mapValueFromApi)
            );

            resetValueForm();
        } catch (error) {
            setErrorMessage(error.message);
        }
    }

    return (
        <section className="page dictionaries-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Справочники</p>

                    <h2>Группы и значения справочников</h2>

                    <p>
                        Справочники хранят повторяющиеся значения для характеристик:
                        виды рыб, виды охоты, услуги, материалы стен и другие списки.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="dictionaries-empty">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="dictionaries-empty">
                    Загружаем справочники...
                </div>
            ) : (
                <>
                    <DictionaryGroupsTable
                        groups={groupsWithCounters}
                        selectedGroupId={selectedGroupId}
                        onOpen={handleOpenGroup}
                        onEdit={handleEditGroup}
                        onDelete={handleDeleteGroup}
                    />

                    <DictionaryGroupForm
                        form={groupForm}
                        isEditing={isEditingGroup}
                        onChange={handleGroupFormChange}
                        onSubmit={handleGroupSubmit}
                        onCancel={resetGroupForm}
                    />

                    <DictionaryValuesTable
                        selectedGroup={selectedGroup}
                        values={selectedValues}
                        onEdit={handleEditValue}
                        onDelete={handleDeleteValue}
                    />

                    <DictionaryValueForm
                        selectedGroup={selectedGroup}
                        form={valueForm}
                        isEditing={isEditingValue}
                        onChange={handleValueFormChange}
                        onSubmit={handleValueSubmit}
                        onCancel={resetValueForm}
                    />
                </>
            )}
        </section>
    );
}