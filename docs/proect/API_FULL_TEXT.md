# Full API Document Export

```
api/places/index.php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');
$type = trim($_GET['type'] ?? '');
$commercial = trim($_GET['commercial'] ?? '');
$booking = trim($_GET['booking'] ?? '');
$query = trim($_GET['q'] ?? '');

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.status,
            p.publication_type,
            p.is_commercial,
            p.booking_type,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id

        WHERE p.status = 'published'
        AND c.is_active = 1
        AND pt.is_active = 1
    ";

    $params = [];

    if ($category !== '') {
        $sql .= " AND c.code = :category";
        $params['category'] = $category;
    }

    if ($type !== '') {
        $sql .= " AND pt.code = :type";
        $params['type'] = $type;
    }

    if ($commercial !== '') {
        $sql .= " AND p.is_commercial = :commercial";
        $params['commercial'] = (int) $commercial;
    }

    if ($booking !== '') {
        $sql .= " AND p.booking_type = :booking";
        $params['booking'] = $booking;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                p.title LIKE :query_title
                OR p.short_description LIKE :query_short_description
                OR p.full_description LIKE :query_full_description
                OR p.address LIKE :query_address
                OR c.title LIKE :query_category_title
                OR c.code LIKE :query_category_code
                OR pt.title LIKE :query_type_title
                OR pt.code LIKE :query_type_code
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_title'] = $searchValue;
        $params['query_short_description'] = $searchValue;
        $params['query_full_description'] = $searchValue;
        $params['query_address'] = $searchValue;
        $params['query_category_title'] = $searchValue;
        $params['query_category_code'] = $searchValue;
        $params['query_type_title'] = $searchValue;
        $params['query_type_code'] = $searchValue;
    }

    $sql .= " ORDER BY p.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $places = $stmt->fetchAll();

    successResponse([
        'places' => $places,
        'filters' => [
            'category' => $category,
            'type' => $type,
            'commercial' => $commercial,
            'booking' => $booking,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объекты', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/places/search.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$query = trim($_GET['q'] ?? '');
$category = trim($_GET['category'] ?? '');
$type = trim($_GET['type'] ?? '');
$commercial = trim($_GET['commercial'] ?? '');
$booking = trim($_GET['booking'] ?? '');

if ($query === '') {
    errorResponse('Пустой поисковый запрос', 400);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.status,
            p.publication_type,
            p.is_commercial,
            p.booking_type,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id

        WHERE p.status = 'published'
        AND c.is_active = 1
        AND pt.is_active = 1

        AND (
            p.title LIKE :query_title
            OR p.short_description LIKE :query_short_description
            OR p.full_description LIKE :query_full_description
            OR p.address LIKE :query_address
            OR c.title LIKE :query_category_title
            OR c.code LIKE :query_category_code
            OR pt.title LIKE :query_type_title
            OR pt.code LIKE :query_type_code
        )
    ";

    $searchValue = '%' . $query . '%';

    $params = [
        'query_title' => $searchValue,
        'query_short_description' => $searchValue,
        'query_full_description' => $searchValue,
        'query_address' => $searchValue,
        'query_category_title' => $searchValue,
        'query_category_code' => $searchValue,
        'query_type_title' => $searchValue,
        'query_type_code' => $searchValue,
    ];

    if ($category !== '') {
        $sql .= " AND c.code = :category";
        $params['category'] = $category;
    }

    if ($type !== '') {
        $sql .= " AND pt.code = :type";
        $params['type'] = $type;
    }

    if ($commercial !== '') {
        $sql .= " AND p.is_commercial = :commercial";
        $params['commercial'] = (int) $commercial;
    }

    if ($booking !== '') {
        $sql .= " AND p.booking_type = :booking";
        $params['booking'] = $booking;
    }

    $sql .= " ORDER BY p.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $places = $stmt->fetchAll();

    successResponse([
        'places' => $places,
        'filters' => [
            'q' => $query,
            'category' => $category,
            'type' => $type,
            'commercial' => $commercial,
            'booking' => $booking,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить поиск', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/places/map.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');
$type = trim($_GET['type'] ?? '');
$commercial = trim($_GET['commercial'] ?? '');
$booking = trim($_GET['booking'] ?? '');
$query = trim($_GET['q'] ?? '');

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            p.id,
            p.title,
            p.slug,
            p.latitude,
            p.longitude,
            p.cover_image,

            (
                SELECT pa.value
                FROM place_attributes pa
                INNER JOIN attribute_definitions ad
                    ON ad.id = pa.attribute_definition_id
                WHERE pa.place_id = p.id
                AND ad.code = 'price'
                LIMIT 1
            ) AS price,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id

        WHERE p.status = 'published'
        AND c.is_active = 1
        AND pt.is_active = 1
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
    ";

    $params = [];

    if ($category !== '') {
        $sql .= " AND c.code = :category";
        $params['category'] = $category;
    }

    if ($type !== '') {
        $sql .= " AND pt.code = :type";
        $params['type'] = $type;
    }

    if ($commercial !== '') {
        $sql .= " AND p.is_commercial = :commercial";
        $params['commercial'] = (int) $commercial;
    }

    if ($booking !== '') {
        $sql .= " AND p.booking_type = :booking";
        $params['booking'] = $booking;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                p.title LIKE :query_title
                OR p.short_description LIKE :query_short_description
                OR p.full_description LIKE :query_full_description
                OR p.address LIKE :query_address
                OR c.title LIKE :query_category_title
                OR c.code LIKE :query_category_code
                OR pt.title LIKE :query_type_title
                OR pt.code LIKE :query_type_code
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_title'] = $searchValue;
        $params['query_short_description'] = $searchValue;
        $params['query_full_description'] = $searchValue;
        $params['query_address'] = $searchValue;
        $params['query_category_title'] = $searchValue;
        $params['query_category_code'] = $searchValue;
        $params['query_type_title'] = $searchValue;
        $params['query_type_code'] = $searchValue;
    }

    $sql .= " ORDER BY c.sort_order ASC, p.title ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $places = $stmt->fetchAll();

    successResponse([
        'places' => $places,
        'filters' => [
            'category' => $category,
            'type' => $type,
            'commercial' => $commercial,
            'booking' => $booking,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объекты для карты', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/places/show.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$slug = $_GET['slug'] ?? null;

if (!$slug) {
    errorResponse('Не передан slug объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.full_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.contact_name,
            p.phone,
            p.telegram,
            p.email,
            p.website,
            p.status,
            p.publication_type,
            p.is_commercial,
            p.booking_type,
            p.booking_url,
            p.created_at,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id

        WHERE p.slug = :slug
          AND p.status = 'published'
        LIMIT 1
    ");

    $stmt->execute([
        'slug' => $slug,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $place['id'],
    ]);

    $images = $imagesStmt->fetchAll();

    successResponse([
        'place' => $place,
        'images' => $images,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объект', 500, [
        'error' => $e->getMessage(),
    ]);
} 

api/reference-values/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $groupCode = $_GET['group'] ?? null;

    if ($groupCode) {
        $stmt = $pdo->prepare("
            SELECT
                rv.id,
                rv.code,
                rv.title,
                rv.sort_order,
                rg.code AS group_code,
                rg.title AS group_title
            FROM reference_values rv
            INNER JOIN reference_groups rg ON rg.id = rv.group_id
            WHERE rg.code = :group_code
              AND rv.is_active = 1
              AND rg.is_active = 1
            ORDER BY rv.sort_order ASC, rv.id ASC
        ");

        $stmt->execute([
            'group_code' => $groupCode,
        ]);
    } else {
        $stmt = $pdo->query("
            SELECT
                rv.id,
                rv.code,
                rv.title,
                rv.sort_order,
                rg.code AS group_code,
                rg.title AS group_title
            FROM reference_values rv
            INNER JOIN reference_groups rg ON rg.id = rv.group_id
            WHERE rv.is_active = 1
              AND rg.is_active = 1
            ORDER BY rg.sort_order ASC, rv.sort_order ASC, rv.id ASC
        ");
    }

    $items = $stmt->fetchAll();

    successResponse([
        'items' => $items,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить справочники', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/plans/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price
        FROM plans
        WHERE is_active = 1
        ORDER BY id ASC
    ");

    $plans = $stmt->fetchAll();

    successResponse([
        'plans' => $plans,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить тарифы', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/categories/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            icon,
            color,
            sort_order
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $categories = $stmt->fetchAll();

    successResponse([
        'categories' => $categories,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить категории', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/shared/cors.php

<?php

$allowedOrigins = [
    'https://native-places.ru',
    'http://localhost:5173',
    'http://localhost:5174',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

api/shared/response.php

<?php

function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    exit;
}

function successResponse(array $data = [], int $statusCode = 200): void
{
    jsonResponse([
        'success' => true,
        'data' => $data,
    ], $statusCode);
}

function errorResponse(string $message, int $statusCode = 400, array $extra = []): void
{
    jsonResponse([
        'success' => false,
        'message' => $message,
        'extra' => $extra,
    ], $statusCode);
}

api/place-types/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,

            c.code AS category_code,
            c.title AS category_title

        FROM place_types pt
        INNER JOIN categories c
            ON c.id = pt.category_id

        WHERE pt.is_active = 1
        AND c.is_active = 1
    ";

    $params = [];

    if ($category !== '') {
        $sql .= " AND c.code = :category";
        $params['category'] = $category;
    }

    $sql .= "
        ORDER BY
            c.sort_order ASC,
            pt.sort_order ASC,
            pt.title ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $types = $stmt->fetchAll();

    successResponse([
        'types' => $types,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/stats/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $placesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'published'
    ");

    $categoriesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM categories
        WHERE is_active = 1
    ");

    $placeTypesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM place_types
        WHERE is_active = 1
    ");

    $publishedPlaces = (int) $placesStmt->fetch()['total'];
    $activeCategories = (int) $categoriesStmt->fetch()['total'];
    $activePlaceTypes = (int) $placeTypesStmt->fetch()['total'];

    successResponse([
        'stats' => [
            'published_places' => $publishedPlaces,
            'active_categories' => $activeCategories,
            'active_place_types' => $activePlaceTypes,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить статистику', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/places/filters.php
 
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $categoriesStmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            icon,
            color,
            sort_order
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $typesStmt = $pdo->query("
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,

            c.code AS category_code,
            c.title AS category_title

        FROM place_types pt
        INNER JOIN categories c ON c.id = pt.category_id

        WHERE pt.is_active = 1
        AND c.is_active = 1

        ORDER BY
            c.sort_order ASC,
            pt.sort_order ASC,
            pt.title ASC
    ");

    $categories = $categoriesStmt->fetchAll();
    $types = $typesStmt->fetchAll();

    successResponse([
        'categories' => $categories,
        'types' => $types,

        'publication_types' => [
            [
                'value' => 'free',
                'title' => 'Бесплатное размещение',
            ],
            [
                'value' => 'paid',
                'title' => 'Платное размещение',
            ],
        ],

        'booking_types' => [
            [
                'value' => 'chat',
                'title' => 'Чат',
            ],
            [
                'value' => 'phone',
                'title' => 'Телефон',
            ],
            [
                'value' => 'external',
                'title' => 'Внешняя ссылка',
            ],
        ],

        'commercial_options' => [
            [
                'value' => 0,
                'title' => 'Частный объект',
            ],
            [
                'value' => 1,
                'title' => 'Коммерческий объект',
            ],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить фильтры объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/places/featured.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE p.status = 'published'
        AND c.is_active = 1
        AND pt.is_active = 1

        ORDER BY p.created_at DESC

        LIMIT 6
    ");

    $places = $stmt->fetchAll();

    successResponse([
        'places' => $places,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить рекомендуемые объекты', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/places/types-by-category.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');

if ($category === '') {
    errorResponse('Не передан код категории', 400);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pt.id,
            pt.code,
            pt.title,
            pt.sort_order
        FROM place_types pt
        INNER JOIN categories c
            ON c.id = pt.category_id
        WHERE c.code = :category
        AND c.is_active = 1
        AND pt.is_active = 1
        ORDER BY pt.sort_order ASC, pt.title ASC
    ");

    $stmt->execute([
        'category' => $category,
    ]);

    $types = $stmt->fetchAll();

    successResponse([
        'types' => $types,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/places/validate.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$title = trim($input['title'] ?? '');
$category = trim($input['category'] ?? '');
$type = trim($input['type'] ?? '');

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
}

if ($category === '') {
    $errors['category'] = 'Выберите категорию';
}

if ($type === '') {
    $errors['type'] = 'Выберите тип объекта';
}

if (!empty($errors)) {
    errorResponse(
        'Обнаружены ошибки валидации',
        422,
        [
            'errors' => $errors,
        ]
    );
}

successResponse([
    'message' => 'Проверка пройдена',
]);

api/places/create-options.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $categoriesStmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            icon,
            color,
            sort_order
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $typesStmt = $pdo->query("
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,
            c.code AS category_code,
            c.title AS category_title
        FROM place_types pt
        INNER JOIN categories c ON c.id = pt.category_id
        WHERE pt.is_active = 1
        AND c.is_active = 1
        ORDER BY c.sort_order ASC, pt.sort_order ASC, pt.title ASC
    ");

    $plansStmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price
        FROM plans
        WHERE is_active = 1
        ORDER BY id ASC
    ");

    $categories = $categoriesStmt->fetchAll();
    $types = $typesStmt->fetchAll();
    $plans = $plansStmt->fetchAll();

    successResponse([
        'categories' => $categories,
        'types' => $types,
        'plans' => $plans,

        'publication_types' => [
            [
                'value' => 'free',
                'title' => 'Бесплатное размещение',
            ],
            [
                'value' => 'paid',
                'title' => 'Платное размещение',
            ],
        ],

        'booking_types' => [
            [
                'value' => 'chat',
                'title' => 'Чат',
            ],
            [
                'value' => 'phone',
                'title' => 'Телефон',
            ],
            [
                'value' => 'external',
                'title' => 'Внешняя ссылка',
            ],
        ],

        'commercial_options' => [
            [
                'value' => 0,
                'title' => 'Частный объект',
            ],
            [
                'value' => 1,
                'title' => 'Коммерческий объект',
            ],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить данные для формы создания объекта', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/auth/register.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');
$firstName = trim($input['first_name'] ?? '');
$profileStatus = trim($input['profile_status'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');
$acceptedTermsRaw = $input['accepted_terms'] ?? false;
$acceptedPersonalDataRaw = $input['accepted_personal_data'] ?? false;
$acceptedMarketingRaw = $input['accepted_marketing'] ?? false;

$acceptedTerms = isTruthyConsentValue($acceptedTermsRaw);
$acceptedPersonalData = isTruthyConsentValue($acceptedPersonalDataRaw);
$acceptedMarketing = isTruthyConsentValue($acceptedMarketingRaw);

$termsDocumentVersion = '1.0';
$personalDataDocumentVersion = '1.0';
$marketingDocumentVersion = '1.0';

$errors = [];

if ($firstName === '') {
    $errors['first_name'] = 'Введите имя';
}

if ($email === '') {
    $errors['email'] = 'Введите email';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($password === '') {
    $errors['password'] = 'Введите пароль';
} elseif (mb_strlen($password) < 6) {
    $errors['password'] = 'Пароль должен содержать минимум 6 символов';
}

if (mb_strlen($profileStatus) > 255) {
    $errors['profile_status'] = 'Статус не должен быть длиннее 255 символов';
}

if (!$acceptedTerms) {
    $errors['accepted_terms'] = 'Необходимо принять правила сайта';
}

if (!$acceptedPersonalData) {
    $errors['accepted_personal_data'] = 'Необходимо дать согласие на обработку персональных данных';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $existingUser = $stmt->fetch();

    if ($existingUser) {
        errorResponse('Пользователь с таким email уже существует', 409);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $acceptedAt = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    $ipAddress = getClientIpAddress();
    $userAgent = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512);

    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare("
        INSERT INTO users (
            role_id,
            email,
            password_hash,
            first_name,
            profile_status,
            phone,
            telegram,
            status
        ) VALUES (
            :role_id,
            :email,
            :password_hash,
            :first_name,
            :profile_status,
            :phone,
            :telegram,
            :status
        )
    ");

    $insertStmt->execute([
        'role_id' => 1,
        'email' => $email,
        'password_hash' => $passwordHash,
        'first_name' => $firstName,
        'profile_status' => $profileStatus !== '' ? $profileStatus : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'status' => 'active',
    ]);

    $userId = (int) $pdo->lastInsertId();

    $consentStmt = $pdo->prepare("
        INSERT INTO user_consents (
            user_id,
            consent_type,
            document_version,
            accepted_at,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            :user_id,
            :consent_type,
            :document_version,
            :accepted_at,
            :ip_address,
            :user_agent,
            NOW()
        )
    ");

    $consents = [
        [
            'type' => 'terms',
            'document_version' => $termsDocumentVersion,
        ],
        [
            'type' => 'personal_data',
            'document_version' => $personalDataDocumentVersion,
        ],
    ];

    if ($acceptedMarketing) {
        $consents[] = [
            'type' => 'marketing_emails',
            'document_version' => $marketingDocumentVersion,
        ];
    }

    foreach ($consents as $consent) {
        $consentStmt->execute([
            'user_id' => $userId,
            'consent_type' => $consent['type'],
            'document_version' => $consent['document_version'],
            'accepted_at' => $acceptedAt,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent !== '' ? $userAgent : null,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Пользователь успешно зарегистрирован',
        'user' => [
            'id' => $userId,
            'role_id' => 1,
            'email' => $email,
            'first_name' => $firstName,
            'profile_status' => $profileStatus !== '' ? $profileStatus : null,
            'phone' => $phone !== '' ? $phone : null,
            'telegram' => $telegram !== '' ? $telegram : null,
            'accepted_terms' => true,
            'accepted_personal_data' => true,
            'accepted_marketing' => $acceptedMarketing,
            'terms_document_version' => $termsDocumentVersion,
            'personal_data_document_version' => $personalDataDocumentVersion,
            'marketing_document_version' => $acceptedMarketing ? $marketingDocumentVersion : null,
            'terms_accepted_at' => $acceptedAt,
            'personal_data_accepted_at' => $acceptedAt,
            'marketing_accepted_at' => $acceptedMarketing ? $acceptedAt : null,
            'status' => 'active',
        ],
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось выполнить регистрацию', 500, [
        'error' => $e->getMessage(),
    ]);
}

function isTruthyConsentValue($value): bool
{
    return in_array($value, [1, '1', true, 'true', 'on', 'yes'], true);
}

function getClientIpAddress(): ?string
{
    $rawIp = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? null;

    if (!$rawIp) {
        return null;
    }

    $ip = trim(explode(',', $rawIp)[0]);

    return $ip !== '' ? substr($ip, 0, 45) : null;
}


api/auth/login.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

session_start();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

$errors = [];

if ($email === '') {
    $errors['email'] = 'Введите email';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($password === '') {
    $errors['password'] = 'Введите пароль';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.password_hash,
            u.first_name,
            u.last_name,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,

            r.code AS role_code,
            r.title AS role_title

        FROM users u
        INNER JOIN roles r ON r.id = u.role_id

        WHERE u.email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    $_SESSION['user_id'] = (int) $user['id'];

    unset($user['password_hash']);

    successResponse([
        'message' => 'Вход выполнен успешно',
        'authenticated' => true,
        'user' => $user,
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/auth/me.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

session_start();

$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    successResponse([
        'authenticated' => false,
        'user' => null,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.first_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,

            r.code AS role_code,
            r.title AS role_title

        FROM users u
        INNER JOIN roles r ON r.id = u.role_id

        WHERE u.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => (int) $userId,
    ]);

    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active') {
        session_destroy();

        successResponse([
            'authenticated' => false,
            'user' => null,
        ]);
    }

    successResponse([
        'authenticated' => true,
        'user' => $user,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить текущего пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/auth/logout.php

<?php
require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';

session_start();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

successResponse([
    'message' => 'Выход выполнен успешно',
    'authenticated' => false,
    'user' => null,
]);

api/shared/auth.php

<?php

function getCurrentUserId(): ?int
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION['user_id'])) {
        return null;
    }

    return (int) $_SESSION['user_id'];
}

function requireAuth(): int
{
    $userId = getCurrentUserId();

    if (!$userId) {
        errorResponse('Требуется авторизация', 401);
    }

    return $userId;
}

api/profile/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.created_at,

            r.code AS role_code,
            r.title AS role_title

        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id

        WHERE u.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $userId,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    successResponse([
        'user' => $user,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить профиль',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/profile/update.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$firstName = trim($input['first_name'] ?? '');
$profileStatus = trim($input['profile_status'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');

$errors = [];

if ($firstName === '') {
    $errors['first_name'] = 'Введите имя';
}

if (mb_strlen($profileStatus) > 255) {
    $errors['profile_status'] = 'Статус не должен быть длиннее 255 символов';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            first_name = :first_name,
            profile_status = :profile_status,
            phone = :phone,
            telegram = :telegram,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'first_name' => $firstName,
        'profile_status' => $profileStatus !== '' ? $profileStatus : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Профиль успешно обновлён',
        'profile' => [
            'first_name' => $firstName,
            'profile_status' => $profileStatus !== '' ? $profileStatus : null,
            'phone' => $phone !== '' ? $phone : null,
            'telegram' => $telegram !== '' ? $telegram : null,
        ],
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось обновить профиль', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/profile/avatar.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

if (empty($_FILES['avatar'])) {
    errorResponse('Файл аватара не передан', 400);
}

$file = $_FILES['avatar'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    errorResponse('Ошибка загрузки файла', 400);
}

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

$mimeType = mime_content_type($file['tmp_name']);

if (!isset($allowedTypes[$mimeType])) {
    errorResponse('Разрешены только изображения JPG, PNG или WEBP', 422);
}

$maxSize = 3 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    errorResponse('Размер файла не должен превышать 3 МБ', 422);
}

$extension = $allowedTypes[$mimeType];

$uploadDir = __DIR__ . '/../../uploads/avatars';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$fileName = 'user_' . $userId . '_' . time() . '.' . $extension;
$filePath = $uploadDir . '/' . $fileName;

if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    errorResponse('Не удалось сохранить файл', 500);
}

$publicPath = '/uploads/avatars/' . $fileName;

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            avatar = :avatar,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'avatar' => $publicPath,
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Аватар успешно обновлён',
        'avatar' => $publicPath,
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось обновить аватар', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/favorites/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            f.id AS favorite_id,
            f.created_at AS favorite_created_at,

            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM favorites f

        INNER JOIN places p
            ON p.id = f.place_id

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE f.user_id = :user_id

        ORDER BY f.created_at DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $favorites = $stmt->fetchAll();

    successResponse([
        'favorites' => $favorites,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить избранное',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/favorites/toggle.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $favoriteStmt = $pdo->prepare("
        SELECT id
        FROM favorites
        WHERE user_id = :user_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $favoriteStmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    $favorite = $favoriteStmt->fetch();

    if ($favorite) {
        $deleteStmt = $pdo->prepare("
            DELETE FROM favorites
            WHERE id = :id
            LIMIT 1
        ");

        $deleteStmt->execute([
            'id' => $favorite['id'],
        ]);

        successResponse([
            'message' => 'Объект удалён из избранного',
            'place_id' => $placeId,
            'is_favorite' => false,
            'action' => 'removed',
        ]);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO favorites (
            user_id,
            place_id
        ) VALUES (
            :user_id,
            :place_id
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    successResponse([
        'message' => 'Объект добавлен в избранное',
        'place_id' => $placeId,
        'is_favorite' => true,
        'action' => 'added',
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось изменить избранное', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/favorites/check.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = getCurrentUserId();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!$userId) {
    successResponse([
        'is_favorite' => false,
    ]);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id
        FROM favorites
        WHERE user_id = :user_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $stmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    $favorite = $stmt->fetch();

    successResponse([
        'is_favorite' => (bool) $favorite,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось проверить избранное',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/conversations/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            c.id,
            c.place_id,
            c.owner_id,
            c.user_id,
            c.last_message_at,
            c.created_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image,

            owner.first_name AS owner_name

        FROM conversations c

        INNER JOIN places p
            ON p.id = c.place_id

        INNER JOIN users owner
            ON owner.id = c.owner_id

        WHERE
            c.owner_id = :user_id
            OR
            c.user_id = :user_id

        ORDER BY
            c.last_message_at DESC,
            c.created_at DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $conversations = $stmt->fetchAll();

    successResponse([
        'conversations' => $conversations,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить список диалогов',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/messages/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$conversationId = (int) ($_GET['conversation_id'] ?? 0);

if ($conversationId <= 0) {
    errorResponse('Не передан ID диалога', 400);
}

try {

    $pdo = getDatabaseConnection();

    $conversationStmt = $pdo->prepare("
        SELECT id
        FROM conversations
        WHERE id = :conversation_id
        AND (
            owner_id = :user_id
            OR user_id = :user_id
        )
        LIMIT 1
    ");

    $conversationStmt->execute([
        'conversation_id' => $conversationId,
        'user_id' => $userId,
    ]);

    $conversation = $conversationStmt->fetch();

    if (!$conversation) {
        errorResponse('Диалог не найден или нет доступа', 404);
    }

    $messagesStmt = $pdo->prepare("
        SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            m.message_text,
            m.attachment_path,
            m.is_read,
            m.created_at,

            u.first_name AS sender_name,
            u.avatar AS sender_avatar

        FROM messages m

        INNER JOIN users u
            ON u.id = m.sender_id

        WHERE m.conversation_id = :conversation_id

        ORDER BY m.created_at ASC, m.id ASC
    ");

    $messagesStmt->execute([
        'conversation_id' => $conversationId,
    ]);

    $messages = $messagesStmt->fetchAll();

    successResponse([
        'conversation_id' => $conversationId,
        'messages' => $messages,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить сообщения',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/messages/send.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$conversationId = (int) ($input['conversation_id'] ?? 0);
$messageText = trim($input['message_text'] ?? '');

if ($conversationId <= 0) {
    errorResponse('Не передан ID диалога', 400);
}

if ($messageText === '') {
    errorResponse('Введите текст сообщения', 422);
}

try {

    $pdo = getDatabaseConnection();

    $conversationStmt = $pdo->prepare("
        SELECT id
        FROM conversations
        WHERE id = :conversation_id
        AND (
            owner_id = :user_id
            OR user_id = :user_id
        )
        LIMIT 1
    ");

    $conversationStmt->execute([
        'conversation_id' => $conversationId,
        'user_id' => $userId,
    ]);

    $conversation = $conversationStmt->fetch();

    if (!$conversation) {
        errorResponse('Диалог не найден или нет доступа', 404);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO messages (
            conversation_id,
            sender_id,
            message_text,
            is_read
        ) VALUES (
            :conversation_id,
            :sender_id,
            :message_text,
            0
        )
    ");

    $insertStmt->execute([
        'conversation_id' => $conversationId,
        'sender_id' => $userId,
        'message_text' => $messageText,
    ]);

    $messageId = (int) $pdo->lastInsertId();

    $updateStmt = $pdo->prepare("
        UPDATE conversations
        SET
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = :conversation_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'conversation_id' => $conversationId,
    ]);

    successResponse([
        'message' => 'Сообщение отправлено',
        'item' => [
            'id' => $messageId,
            'conversation_id' => $conversationId,
            'sender_id' => $userId,
            'message_text' => $messageText,
            'is_read' => 0,
        ],
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось отправить сообщение',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/conversations/start.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            title
        FROM places
        WHERE id = :id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $ownerId = (int) $place['user_id'];

    if ($ownerId <= 0) {
        errorResponse('У объекта не указан владелец', 422);
    }

    if ($ownerId === $userId) {
        errorResponse('Нельзя создать диалог с самим собой', 422);
    }

    $existingStmt = $pdo->prepare("
        SELECT id
        FROM conversations
        WHERE place_id = :place_id
        AND owner_id = :owner_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $existingStmt->execute([
        'place_id' => $placeId,
        'owner_id' => $ownerId,
        'user_id' => $userId,
    ]);

    $existingConversation = $existingStmt->fetch();

    if ($existingConversation) {
        successResponse([
            'message' => 'Диалог уже существует',
            'conversation_id' => (int) $existingConversation['id'],
            'created' => false,
        ]);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO conversations (
            place_id,
            owner_id,
            user_id,
            last_message_at
        ) VALUES (
            :place_id,
            :owner_id,
            :user_id,
            NOW()
        )
    ");

    $insertStmt->execute([
        'place_id' => $placeId,
        'owner_id' => $ownerId,
        'user_id' => $userId,
    ]);

    $conversationId = (int) $pdo->lastInsertId();

    successResponse([
        'message' => 'Диалог создан',
        'conversation_id' => $conversationId,
        'created' => true,
        'place' => [
            'id' => (int) $place['id'],
            'title' => $place['title'],
        ],
    ], 201);

} catch (Throwable $e) {
    errorResponse('Не удалось начать диалог', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/config/database.php

<?php

function getDatabaseConnection(): PDO
{
    $host = 'localhost';
    $dbName = 'vnuko1796_nativeplaces_dev';
    $user = 'vnuko1796_nativeplaces_user';
    $pass =;

    $dsn = "mysql:host={$host};dbname={$dbName};charset=utf8mb4";

    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

api/my-places/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.status,
            p.publication_type,
            p.is_commercial,
            p.booking_type,
            p.created_at,
            p.updated_at,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE p.user_id = :user_id

        ORDER BY p.created_at DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $places = $stmt->fetchAll();

    successResponse([
        'places' => $places,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить список объектов пользователя',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/my-places/create.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$title = trim($input['title'] ?? '');
$categoryId = (int) ($input['category_id'] ?? 0);
$placeTypeId = (int) ($input['place_type_id'] ?? 0);

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
}

if ($categoryId <= 0) {
    $errors['category_id'] = 'Выберите категорию';
}

if ($placeTypeId <= 0) {
    $errors['place_type_id'] = 'Выберите тип объекта';
}

if (!empty($errors)) {

    errorResponse(
        'Ошибка валидации',
        422,
        [
            'errors' => $errors,
        ]
    );
}

try {

    $pdo = getDatabaseConnection();

    $slug = uniqid('place_');

$stmt = $pdo->prepare("
    INSERT INTO places (
        user_id,
        category_id,
        place_type_id,
        title,
        slug,
        latitude,
        longitude,
        status,
        publication_type,
        payment_status,
        created_at,
        updated_at
    ) VALUES (
        :user_id,
        :category_id,
        :place_type_id,
        :title,
        :slug,
        :latitude,
        :longitude,
        'pending',
        'free',
        'not_required',
        NOW(),
        NOW()
    )
");

$stmt->execute([
    'user_id' => $userId,
    'category_id' => $categoryId,
    'place_type_id' => $placeTypeId,
    'title' => $title,
    'slug' => $slug,
    'latitude' => 0,
    'longitude' => 0,
]);

    $placeId = (int) $pdo->lastInsertId();

    successResponse([
        'message' => 'Объект успешно создан',
        'place_id' => $placeId,
        'slug' => $slug,
        'status' => 'pending',
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось создать объект',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/my-places/update.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int)($input['id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $title = trim($input['title'] ?? '');
    $shortDescription = trim($input['short_description'] ?? '');
    $fullDescription = trim($input['full_description'] ?? '');
    $address = trim($input['address'] ?? '');
    $latitude = $input['latitude'] ?? null;
    $longitude = $input['longitude'] ?? null;

    $contactName = trim($input['contact_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $telegram = trim($input['telegram'] ?? '');
    $email = trim($input['email'] ?? '');
    $website = trim($input['website'] ?? '');

    $bookingType = trim($input['booking_type'] ?? '');
    $bookingUrl = trim($input['booking_url'] ?? '');

    $errors = [];

    if ($title === '') {
        $errors['title'] = 'Введите название объекта';
    }

    if (!empty($errors)) {
        errorResponse(
            'Ошибка валидации',
            422,
            [
                'errors' => $errors,
            ]
        );
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            title = :title,
            short_description = :short_description,
            full_description = :full_description,
            address = :address,

            latitude = :latitude,
            longitude = :longitude,

            contact_name = :contact_name,
            phone = :phone,
            telegram = :telegram,
            email = :email,
            website = :website,

            booking_type = :booking_type,
            booking_url = :booking_url,

            updated_at = NOW()

        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'title' => $title,
        'short_description' => $shortDescription ?: null,
        'full_description' => $fullDescription ?: null,
        'address' => $address ?: null,

        'latitude' => $latitude ?: null,
        'longitude' => $longitude ?: null,

        'contact_name' => $contactName ?: null,
        'phone' => $phone ?: null,
        'telegram' => $telegram ?: null,
        'email' => $email ?: null,
        'website' => $website ?: null,

        'booking_type' => $bookingType ?: null,
        'booking_url' => $bookingUrl ?: null,

        'id' => $placeId,
    ]);

    successResponse([
        'message' => 'Объект успешно обновлён',
        'place_id' => $placeId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить объект',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/my-places/delete.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    if ($place['status'] === 'expired') {
        errorResponse('Объект уже находится в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'expired',
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
    ]);

    successResponse([
        'message' => 'Объект перемещён в архив',
        'place_id' => $placeId,
        'status' => 'expired',
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось переместить объект в архив',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/place-images/upload.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_POST['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (empty($_FILES['image'])) {
    errorResponse('Файл изображения не передан', 400);
}

$file = $_FILES['image'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    errorResponse('Ошибка загрузки файла', 400);
}

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

$mimeType = mime_content_type($file['tmp_name']);

if (!isset($allowedTypes[$mimeType])) {
    errorResponse('Разрешены только изображения JPG, PNG или WEBP', 422);
}

$maxSize = 5 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    errorResponse('Размер файла не должен превышать 5 МБ', 422);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $countStmt = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM place_images
        WHERE place_id = :place_id
    ");

    $countStmt->execute([
        'place_id' => $placeId,
    ]);

    $imagesCount = (int) $countStmt->fetch()['total'];

    if ($imagesCount >= 15) {
        errorResponse('Можно загрузить не больше 15 фотографий', 422);
    }

    $extension = $allowedTypes[$mimeType];

    $uploadDir = __DIR__ . '/../../uploads/places';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $fileName = 'place_' . $placeId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $filePath = $uploadDir . '/' . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        errorResponse('Не удалось сохранить файл', 500);
    }

    $publicPath = '/uploads/places/' . $fileName;

    $isCover = $imagesCount === 0 ? 1 : 0;
    $sortOrder = $imagesCount;

    $insertStmt = $pdo->prepare("
        INSERT INTO place_images (
            place_id,
            image_path,
            sort_order,
            is_cover
        ) VALUES (
            :place_id,
            :image_path,
            :sort_order,
            :is_cover
        )
    ");

    $insertStmt->execute([
        'place_id' => $placeId,
        'image_path' => $publicPath,
        'sort_order' => $sortOrder,
        'is_cover' => $isCover,
    ]);

    $imageId = (int) $pdo->lastInsertId();

    if ($isCover === 1) {
        $coverStmt = $pdo->prepare("
            UPDATE places
            SET cover_image = :cover_image
            WHERE id = :id
            LIMIT 1
        ");

        $coverStmt->execute([
            'cover_image' => $publicPath,
            'id' => $placeId,
        ]);
    }

    successResponse([
        'message' => 'Фотография успешно загружена',
        'image' => [
            'id' => $imageId,
            'place_id' => $placeId,
            'image_path' => $publicPath,
            'sort_order' => $sortOrder,
            'is_cover' => (bool) $isCover,
        ],
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось загрузить фотографию',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/place-images/delete.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$imageId = (int) ($input['image_id'] ?? 0);

if ($imageId <= 0) {
    errorResponse('Не передан ID фотографии', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pi.id,
            pi.place_id,
            pi.image_path,
            pi.is_cover
        FROM place_images pi
        INNER JOIN places p
            ON p.id = pi.place_id
        WHERE pi.id = :image_id
        AND p.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'image_id' => $imageId,
        'user_id' => $userId,
    ]);

    $image = $stmt->fetch();

    if (!$image) {
        errorResponse('Фотография не найдена или нет доступа', 404);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM place_images
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $imageId,
    ]);

    $filePath = __DIR__ . '/../..' . $image['image_path'];

    if (is_file($filePath)) {
        unlink($filePath);
    }

    if ((int) $image['is_cover'] === 1) {
        $nextCoverStmt = $pdo->prepare("
            SELECT
                id,
                image_path
            FROM place_images
            WHERE place_id = :place_id
            ORDER BY sort_order ASC, id ASC
            LIMIT 1
        ");

        $nextCoverStmt->execute([
            'place_id' => $image['place_id'],
        ]);

        $nextCover = $nextCoverStmt->fetch();

        if ($nextCover) {
            $setCoverStmt = $pdo->prepare("
                UPDATE place_images
                SET is_cover = CASE
                    WHEN id = :image_id THEN 1
                    ELSE 0
                END
                WHERE place_id = :place_id
            ");

            $setCoverStmt->execute([
                'image_id' => $nextCover['id'],
                'place_id' => $image['place_id'],
            ]);

            $updatePlaceStmt = $pdo->prepare("
                UPDATE places
                SET cover_image = :cover_image
                WHERE id = :place_id
                LIMIT 1
            ");

            $updatePlaceStmt->execute([
                'cover_image' => $nextCover['image_path'],
                'place_id' => $image['place_id'],
            ]);
        } else {
            $clearCoverStmt = $pdo->prepare("
                UPDATE places
                SET cover_image = NULL
                WHERE id = :place_id
                LIMIT 1
            ");

            $clearCoverStmt->execute([
                'place_id' => $image['place_id'],
            ]);
        }
    }

    successResponse([
        'message' => 'Фотография удалена',
        'image_id' => $imageId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось удалить фотографию',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/place-images/set-cover.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$imageId = (int) ($input['image_id'] ?? 0);

if ($imageId <= 0) {
    errorResponse('Не передан ID фотографии', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pi.id,
            pi.place_id,
            pi.image_path
        FROM place_images pi
        INNER JOIN places p
            ON p.id = pi.place_id
        WHERE pi.id = :image_id
        AND p.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'image_id' => $imageId,
        'user_id' => $userId,
    ]);

    $image = $stmt->fetch();

    if (!$image) {
        errorResponse('Фотография не найдена или нет доступа', 404);
    }

    $resetStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 0
        WHERE place_id = :place_id
    ");

    $resetStmt->execute([
        'place_id' => $image['place_id'],
    ]);

    $coverStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 1
        WHERE id = :image_id
        LIMIT 1
    ");

    $coverStmt->execute([
        'image_id' => $imageId,
    ]);

    $placeStmt = $pdo->prepare("
        UPDATE places
        SET
            cover_image = :cover_image,
            updated_at = NOW()
        WHERE id = :place_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'cover_image' => $image['image_path'],
        'place_id' => $image['place_id'],
    ]);

    successResponse([
        'message' => 'Обложка успешно обновлена',
        'image_id' => $imageId,
        'place_id' => (int) $image['place_id'],
        'cover_image' => $image['image_path'],
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить обложку',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/place-images/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover,
            created_at
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $placeId,
    ]);

    $images = $imagesStmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'images' => $images,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить фотографии',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/place-attributes/definitions.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$categoryId = (int) ($_GET['category_id'] ?? 0);

if ($categoryId <= 0) {
    errorResponse('Не передан ID категории', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            ad.id,
            ad.category_id,
            ad.code,
            ad.title,
            ad.field_type,
            ad.reference_group_id,
            ad.is_required,
            ad.is_filterable,
            ad.sort_order,

            rg.code AS reference_group_code,
            rg.title AS reference_group_title

        FROM attribute_definitions ad

        LEFT JOIN reference_groups rg
            ON rg.id = ad.reference_group_id

        WHERE ad.category_id = :category_id
        AND ad.is_active = 1

        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $stmt->execute([
        'category_id' => $categoryId,
    ]);

    $attributes = $stmt->fetchAll();

    successResponse([
        'category_id' => $categoryId,
        'attributes' => $attributes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить характеристики категории',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/place-attributes/save.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);
$attributes = $input['attributes'] ?? [];

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!is_array($attributes)) {
    errorResponse('Некорректный формат характеристик', 422);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            category_id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $pdo->beginTransaction();

    foreach ($attributes as $attribute) {
        $definitionId = (int) ($attribute['attribute_definition_id'] ?? 0);
        $value = trim((string) ($attribute['value'] ?? ''));

        if ($definitionId <= 0) {
            continue;
        }

        $definitionStmt = $pdo->prepare("
            SELECT id
            FROM attribute_definitions
            WHERE id = :id
            AND category_id = :category_id
            AND is_active = 1
            LIMIT 1
        ");

        $definitionStmt->execute([
            'id' => $definitionId,
            'category_id' => $place['category_id'],
        ]);

        $definition = $definitionStmt->fetch();

        if (!$definition) {
            continue;
        }

        $deleteStmt = $pdo->prepare("
            DELETE FROM place_attributes
            WHERE place_id = :place_id
            AND attribute_definition_id = :attribute_definition_id
        ");

        $deleteStmt->execute([
            'place_id' => $placeId,
            'attribute_definition_id' => $definitionId,
        ]);

        if ($value === '') {
            continue;
        }

        $insertStmt = $pdo->prepare("
            INSERT INTO place_attributes (
                place_id,
                attribute_definition_id,
                value,
                created_at,
                updated_at
            ) VALUES (
                :place_id,
                :attribute_definition_id,
                :value,
                NOW(),
                NOW()
            )
        ");

        $insertStmt->execute([
            'place_id' => $placeId,
            'attribute_definition_id' => $definitionId,
            'value' => $value,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Характеристики объекта сохранены',
        'place_id' => $placeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось сохранить характеристики объекта',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/place-attributes/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            category_id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $stmt = $pdo->prepare("
        SELECT
            pa.id,
            pa.attribute_definition_id,
            pa.value,

            ad.code,
            ad.title,
            ad.field_type,
            ad.is_required,
            ad.is_filterable

        FROM place_attributes pa

        INNER JOIN attribute_definitions ad
            ON ad.id = pa.attribute_definition_id

        WHERE pa.place_id = :place_id

        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $stmt->execute([
        'place_id' => $placeId,
    ]);

    $attributes = $stmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'attributes' => $attributes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить характеристики объекта',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/my-places/show.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT *
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $placeId,
    ]);

    $images = $imagesStmt->fetchAll();

    $attributesStmt = $pdo->prepare("
        SELECT
            pa.attribute_definition_id,
            pa.value,

            ad.code,
            ad.title,
            ad.field_type

        FROM place_attributes pa

        INNER JOIN attribute_definitions ad
            ON ad.id = pa.attribute_definition_id

        WHERE pa.place_id = :place_id

        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $attributesStmt->execute([
        'place_id' => $placeId,
    ]);

    $attributes = $attributesStmt->fetchAll();

    successResponse([
        'place' => $place,
        'images' => $images,
        'attributes' => $attributes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить объект',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/routes/index.php 

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.title,
            r.description,
            r.is_public,
            r.share_token,
            r.created_at,
            r.updated_at,

            COUNT(rp.id) AS places_count

        FROM routes r

        LEFT JOIN route_places rp
            ON rp.route_id = r.id

        WHERE r.user_id = :user_id

        GROUP BY r.id

        ORDER BY r.updated_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $routes = $stmt->fetchAll();

    successResponse([
        'routes' => $routes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить маршруты',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/routes/create.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$isPublic = !empty($input['is_public']) ? 1 : 0;

if ($title === '') {
    errorResponse('Введите название маршрута', 422);
}

try {

    $pdo = getDatabaseConnection();

    $shareToken = bin2hex(random_bytes(16));

    $stmt = $pdo->prepare("
        INSERT INTO routes (
            user_id,
            title,
            description,
            is_public,
            share_token,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :title,
            :description,
            :is_public,
            :share_token,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'is_public' => $isPublic,
        'share_token' => $shareToken,
    ]);

    $routeId = (int) $pdo->lastInsertId();

    successResponse([
        'message' => 'Маршрут успешно создан',
        'route' => [
            'id' => $routeId,
            'title' => $title,
            'description' => $description !== '' ? $description : null,
            'is_public' => (bool) $isPublic,
            'share_token' => $shareToken,
        ],
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось создать маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/routes/add-place.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routeId = (int) ($input['route_id'] ?? 0);
$placeId = (int) ($input['place_id'] ?? 0);
$note = trim($input['note'] ?? '');

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT id
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        AND status = 'active'
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Активный маршрут не найден или нет доступа', 404);
    }

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или не опубликован', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM route_places
        WHERE route_id = :route_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $existsStmt->execute([
        'route_id' => $routeId,
        'place_id' => $placeId,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse('Объект уже добавлен в маршрут', 422);
    }

    $orderStmt = $pdo->prepare("
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
        FROM route_places
        WHERE route_id = :route_id
    ");

    $orderStmt->execute([
        'route_id' => $routeId,
    ]);

    $sortOrder = (int) $orderStmt->fetch()['next_order'];

    $insertStmt = $pdo->prepare("
        INSERT INTO route_places (
            route_id,
            place_id,
            sort_order,
            note,
            created_at
        ) VALUES (
            :route_id,
            :place_id,
            :sort_order,
            :note,
            NOW()
        )
    ");

    $insertStmt->execute([
        'route_id' => $routeId,
        'place_id' => $placeId,
        'sort_order' => $sortOrder,
        'note' => $note !== '' ? $note : null,
    ]);

    $updateRouteStmt = $pdo->prepare("
        UPDATE routes
        SET updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateRouteStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Объект добавлен в маршрут',
        'route_id' => $routeId,
        'place_id' => $placeId,
        'sort_order' => $sortOrder,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось добавить объект в маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/routes/archive-index.php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.title,
            r.description,
            r.is_public,
            r.share_token,
            r.status,
            r.completed_at,
            r.archived_at,
            r.created_at,
            r.updated_at,

            COUNT(rp.id) AS places_count

        FROM routes r

        LEFT JOIN route_places rp
            ON rp.route_id = r.id

        WHERE r.user_id = :user_id
        AND r.status IN ('archived', 'completed')

        GROUP BY r.id

        ORDER BY
            COALESCE(r.archived_at, r.completed_at, r.updated_at) DESC,
            r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $routes = $stmt->fetchAll();

    successResponse([
        'routes' => $routes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить архив маршрутов',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/routes/archive.php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routeId = (int) ($input['route_id'] ?? 0);

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT
            id,
            status
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    if ($route['status'] === 'archived') {
        errorResponse('Маршрут уже находится в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE routes
        SET
            status = 'archived',
            archived_at = NOW(),
            updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Маршрут перемещён в архив',
        'route_id' => $routeId,
        'status' => 'archived',
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось переместить маршрут в архив',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/routes/restore.php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routeId = (int) ($input['route_id'] ?? 0);

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT
            id,
            status
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    if ($route['status'] === 'active') {
        errorResponse('Маршрут уже активен', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE routes
        SET
            status = 'active',
            archived_at = NULL,
            completed_at = NULL,
            updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Маршрут восстановлен',
        'route_id' => $routeId,
        'status' => 'active',
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось восстановить маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}

api/routes/complete.php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routeId = (int) ($input['route_id'] ?? 0);

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT
            id,
            status
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    if ($route['status'] !== 'active') {
        errorResponse('Завершить можно только активный маршрут', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE routes
        SET
            status = 'completed',
            completed_at = NOW(),
            archived_at = NULL,
            updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Маршрут завершён',
        'route_id' => $routeId,
        'status' => 'completed',
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось завершить маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}


api/routes/show.php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$routeId = (int) ($_GET['route_id'] ?? 0);

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            title,
            description,
            is_public,
            share_token,
            created_at,
            updated_at
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    $placesStmt = $pdo->prepare("
        SELECT
            rp.id AS route_place_id,
            rp.sort_order,
            rp.note,

            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.status,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM route_places rp

        INNER JOIN places p
            ON p.id = rp.place_id

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE rp.route_id = :route_id

        ORDER BY rp.sort_order ASC, rp.id ASC
    ");

    $placesStmt->execute([
        'route_id' => $routeId,
    ]);

    $places = $placesStmt->fetchAll();

    successResponse([
        'route' => $route,
        'places' => $places,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/routes/remove-place.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routePlaceId = (int) ($input['route_place_id'] ?? 0);

if ($routePlaceId <= 0) {
    errorResponse('Не передан ID точки маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            rp.id,
            rp.route_id
        FROM route_places rp
        INNER JOIN routes r
            ON r.id = rp.route_id
        WHERE rp.id = :id
        AND r.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $routePlaceId,
        'user_id' => $userId,
    ]);

    $routePlace = $stmt->fetch();

    if (!$routePlace) {
        errorResponse('Точка маршрута не найдена', 404);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM route_places
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $routePlaceId,
    ]);

    successResponse([
        'message' => 'Точка удалена из маршрута',
        'route_place_id' => $routePlaceId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось удалить точку маршрута',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/routes/update.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
file_get_contents('php://input'),
true
);

$routeId = (int) ($input['route_id'] ?? 0);
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$isPublic = !empty($input['is_public']) ? 1 : 0;

if ($routeId <= 0) {
errorResponse('Не передан ID маршрута', 400);
}

if ($title === '') {
errorResponse('Введите название маршрута', 422);
}

try {

$pdo = getDatabaseConnection();

$routeStmt = $pdo->prepare("
SELECT id
FROM routes
WHERE id = :route_id
AND user_id = :user_id
AND status = 'active'
LIMIT 1
");

$routeStmt->execute([
'route_id' => $routeId,
'user_id' => $userId,
]);

$route = $routeStmt->fetch();

if (!$route) {
errorResponse('Активный маршрут не найден или нет доступа', 404);
}

$updateStmt = $pdo->prepare("
UPDATE routes
SET
title = :title,
description = :description,
is_public = :is_public,
updated_at = NOW()
WHERE id = :route_id
LIMIT 1
");

$updateStmt->execute([
'title' => $title,
'description' => $description !== '' ? $description : null,
'is_public' => $isPublic,
'route_id' => $routeId,
]);

successResponse([
'message' => 'Маршрут обновлён',
'route_id' => $routeId,
]);

} catch (Throwable $e) {

errorResponse(
'Не удалось обновить маршрут',
500,
[
'error' => $e->getMessage(),
]
);
}
api/routes/delete.php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routeId = (int) ($input['route_id'] ?? 0);

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT id
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    $pdo->beginTransaction();

    $deletePlacesStmt = $pdo->prepare("
        DELETE FROM route_places
        WHERE route_id = :route_id
    ");

    $deletePlacesStmt->execute([
        'route_id' => $routeId,
    ]);

    $deleteRouteStmt = $pdo->prepare("
        DELETE FROM routes
        WHERE id = :route_id
        LIMIT 1
    ");

    $deleteRouteStmt->execute([
        'route_id' => $routeId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Маршрут успешно удалён',
        'route_id' => $routeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось удалить маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/routes/reorder.php


<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routeId = (int) ($input['route_id'] ?? 0);
$items = $input['items'] ?? [];

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

if (!is_array($items)) {
    errorResponse('Некорректный список точек маршрута', 422);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT id
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    $pdo->beginTransaction();

    $updateStmt = $pdo->prepare("
        UPDATE route_places
        SET sort_order = :sort_order
        WHERE id = :id
        AND route_id = :route_id
    ");

    foreach ($items as $index => $routePlaceId) {

        $updateStmt->execute([
            'sort_order' => $index + 1,
            'id' => (int) $routePlaceId,
            'route_id' => $routeId,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Порядок точек маршрута обновлён',
        'route_id' => $routeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось обновить порядок маршрута',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/routes/share.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$token = trim($_GET['token'] ?? '');

if ($token === '') {
    errorResponse('Не передан токен маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            title,
            description,
            is_public,
            share_token,
            created_at,
            updated_at
        FROM routes
        WHERE share_token = :share_token
        LIMIT 1
    ");

    $routeStmt->execute([
        'share_token' => $token,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Публичный маршрут не найден', 404);
    }

    $placesStmt = $pdo->prepare("
        SELECT
            rp.id AS route_place_id,
            rp.sort_order,
            rp.note,

            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.status,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM route_places rp

        INNER JOIN places p
            ON p.id = rp.place_id

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE rp.route_id = :route_id
        AND p.status = 'published'

        ORDER BY rp.sort_order ASC, rp.id ASC
    ");

    $placesStmt->execute([
        'route_id' => $route['id'],
    ]);

    $places = $placesStmt->fetchAll();

    successResponse([
        'route' => $route,
        'places' => $places,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить публичный маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/reviews/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.review_text,
            r.status,
            r.created_at,

            u.first_name AS user_name,
            u.avatar AS user_avatar

        FROM reviews r

        INNER JOIN users u
            ON u.id = r.user_id

        WHERE r.place_id = :place_id
        AND r.status = 'published'

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'place_id' => $placeId,
    ]);

    $reviews = $stmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'reviews' => $reviews,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить отзывы',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/reviews/create.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);
$reviewText = trim($input['review_text'] ?? '');

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if ($reviewText === '') {
    errorResponse('Введите текст отзыва', 422);
}

if (mb_strlen($reviewText) < 10) {
    errorResponse('Отзыв слишком короткий', 422);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    if (!$placeStmt->fetch()) {
        errorResponse('Объект не найден', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM reviews
        WHERE place_id = :place_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $existsStmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse(
            'Вы уже оставляли отзыв для этого объекта',
            422
        );
    }

    $stmt = $pdo->prepare("
        INSERT INTO reviews (
            place_id,
            user_id,
            review_text,
            status,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :user_id,
            :review_text,
            'pending',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
        'review_text' => $reviewText,
    ]);

    successResponse([
        'message' => 'Отзыв отправлен на модерацию',
        'review_id' => (int) $pdo->lastInsertId(),
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось создать отзыв',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/reviews/my.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.review_text,
            r.status,
            r.created_at,
            r.moderated_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image

        FROM reviews r

        INNER JOIN places p
            ON p.id = r.place_id

        WHERE r.user_id = :user_id

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $reviews = $stmt->fetchAll();

    successResponse([
        'reviews' => $reviews,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить отзывы пользователя',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/reports/create.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);
$reportType = trim($input['report_type'] ?? '');
$message = trim($input['message'] ?? '');

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if ($reportType === '') {
    errorResponse('Выберите тип жалобы', 422);
}

if ($message === '') {
    errorResponse('Опишите причину жалобы', 422);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    if (!$placeStmt->fetch()) {
        errorResponse('Объект не найден', 404);
    }

    $stmt = $pdo->prepare("
        INSERT INTO reports (
            place_id,
            user_id,
            report_type,
            message,
            status,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :user_id,
            :report_type,
            :message,
            'new',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
        'report_type' => $reportType,
        'message' => $message,
    ]);

    successResponse([
        'message' => 'Жалоба отправлена',
        'report_id' => (int) $pdo->lastInsertId(),
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось отправить жалобу',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/reports/my.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.report_type,
            r.message,
            r.status,
            r.created_at,
            r.resolved_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image

        FROM reports r

        INNER JOIN places p
            ON p.id = r.place_id

        WHERE r.user_id = :user_id

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $reports = $stmt->fetchAll();

    successResponse([
        'reports' => $reports,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить жалобы пользователя',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/notifications/index.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            type,
            title,
            message,
            is_read,
            read_at,
            created_at
        FROM notifications
        WHERE user_id = :user_id
        ORDER BY created_at DESC, id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $notifications = $stmt->fetchAll();

    $unreadStmt = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM notifications
        WHERE user_id = :user_id
        AND is_read = 0
    ");

    $unreadStmt->execute([
        'user_id' => $userId,
    ]);

    $unreadCount = (int) $unreadStmt->fetch()['total'];

    successResponse([
        'notifications' => $notifications,
        'unread_count' => $unreadCount,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить уведомления',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/notifications/read.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$notificationId = (int) ($input['notification_id'] ?? 0);

if ($notificationId <= 0) {
    errorResponse('Не передан ID уведомления', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE notifications
        SET
            is_read = 1,
            read_at = NOW()
        WHERE id = :notification_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'notification_id' => $notificationId,
        'user_id' => $userId,
    ]);

    if ($stmt->rowCount() === 0) {
        errorResponse('Уведомление не найдено', 404);
    }

    successResponse([
        'message' => 'Уведомление отмечено как прочитанное',
        'notification_id' => $notificationId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить уведомление',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/notifications/read-all.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE notifications
        SET
            is_read = 1,
            read_at = NOW()
        WHERE user_id = :user_id
        AND is_read = 0
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Все уведомления отмечены как прочитанные',
        'updated' => $stmt->rowCount(),
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить уведомления',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}

api/place-images/set-cover.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

$imageId = (int) ($input['image_id'] ?? 0);

if ($imageId <= 0) {
    errorResponse('Не передан ID фотографии', 400);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pi.id,
            pi.place_id,
            pi.image_path
        FROM place_images pi
        INNER JOIN places p ON p.id = pi.place_id
        WHERE pi.id = :image_id
          AND p.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'image_id' => $imageId,
        'user_id' => $userId,
    ]);

    $image = $stmt->fetch();

    if (!$image) {
        errorResponse('Фотография не найдена или нет доступа', 404);
    }

    $pdo->beginTransaction();

    $resetStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 0
        WHERE place_id = :place_id
    ");

    $resetStmt->execute([
        'place_id' => $image['place_id'],
    ]);

    $coverStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 1
        WHERE id = :image_id
        LIMIT 1
    ");

    $coverStmt->execute([
        'image_id' => $imageId,
    ]);

    $placeStmt = $pdo->prepare("
        UPDATE places
        SET cover_image = :cover_image
        WHERE id = :place_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'cover_image' => $image['image_path'],
        'place_id' => $image['place_id'],
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Обложка обновлена',
        'image_id' => $imageId,
        'cover_image' => $image['image_path'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось назначить обложку', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/place-images/reorder.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

$placeId = (int) ($input['place_id'] ?? 0);
$imageIds = $input['image_ids'] ?? [];

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!is_array($imageIds) || count($imageIds) === 0) {
    errorResponse('Не передан порядок фотографий', 422);
}

$imageIds = array_values(array_filter(array_map('intval', $imageIds)));

if (count($imageIds) === 0) {
    errorResponse('Некорректный порядок фотографий', 422);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
          AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $placeholders = implode(',', array_fill(0, count($imageIds), '?'));

    $checkStmt = $pdo->prepare("
        SELECT id
        FROM place_images
        WHERE place_id = ?
          AND id IN ($placeholders)
    ");

    $checkStmt->execute([
        $placeId,
        ...$imageIds,
    ]);

    $existingIds = array_map('intval', array_column($checkStmt->fetchAll(), 'id'));

    if (count($existingIds) !== count($imageIds)) {
        errorResponse('В списке есть фотографии другого объекта', 403);
    }

    $pdo->beginTransaction();

    $updateStmt = $pdo->prepare("
        UPDATE place_images
        SET sort_order = :sort_order
        WHERE id = :image_id
          AND place_id = :place_id
        LIMIT 1
    ");

    foreach ($imageIds as $index => $imageId) {
        $updateStmt->execute([
            'sort_order' => $index,
            'image_id' => $imageId,
            'place_id' => $placeId,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Порядок фотографий обновлён',
        'place_id' => $placeId,
        'image_ids' => $imageIds,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить порядок фотографий', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/appeals/my.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            appeal_type,
            contact,
            message,
            admin_response,
            status,
            created_at,
            updated_at,
            closed_at
        FROM appeals
        WHERE user_id = :user_id
        ORDER BY created_at DESC, id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'appeals' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить обращения', 500, [
        'error' => $e->getMessage(),
    ]);
}

api/appeals/create.php

<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

$type = trim($input['type'] ?? '');
$contact = trim($input['contact'] ?? '');
$message = trim($input['message'] ?? '');

$allowedTypes = ['support', 'idea'];

if (!in_array($type, $allowedTypes, true)) {
    errorResponse('Некорректный тип обращения', 422);
}

if ($message === '') {
    errorResponse('Введите текст обращения', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        INSERT INTO appeals (
            user_id,
            appeal_type,
            contact,
            message,
            admin_response,
            status,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :appeal_type,
            :contact,
            :message,
            NULL,
            'new',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'appeal_type' => $type,
        'contact' => $contact !== '' ? $contact : null,
        'message' => $message,
    ]);

    successResponse([
        'message' => 'Обращение отправлено',
        'appeal_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось отправить обращение', 500, [
        'error' => $e->getMessage(),
    ]);
}


```
