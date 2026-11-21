import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { directoryApi } from "../shared/api/directoryApi";
import { DirectoryDetailMap } from "../features/directory/DirectoryMapGeometry";
import { DIRECTORY_TYPES, directoryEntryDescription, directoryEntryPath, directoryEntryTitle } from "../features/directory/directoryConfig";
import { Seo } from "../shared/seo/Seo";
import { NOINDEX_ROBOTS, SITE_URL, createBreadcrumbStructuredData } from "../shared/seo/seoConfig";
import "./DirectoryPage.css";

const PROTECTED_CATEGORIES = {
    zapovednik: "Государственный природный заповедник",
    zakaznik: "Государственный природный заказник",
    national_park: "Национальный парк",
    natural_park: "Природный парк",
    nature_monument: "Памятник природы",
    other: "Другая ООПТ",
};

export function DirectoryEntryPage() {
    const { type, slug } = useParams();
    const [entry, setEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        setEntry(null);
        setLoading(true);
        directoryApi.show(type, slug).then((result) => {
            if (active) { setEntry(result.entry || null); setError(""); }
        }).catch((loadError) => {
            if (active) setError(loadError.status === 404 ? "Справочный объект не найден или не опубликован." : (loadError.message || "Справочник временно недоступен."));
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [type, slug]);
    if (loading) return <main className="directory-public"><div className="directory-public__container">Загружаем информацию…</div></main>;
    if (!entry) return <>
        <Seo title="Объект не найден | Native Places" description="Объект справочника недоступен." canonical="/directory" robots={NOINDEX_ROBOTS} />
        <main className="directory-public"><div className="directory-public__container"><h1>Объект не найден</h1><p>{error}</p><Link to="/directory">Вернуться в справочник</Link></div></main>
    </>;
    const path = directoryEntryPath(entry);
    const sourceUrl = /^https?:\/\//i.test(entry.source_url || "") ? entry.source_url : "";
    const detail = (entry.body || "").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    return <>
        <Seo
            title={directoryEntryTitle(entry)}
            description={directoryEntryDescription(entry)}
            canonical={path}
            structuredData={[
                createBreadcrumbStructuredData([{ name: "Главная", path: "/" }, { name: "Справочник", path: "/directory" }, { name: entry.title, path }]),
                { "@context": "https://schema.org", "@type": "Place", "@id": `${SITE_URL}${path}#place`, name: entry.title, description: entry.summary, url: `${SITE_URL}${path}` },
            ]}
        />
        <main className="directory-public"><article className="directory-public__container directory-public__detail">
            <nav className="directory-public__breadcrumbs" aria-label="Навигационная цепочка"><Link to="/">Главная</Link> / <Link to="/directory">Справочник</Link> / {entry.title}</nav>
            <p className="directory-public__eyebrow">{DIRECTORY_TYPES[entry.type]?.label || "Справочный объект"} · Бесплатная информация</p>
            <h1>{entry.title}</h1>
            {entry.region && <p className="directory-public__region">{entry.region}</p>}
            <p className="directory-public__lead">{entry.summary}</p>
            <DirectoryDetailMap entry={entry} />
            {["protected_area", "hunting_ground"].includes(entry.type) && <section className="directory-public__territory" aria-label="Правовой статус территории">
                <h2>Статус и территория</h2>
                {entry.type === "protected_area" && <p>Категория: {PROTECTED_CATEGORIES[entry.official_category] || "ООПТ"}</p>}
                <p>Официальное название: {entry.official_name}</p>
                {entry.managing_body && <p>Управляющая организация: {entry.managing_body}</p>}
                {entry.geometry && entry.boundary_source_url
                    ? <p>Контур: <a href={entry.boundary_source_url} target="_blank" rel="noopener noreferrer">источник границ</a>.</p>
                    : <p>Точный контур территории пока не опубликован.</p>}
                {entry.type === "protected_area" && entry.official_category === "zapovednik" && <p>Любительская и промысловая охота на территории заповедника запрещена. Особые мероприятия регулируются положением о заповеднике.</p>}
                {entry.access_rules
                    ? <><h3>{entry.type === "hunting_ground" ? "Сроки и ограничения охоты" : "Посещение и ограничения"}</h3><p className="directory-public__rules">{entry.access_rules}</p><p>Проверено: {entry.checked_at}. <a href={entry.access_source_url} target="_blank" rel="noopener noreferrer">Источник режима</a>.</p></>
                    : <p>{entry.type === "hunting_ground" ? "Сроки охоты и ограничения пока не подтверждены; уточняйте их по официальным документам." : "Режим посещения уточняйте у администрации территории."}</p>}
                {entry.legal_basis_url && <p><a href={entry.legal_basis_url} target="_blank" rel="noopener noreferrer">Правовой документ</a></p>}
            </section>}
            <section className="directory-public__article" aria-label="Описание объекта"><h2>Об объекте</h2>{detail.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>
            {Array.isArray(entry.species) && entry.species.length > 0 && <section className="directory-public__species" aria-label={entry.type === "river" || entry.type === "lake" ? "Виды рыб" : "Животные и птицы"}>
                <h2>{entry.type === "river" || entry.type === "lake" ? "Виды рыб" : "Животные и птицы"}</h2>
                <p className="directory-public__species-help">Сведения о присутствии видов приведены по проверенным источникам и относятся к зафиксированному периоду. {["protected_area", "hunting_ground"].includes(entry.type) && "Присутствие вида не означает разрешения на охоту."}</p>
                <div className="directory-public__species-grid">{entry.species.map(item => <article className="directory-public__species-card" key={item.slug}>
                    {item.cover_image_id && <img src={`/api/directory/image.php?id=${encodeURIComponent(item.cover_image_id)}`} alt={`${item.common_name} — иллюстрация или фотография вида`} loading="lazy" />}
                    <h3><Link to={`/directory/species/${item.slug}`}>{item.common_name}</Link></h3>
                    <p>{({fish:"Рыба",bird:"Птица",mammal:"Млекопитающее"})[item.kind] || "Вид"}</p>
                    {item.scientific_name && <p><i>{item.scientific_name}</i></p>}
                    <p>{item.summary}</p>
                    <Link to={`/directory/species/${item.slug}`}>Описание и источники</Link>
                </article>)}</div>
            </section>}
            {sourceUrl && <p className="directory-public__source">Источник сведений: <a href={sourceUrl} rel="noopener noreferrer" target="_blank">Открыть источник</a>.</p>}
            <div className="directory-public__actions"><Link to="/directory">Все объекты</Link><Link to="/map">Общая карта</Link></div>
            {entry.type === "hunting_ground" && <p className="directory-public__notice">Информация о границах территории не заменяет официальные сведения о разрешениях и условиях охоты.</p>}
            {entry.type === "protected_area" && <p className="directory-public__notice">Режим доступа зависит от конкретной территории и действующих документов. Перед поездкой уточняйте его у администрации.</p>}
        </article></main>
    </>;
}
