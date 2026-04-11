<?php
require_once 'config.php';
require_once 'helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$type = $_GET['type'] ?? 'all';

if ($type !== 'all') {
    $stmt = $pdo->prepare("
        SELECT lb.rank, lb.entity_type, lb.entity_id, lb.total_score, lb.last_updated,
               COALESCE(u.name, t.name) AS display_name
        FROM leaderboard lb
        LEFT JOIN users u ON lb.entity_type = 'user' AND lb.entity_id = u.id
        LEFT JOIN teams t ON lb.entity_type = 'team' AND lb.entity_id = t.id
        WHERE lb.entity_type = ?
        ORDER BY lb.rank ASC
    ");
    $stmt->execute([$type]);
} else {
    $stmt = $pdo->query("
        SELECT lb.rank, lb.entity_type, lb.entity_id, lb.total_score, lb.last_updated,
               COALESCE(u.name, t.name) AS display_name
        FROM leaderboard lb
        LEFT JOIN users u ON lb.entity_type = 'user' AND lb.entity_id = u.id
        LEFT JOIN teams t ON lb.entity_type = 'team' AND lb.entity_id = t.id
        ORDER BY lb.rank ASC
    ");
}

jsonResponse($stmt->fetchAll());
