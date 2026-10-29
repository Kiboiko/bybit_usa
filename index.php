<?php
/**
 * Service Connectivity & Environment Test
 * Version: 1.3.0 (PHP 7.4 compatible)
 *
 * Usage:
 * 1. Upload this file to your server (e.g. https://your-site.com/service_test.php)
 * 2. Open it in a browser.
 * 3. Review results and send them to support if needed.
 */

/* ---------------------------------------------------------------------------
   CONFIGURATION (EDIT THESE)
   --------------------------------------------------------------------------- */

const SERVER_URL = 'https://rbl.palladium.expert';

// URL of your service test endpoint (ideally a safe test route)
$SERVICE_URL = SERVER_URL . '/test_response.php';

// Optional: API key or token if your service uses one
$SERVICE_API_KEY = 'YOUR_API_KEY_HERE';

// Minimum PHP version required by your library
$SERVICE_MIN_PHP = '7.4';

// Request timeout in seconds
$SERVICE_TIMEOUT = 5;

// Number of latency tests per mode (raw + form POST) => total = 2 * NUM_TESTS
$SERVICE_LATENCY_TESTS = 1;

/* ---------------------------------------------------------------------------
   NO NEED TO EDIT BELOW THIS LINE
   --------------------------------------------------------------------------- */

$results = [
    'env'              => [],
    'compat'           => [],
    'request'          => [],
    'primary_response' => [],
    'latency'          => [],
    'errors'           => [],
];

function service_status_badge($ok, $labelOk = 'OK', $labelFail = 'FAIL') {
    $color = $ok ? '#16a34a' : '#dc2626'; // green / red
    $label = $ok ? $labelOk : $labelFail;
    return '<span style="
        display:inline-block;
        padding:2px 8px;
        border-radius:999px;
        font-size:12px;
        color:#fff;
        background:'.$color.';
        font-family:system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    ">'.$label.'</span>';
}

// Polyfill for getallheaders() if needed (PHP 7.4-safe)
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strpos($name, 'HTTP_') === 0) {
                $header = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$header] = $value;
            }
        }
        return $headers;
    }
}

// 1. Environment basic checks
$phpVersion           = PHP_VERSION;
$phpOk                = version_compare($phpVersion, $SERVICE_MIN_PHP, '>=');
$jsonOk               = extension_loaded('json');
$curlOk               = function_exists('curl_init');
$opensslOk            = extension_loaded('openssl');
$allowUrlFopen        = ini_get('allow_url_fopen');
$allowUrlFopenBool    = (bool) (filter_var($allowUrlFopen, FILTER_VALIDATE_BOOLEAN) || $allowUrlFopen == '1');
$clientIp             = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';

$results['env'] = [
    'php_version'       => $phpVersion,
    'php_ok'            => $phpOk,
    'min_php_required'  => $SERVICE_MIN_PHP,
    'json_ok'           => $jsonOk,
    'curl_ok'           => $curlOk,
    'openssl_ok'        => $opensslOk,
    'allow_url_fopen'   => $allowUrlFopenBool,
    'client_ip'         => $clientIp,
    'sapi'              => PHP_SAPI,
    'loaded_extensions' => get_loaded_extensions(),
];

// 2. Compatibility & runtime tests (cURL / JSON / OpenSSL)

// JSON runtime test
$jsonRuntimeOk = false;
if ($jsonOk) {
    $testJson = '{"ok":true}';
    $decoded  = json_decode($testJson, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && isset($decoded['ok']) && $decoded['ok'] === true) {
        $jsonRuntimeOk = true;
    }
}

// cURL runtime test (just curl_init)
$curlRuntimeOk    = false;
$curlRuntimeError = null;
if ($curlOk) {
    $testCh = @curl_init('https://example.com');
    if ($testCh === false) {
        $curlRuntimeError = 'curl_init returned false (possibly disabled via configuration).';
    } else {
        $curlRuntimeOk = true;
        curl_close($testCh);
    }
}

