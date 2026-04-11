<?php
require_once 'config.php';
require_once 'helpers.php';

$user = requireAuth();

if ($user['role'] !== 'admin') {
    jsonResponse(['error' => 'Admin access required'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$stmt = $pdo->query("
    SELECT u.id, u.name, u.email, u.role, u.payment_status, u.payment_reference, u.created_at,
           tm.team_id,
           t.name AS team_name,
           (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id) AS submission_count
    FROM users u
    LEFT JOIN team_members tm ON tm.user_id = u.id
    LEFT JOIN teams t ON t.id = tm.team_id
    WHERE u.role != 'admin'
    ORDER BY u.created_at DESC
");

jsonResponse($stmt->fetchAll());
