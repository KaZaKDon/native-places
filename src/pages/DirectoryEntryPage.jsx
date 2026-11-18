import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { directoryApi } from "../shared/api/directoryApi";
import { DirectoryDetailMap } from "../features/directory/DirectoryMapGeometry";
import { DIRECTORY_TYPES, directoryEntryDescription, directoryEntryPath, directoryEntryTitle } from "../features/directory/directoryConfig";
import { Seo } from "../shared/seo/Seo";
import { NOINDEX_ROBOTS, SITE_URL, createBreadcrumbStructuredData } from "../shared/seo/seoConfig";
import "./DirectoryPage.css";

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
            <section className="directory-public__article" aria-label="Описание объекта"><h2>Об объекте</h2>{detail.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>
            {Array.isArray(entry.species) && entry.species.length > 0 && <section className="directory-public__species" aria-label="Виды рыб">
                <h2>Виды рыб</h2>
                <p className="directory-public__species-help">Сведения о присутствии видов приведены по указанным источникам и относятся к зафиксированному периоду наблюдений.</p>
                <div className="directory-public__species-grid">{entry.species.map(fish => <article className="directory-public__species-card" key={fish.slug}>
                    {fish.cover_image_id && <img src={`/api/directory/image.php?id=${encodeURIComponent(fish.cover_image_id)}`} alt={`${fish.common_name} — иллюстрация или фотография вида`} loading="lazy" />}
                    <h3><Link to={`/directory/species/${fish.slug}`}>{fish.common_name}</Link></h3>
                    {fish.scientific_name && <p><i>{fish.scientific_name}</i></p>}
                    <p>{fish.summary}</p>
                    <Link to={`/directory/species/${fish.slug}`}>Описание и источники</Link>
                </article>)}</div>
            </section>}
            {sourceUrl && <p className="directory-public__source">Источник сведений: <a href={sourceUrl} rel="noopener noreferrer" target="_blank">Открыть источник</a>. Геоданные OpenStreetMap доступны на условиях ODbL.</p>}
            <div className="directory-public__actions"><Link to="/directory">Все объекты</Link><Link to="/map">Общая карта</Link></div>
            {entry.type === "hunting_ground" && <p className="directory-public__notice">Информация о границах территории не заменяет официальные сведения о разрешениях и условиях охоты.</p>}
        </article></main>
    </>;
}