$results['compat'] = [
    'php' => [
        'label'    => 'PHP Version',
        'ok'       => $phpOk,
        'current'  => $phpVersion,
        'required' => $SERVICE_MIN_PHP,
        'note'     => 'Minimum required for the service client library.',
    ],
    'json_ext' => [
        'label'   => 'JSON extension',
        'ok'      => $jsonOk,
        'note'    => 'Required for encoding and decoding payloads (json_decode / json_encode).',
    ],
    'json_runtime' => [
        'label'   => 'JSON runtime test',
        'ok'      => $jsonRuntimeOk,
        'note'    => 'Decoded {"ok":true} without errors.',
    ],
    'curl_ext' => [
        'label'   => 'cURL extension',
        'ok'      => $curlOk,
        'note'    => 'Required for sending HTTP requests to the service (curl_init / curl_exec).',
    ],
    'curl_runtime' => [
        'label'   => 'cURL runtime test',
        'ok'      => $curlRuntimeOk,
        'note'    => $curlRuntimeOk ? 'curl_init("https://example.com") succeeded.' : ($curlRuntimeError ?: 'Not tested.'),
    ],
    'openssl_ext' => [
        'label'   => 'OpenSSL extension',
        'ok'      => $opensslOk,
        'note'    => 'Required for HTTPS connections (TLS) to the service.',
    ],
];

// 3. Collect headers and request context
$headers = getallheaders();
$serverInfo = [
    'REMOTE_ADDR'    => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
    'REMOTE_PORT'    => isset($_SERVER['REMOTE_PORT']) ? $_SERVER['REMOTE_PORT'] : null,
    'SERVER_NAME'    => isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : null,
    'SERVER_ADDR'    => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : null,
    'HTTP_HOST'      => isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : null,
    'REQUEST_URI'    => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : null,
    'REQUEST_METHOD' => isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : null,
    'HTTPS'          => isset($_SERVER['HTTPS']) ? $_SERVER['HTTPS'] : null,
    'HTTP_USER_AGENT'=> isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : null,
];

$results['request'] = [
    'headers'    => $headers,
    'server'     => $serverInfo,
    'target_url' => $SERVICE_URL,
];

// 4. Build payload (canonical data structure)
$payload = [
    'test'               => true,
    'test_type'          => 'connectivity_and_environment',
    'test_script_version'=> '1.3.0',
    'client' => [
        'php_version'             => $phpVersion,
        'sapi'                    => PHP_SAPI,
        'extensions'              => $results['env']['loaded_extensions'],
        'client_ip_seen_by_script'=> $clientIp,
    ],
    'compat' => $results['compat'],
    'request' => [
        'browser_headers' => $headers,
        'server'          => $serverInfo,
    ],
];

