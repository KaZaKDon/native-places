import { useCallback, useEffect, useMemo, useState } from 'react';
import { directorySegmentsApi, directorySpeciesApi } from '../../../shared/api/directoryApi';
import { EMPTY_SPECIES, EMPTY_OCCURRENCE, EMPTY_PHOTO, EMPTY_SOURCE, PHOTO_ORIGINS, EVIDENCE_LEVELS, SPECIES_KINDS, validateSpecies, validateOccurrence, validatePhoto } from './speciesModel.js';
import './SpeciesEditor.css';

const asDate = () => new Date().toLocaleDateString('sv-SE');

export function SpeciesEditor({ entries, csrfToken, mode = 'fish' }) {
    const [species, setSpecies] = useState([]);
    const [sources, setSources] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [form, setForm] = useState(null);
    const [occurrenceForm, setOccurrenceForm] = useState(null);
    const [sourceForm, setSourceForm] = useState(null);
    const [photoForm, setPhotoForm] = useState(null);
    const [occurrences, setOccurrences] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const refresh = useCallback(async () => {
        const [listed, proof] = await Promise.all([directorySpeciesApi.list(), directorySegmentsApi.sources()]);
        setSpecies(Array.isArray(listed.species) ? listed.species : []);
        setSources(Array.isArray(proof.sources) ? proof.sources : []);
    }, []);

    useEffect(() => {
        let live = true;
        Promise.all([directorySpeciesApi.list(),directorySegmentsApi.sources()]).then(([listed, proof]) => {
            if (!live) return;
            setSpecies(Array.isArray(listed.species) ? listed.species : []);
            setSources(Array.isArray(proof.sources) ? proof.sources : []);
        }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
        return () => { live = false; };
    }, []);

    useEffect(() => {
        let live = true;
        if (!selectedId) return;
        Promise.all([directorySpeciesApi.occurrences(selectedId),directorySpeciesApi.media(selectedId)])
            .then(([o,m]) => { if (live) { setOccurrences(o.occurrences || []); setPhotos(m.media || []); } })
            .catch(e => { if (live) setError(e.message); });
        return () => { live = false; };
    }, [selectedId]);

    const selected = useMemo(() => species.find(s => String(s.id) === String(selectedId)), [species,selectedId]);
    const riverEntries = useMemo(() => entries.filter(e => mode === 'fish' ? ['river','lake'].includes(e.type) : ['protected_area','hunting_ground'].includes(e.type)), [entries, mode]);
    const visibleSpecies = species.filter(s => mode === 'fish' ? s.kind === 'fish' : ['bird','mammal'].includes(s.kind));
    const evidenceSourceKind = {official:'official',research:'scientific',verified_observation:'observation'};

    useEffect(() => {
        let live = true;
        const entryId = occurrenceForm?.entry_id;
        const entry = riverEntries.find(e => String(e.id) === String(entryId));
        if (!entryId || entry?.type !== 'river') return;
        directorySegmentsApi.list(entryId).then(d => { if (live) setSegments(d.segments || []); })
            .catch(e => { if (live) setError(e.message); });
        return () => { live = false; };
    }, [occurrenceForm?.entry_id, riverEntries]);

    const update = (setter, name, value) => setter(old => ({ ...old, [name]:value }));
    const clearFeedback = () => { setError(''); setMessage(''); };
    async function saveSpecies(event) {
        event.preventDefault();
        const problems = validateSpecies(form);
        if (problems.length) { setError(problems.join(' ')); return; }
        if (!csrfToken) { setError('CSRF-токен недоступен. Обновите страницу.'); return; }
        setBusy(true); clearFeedback();
        try {
            const result = await directorySpeciesApi.save(form, csrfToken);
            await refresh();
            setSelectedId(String(result.species.id));
            setForm(null);
            setMessage('Черновик вида сохранён. Теперь можно прикрепить источник, сведения о встречаемости и фото.');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function setPublication(item) {
        const publish = item.status === 'draft';
        const prompt = publish
            ? `Опубликовать «${item.common_name}», его подтверждённые привязки и изображения? Все эти данные станут общедоступными.`
            : `Снять с публикации «${item.common_name}» вместе со сведениями и фотографиями?`;
        if (!window.confirm(prompt)) return;
        setBusy(true); clearFeedback();
        try {
            await directorySpeciesApi.setPublication(item.id, publish ? 'publish' : 'unpublish', csrfToken);
            await refresh();
            if (String(selectedId) === String(item.id)) {
                const [o,m] = await Promise.all([directorySpeciesApi.occurrences(item.id),directorySpeciesApi.media(item.id)]);
                setOccurrences(o.occurrences || []); setPhotos(m.media || []);
            }
            setMessage(publish ? 'Вид опубликован. Проверьте публичную страницу и Sitemap.' : 'Вид и его изображения сняты с публикации.');
        } catch(e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function saveOccurrence(event) {
        event.preventDefault();
        const problems = validateOccurrence(occurrenceForm);
        if (problems.length) { setError(problems.join(' ')); return; }
        setBusy(true); clearFeedback();
        try {
            await directorySpeciesApi.saveOccurrence({ ...occurrenceForm, species_id:Number(selectedId), entry_id:Number(occurrenceForm.entry_id),
                segment_id:occurrenceForm.segment_id ? Number(occurrenceForm.segment_id) : null,
                source_id:Number(occurrenceForm.source_id) }, csrfToken);
            const res = await directorySpeciesApi.occurrences(selectedId);
            setOccurrences(res.occurrences || []); setOccurrenceForm(null);
            setMessage('Черновик связи вида с природным объектом сохранён. Он не виден посетителям.');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function saveSource(event) {
        event.preventDefault();
        setBusy(true); clearFeedback();
        try {
            const res = await directorySegmentsApi.addSource(sourceForm, csrfToken);
            const s = await directorySegmentsApi.sources();
            setSources(s.sources || []);
            setSourceForm(null);
            if (res.source?.id) setOccurrenceForm(old => old ? {...old, source_id:String(res.source.id)} : old);
            setMessage('Источник зарегистрирован. Укажите, что именно он подтверждает.');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function savePhoto(event) {
        event.preventDefault();
        const problems = validatePhoto(photoForm);
        if (problems.length) { setError(problems.join(' ')); return; }
        setBusy(true); clearFeedback();
        try {
            await directorySpeciesApi.uploadPhoto(selectedId, photoForm, csrfToken);
            const m = await directorySpeciesApi.media(selectedId);
            setPhotos(m.media || []);
            setPhotoForm(null);
            setMessage('Изображение сохранено приватно и видно только администратору.');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }
    async function deleteOccurrence(item) {
        if (!window.confirm(`Удалить черновик связи «${item.entry_title}»?`)) return;
        setBusy(true); clearFeedback();
        try { await directorySpeciesApi.deleteOccurrence(item.id, selectedId, csrfToken);
            const response = await directorySpeciesApi.occurrences(selectedId); setOccurrences(response.occurrences || []); setMessage('Связь удалена.');
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    async function deletePhoto(item) {
        if (!window.confirm(`Удалить фотографию №${item.id}? Действие необратимо.`)) return;
        setBusy(true); clearFeedback();
        try { await directorySpeciesApi.deletePhoto(item.id, selectedId, csrfToken);
            const response = await directorySpeciesApi.media(selectedId); setPhotos(response.media || []); setMessage('Фотография удалена.');
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    }
    function choose(id) {
        setSelectedId(String(id)); setForm(null); setOccurrenceForm(null); setPhotoForm(null); setSourceForm(null);
        setOccurrences([]); setPhotos([]); clearFeedback();
    }

    return <section className="directory-species">
        <div className="directory-species__top">
            <div><h3>{mode === 'fish' ? 'Виды рыб' : 'Животные и птицы'}</h3><p>Единая база видов. Присутствие в конкретном объекте указывается отдельно и только с источником подтверждения. {mode === 'fauna' && 'Список видов не определяет право на охоту. '}Публикация выполняется после проверки описания, источников и изображений.</p></div>
            <button type="button" className="directory-action directory-action--primary" disabled={!csrfToken || loading || busy} onClick={() => {setForm({...EMPTY_SPECIES,kind:mode === 'fish' ? 'fish' : 'mammal'});clearFeedback();}}>Добавить вид</button>
        </div>
        {error && <p role="alert" className="directory-message directory-message--error">{error}</p>}
        {message && <p role="status" className="directory-message directory-message--success">{message}</p>}
        {form && <form className="directory-form" onSubmit={saveSpecies}>
            <div className="directory-form__heading"><h3>{form.id ? `Редактировать вид №${form.id}`:'Новый вид'}</h3><button className="directory-action" type="button" disabled={busy} onClick={()=>setForm(null)}>Закрыть</button></div>
            <div className="directory-form__grid">
                {mode === 'fauna' && <label>Группа вида *<select value={form.kind} onChange={e=>update(setForm,'kind',e.target.value)}>{SPECIES_KINDS.filter(k=>['bird','mammal'].includes(k.value)).map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label>}
                <label>Название *<input required maxLength={180} value={form.common_name} onChange={e=>update(setForm,'common_name',e.target.value)} placeholder={mode === 'fish' ? 'Например, окунь' : form.kind === 'bird' ? 'Например, журавль' : 'Например, лось'}/></label>
                <label>Slug *<input required maxLength={160} value={form.slug} onChange={e=>update(setForm,'slug',e.target.value.toLowerCase())} placeholder={mode === 'fish' ? 'okun' : form.kind === 'bird' ? 'zhuravl' : 'los'}/></label>
                <label className="directory-form__wide">Научное название (только проверенное)<input maxLength={180} value={form.scientific_name || ''} onChange={e=>update(setForm,'scientific_name',e.target.value)} placeholder="Необязательно для черновика"/></label>
                <label className="directory-form__wide">Краткое описание<textarea rows={3} maxLength={500} value={form.summary} onChange={e=>update(setForm,'summary',e.target.value)}/></label>
                <label className="directory-form__wide">Подробные сведения<textarea rows={5} maxLength={10000} value={form.body} onChange={e=>update(setForm,'body',e.target.value)}/></label>
            </div>
            <button type="submit" disabled={busy} className="directory-action directory-action--primary">{busy?'Сохраняем…':'Сохранить черновик вида'}</button>
        </form>}
        <div className="directory-list directory-species__list">{loading ? <p>Загружаем виды…</p> : visibleSpecies.length === 0 ? <p>В этой группе видов пока нет. Создайте первый черновик.</p> : <table>
            <thead><tr><th>Вид</th><th>Научное название</th><th>Статус</th><th>Действие</th></tr></thead>
            <tbody>{visibleSpecies.map(s=><tr key={s.id}><td><strong>{s.common_name}</strong><div className="directory-species__muted">/{s.slug} · {SPECIES_KINDS.find(k=>k.value===s.kind)?.label}</div></td><td>{s.scientific_name || '—'}</td><td>{s.status==='published' ? 'Опубликован' : 'Черновик'}</td><td><button type="button" className="directory-action" onClick={()=>choose(s.id)}>Открыть</button></td></tr>)}</tbody>
        </table>}</div>
        {selected && <div className="directory-species__editor">
            <div className="directory-species__subsection"><div className="directory-species__top"><div><h3>{selected.common_name}</h3><p>{selected.status==='published' ? 'Вид опубликован. Для редактирования сначала снимите его с публикации.' : 'Вид — черновик. Для публикации необходимы содержательное описание, подтверждённая привязка и изображение.'} {mode === 'fish' ? 'Сведения о встречаемости не распространяются автоматически на все участки.' : 'Сведения о встречаемости не распространяются автоматически на другие территории.'}</p></div><button type="button" className="directory-action" disabled={selected.status!=='draft'} onClick={()=>{setForm({...EMPTY_SPECIES,...selected});clearFeedback();}}>Редактировать описание</button><button type="button" className="directory-action directory-action--primary" disabled={busy || !csrfToken} onClick={()=>setPublication(selected)}>{selected.status==='published' ? 'Снять с публикации' : 'Опубликовать вид'}</button>{selected.status==='published' && <a href={`/directory/species/${selected.slug}`} target="_blank" rel="noopener noreferrer">Публичная карточка</a>}</div></div>
            <div className="directory-species__subsection">
                <div className="directory-species__top"><h4>Где встречается (подтверждённые сведения)</h4><button type="button" className="directory-action" disabled={busy || selected.status!=='draft'} onClick={()=>{setOccurrenceForm({...EMPTY_OCCURRENCE,species_id:String(selectedId),verified_at:asDate()});setSegments([]);clearFeedback();}}>{mode === 'fish' ? 'Привязать к реке или участку' : 'Привязать к территории'}</button></div>
                {occurrences.length===0 ? <p className="directory-species__muted">Пока нет записей о встречаемости. Никаких предположений добавлять не будем.</p> : <div className="directory-species__list"><table><thead><tr><th>Природный объект</th><th>Участок</th><th>Источник</th><th>Проверено</th><th>Действие</th></tr></thead><tbody>{occurrences.map(o=><tr key={o.id}><td>{o.entry_title}</td><td>{o.segment_title || 'В целом по объекту'}</td><td>{o.source_title}</td><td>{o.verified_at}</td><td><button className="directory-action" type="button" disabled={selected.status!=='draft'} onClick={()=>{setOccurrenceForm({...EMPTY_OCCURRENCE,...o,entry_id:String(o.entry_id),segment_id:String(o.segment_id || ''),source_id:String(o.source_id)});clearFeedback();}}>Редактировать</button> <button className="directory-action" type="button" disabled={busy || selected.status!=='draft'} onClick={()=>deleteOccurrence(o)}>Удалить</button></td></tr>)}</tbody></table></div>}
                {occurrenceForm && <form className="directory-form" onSubmit={saveOccurrence}><div className="directory-form__heading"><h4>Связь вида с природным объектом</h4><button className="directory-action" type="button" onClick={()=>setOccurrenceForm(null)}>Закрыть</button></div><div className="directory-form__grid">
                    <label>{mode === 'fish' ? 'Река / водоём' : 'ООПТ / охотугодье'} *<select required value={occurrenceForm.entry_id} onChange={e=>setOccurrenceForm(o=>({...o,entry_id:e.target.value,segment_id:''}))}><option value="">Выберите объект</option>{riverEntries.map(r=><option key={r.id} value={r.id}>{r.title} — {r.region}</option>)}</select></label>
                    {mode === 'fish' && <label>Участок (необязательный)<select value={occurrenceForm.segment_id} onChange={e=>update(setOccurrenceForm,'segment_id',e.target.value)} disabled={!riverEntries.find(e=>String(e.id)===String(occurrenceForm.entry_id) && e.type==='river')}><option value="">Только связь с рекой целиком</option>{segments.map(s=><option key={s.id} value={s.id}>{s.title} ({s.status})</option>)}</select></label>}
                    <label>Степень подтверждения *<select value={occurrenceForm.evidence_level} onChange={e=>setOccurrenceForm(o=>({...o,evidence_level:e.target.value,source_id:''}))}>{EVIDENCE_LEVELS.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
                    <label>Дата проверки *<input required type="date" value={occurrenceForm.verified_at} onChange={e=>update(setOccurrenceForm,'verified_at',e.target.value)}/></label>
                    <label className="directory-form__wide">Источник факта о виде *<select required value={occurrenceForm.source_id} onChange={e=>update(setOccurrenceForm,'source_id',e.target.value)}><option value="">Выберите источник (карта OSM не подтверждает присутствие вида)</option>{sources.filter(s => s.source_kind === evidenceSourceKind[occurrenceForm.evidence_level]).map(s=><option key={s.id} value={s.id}>{s.title} — {s.accessed_at}</option>)}</select></label>
                    <div className="directory-form__wide"><button className="directory-action" type="button" onClick={()=>{setSourceForm({...EMPTY_SOURCE,accessed_at:asDate()});clearFeedback();}}>Добавить источник</button></div>
                    <label className="directory-form__wide">Примечание / точность сведений<textarea maxLength={2000} rows={3} value={occurrenceForm.notes} onChange={e=>update(setOccurrenceForm,'notes',e.target.value)}/></label>
                </div><button type="submit" disabled={busy} className="directory-action directory-action--primary">Сохранить черновик связи</button></form>}
                {sourceForm && <form className="directory-form" onSubmit={saveSource}><div className="directory-form__heading"><h4>Новый источник подтверждения</h4><button type="button" className="directory-action" onClick={()=>setSourceForm(null)}>Закрыть</button></div><div className="directory-form__grid">
                    <label>Название *<input required maxLength={250} value={sourceForm.title} onChange={e=>update(setSourceForm,'title',e.target.value)}/></label>
                    <label>Вид источника<select value={sourceForm.source_kind} onChange={e=>update(setSourceForm,'source_kind',e.target.value)}><option value="official">Официальный</option><option value="scientific">Научный</option><option value="observation">Наблюдение</option><option value="other">Прочий</option></select></label>
                    <label>Издатель<input maxLength={250} value={sourceForm.publisher} onChange={e=>update(setSourceForm,'publisher',e.target.value)}/></label>
                    <label>Дата проверки *<input required type="date" value={sourceForm.accessed_at} onChange={e=>update(setSourceForm,'accessed_at',e.target.value)}/></label>
                    <label className="directory-form__wide">URL источника (необязательно)<input type="url" placeholder="Для книги или наблюдения оставьте пустым" maxLength={1000} value={sourceForm.url} onChange={e=>update(setSourceForm,'url',e.target.value)}/></label>
                    <label>Дата публикации<input type="date" value={sourceForm.published_on} onChange={e=>update(setSourceForm,'published_on',e.target.value)}/></label>
                    <label>Лицензия<input value={sourceForm.license_name} maxLength={180} onChange={e=>update(setSourceForm,'license_name',e.target.value)}/></label>
                    <label>URL лицензии<input type="url" maxLength={1000} value={sourceForm.license_url} onChange={e=>update(setSourceForm,'license_url',e.target.value)}/></label>
                    <label className="directory-form__wide">Комментарий / библиографические реквизиты<textarea placeholder="Книга: автор, издание, год, страницы. Наблюдение: место и примерный период." maxLength={2000} value={sourceForm.comment} onChange={e=>update(setSourceForm,'comment',e.target.value)}/></label>
                </div><button className="directory-action directory-action--primary" disabled={busy} type="submit">Сохранить источник</button></form>}
            </div>
            <div className="directory-species__subsection"><div className="directory-species__top"><h4>Изображения вида (закрытая медиатека)</h4><button className="directory-action" type="button" disabled={busy || photos.length>=8 || selected.status!=='draft'} onClick={()=>{setPhotoForm({...EMPTY_PHOTO});clearFeedback();}}>Загрузить изображение</button></div>
                {photos.length===0 && <p className="directory-species__muted">Изображений нет. Допустимы фотографии с разрешённым использованием и собственные ИИ-иллюстрации. Пока изображения не видны посетителям.</p>}
                <div className="directory-species__photos">{photos.map(p=><div className="directory-species__photo" key={p.id}><img src={directorySpeciesApi.imageUrl(p.id)} alt={p.alt_text || p.caption || selected.common_name} loading="lazy"/><strong>{p.caption || selected.common_name}</strong><small>{p.license_name?.startsWith('ИИ-иллюстрация') ? 'Инструмент: ' + p.author.replace(/^ИИ: /, '') : 'Автор: ' + p.author}</small><small>Основание: {p.license_name}</small><small>{p.is_cover ? 'Основное фото · ' : ''}{p.status==='draft'?'Черновик':'Опубликовано'}</small><button className="directory-action" type="button" disabled={busy || selected.status!=='draft'} onClick={()=>deletePhoto(p)}>Удалить фото</button></div>)}</div>
                {photoForm && <form className="directory-form" onSubmit={savePhoto}><div className="directory-form__heading"><h4>Загрузить изображение</h4><button className="directory-action" type="button" disabled={busy} onClick={()=>setPhotoForm(null)}>Закрыть</button></div>
                    <p className="directory-species__source-help">JPEG, PNG или WebP до 3 МБ; после безопасной обработки максимум 1600 px. PHP GD обязателен. Файлы хранятся закрыто в MySQL. Изображение, найденное в поиске, не считается созданным ИИ.</p>
                    <div className="directory-form__grid">
                        <label className="directory-form__wide">Файл *<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>update(setPhotoForm,'image',e.target.files?.[0] || null)}/></label>
                        <label className="directory-form__wide">Происхождение изображения *<select value={photoForm.image_origin} onChange={e=>update(setPhotoForm,'image_origin',e.target.value)}>{PHOTO_ORIGINS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                        {photoForm.image_origin === 'ai_generated' ? <>
                            <label className="directory-form__wide">Инструмент ИИ-генерации *<input required value={photoForm.ai_tool} maxLength={190} onChange={e=>update(setPhotoForm,'ai_tool',e.target.value)} placeholder="Например, ChatGPT (OpenAI)"/></label>
                            <p className="directory-form__wide directory-species__source-help">Отдельная лицензия на чужую фотографию не нужна, если изображение действительно было сгенерировано ИИ и у вас есть право его разместить. В карточке оно будет помечено как ИИ-иллюстрация, а не документальный снимок вида.</p>
                        </> : <>
                            <label>Автор *<input required value={photoForm.author} maxLength={250} onChange={e=>update(setPhotoForm,'author',e.target.value)}/></label>
                            <label>Лицензия / основание использования *<input required value={photoForm.license_name} maxLength={180} onChange={e=>update(setPhotoForm,'license_name',e.target.value)} placeholder="Например, собственное фото"/></label>
                        </>}
                        <label>Подпись<input value={photoForm.caption} maxLength={300} onChange={e=>update(setPhotoForm,'caption',e.target.value)}/></label>
                        <label>Alt — описание изображения<input value={photoForm.alt_text} maxLength={300} onChange={e=>update(setPhotoForm,'alt_text',e.target.value)}/></label>
                        <label className="directory-form__wide">Ссылка на оригинал (если внешний источник)<input type="url" value={photoForm.source_url} maxLength={1000} onChange={e=>update(setPhotoForm,'source_url',e.target.value)}/></label>
                        <label className="directory-form__wide">Ссылка на лицензию<input type="url" value={photoForm.license_url} maxLength={1000} onChange={e=>update(setPhotoForm,'license_url',e.target.value)}/></label>
                        <label className="directory-form__wide">Текст атрибуции<textarea value={photoForm.attribution} maxLength={1000} rows={2} onChange={e=>update(setPhotoForm,'attribution',e.target.value)}/></label>
                        <label className="directory-form__wide directory-species__checkbox"><input type="checkbox" checked={photoForm.rights_confirmed} onChange={e=>update(setPhotoForm,'rights_confirmed',e.target.checked)}/><span>{photoForm.image_origin === 'ai_generated' ? 'Подтверждаю, что файл действительно создан ИИ (не скачан как чужое фото) и его можно размещать на сайте *' : 'Подтверждаю право использования изображения и корректность сведений об авторе и основании использования *'}</span></label>
                    </div><button className="directory-action directory-action--primary" type="submit" disabled={busy}>Сохранить изображение в черновики</button></form>}
            </div>
        </div>}
    </section>;
}
