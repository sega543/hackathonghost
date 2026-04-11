<?php
require_once 'config.php';
require_once 'helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$input = getJsonInput();
$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

if (!$email || !$password) {
    jsonResponse(['error' => 'Email and password required'], 400);
}

$stmt = $pdo->prepare("
    SELECT u.id, u.name, u.email, u.role, u.payment_status, u.password_hash, tm.team_id
    FROM users u
    LEFT JOIN team_members tm ON tm.user_id = u.id
    WHERE u.email = ?
");
$stmt->execute([strtolower($email)]);
$user = $stmt->fetch();

if (!$user) {
    jsonResponse(['error' => 'No account found with that email'], 401);
}

if (!password_verify($password, $user['password_hash'])) {
    jsonResponse(['error' => 'Incorrect password'], 401);
}

$token = createJWT(['id' => $user['id'], 'role' => $user['role']], JWT_SECRET);

unset($user['password_hash']);

jsonResponse([
    'token' => $token,
    'user' => $user
]);