// Helper: pretty-print JSON or raw strings
function service_pretty_json($data) {
    if ($data === null) {
        return 'null';
    }
    if (is_string($data)) {
        $decoded = json_decode($data, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        return $data;
    }
    return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

/**
 * Perform HTTP request to the service.
 *
 * Modes:
 *  - "json_body"        => application/json, JSON in php://input
 *  - "raw"              => text/plain, raw body (JSON string)
 *  - "form_json_field"  => application/x-www-form-urlencoded, JSON in $_POST['json']
 */
function service_do_request($url, $mode, $payload, $apiKey, $timeout, $curlOk, $allowUrlFopenBool) {
    $result = [
        'latency_ms'  => null,
        'http_status' => null,
        'raw'         => null,
        'decoded'     => null,
        'error'       => null,
        'mode'        => $mode,
    ];

    if (!$curlOk && !$allowUrlFopenBool) {
        $result['error'] = 'Neither cURL nor allow_url_fopen is available.';
        return $result;
    }

    if (!extension_loaded('json')) {
        $result['error'] = 'JSON extension is not available.';
        return $result;
    }

    $jsonString = json_encode($payload);
    if ($jsonString === false) {
        $result['error'] = 'Failed to json_encode payload.';
        return $result;
    }

    $headersOut = [];
    $bodyString = '';

    if ($mode === 'json_body') {
        // Real JSON POST – server reads from php://input
        $headersOut[] = 'Content-Type: application/json';
        $bodyString   = $jsonString;
    } elseif ($mode === 'raw') {
        // Raw text/plain – same data, but as plain body, often logged as-is
        $headersOut[] = 'Content-Type: text/plain';
        $bodyString   = $jsonString;
    } elseif ($mode === 'form_json_field') {
        // application/x-www-form-urlencoded – server reads $_POST['json']
        $headersOut[] = 'Content-Type: application/x-www-form-urlencoded';
        $postData = [
            'json'            => $jsonString,
            'mode'            => 'form_json_field',
            'script_version'  => '1.3.0',
        ];
        $bodyString = http_build_query($postData, '', '&');
    } else {
        $result['error'] = 'Unknown mode: ' . $mode;
        return $result;
    }

    // Mark test mode for the service
    $headersOut[] = 'X-Service-Test-Mode: ' . $mode;

    if (!empty($apiKey)) {
        $headersOut[] = 'Authorization: Bearer ' . $apiKey;
    }

    $start = microtime(true);

    if ($curlOk) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $bodyString,
            CURLOPT_HTTPHEADER     => $headersOut,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_HEADER         => false, // body only
        ]);

        $responseBody = curl_exec($ch);
        $curlErr      = curl_error($ch);
        $curlErrNo    = curl_errno($ch);
        $httpStatus   = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $latencyMs = round((microtime(true) - $start) * 1000, 2);

        $result['latency_ms']  = $latencyMs;
        $result['http_status'] = $httpStatus;
        $result['raw']         = $responseBody;

        if ($curlErrNo) {
            $result['error'] = 'cURL error #' . $curlErrNo . ': ' . $curlErr;
        }
    } else {
        // Fallback using file_get_contents
        $headersString = implode("\r\n", $headersOut);
        $contextOptions = [
            'http' => [
                'method'  => 'POST',
                'header'  => $headersString . "\r\n",
                'content' => $bodyString,
                'timeout' => $timeout,
            ]
        ];

        $context = stream_context_create($contextOptions);

        $responseBody = @file_get_contents($url, false, $context);
        $latencyMs    = round((microtime(true) - $start) * 1000, 2);

        $result['latency_ms'] = $latencyMs;
        $result['raw']        = $responseBody;

        // Try to get HTTP status from $http_response_header
        $httpStatus = null;
        if (isset($http_response_header[0]) && preg_match('#HTTP/\S+\s+(\d{3})#', $http_response_header[0], $m)) {
            $httpStatus = (int)$m[1];
        }
        $result['http_status'] = $httpStatus;

        if ($responseBody === false) {
            $result['error'] = 'file_get_contents failed to contact service endpoint.';
        }
    }

    // Attempt to decode JSON response (if any)
    if (is_string($result['raw']) && $result['raw'] !== '') {
        $decoded = json_decode($result['raw'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $result['decoded'] = $decoded;
        }
    }

    return $result;
}

// 5. Primary single JSON POST (real JSON body)
$primaryResponse = service_do_request(
    $SERVICE_URL,
    'json_body',
    $payload,
    $SERVICE_API_KEY,
    $SERVICE_TIMEOUT,
    $curlOk,
    $allowUrlFopenBool
);
$results['primary_response'] = $primaryResponse;

if ($primaryResponse['error'] !== null) {
    $results['errors'][] = 'Primary JSON POST: ' . $primaryResponse['error'];
}

// 6. Latency tests: 10 RAW BODY + 10 FORM POST with JSON in $_POST['json']
$latenciesRaw    = [];
$statusesRaw     = [];
$latenciesPost   = [];
$statusesPost    = [];
$lastRaw         = null;
$lastPostJson    = null;

