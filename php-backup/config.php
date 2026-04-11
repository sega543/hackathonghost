<?php
// Suppress warnings from being output (they corrupt JSON responses)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ── LOAD .env FILE ────────────────────────────────────────────────────────
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($val));
    }
}

// ── DATABASE CONFIGURATION ────────────────────────────────────────────────
// Supports DATABASE_URL (Neon/Supabase/Vercel Postgres) or individual vars

define('JWT_SECRET', getenv('JWT_SECRET') ?: 'ghost-protocol-jwt-secret-2026');

$dsn  = '';
$user = '';
$pass = '';

$database_url = getenv('DATABASE_URL');

if ($database_url) {
    // Parse postgres://user:pass@host:port/dbname
    $p = parse_url($database_url);
    $host   = $p['host'];
    $port   = $p['port'] ?? 5432;
    $dbname = ltrim($p['path'], '/');
    $user   = $p['user'] ?? '';
    $pass   = urldecode($p['pass'] ?? '');
    // Use hostaddr to bypass DNS IPv6 issues — resolve manually
    $ip = gethostbyname($host);
    $dsn = "pgsql:host=$ip;port=$port;dbname=$dbname;sslmode=require;options='--client_encoding=UTF8'";
    // Fall back to hostname if resolution fails
    if ($ip === $host) {
        $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
    }
} else {
    $host   = getenv('DB_HOST') ?: 'localhost';
    $port   = getenv('DB_PORT') ?: '5432';
    $dbname = getenv('DB_NAME') ?: 'ghost_protocol';
    $user   = getenv('DB_USER') ?: 'postgres';
    $pass   = getenv('DB_PASS') ?: '';
    $dsn    = "pgsql:host=$host;port=$port;dbname=$dbname";
}

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
