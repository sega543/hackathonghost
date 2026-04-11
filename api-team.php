<?php
require_once 'config.php';
require_once 'helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$team_id = $_GET['team_id'] ?? null;

if (!$team_id) {
    jsonResponse(['error' => 'team_id required'], 400);
}

$stmt = $pdo->prepare('SELECT * FROM teams WHERE id = ?');
$stmt->execute([$team_id]);
$team = $stmt->fetch();

if (!$team) {
    jsonResponse(['error' => 'Team not found'], 404);
}

$stmt = $pdo->prepare("
    SELECT u.id, u.name, u.email, u.payment_status,
           (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id)::int AS submission_count
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ?
    ORDER BY tm.joined_at ASC
");
$stmt->execute([$team_id]);
$members = $stmt->fetchAll();

$team['members'] = $members;

jsonResponse($team);