if (!$curlOk && !$allowUrlFopenBool) {
    $results['errors'][] = 'Latency tests skipped: neither cURL nor allow_url_fopen is available.';
} else {
    for ($i = 0; $i < $SERVICE_LATENCY_TESTS; $i++) {
        // RAW BODY (text/plain)
        $resRaw = service_do_request(
            $SERVICE_URL,
            'raw',
            $payload,
            $SERVICE_API_KEY,
            $SERVICE_TIMEOUT,
            $curlOk,
            $allowUrlFopenBool
        );
        if ($resRaw['latency_ms'] !== null) {
            $latenciesRaw[] = $resRaw['latency_ms'];
        }
        if ($resRaw['http_status'] !== null) {
            $statusesRaw[] = $resRaw['http_status'];
        }
        $lastRaw = $resRaw;
        if ($resRaw['error'] !== null) {
            $results['errors'][] = 'RAW test #' . ($i + 1) . ': ' . $resRaw['error'];
        }

        // FORM POST with JSON field ($_POST['json'])
        $resForm = service_do_request(
            $SERVICE_URL,
            'form_json_field',
            $payload,
            $SERVICE_API_KEY,
            $SERVICE_TIMEOUT,
            $curlOk,
            $allowUrlFopenBool
        );
        if ($resForm['latency_ms'] !== null) {
            $latenciesPost[] = $resForm['latency_ms'];
        }
        if ($resForm['http_status'] !== null) {
            $statusesPost[] = $resForm['http_status'];
        }
        $lastPostJson = $resForm;
        if ($resForm['error'] !== null) {
            $results['errors'][] = 'FORM POST test #' . ($i + 1) . ': ' . $resForm['error'];
        }
    }
}

// Helper: compute latency stats
function service_latency_stats($latencies, $statuses) {
    if (empty($latencies)) {
        return null;
    }
    sort($latencies);
    $n         = count($latencies);
    $min       = $latencies[0];
    $max       = $latencies[$n - 1];
    $avg       = array_sum($latencies) / $n;
    $successes = 0;
    foreach ($statuses as $st) {
        if ($st >= 200 && $st < 400) {
            $successes++;
        }
    }
    $successRate = $n > 0 ? ($successes / $n) * 100 : null;

    return [
        'count'        => $n,
        'min'          => round($min, 2),
        'max'          => round($max, 2),
        'avg'          => round($avg, 2),
        'success_rate' => $successRate !== null ? round($successRate, 1) : null,
    ];
}

$statsRaw  = service_latency_stats($latenciesRaw, $statusesRaw);
$statsPost = service_latency_stats($latenciesPost, $statusesPost);

$results['latency'] = [
    'raw_body' => [
        'stats' => $statsRaw,
        'last'  => $lastRaw,
    ],
    'form_post_json' => [
        'stats' => $statsPost,
        'last'  => $lastPostJson,
    ],
];

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Service Connectivity Test</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            margin: 0;
            padding: 16px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f1f5f9;
            color: #0f172a;
        }
        .container {
            max-width: 960px;
            margin: 0 auto;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 4px;
        }
        h2 {
            font-size: 18px;
            margin-top: 24px;
            margin-bottom: 8px;
        }
        .card {
            background: #ffffff;
            border-radius: 12px;
            padding: 16px 20px;
            margin-top: 12px;
            box-shadow: 0 10px 25px rgba(15,23,42,0.04);
        }
        .kv {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
        }
        .kv:last-child {
            border-bottom: none;
        }
        .kv-label {
            font-weight: 500;
            color: #64748b;
        }
        .kv-value {
            font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            color: #0f172a;
        }
        pre {
            background: #0f172a;
            color: #e5e7eb;
            padding: 12px;
            border-radius: 10px;
            overflow-x: auto;
            font-size: 12px;
            line-height: 1.5;
        }
        .errors {
            background: #fef2f2;
            color: #b91c1c;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 14px;
        }
        .badge-small {
            display:inline-block;
            padding:2px 6px;
            border-radius:999px;
            font-size:11px;
            background:#e5e7eb;
            color:#4b5563;
        }
        .footer {
            margin-top: 24px;
            font-size: 12px;
            color: #94a3b8;
        }
        .pill {
            display:inline-block;
            padding:2px 8px;
            border-radius:999px;
            font-size:11px;
            background:#e0f2fe;
            color:#0369a1;
            margin:2px 4px 2px 0;
        }
        .latency-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 6px;
        }
        .latency-table th,
        .latency-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
        }
        .latency-table th {
            background: #f8fafc;
            font-weight: 600;
            color: #475569;
        }
    </style>
