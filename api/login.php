<?php
declare(strict_types=1);
header('Content-Type: application/json');

require __DIR__ . '/db.php';       // gives us $pdo

$body = json_decode(file_get_contents('php://input'), true);
$userId = $body['user_id'] ?? null;
$pin = $body['pin'] ?? null;
if (!$userId || !$pin) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id and pin are required']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, name, pin_code FROM users WHERE id = ? AND is_active = 1');
$stmt->execute([$userId]);
$row = $stmt->fetch();

if (!($row && password_verify($pin, $row['pin_code']))) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid user_id or pin']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT id FROM attendance_logs WHERE user_id = ? AND clock_out_time IS NULL'
);
$stmt->execute([$userId]);
$hasOpenSession = (bool) $stmt->fetch();

echo json_encode([
    'name' => $row['name'],
    'has_open_session' => $hasOpenSession,
]);
