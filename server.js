const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT) || 3000;
const SPREADSHEET_ID =
  process.env.SPREADSHEET_ID || "1aEeUcO5WFwAlSn2Ydm9W5QoIENdLG20qdSA8MJaK5Zw";
const SHEET_NAME = process.env.SHEET_NAME || "Leads";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const LEAD_EMAIL_TO = process.env.LEAD_EMAIL_TO || "xeqiyehov74@gmail.com";
const LEAD_EMAIL_FROM =
  process.env.LEAD_EMAIL_FROM || "onboarding@resend.dev";
const LEAD_EMAIL_REPLY_TO =
  process.env.LEAD_EMAIL_REPLY_TO || LEAD_EMAIL_TO;

const CREDENTIALS_CANDIDATES = [
  process.env.GOOGLE_CREDENTIALS_PATH,
  path.join(__dirname, "credentials.json"),
  path.join(__dirname, "usacars-503216-1c1e00868fca.json"),
].filter(Boolean);

function resolveCredentialsPath() {
  for (const candidate of CREDENTIALS_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    "Credentials JSON not found. Place usacars-*.json or credentials.json in the project root."
  );
}

const credentials = JSON.parse(fs.readFileSync(resolveCredentialsPath(), "utf8"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function requestJson(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body == null ? null : Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: {
          ...(options.headers || {}),
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": payload.length,
              }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = { raw: text };
          }
          if (res.statusCode >= 400) {
            const err = new Error(
              data?.error?.message || data?.error || `HTTP ${res.statusCode}`
            );
            err.status = res.statusCode;
            err.data = data;
            reject(err);
            return;
          }
          resolve(data);
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let cachedToken = null;
let cachedTokenExp = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExp - 60) return cachedToken;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(credentials.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${unsigned}.${signature}`;
  const tokenRes = await requestJson(
    "https://oauth2.googleapis.com/token",
    { method: "POST" },
    {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }
  );

  cachedToken = tokenRes.access_token;
  cachedTokenExp = now + Number(tokenRes.expires_in || 3600);
  return cachedToken;
}

async function appendLead(row) {
  const token = await getAccessToken();
  const range = encodeURIComponent(`${SHEET_NAME}!A:I`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}` +
    `/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  return requestJson(
    url,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
    { values: [row] }
  );
}

async function checkSheetAccess() {
  const token = await getAccessToken();
  return requestJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=spreadsheetId,properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendLeadEmail({ name, phone, email, source, page, submittedAt }) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing in .env");
  }

  const subject = `New lead: ${name}`;
  const text = [
    "New lead from Bybit Analytics",
    "",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Source: ${source}`,
    `Page: ${page}`,
    `Submitted: ${submittedAt}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">New lead from Bybit Analytics</h2>
      <p style="margin:0 0 8px"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 8px"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin:0 0 8px"><strong>Source:</strong> ${escapeHtml(source)}</p>
      <p style="margin:0 0 8px"><strong>Page:</strong> ${escapeHtml(page)}</p>
      <p style="margin:0"><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
    </div>
  `;

  return requestJson(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    },
    {
      from: LEAD_EMAIL_FROM,
      to: LEAD_EMAIL_TO,
      reply_to: LEAD_EMAIL_REPLY_TO,
      subject,
      text,
      html,
    }
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Landing URLs carry the ad's Google Ads tag as ?gtag_id=AW-...; the sheet stores that id, not the URL.
function extractGtagId(pageUrl) {
  try {
    return new URL(pageUrl).searchParams.get("gtag_id") || "";
  } catch {
    return "";
  }
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (pathname === "/") pathname = "/index.html";

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }

  // Never expose secrets over HTTP
  const base = path.basename(filePath).toLowerCase();
  if (
    base === "credentials.json" ||
    base === ".env" ||
    (base.endsWith(".json") && base.includes("usacars"))
  ) {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/health") {
    try {
      const info = await checkSheetAccess();
      sendJson(res, 200, {
        ok: true,
        sheet: SHEET_NAME,
        title: info?.properties?.title || null,
        emailTo: LEAD_EMAIL_TO,
        emailFrom: LEAD_EMAIL_FROM,
        emailReplyTo: LEAD_EMAIL_REPLY_TO,
        resendConfigured: Boolean(RESEND_API_KEY),
      });
    } catch (err) {
      console.error("[health]", err.message);
      sendJson(res, 500, { ok: false, error: err.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/leads") {
    try {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      const email = String(body.email || "").trim();
      const source = String(body.source || "website").trim();
      const page = String(body.page || "").trim();
      const submittedAt = String(body.submittedAt || new Date().toISOString());

      if (!name || !phone || !email || !isValidEmail(email)) {
        sendJson(res, 400, {
          ok: false,
          error: "Invalid payload. name, phone and valid email are required.",
        });
        return;
      }

      const lead = { name, phone, email, source, page, submittedAt };

      // Columns F-H stay empty; the gtag id belongs in column I.
      await appendLead([submittedAt, name, phone, email, source, "", "", "", extractGtagId(page)]);

      try {
        await sendLeadEmail(lead);
      } catch (mailErr) {
        console.error("[email]", mailErr.message, mailErr.data || "");
        sendJson(res, 500, {
          ok: false,
          error: "Lead saved to Sheets, but email notification failed.",
          details: mailErr.message,
        });
        return;
      }

      sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error("[leads]", err.message, err.data || "");
      sendJson(res, 500, {
        ok: false,
        error: "Failed to save lead. Check credentials and sheet access.",
      });
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { ok: false, error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Sheet: ${SPREADSHEET_ID} / ${SHEET_NAME}`);
  console.log(`Service account: ${credentials.client_email}`);
  console.log(`Lead email: ${LEAD_EMAIL_FROM} → ${LEAD_EMAIL_TO} (reply-to ${LEAD_EMAIL_REPLY_TO})`);
  console.log(`Resend: ${RESEND_API_KEY ? "configured" : "MISSING"}`);
});