</head>
<body>
<div class="container">
    <h1>Service Connectivity Test</h1>
    <div class="badge-small">Script v1.3.0 (PHP 7.4)</div>

    <div class="card">
        <h2>Summary</h2>
        <div class="kv">
            <div class="kv-label">PHP Version</div>
            <div class="kv-value">
                <?php echo htmlspecialchars($phpVersion); ?>
                <?php echo service_status_badge($phpOk); ?>
            </div>
        </div>
        <div class="kv">
            <div class="kv-label">Primary JSON POST (php://input) status</div>
            <div class="kv-value">
                <?php
                $prStatus = $primaryResponse['http_status'];
                if ($prStatus !== null) {
                    echo htmlspecialchars($prStatus) . ' ';
                    echo service_status_badge($prStatus >= 200 && $prStatus < 400);
                } else {
                    echo 'N/A ' . service_status_badge(false);
                }
                ?>
            </div>
        </div>
        <div class="kv">
            <div class="kv-label">Average latency (RAW BODY tests)</div>
            <div class="kv-value">
                <?php
                if ($statsRaw !== null) {
                    echo htmlspecialchars($statsRaw['avg']) . ' ms ';
                    echo service_status_badge(true);
                } else {
                    echo 'N/A ' . service_status_badge(false);
                }
                ?>
            </div>
        </div>
        <div class="kv">
            <div class="kv-label">Average latency (FORM POST JSON tests)</div>
            <div class="kv-value">
                <?php
                if ($statsPost !== null) {
                    echo htmlspecialchars($statsPost['avg']) . ' ms ';
                    echo service_status_badge(true);
                } else {
                    echo 'N/A ' . service_status_badge(false);
                }
                ?>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>Compatibility & Required Extensions</h2>
        <?php foreach ($results['compat'] as $key => $info): ?>
            <div class="kv">
                <div class="kv-label"><?php echo htmlspecialchars($info['label']); ?></div>
                <div class="kv-value">
                    <?php echo service_status_badge($info['ok']); ?>
                </div>
            </div>
            <?php if (!empty($info['note'])): ?>
                <div style="font-size:12px;color:#64748b;margin:2px 0 6px 0;">
                    <?php echo htmlspecialchars($info['note']); ?>
                    <?php if (isset($info['current']) && isset($info['required'])): ?>
                        (Current: <?php echo htmlspecialchars($info['current']); ?>,
                        Required: <?php echo htmlspecialchars($info['required']); ?>)
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>

    <?php if (!empty($results['errors'])): ?>
        <div class="card">
            <h2>Errors / Warnings</h2>
            <div class="errors">
                <ul>
                    <?php foreach ($results['errors'] as $err): ?>
                        <li><?php echo htmlspecialchars($err); ?></li>
                    <?php endforeach; ?>
                </ul>
                <p>If any item above is red, this server may not be able to communicate with the service correctly.</p>
            </div>
        </div>
    <?php endif; ?>

    <div class="card">
        <h2>Latency Benchmark (<?php echo (int)$SERVICE_LATENCY_TESTS; ?> tests per mode)</h2>
        <table class="latency-table">
            <thead>
            <tr>
                <th>Mode</th>
                <th>Tests</th>
                <th>Min (ms)</th>
                <th>Max (ms)</th>
                <th>Avg (ms)</th>
                <th>Success rate</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td>RAW BODY (text/plain)</td>
                <td><?php echo $statsRaw !== null ? htmlspecialchars($statsRaw['count']) : '0'; ?></td>
                <td><?php echo $statsRaw !== null ? htmlspecialchars($statsRaw['min']) : 'N/A'; ?></td>
                <td><?php echo $statsRaw !== null ? htmlspecialchars($statsRaw['max']) : 'N/A'; ?></td>
                <td><?php echo $statsRaw !== null ? htmlspecialchars($statsRaw['avg']) : 'N/A'; ?></td>
                <td>
                    <?php
                    if ($statsRaw !== null && $statsRaw['success_rate'] !== null) {
                        echo htmlspecialchars($statsRaw['success_rate']) . '%';
                    } else {
                        echo 'N/A';
                    }
                    ?>
                </td>
            </tr>
            <tr>
                <td>FORM POST (JSON in $_POST['json'])</td>
                <td><?php echo $statsPost !== null ? htmlspecialchars($statsPost['count']) : '0'; ?></td>
                <td><?php echo $statsPost !== null ? htmlspecialchars($statsPost['min']) : 'N/A'; ?></td>
                <td><?php echo $statsPost !== null ? htmlspecialchars($statsPost['max']) : 'N/A'; ?></td>
                <td><?php echo $statsPost !== null ? htmlspecialchars($statsPost['avg']) : 'N/A'; ?></td>
                <td>
                    <?php
                    if ($statsPost !== null && $statsPost['success_rate'] !== null) {
                        echo htmlspecialchars($statsPost['success_rate']) . '%';
                    } else {
                        echo 'N/A';
                    }
                    ?>
                </td>
            </tr>
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>Environment Details</h2>
        <div class="kv">
            <div class="kv-label">Client IP (seen by script)</div>
            <div class="kv-value"><?php echo htmlspecialchars($clientIp); ?></div>
        </div>
        <div class="kv">
            <div class="kv-label">SAPI</div>
            <div class="kv-value"><?php echo htmlspecialchars(PHP_SAPI); ?></div>
        </div>
        <div style="margin-top:8px;">
            <div class="kv-label" style="margin-bottom:4px;">Loaded extensions</div>
            <div>
                <?php foreach ($results['env']['loaded_extensions'] as $ext): ?>
                    <span class="pill"><?php echo htmlspecialchars($ext); ?></span>
                <?php endforeach; ?>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>Collected Browser Headers</h2>
        <pre><?php echo htmlspecialchars(service_pretty_json($headers)); ?></pre>
    </div>

    <div class="card">
        <h2>Payload Used in Tests (canonical JSON)</h2>
        <pre><?php echo htmlspecialchars(service_pretty_json($payload)); ?></pre>
    </div>

    <div class="card">
        <h2>Primary Service Response (JSON body)</h2>
        <pre><?php echo htmlspecialchars(service_pretty_json($primaryResponse['raw'])); ?></pre>
    </div>

    <div class="card">
        <h2>Last RAW BODY Response (text/plain)</h2>
        <pre><?php echo htmlspecialchars(service_pretty_json($lastRaw !== null ? $lastRaw['raw'] : 'No response')); ?></pre>
    </div>

    <div class="card">
        <h2>Last FORM POST Response (JSON from $_POST['json'])</h2>
        <pre><?php echo htmlspecialchars(service_pretty_json($lastPostJson !== null ? $lastPostJson['raw'] : 'No response')); ?></pre>
    </div>

    <div class="footer">
        If you’re sending this output to support, include everything from this page.
    </div>
</div>
</body>
</html>
