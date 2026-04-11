<?php
require_once 'config.php';
require_once 'helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$input = getJsonInput();
$reference = $input['reference'] ?? '';

if (!$reference) {
    jsonResponse(['error' => 'Payment reference required'], 400);
}

try {
    $stmt = $pdo->prepare("SELECT fn_verify_payment(?)");
    $stmt->execute([$reference]);
    
    jsonResponse(['success' => true, 'message' => 'Payment verified']);
} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 400);
}
