<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET,POST,OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

function send_json($status, $payload) {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, ['ok' => false, 'error' => 'Method not allowed']);
}

// realpath() resolves the symlinked public_html the parked domains use, so secrets.php
// is always read from the primary domain's folder no matter which domain served the request.
$config = require dirname(dirname(realpath(__DIR__))) . '/secrets.php';

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function google_access_token(array $credentials, $scope) {
    $now = time();
    $header = base64url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claim = base64url_encode(json_encode([
        'iss' => $credentials['client_email'],
        'scope' => $scope,
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ]));

    $unsigned = "$header.$claim";
    $signature = '';
    $ok = openssl_sign($unsigned, $signature, $credentials['private_key'], 'sha256WithRSAEncryption');
    if (!$ok) {
        throw new Exception('Failed to sign JWT assertion');
    }
    $assertion = $unsigned . '.' . base64url_encode($signature);

    $res = http_post_json('https://oauth2.googleapis.com/token', [
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $assertion,
    ]);

    if (!isset($res['access_token'])) {
        throw new Exception('Failed to obtain Google access token: ' . json_encode($res));
    }
    return $res['access_token'];
}

function http_post_json($url, $body, $headers = []) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_TIMEOUT => 20,
    ]);
    $raw = curl_exec($ch);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception("HTTP request failed: $err");
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode($raw, true);
    if ($status >= 400) {
        $msg = is_array($data) && isset($data['error']) ? (is_array($data['error']) ? ($data['error']['message'] ?? json_encode($data['error'])) : $data['error']) : "HTTP $status";
        throw new Exception($msg);
    }
    return $data;
}

function is_valid_email($value) {
    return (bool) filter_var($value, FILTER_VALIDATE_EMAIL);
}

function is_valid_us_phone($value) {
    $digits = preg_replace('/\D/', '', $value);
    if (strlen($digits) === 11 && $digits[0] === '1') {
        $digits = substr($digits, 1);
    }
    return (bool) preg_match('/^[2-9]\d{2}[2-9]\d{6}$/', $digits);
}

function escape_html($value) {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

// Landing URLs carry the ad's Google Ads tag as ?gtag_id=AW-...; the sheet stores that id, not the URL.
function extract_gtag_id($pageUrl) {
    $query = parse_url($pageUrl, PHP_URL_QUERY);
    if (!$query) return '';
    parse_str($query, $params);
    return isset($params['gtag_id']) ? trim((string) $params['gtag_id']) : '';
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

$name = trim((string)($body['name'] ?? ''));
$phone = trim((string)($body['phone'] ?? ''));
$email = trim((string)($body['email'] ?? ''));
$source = trim((string)($body['source'] ?? 'website'));
$page = trim((string)($body['page'] ?? ''));
$submittedAt = (string)($body['submittedAt'] ?? date('c'));

if (!$name || !$phone || !is_valid_us_phone($phone) || !$email || !is_valid_email($email)) {
    send_json(400, ['ok' => false, 'error' => 'Invalid payload. name, a valid US phone number and valid email are required.']);
}

try {
    $credentials = json_decode(file_get_contents($config['credentials_path']), true);
    $token = google_access_token($credentials, 'https://www.googleapis.com/auth/spreadsheets');

    $range = rawurlencode($config['sheet_name'] . '!A:I');
    $url = "https://sheets.googleapis.com/v4/spreadsheets/{$config['spreadsheet_id']}/values/{$range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";
    // Columns F-H stay empty; the gtag id belongs in column I.
    $row = [$submittedAt, $name, $phone, $email, $source, '', '', '', extract_gtag_id($page)];
    http_post_json($url, ['values' => [$row]], ["Authorization: Bearer $token"]);
} catch (Exception $e) {
    error_log('[leads] ' . $e->getMessage());
    send_json(500, ['ok' => false, 'error' => 'Failed to save lead. Check credentials and sheet access.']);
}

try {
    if (!$config['resend_api_key']) {
        throw new Exception('RESEND_API_KEY is missing');
    }
    $subject = "New lead: $name";
    $text = "New lead from Bybit Analytics\n\n" .
        "Name: $name\nPhone: $phone\nEmail: $email\nSource: $source\nPage: $page\nSubmitted: $submittedAt";
    $html = '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">' .
        '<h2 style="margin:0 0 12px">New lead from Bybit Analytics</h2>' .
        '<p style="margin:0 0 8px"><strong>Name:</strong> ' . escape_html($name) . '</p>' .
        '<p style="margin:0 0 8px"><strong>Phone:</strong> ' . escape_html($phone) . '</p>' .
        '<p style="margin:0 0 8px"><strong>Email:</strong> ' . escape_html($email) . '</p>' .
        '<p style="margin:0 0 8px"><strong>Source:</strong> ' . escape_html($source) . '</p>' .
        '<p style="margin:0 0 8px"><strong>Page:</strong> ' . escape_html($page) . '</p>' .
        '<p style="margin:0"><strong>Submitted:</strong> ' . escape_html($submittedAt) . '</p>' .
        '</div>';

    http_post_json('https://api.resend.com/emails', [
        'from' => $config['lead_email_from'],
        'to' => $config['lead_email_to'],
        'reply_to' => $config['lead_email_reply_to'],
        'subject' => $subject,
        'text' => $text,
        'html' => $html,
    ], ["Authorization: Bearer {$config['resend_api_key']}"]);
} catch (Exception $e) {
    error_log('[email] ' . $e->getMessage());
    send_json(500, ['ok' => false, 'error' => 'Lead saved to Sheets, but email notification failed.', 'details' => $e->getMessage()]);
}

send_json(200, ['ok' => true]);
