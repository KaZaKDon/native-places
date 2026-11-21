<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$title = trim($input['title'] ?? '');
$category = trim($input['category'] ?? '');
$type = trim($input['type'] ?? '');
$bookingType = trim($input['booking_type'] ?? '');
$publicationType = trim($input['publication_type'] ?? '');
$isCommercial = $input['is_commercial'] ?? null;

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
}

if ($category === '') {
    $errors['category'] = 'Выберите категорию';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    $errors['category'] = 'Некорректная категория';
}

if ($type === '') {
    $errors['type'] = 'Выберите тип объекта';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $type)) {
    $errors['type'] = 'Некорректный тип объекта';
}

if ($bookingType !== '' && !in_array($bookingType, ['chat', 'phone', 'external'], true)) {
    $errors['booking_type'] = 'Некорректный тип бронирования';
}

if ($publicationType !== '' && !in_array($publicationType, ['free', 'paid'], true)) {
    $errors['publication_type'] = 'Некорректный тип размещения';
}

if ($isCommercial !== null && !in_array((int) $isCommercial, [0, 1], true)) {
    $errors['is_commercial'] = 'Некорректный тип объекта';
}

if (!empty($errors)) {
    errorResponse('Обнаружены ошибки валидации', 422, [
        'errors' => $errors,
    ]);
}

successResponse([
    'message' => 'Проверка пройдена',
]);
