import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { directoryApi } from "../shared/api/directoryApi";
import { DIRECTORY_TYPES, directoryEntryPath } from "../features/directory/directoryConfig";
import { Seo } from "../shared/seo/Seo";
import { SITE_URL, NOINDEX_FOLLOW_ROBOTS, createBreadcrumbStructuredData } from "../shared/seo/seoConfig";
import "./DirectoryPage.css";

export function DirectoryPage() {
    const [entries, setEntries] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const result = await directoryApi.list({ page });
                if (!active) return;
                setEntries((current) => page === 1 ? (result.entries || []) : [...current, ...(result.entries || [])]);
                setHasMore(Boolean(result.has_more));
                setError("");
            } catch (loadError) {
                if (active) setError(loadError.message || "Не удалось загрузить справочник");
            } finally {
                if (active) setLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [page]);
    const path = "/directory";
    return (
        <>
            <Seo
                title="Справочник рек, природных мест и достопримечательностей | Native Places"
                description="Бесплатный справочник рек, водоёмов, природных территорий, охотничьих угодий и интересных мест. Описания и география на карте Native Places."
                canonical={path}
                robots={loading || error || entries.length === 0 ? NOINDEX_FOLLOW_ROBOTS : undefined}
                structuredData={[
                    createBreadcrumbStructuredData([{ name: "Главная", path: "/" }, { name: "Справочник", path }]),
                    { "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${SITE_URL}${path}#collection`, name: "Справочник мест", url: `${SITE_URL}${path}`, inLanguage: "ru-RU" },
                ]}
            />
            <main className="directory-public">
                <div className="directory-public__container">
                    <nav className="directory-public__breadcrumbs" aria-label="Навигационная цепочка"><Link to="/">Главная</Link> / Справочник</nav>
                    <p className="directory-public__eyebrow">Природные места и география</p>
                    <h1>Справочник мест</h1>
                    <p className="directory-public__lead">Реки, водоёмы, природные территории и достопримечательности. Информация доступна бесплатно и не является платным объявлением.</p>
                    <div className="directory-public__actions"><Link to="/map">Смотреть на карте</Link><Link to="/categories">Категории объявлений</Link></div>
                    {error && <p role="alert" className="directory-public__error">{error}</p>}
                    {loading && page === 1 ? <p>Загружаем справочник…</p> : null}
                    {!loading && !error && entries.length === 0 && <p>Пока нет опубликованных справочных объектов.</p>}
                    <section className="directory-public__grid" aria-label="Опубликованные справочные объекты">
                        {entries.map((entry) => <article className="directory-public__card" key={entry.id}>
                            <p className="directory-public__type">{DIRECTORY_TYPES[entry.type]?.label || "Место"}{entry.region ? ` · ${entry.region}` : ""}</p>
                            <h2><Link to={directoryEntryPath(entry)}>{entry.title}</Link></h2>
                            <p>{entry.summary}</p>
                            <Link className="directory-public__read" to={directoryEntryPath(entry)}>Подробнее об объекте</Link>
                        </article>)}
                    </section>
                    {hasMore && !loading && <button type="button" className="directory-public__more" onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Показать ещё</button>}
                </div>
            </main>
        </>
    );
}
