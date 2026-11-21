<?php

require_once __DIR__ . '/../../config/database.php';

function writeModeratorLog(
    int $moderatorId,
    string $actionType,
    string $entityType,
    int $entityId,
    ?string $description = null,
    ?PDO $pdo = null
): void {
    if ($moderatorId <= 0) {
        throw new InvalidArgumentException('Некорректный ID модератора для лога');
    }

    if ($entityId <= 0) {
        throw new InvalidArgumentException('Некорректный ID сущности для лога');
    }

    $actionType = trim($actionType);
    $entityType = trim($entityType);

    if ($actionType === '') {
        throw new InvalidArgumentException('Не передан тип действия для лога');
    }

    if ($entityType === '') {
        throw new InvalidArgumentException('Не передан тип сущности для лога');
    }

    $actionType = substr($actionType, 0, 50);
    $entityType = substr($entityType, 0, 50);

    if ($description !== null) {
        $description = trim($description);

        if ($description === '') {
            $description = null;
        }
    }

    $connection = $pdo ?: getDatabaseConnection();

    $stmt = $connection->prepare("
        INSERT INTO moderator_logs (
            moderator_id,
            action_type,
            entity_type,
            entity_id,
            description,
            created_at
        ) VALUES (
            :moderator_id,
            :action_type,
            :entity_type,
            :entity_id,
            :description,
            NOW()
        )
    ");

    $stmt->execute([
        'moderator_id' => $moderatorId,
        'action_type' => $actionType,
        'entity_type' => $entityType,
        'entity_id' => $entityId,
        'description' => $description,
    ]);
}
