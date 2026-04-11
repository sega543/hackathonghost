<?php
require_once 'config.php';
require_once 'helpers.php';

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$stmt = $pdo->prepare("
    SELECT payment_status, payment_reference, payment_verified_at
    FROM users
    WHERE id = ?
");
$stmt->execute([$user['id']]);

jsonResponse($stmt->fetch());
