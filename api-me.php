<?php
require_once 'config.php';
require_once 'helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$user = requireAuth();

$stmt = $pdo->prepare("
    SELECT u.id, u.name, u.email, u.role, u.payment_status, tm.team_id
    FROM users u
    LEFT JOIN team_members tm ON tm.user_id = u.id
    WHERE u.id = ?
");
$stmt->execute([$user['id']]);
$userData = $stmt->fetch();

if (!$userData) {
    jsonResponse(['error' => 'User not found'], 404);
}

jsonResponse($userData);
