<?php
require_once 'config.php';

// Paystack webhook handler
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$input = file_get_contents('php://input');
$event = json_decode($input, true);

// Verify webhook signature (optional but recommended)
// $signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';
// if ($signature !== hash_hmac('sha512', $input, getenv('PAYSTACK_SECRET_KEY'))) {
//     http_response_code(401);
//     exit;
// }

if ($event['event'] === 'charge.success') {
    $reference = $event['data']['reference'] ?? '';
    
    if ($reference) {
        try {
            $stmt = $pdo->prepare("SELECT fn_verify_payment(?)");
            $stmt->execute([$reference]);
            http_response_code(200);
            echo json_encode(['status' => 'success']);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}

http_response_code(200);
