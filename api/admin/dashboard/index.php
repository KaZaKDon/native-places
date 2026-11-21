<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $usersStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM users
        WHERE status <> 'deleted'
    ");

    $activeUsersStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM users
        WHERE status = 'active'
    ");

    $placesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
    ");

    $publishedPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'published'
    ");

    $pendingPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'pending'
    ");

    $rejectedPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'rejected'
    ");

    $archivedPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'expired'
    ");

    $newReportsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reports
        WHERE status = 'new'
    ");

    $closedReportsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reports
        WHERE status = 'closed'
    ");

    $pendingReviewsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reviews
        WHERE status = 'pending'
    ");

    $publishedReviewsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reviews
        WHERE status = 'published'
    ");

    $activeAccessCodesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM admin_access_codes
        WHERE status = 'active'
    ");

    successResponse([
        'dashboard' => [
            'users_count' => (int) $usersStmt->fetch()['total'],
            'active_users_count' => (int) $activeUsersStmt->fetch()['total'],

            'places_count' => (int) $placesStmt->fetch()['total'],
            'published_places_count' => (int) $publishedPlacesStmt->fetch()['total'],
            'pending_places_count' => (int) $pendingPlacesStmt->fetch()['total'],
            'rejected_places_count' => (int) $rejectedPlacesStmt->fetch()['total'],
            'archived_places_count' => (int) $archivedPlacesStmt->fetch()['total'],

            'new_reports_count' => (int) $newReportsStmt->fetch()['total'],
            'closed_reports_count' => (int) $closedReportsStmt->fetch()['total'],

            'pending_reviews_count' => (int) $pendingReviewsStmt->fetch()['total'],
            'published_reviews_count' => (int) $publishedReviewsStmt->fetch()['total'],

            'active_access_codes_count' => (int) $activeAccessCodesStmt->fetch()['total'],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить данные панели управления', 500, [
        'error' => $e->getMessage(),
    ]);
}
