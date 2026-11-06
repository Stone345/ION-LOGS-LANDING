<?php
// Demo requests from the landing page form (#demo). Emails each request to the IONLOGS inbox and
// keeps a copy in a private folder next to the website (not reachable from the web), so no request
// is lost if an email lands in spam. Works with JavaScript (JSON reply) and without (redirect back).

declare(strict_types=1);

const TO_EMAIL      = 'ionlabllc@gmail.com';
const FROM_EMAIL    = 'no-reply@ionlogs.com';
const FROM_NAME     = 'IONLOGS website';
const MIN_SECONDS   = 3;    // a person takes longer than this to fill in the form
const PER_IP_HOUR   = 5;    // requests per visitor per hour
const ALL_HOUR      = 60;   // requests per hour in total

// Outside public_html: domains/ionlogs.com/demo-requests/
$dataDir = dirname(__DIR__) . '/demo-requests';

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function finish(bool $ok, string $error = '', int $status = 200): void
{
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($ok ? 200 : $status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    } else {
        header('Location: /?demo=' . ($ok ? 'sent' : 'error') . '#demo', true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /#demo', true, 303);
    exit;
}

/** Trimmed single-line text, control characters removed, capped at $max characters. */
function field(string $name, int $max, bool $multiline = false): string
{
    $v = (string)($_POST[$name] ?? '');
    $v = $multiline
        ? preg_replace('/[^\P{C}\n\t]/u', '', str_replace("\r", '', $v))
        : preg_replace('/\p{C}/u', ' ', $v);
    return mb_substr(trim((string)$v), 0, $max);
}

// Bots fill in the hidden "website" field or submit instantly. Pretend it worked so they move on.
if (field('website', 200) !== '') finish(true);
$t = (int)($_POST['t'] ?? 0);
if ($t > 0 && (microtime(true) * 1000 - $t) < MIN_SECONDS * 1000) finish(true);

$first   = field('first_name', 80);
$last    = field('last_name', 80);
$phone   = field('phone', 40);
$email   = field('email', 160);
$lab     = field('lab', 160);
$message = field('message', 4000, true);

if ($first === '' || $last === '' || $lab === '') finish(false, 'Please fill in your name and lab.', 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) finish(false, 'That email doesn’t look right — check for typos.', 422);

// Rate limits, stored as timestamps in small files in the private folder.
if (!is_dir($dataDir)) @mkdir($dataDir, 0700, true);
$ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0]) ?: ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$now = time();
foreach ([['ip-' . hash('sha256', $ip), PER_IP_HOUR], ['all', ALL_HOUR]] as [$key, $limit]) {
    $file = "$dataDir/rate-$key.txt";
    $hits = is_file($file) ? array_filter(array_map('intval', file($file, FILE_IGNORE_NEW_LINES)), fn($x) => $x > $now - 3600) : [];
    if (count($hits) >= $limit) finish(false, 'Too many requests right now. Please try again in an hour.', 429);
    $hits[] = $now;
    @file_put_contents($file, implode("\n", $hits), LOCK_EX);
}

$when = gmdate('Y-m-d H:i') . ' UTC';
$name = "$first $last";

// Keep a private copy first, so the request survives even if mail delivery fails.
@file_put_contents(
    "$dataDir/requests.jsonl",
    json_encode(compact('when', 'first', 'last', 'phone', 'email', 'lab', 'message', 'ip'), JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

$body = "New IONLOGS demo request\n"
      . "========================\n\n"
      . "Name:   $name\n"
      . "Lab:    $lab\n"
      . "Email:  $email\n"
      . "Phone:  " . ($phone !== '' ? $phone : '—') . "\n"
      . "Sent:   $when\n\n"
      . "Message:\n" . ($message !== '' ? $message : '—') . "\n\n"
      . "--\nReply to this email to answer $first directly.\n";

$subject = 'Demo request: ' . $lab . ' (' . $name . ')';
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$replyName = '=?UTF-8?B?' . base64_encode($name) . '?=';
$headers = implode("\r\n", [
    'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
    "Reply-To: $replyName <$email>",
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: IONLOGS landing',
]);

$sent = @mail(TO_EMAIL, $encodedSubject, $body, $headers, '-f' . FROM_EMAIL);

if (!$sent) {
    @file_put_contents("$dataDir/mail-errors.log", "$when mail() failed for $email\n", FILE_APPEND | LOCK_EX);
    // The request is saved, so the visitor still gets a success message; the owner can read the file.
}
finish(true);
