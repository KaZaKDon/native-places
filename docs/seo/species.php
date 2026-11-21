<?php
declare(strict_types=1);
// Server-rendered species pages: ONLY published, evidence-linked records.
function seoSpeciesVisibleExpr(): string {
    return "EXISTS (SELECT 1 FROM directory_species_occurrences o JOIN directory_entries e
        ON e.id=o.entry_id AND e.status='published'
        WHERE o.species_id=s.id AND o.status='published')";
}
function seoSpeciesCoverExpr(): string {
    return "(SELECT m.id FROM directory_media_links ml JOIN directory_media m ON m.id=ml.media_id AND m.status='published'
        WHERE ml.species_id=s.id ORDER BY ml.is_cover DESC,ml.sort_order ASC,m.id ASC LIMIT 1)";
}
function seoSpeciesPublishedList(PDO $pdo, int $limit=500): array {
    $limit=min(max(1,$limit),1000);
    $sql = "SELECT s.slug,s.kind,s.common_name,s.scientific_name,s.summary,s.updated_at,".seoSpeciesCoverExpr()." AS cover_image_id
        FROM directory_species s WHERE s.kind IN ('fish','bird','mammal') AND s.status='published' AND ".seoSpeciesVisibleExpr().
        ' ORDER BY s.common_name ASC LIMIT '.$limit;
    return $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
}
function seoSpeciesShow(PDO $pdo, string $slug): ?array {
    $stmt=$pdo->prepare("SELECT s.id,s.slug,s.kind,s.common_name,s.scientific_name,s.summary,s.body,s.updated_at,".
        seoSpeciesCoverExpr()." AS cover_image_id FROM directory_species s
        WHERE s.status='published' AND s.kind IN ('fish','bird','mammal') AND s.slug=:slug AND ".seoSpeciesVisibleExpr().' LIMIT 1');
    $stmt->execute(['slug'=>$slug]);
    $fish=$stmt->fetch(PDO::FETCH_ASSOC);
    if (!$fish) return null;
    $q=$pdo->prepare("SELECT DISTINCT e.title,e.type,e.slug,e.region,o.evidence_level,src.title AS source_title,
        CASE WHEN seg.status='published' THEN seg.title ELSE NULL END AS segment_title
        FROM directory_species_occurrences o
        JOIN directory_entries e ON e.id=o.entry_id AND e.status='published'
        JOIN directory_sources src ON src.id=o.source_id
        LEFT JOIN directory_segments seg ON seg.id=o.segment_id
        WHERE o.species_id=:id AND o.status='published' ORDER BY e.title,src.title LIMIT 120");
    $q->execute(['id'=>$fish['id']]);
    $fish['occurrences']=$q->fetchAll(PDO::FETCH_ASSOC);
    return $fish;
}
function seoSpeciesOfEntry(PDO $pdo, int $entryId, string $type = 'river'): array {
    $kinds = in_array($type, ['river','lake'], true) ? "s.kind='fish'" : "s.kind IN ('bird','mammal')";
    $q=$pdo->prepare("SELECT DISTINCT s.slug,s.kind,s.common_name,s.summary
        FROM directory_species_occurrences o JOIN directory_species s ON s.id=o.species_id
        WHERE o.entry_id=:entry AND o.status='published' AND s.status='published' AND $kinds
        ORDER BY s.common_name ASC LIMIT 80");
    $q->execute(['entry'=>$entryId]);
    return $q->fetchAll(PDO::FETCH_ASSOC);
}
function seoSpeciesSnapshot(array $fish): string {
    $parts=preg_split('/\n\s*\n/u',str_replace("\r",'',(string)($fish['body']??''))) ?: [];
    $paragraphs='';
    foreach ($parts as $part) { $part=trim($part); if ($part!=='') $paragraphs.='<p>'.nl2br(seoHtmlEscape($part),false).'</p>'; }
    $picture = !empty($fish['cover_image_id'])
        ? '<img class="server-seo-snapshot__image" src="/api/directory/image.php?id='.(int)$fish['cover_image_id'].'" alt="'.seoHtmlEscape($fish['common_name']).' — изображение вида" loading="lazy">'
        : '';
    $occ='';
    foreach ($fish['occurrences'] as $o) {
        $label=match ($o['evidence_level']) {'official'=>'Официальные сведения','research'=>'Научная публикация','verified_observation'=>'Личное наблюдение',default=>'Источник'};
        $entryUrl='/directory/'.rawurlencode($o['type']).'/'.rawurlencode($o['slug']);
        $occ.='<li><a href="'.seoHtmlEscape($entryUrl).'">'.seoHtmlEscape($o['title']).'</a>'
            .($o['segment_title'] ? ' · '.seoHtmlEscape($o['segment_title']) : '')
            .' — '.seoHtmlEscape($label).': '.seoHtmlEscape($o['source_title']).'</li>';
    }
    return seoSnapshotLayout('<p><a href="/directory">Справочник мест</a></p>'
        .'<p>'.seoHtmlEscape(['fish'=>'Виды рыб','bird'=>'Птицы','mammal'=>'Млекопитающие'][$fish['kind'] ?? 'fish'] ?? 'Виды животных').'</p><h1>'.seoHtmlEscape($fish['common_name']).'</h1>'
        .(!empty($fish['scientific_name'])?'<p><i>'.seoHtmlEscape($fish['scientific_name']).'</i></p>':'')
        .'<p>'.seoHtmlEscape($fish['summary']).'</p>'.$picture
        .'<h2>Описание вида</h2>'.$paragraphs
        .'<h2>Где отмечен вид</h2><p>Данные относятся к источникам и периодам наблюдений, не гарантируют присутствия вида сегодня и не определяют правила охоты.</p>'
        .'<ul>'.$occ.'</ul>'.seoSnapshotNavigation());
}
