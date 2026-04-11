<?php
require_once 'config.php';
require_once 'helpers.php';

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    $team_id = $_GET['team_id'] ?? null;
    
    if ($team_id) {
        $stmt = $pdo->prepare("
            SELECT s.*, sr.opens_at, sr.closes_at
            FROM submissions s
            JOIN submission_rounds sr ON sr.round_number = s.round_number
            WHERE s.user_id = ? OR s.team_id = ?
            ORDER BY s.round_number ASC
        ");
        $stmt->execute([$user_id, $team_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT s.*, sr.opens_at, sr.closes_at
            FROM submissions s
            JOIN submission_rounds sr ON sr.round_number = s.round_number
            WHERE s.user_id = ?
            ORDER BY s.round_number ASC
        ");
        $stmt->execute([$user_id]);
    }
    
    jsonResponse($stmt->fetchAll());
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = getJsonInput();
    $user_id = $input['user_id'] ?? null;
    $team_id = $input['team_id'] ?? null;
    $round_number = $input['round_number'] ?? null;
    $pdf_link = $input['pdf_link'] ?? null;
    $github_link = $input['github_link'] ?? null;
    $youtube_link = $input['youtube_link'] ?? null;
    
    if (!$user_id || !$round_number || !$github_link || !$youtube_link) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO submissions (user_id, team_id, round_number, pdf_link, github_link, youtube_link)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, round_number) DO UPDATE
            SET pdf_link = EXCLUDED.pdf_link,
                github_link = EXCLUDED.github_link,
                youtube_link = EXCLUDED.youtube_link,
                submitted_at = NOW()
            RETURNING *
        ");
        $stmt->execute([$user_id, $team_id, $round_number, $pdf_link, $github_link, $youtube_link]);
        
        jsonResponse($stmt->fetch(), 201);
    } catch (Exception $e) {
        jsonResponse(['error' => $e->getMessage()], 400);
    }
}

jsonResponse(['error' => 'Method not allowed'], 405);
