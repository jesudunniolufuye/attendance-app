<?php
declare(strict_types=1);

/**
 * Add a new staff member. Run from the terminal, NOT via a browser:
 *   php add-staff.php "Full Name" 1234
 *
 * This is deliberately a command-line script rather than a web page — it
 * never listens for HTTP requests, so there's no login system to build or
 * get wrong for something only the salon's owner/manager needs to run
 * occasionally.
 */

if ($argc !== 3) {
    fwrite(STDERR, "Usage: php add-staff.php \"Full Name\" 1234\n");
    exit(1);
}

require __DIR__ . '/db.php'; // gives us $pdo

$name = $argv[1];
$pin  = $argv[2];

if (!preg_match('/^\d{4,6}$/', $pin)) {
    fwrite(STDERR, "PIN must be 4 to 6 digits.\n");
    exit(1);
}

$hash = password_hash($pin, PASSWORD_DEFAULT);

$stmt = $pdo->prepare('INSERT INTO users (name, pin_code, role) VALUES (?, ?, ?)');
$stmt->execute([$name, $hash, 'staff']);

echo "Added '{$name}' with id {$pdo->lastInsertId()}.\n";
