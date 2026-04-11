<?php
require_once 'config.php';
require_once 'helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$input = getJsonInput();
$name = $input['name'] ?? '';
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';
$role = $input['role'] ?? '';
$team_name = $input['team_name'] ?? '';

if (!$name || !$email || !$password || !$role) {
    jsonResponse(['error' => 'All fields are required'], 400);
}

if (!in_array($role, ['lone', 'team_4', 'team_10'])) {
    jsonResponse(['error' => 'Invalid role'], 400);
}

if (strlen($password) < 8) {
    jsonResponse(['error' => 'Password must be at least 8 characters'], 400);
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([strtolower($email)]);
if ($stmt->fetch()) {
    jsonResponse(['error' => 'Email already registered'], 409);
}

try {
    $pdo->beginTransaction();
    
    $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    
    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, password_hash, role, payment_status)
        VALUES (?, ?, ?, ?, FALSE)
        RETURNING id, name, email, role, payment_status
    ");
    $stmt->execute([$name, strtolower($email), $password_hash, $role]);
    $user = $stmt->fetch();
    
    $team_id = null;
    if ($role === 'team_4' || $role === 'team_10') {
        $tname = $team_name ?: "$name's Team";
        $stmt = $pdo->prepare("
            INSERT INTO teams (name, team_type)
            VALUES (?, ?)
            RETURNING id
        ");
        $stmt->execute([$tname, $role]);
        $team_id = $stmt->fetch()['id'];
        
        $stmt = $pdo->prepare("
            INSERT INTO team_members (team_id, user_id)
            VALUES (?, ?)
        ");
        $stmt->execute([$team_id, $user['id']]);
    }
    
    $pdo->commit();
    
    $token = createJWT(['id' => $user['id'], 'role' => $user['role']], JWT_SECRET);
    
    $user['team_id'] = $team_id;
    
    jsonResponse([
        'token' => $token,
        'user' => $user
    ], 201);
    
} catch (Exception $e) {
    $pdo->rollBack();
    jsonResponse(['error' => $e->getMessage()], 500);
}
