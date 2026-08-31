<?php
//give me the id and name of every user who is active.

declare(strict_types=1);
header('Content-Type: application/json');

require __DIR__ . '/db.php';       // gives us $pdo

$stmt = $pdo->query('SELECT id, name FROM users WHERE is_active = 1');
$activeUsers = $stmt->fetchAll();

echo json_encode([
    'active_users' => $activeUsers,
]);

?>
