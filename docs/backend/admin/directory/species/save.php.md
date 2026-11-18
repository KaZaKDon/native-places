# api/admin/directory/species/save.php

**Статус:** код подготовлен для хостинга в v0.4b; не развёрнут. Локально только текстовая копия PHP.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
$admin = requireAdmin();
$input = speciesInput();
directoryAssertCsrf($input);
$id = speciesId($input['id'] ?? null, 'id', true);
$kind = directoryString($input, 'kind', 32);
if (!in_array($kind, ['fish', 'bird', 'mammal', 'plant', 'other'], true)) errorResponse('Неизвестная группа вида', 422);
$slug = speciesSlug($input);
$name = directoryString($input, 'common_name', 180);
if (mb_strlen($name, 'UTF-8') < 2) errorResponse('Укажите русское название вида', 422);
$scientific = directoryString($input, 'scientific_name', 180);
$summary = directoryString($input, 'summary', 500);
$body = directoryString($input, 'body', 10000);
try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    if ($id !== null) {
        $stmt = $pdo->prepare('SELECT status FROM directory_species WHERE id=:id FOR UPDATE');
        $stmt->execute(['id'=>$id]);
        $existing = $stmt->fetch();
        if (!$existing) { $pdo->rollBack(); errorResponse('Вид не найден', 404); }
        if ($existing['status'] !== 'draft') { $pdo->rollBack(); errorResponse('Опубликованный вид изменять нельзя', 409); }
        $update = $pdo->prepare('UPDATE directory_species SET slug=:slug, kind=:kind, common_name=:name, scientific_name=:scientific, summary=:summary, body=:body WHERE id=:id');
        $update->execute(['slug'=>$slug,'kind'=>$kind,'name'=>$name,'scientific'=>$scientific ?: null,'summary'=>$summary,'body'=>$body,'id'=>$id]);
    } else {
        $insert = $pdo->prepare("INSERT INTO directory_species (slug,kind,common_name,scientific_name,summary,body,status,created_by_admin_id) VALUES (:slug,:kind,:name,:scientific,:summary,:body,'draft',:admin)");
        $insert->execute(['slug'=>$slug,'kind'=>$kind,'name'=>$name,'scientific'=>$scientific ?: null,'summary'=>$summary,'body'=>$body,'admin'=>(int)$admin['id']]);
        $id = (int)$pdo->lastInsertId();
    }
    $pdo->commit();
    header('Cache-Control: no-store');
    successResponse(['species'=>['id'=>$id,'slug'=>$slug,'kind'=>$kind,'common_name'=>$name,'status'=>'draft']]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if ((string)$e->getCode() === '23000') errorResponse('Slug вида уже занят', 409);
    error_log('[directory/species/save] ' . $e->getMessage());
    errorResponse('Не удалось сохранить вид', 500);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[directory/species/save] ' . $e->getMessage());
    errorResponse('Не удалось сохранить вид', 500);
}

```
