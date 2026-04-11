<?php
require_once 'config.php';
require_once 'helpers.php';

$user = requireAuth();

if ($user['role'] !== 'admin') {
    jsonResponse(['error' => 'Admin access required'], 403);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("
        SELECT s.*, u.name AS user_name, u.email AS user_email, u.role,
               t.name AS team_name
        FROM submissions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN teams t ON t.id = s.team_id
        ORDER BY s.submitted_at DESC
    ");
    
    jsonResponse($stmt->fetchAll());
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = getJsonInput();
    $submission_id = $input['id'] ?? $input['submission_id'] ?? null;
    $score = $input['score'] ?? null;
    
    if (!$submission_id || $score === null) {
        jsonResponse(['error' => 'id and score required'], 400);
    }
    
    if ($score < 0 || $score > 100) {
        jsonResponse(['error' => 'Score must be between 0 and 100'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE submissions
            SET score = ?, scored_by = ?, scored_at = NOW()
            WHERE id = ?
            RETURNING *
        ");
        $stmt->execute([$score, $user['id'], $submission_id]);
        
        jsonResponse($stmt->fetch());
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 400);
    }
}

jsonResponse(['error' => 'Method not allowed'], 405);
