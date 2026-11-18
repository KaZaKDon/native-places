import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { directoryApi } from "../shared/api/directoryApi";
import { Seo } from "../shared/seo/Seo";
import { NOINDEX_ROBOTS, SITE_URL, createBreadcrumbStructuredData } from "../shared/seo/seoConfig";
import "./DirectoryPage.css";

const evidenceTitle = { official: "Официальные сведения", research: "Научная публикация", verified_observation: "Личное наблюдение" };

export function DirectorySpeciesPage() {
    const { slug } = useParams();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        let live = true;
        setRecord(null); setLoading(true);
        directoryApi.speciesShow(slug).then(data => {
            if (live) { setRecord(data); setError(""); }
        }).catch(e => { if (live) setError(e.status===404 ? "Вид не найден или не опубликован." : (e.message || "Временная ошибка")); })
        .finally(() => { if (live) setLoading(false); });
        return () => { live = false; };
    }, [slug]);
    if (loading) return <main className="directory-public"><div className="directory-public__container">Загружаем сведения о виде…</div></main>;
    const fish = record?.species;
    if (!fish) return <>
        <Seo title="Вид не найден | Native Places" description="Вид справочника недоступен." canonical="/directory" robots={NOINDEX_ROBOTS}/>
        <main className="directory-public"><div className="directory-public__container"><h1>Вид не найден</h1><p>{error}</p><Link to="/directory">К справочнику</Link></div></main>
    </>;
    const path = `/directory/species/${fish.slug}`;
    const paragraphs = (fish.body || "").split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    return <>
        <Seo title={`${fish.common_name} (${fish.scientific_name || "вид рыбы"}) — описание | Native Places`}
            description={fish.summary} canonical={path}
            image={fish.cover_image_id ? `${SITE_URL}/api/directory/image.php?id=${fish.cover_image_id}` : undefined}
            structuredData={[
                createBreadcrumbStructuredData([{name:"Главная",path:"/"},{name:"Справочник",path:"/directory"},{name:fish.common_name,path}]),
                {"@context":"https://schema.org","@type":"DefinedTerm",name:fish.common_name,description:fish.summary,url:`${SITE_URL}${path}`,inDefinedTermSet:`${SITE_URL}/directory`},
            ]}
        />
        <main className="directory-public"><article className="directory-public__container directory-public__detail">
            <nav className="directory-public__breadcrumbs"><Link to="/">Главная</Link> / <Link to="/directory">Справочник</Link> / {fish.common_name}</nav>
            <p className="directory-public__eyebrow">Виды рыб · Бесплатный справочник</p>
            <h1>{fish.common_name}</h1>
            {fish.scientific_name && <p className="directory-public__region"><i>{fish.scientific_name}</i></p>}
            <p className="directory-public__lead">{fish.summary}</p>
            {fish.cover_image_id && <figure className="directory-public__species-hero"><img src={`/api/directory/image.php?id=${encodeURIComponent(fish.cover_image_id)}`} alt={record.cover?.alt_text || `${fish.common_name} — изображение вида`}/><figcaption>{record.cover?.caption || fish.common_name}. {record.cover?.author?.startsWith("ИИ: ") ? `ИИ-иллюстрация, инструмент: ${record.cover.author.slice(4)}.` : (record.cover?.author ? `Автор: ${record.cover.author}.` : "")}{record.cover?.license_name ? ` Основание использования: ${record.cover.license_name}.` : ""}</figcaption></figure>}
            <section className="directory-public__article"><h2>Описание вида</h2>{paragraphs.map((p,i)=><p key={i}>{p}</p>)}</section>
            {Array.isArray(record.occurrences) && record.occurrences.length > 0 && <section className="directory-public__species"><h2>Где отмечен вид</h2>
                <p className="directory-public__species-help">Сведения относятся к конкретным источникам и периодам наблюдения, а не гарантируют наличие рыбы в любой момент.</p>
                {record.occurrences.map((o,i)=><div className="directory-public__species-note" key={`${o.entry_slug}-${i}`}>
                    <Link to={`/directory/${o.type}/${o.entry_slug}`}>{o.entry_title}</Link>{o.region ? ` · ${o.region}` : ""}{o.segment_title ? ` · ${o.segment_title}` : ""}
                    <p>{evidenceTitle[o.evidence_level] || "Сведения из источника"}: {o.source_title}.</p>
                    {o.verified_at && <small>Дата сверки сведений: {o.verified_at}. Это не дата наблюдения.</small>}
                </div>)}
            </section>}
            <div className="directory-public__actions"><Link to="/directory">Все объекты</Link><Link to="/map">Общая карта</Link></div>
        </article></main>
    </>;
}
