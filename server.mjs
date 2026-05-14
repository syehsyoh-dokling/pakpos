import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdtemp, readFile, stat, unlink, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 3034);
const unapiOrigin = process.env.UNAPI_ORIGIN || "https://unapi.danandad.org";
const googleKeyPath = path.join(__dirname, "Json google key.json");
const localSessions = new Map();
const execFileAsync = promisify(execFile);

const legalRoutes = {
  "/privacy-policy": path.join(distDir, "privacy-policy", "index.html"),
  "/terms-of-service": path.join(distDir, "terms-of-service", "index.html"),
  "/data-deletion": path.join(distDir, "data-deletion", "index.html"),
};

const contentTypes = {
  ".html": "text/html; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
  });
  createReadStream(filePath).pipe(res);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=UTF-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const text = (await readBodyBuffer(req)).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function readBodyBuffer(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function splitText(text, maxChars = 900) {
  const clean = String(text || "").trim();
  if (!clean) return [];

  const chunks = [];
  let cursor = 0;
  while (cursor < clean.length) {
    let end = cursor + maxChars;
    if (end < clean.length) {
      const nearestBreak = Math.max(
        clean.lastIndexOf("\n\n", end),
        clean.lastIndexOf(". ", end),
        clean.lastIndexOf(" ", end)
      );
      if (nearestBreak > cursor) end = nearestBreak + 1;
    }
    const piece = clean.slice(cursor, end).trim();
    if (piece) chunks.push(piece);
    cursor = end + 1;
  }
  return chunks;
}

function parseMultipartText(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] ||
    contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  if (!boundary) return {};

  const fields = {};
  const raw = buffer.toString("latin1");
  for (const part of raw.split(`--${boundary}`)) {
    const name = part.match(/name="([^"]+)"/)?.[1];
    if (!name) continue;
    const value = part.split(/\r?\n\r?\n/).slice(1).join("\n\n").replace(/\r?\n--$/, "").trim();
    fields[name] = Buffer.from(value, "latin1").toString("utf8");
  }
  return fields;
}

function parseMultipartParts(buffer, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] ||
    contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  if (!boundary) return { fields: {}, files: [] };

  const fields = {};
  const files = [];
  const delimiter = Buffer.from(`--${boundary}`);
  let cursor = buffer.indexOf(delimiter);

  while (cursor !== -1) {
    const next = buffer.indexOf(delimiter, cursor + delimiter.length);
    if (next === -1) break;

    let part = buffer.subarray(cursor + delimiter.length, next);
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(-2).toString() === "\r\n") part = part.subarray(0, -2);

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd > -1) {
      const headerText = part.subarray(0, headerEnd).toString("utf8");
      const body = part.subarray(headerEnd + 4);
      const name = headerText.match(/name="([^"]+)"/)?.[1];
      const filename = headerText.match(/filename="([^"]*)"/)?.[1];
      const contentTypeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1];

      if (name && filename) {
        files.push({
          name,
          filename,
          contentType: contentTypeMatch || "application/octet-stream",
          buffer: body,
        });
      } else if (name) {
        fields[name] = body.toString("utf8");
      }
    }

    cursor = next;
  }

  return { fields, files };
}

async function extractTextWithPython(filePath, filename) {
  const script = `
import json, pathlib, sys
path = sys.argv[1]
name = sys.argv[2].lower()
result = {"text": "", "pages": 1}
try:
    if name.endswith(".pdf"):
        errors = []
        try:
            from pypdf import PdfReader
            reader = PdfReader(path)
            pages = []
            for page in reader.pages:
                pages.append(page.extract_text() or "")
            result["text"] = "\\n\\n".join(pages)
            result["pages"] = len(reader.pages)
        except Exception as exc:
            errors.append(str(exc))
        if not result["text"].strip():
            try:
                import fitz
                document = fitz.open(path)
                pages = [page.get_text("text") or "" for page in document]
                result["text"] = "\\n\\n".join(pages)
                result["pages"] = len(document)
            except Exception as exc:
                errors.append(str(exc))
        if not result["text"].strip() and errors:
            result["error"] = " | ".join(errors[-2:])
    elif name.endswith(".docx"):
        import zipfile
        import xml.etree.ElementTree as ET
        parts = []
        try:
            import docx
            document = docx.Document(path)
            for paragraph in document.paragraphs:
                text = paragraph.text.strip()
                if not text:
                    continue
                style = (paragraph.style.name or "").lower() if paragraph.style else ""
                if "heading 1" in style or style == "title":
                    parts.append("# " + text)
                elif "heading 2" in style or "subtitle" in style:
                    parts.append("## " + text)
                elif "list bullet" in style:
                    parts.append("- " + text)
                elif "list number" in style:
                    parts.append("1. " + text)
                else:
                    parts.append(text)
            for table in document.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        parts.append(row_text)
        except Exception:
            parts = []

        if not parts:
            ns = {
                "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
            }
            with zipfile.ZipFile(path) as archive:
                xml_names = [
                    item for item in archive.namelist()
                    if item == "word/document.xml"
                    or item.startswith("word/header")
                    or item.startswith("word/footer")
                ]
                for xml_name in xml_names:
                    root = ET.fromstring(archive.read(xml_name))
                    for paragraph in root.findall(".//w:p", ns):
                        paragraph_parts = []
                        for node in paragraph.iter():
                            tag = node.tag.split("}", 1)[-1]
                            if tag == "t" and node.text:
                                paragraph_parts.append(node.text)
                            elif tag in ("br", "cr"):
                                paragraph_parts.append("\\n")
                            elif tag == "tab":
                                paragraph_parts.append("\\t")
                        paragraph_text = "".join(paragraph_parts).strip()
                        if paragraph_text:
                            parts.append(paragraph_text)

        result["text"] = "\\n\\n".join(parts).strip()
        result["pages"] = max(1, len(parts))
    elif name.endswith(".doc"):
        result["error"] = "Legacy .doc files are not readable by the local DOCX extractor. Please save as .docx or .txt first."
    else:
        result["text"] = pathlib.Path(path).read_text(encoding="utf-8", errors="ignore")
    print(json.dumps(result, ensure_ascii=False))
except Exception as exc:
    print(json.dumps({"text": "", "pages": 1, "error": str(exc)}, ensure_ascii=False))
    sys.exit(1)
`;

  try {
    const { stdout } = await execFileAsync("python", ["-c", script, filePath, filename], {
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
      maxBuffer: 20 * 1024 * 1024,
    });
    return JSON.parse(stdout || "{}");
  } catch (error) {
    const stdout = error && typeof error === "object" && "stdout" in error ? String(error.stdout || "") : "";
    if (stdout.trim()) {
      return JSON.parse(stdout);
    }
    throw error;
  }
}

async function handleSourcePreview(req, res, pathname) {
  if (pathname !== "/api/source-preview") return false;
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return true;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Method not allowed." });
    return true;
  }

  const contentType = String(req.headers["content-type"] || "");
  const body = await readBodyBuffer(req);
  const { files } = parseMultipartParts(body, contentType);
  const file = files.find((item) => item.name === "file") || files[0];
  if (!file) {
    sendJson(res, 400, { success: false, message: "File is required." });
    return true;
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "pakpos-preview-"));
  const safeName = file.filename.replace(/[^\w.\- ()\u0600-\u06FF]/g, "_");
  const tmpFile = path.join(tmpDir, safeName || "source-file");

  try {
    await writeFile(tmpFile, file.buffer);
    const extracted = await extractTextWithPython(tmpFile, file.filename);
    sendJson(res, 200, {
      success: true,
      data: {
        file_name: file.filename,
        mime_type: file.contentType,
        size: file.buffer.length,
        text: extracted.text || "",
        pages: extracted.pages || 1,
        error: extracted.error || null,
      },
    });
  } catch (error) {
    console.error("Source preview extraction failed:", error instanceof Error ? error.message : error);
    sendJson(res, 500, {
      success: false,
      message:
        "File sudah dimuat, tetapi teks preview belum bisa dibaca otomatis. Anda masih bisa menyimpan file ini atau mencoba file lain.",
    });
  } finally {
    await unlink(tmpFile).catch(() => null);
    await rm(tmpDir, { recursive: true, force: true }).catch(() => null);
  }

  return true;
}

async function readAnyBody(req) {
  const contentType = req.headers["content-type"] || "";
  const body = await readBodyBuffer(req);

  if (String(contentType).includes("multipart/form-data")) {
    return parseMultipartText(body, String(contentType));
  }

  const text = body.toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw_text: text };
  }
}

function buildChunkImportResponse(body, upstream = null) {
  let chunks = [];

  if (typeof body.chunks === "string") {
    try {
      const parsed = JSON.parse(body.chunks);
      if (Array.isArray(parsed)) chunks = parsed;
    } catch {
      chunks = splitText(body.chunks, Number(body.max_chars) || 900);
    }
  } else if (Array.isArray(body.chunks)) {
    chunks = body.chunks;
  }

  if (!chunks.length) {
    chunks = splitText(
      body.raw_text || body.text || body.content || body.source_url || body.source_name,
      Number(body.max_chars) || 900
    );
  }

  return {
    success: true,
    data: {
      app_code: body.app_code || "pakpos",
      source_type: body.source_type || "paste",
      source_name: body.source_name || body.source_url || "manual-paste",
      upstream,
      chunks: chunks.map((text, index) => ({
        id: `local_chunk_${Date.now()}_${index + 1}`,
        index: index + 1,
        text,
        content: text,
        char_count: String(text).length,
      })),
    },
  };
}

async function handleArticleChunkImport(req, res, url) {
  if (url.pathname !== "/api/articles/import/chunks") return false;

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return true;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Method not allowed." });
    return true;
  }

  const contentType = String(req.headers["content-type"] || "");
  const bodyBuffer = await readBodyBuffer(req);
  const parsedBody = contentType.includes("multipart/form-data")
    ? parseMultipartText(bodyBuffer, contentType)
    : (() => {
        const text = bodyBuffer.toString("utf8");
        try {
          return text ? JSON.parse(text) : {};
        } catch {
          return { raw_text: text };
        }
      })();

  const token = getBearerToken(req);
  const isLocalSession = token && localSessions.has(token);

  if (!isLocalSession) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      const lower = key.toLowerCase();
      if (
        [
          "host",
          "connection",
          "content-length",
          "accept-encoding",
          "origin",
          "referer",
          "sec-fetch-dest",
          "sec-fetch-mode",
          "sec-fetch-site",
          "sec-fetch-user",
        ].includes(lower)
      ) continue;
      headers.set(key, Array.isArray(value) ? value.join(",") : value);
    }

    try {
      const upstreamResponse = await fetch(`${unapiOrigin}${url.pathname}${url.search}`, {
        method: "POST",
        headers,
        body: bodyBuffer,
      });
      const upstreamText = await upstreamResponse.text();

      if (upstreamResponse.ok) {
        res.writeHead(upstreamResponse.status, {
          "Content-Type": upstreamResponse.headers.get("content-type") || "application/json; charset=UTF-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(upstreamText);
        return true;
      }

      sendJson(
        res,
        200,
        buildChunkImportResponse(parsedBody, {
          accepted: false,
          status: upstreamResponse.status,
          message: upstreamText.slice(0, 1200),
        })
      );
      return true;
    } catch (error) {
      sendJson(
        res,
        200,
        buildChunkImportResponse(parsedBody, {
          accepted: false,
          status: 0,
          message: error instanceof Error ? error.message : "Upstream request failed.",
        })
      );
      return true;
    }
  }

  sendJson(res, 200, buildChunkImportResponse(parsedBody));
  return true;
}

async function getGoogleClientConfig() {
  const raw = await readFile(googleKeyPath, "utf8");
  return JSON.parse(raw).web;
}

function makeLocalToken() {
  return `local_google_${crypto.randomBytes(32).toString("base64url")}`;
}

function sessionFromGoogleProfile(profile) {
  const accessToken = makeLocalToken();
  const session = {
    user: {
      id: profile.sub,
      email: profile.email,
      full_name: profile.name || profile.email,
      name: profile.name || profile.email,
      display_name: profile.name || profile.email,
      nickname: profile.given_name || null,
      role: "writer",
      email_verified: !!profile.email_verified,
      picture: profile.picture || null,
      provider: "google",
    },
    auth: {
      token_type: "Bearer",
      access_token: accessToken,
      refresh_token: "",
      expires_in: 3600,
      session_id: `google_${profile.sub}`,
    },
    verification: {
      provider: "google",
      source: "google-oauth",
    },
  };

  localSessions.set(accessToken, session);
  return session;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const value = Array.isArray(header) ? header[0] : header;
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function handleGoogleAuth(req, res, pathname) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return true;
  }

  if (pathname === "/api/auth/google/config" && req.method === "GET") {
    const config = await getGoogleClientConfig();
    sendJson(res, 200, {
      success: true,
      data: {
        client_id: config.client_id,
        auth_uri: config.auth_uri,
        javascript_origins: config.javascript_origins,
      },
    });
    return true;
  }

  if (pathname === "/api/auth/google/token" && req.method === "POST") {
    const body = await readJsonBody(req);
    const googleAccessToken = body.access_token;
    if (!googleAccessToken || typeof googleAccessToken !== "string") {
      sendJson(res, 400, { success: false, message: "Google access token is required." });
      return true;
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });

    if (!profileResponse.ok) {
      sendJson(res, 401, { success: false, message: "Google token is invalid or expired." });
      return true;
    }

    const profile = await profileResponse.json();
    if (!profile.email) {
      sendJson(res, 422, { success: false, message: "Google account email is not available." });
      return true;
    }

    sendJson(res, 200, { success: true, data: sessionFromGoogleProfile(profile) });
    return true;
  }

  return false;
}

function handleLocalSession(req, res, pathname) {
  const token = getBearerToken(req);
  if (!token || !localSessions.has(token)) return false;

  if (pathname === "/api/auth/me" && req.method === "GET") {
    const session = localSessions.get(token);
    sendJson(res, 200, {
      success: true,
      data: {
        user: session.user,
        session: session.auth,
      },
    });
    return true;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    localSessions.delete(token);
    sendJson(res, 200, { success: true, data: { logged_out: true } });
    return true;
  }

  if (pathname === "/api/app-access/me" && req.method === "GET") {
    sendJson(res, 200, {
      success: true,
      data: {
        app_code: "pakpos",
        membership: {
          id: `google_access_${localSessions.get(token).user.id}`,
          app_code: "pakpos",
          role: "writer",
          status: "active",
        },
      },
    });
    return true;
  }

  return false;
}

async function handleLocalSessionAsync(req, res, pathname) {
  const token = getBearerToken(req);
  if (!token || !localSessions.has(token)) return false;

  if (pathname === "/api/articles/import/chunks" && req.method === "POST") {
    const body = await readAnyBody(req);
    sendJson(res, 200, buildChunkImportResponse(body));
    return true;
  }

  return false;
}

async function proxyApi(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (
      [
        "host",
        "connection",
        "content-length",
        "accept-encoding",
        "origin",
        "referer",
        "sec-fetch-dest",
        "sec-fetch-mode",
        "sec-fetch-site",
        "sec-fetch-user",
      ].includes(lower)
    ) continue;
    headers.set(key, Array.isArray(value) ? value.join(",") : value);
  }

  const target = `${unapiOrigin}${url.pathname}${url.search}`;
  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : req,
    duplex: "half",
  });

  const body = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=UTF-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname.replace(/\/+$/, "") || "/");

    if (await handleGoogleAuth(req, res, pathname)) {
      return;
    }

    if (await handleSourcePreview(req, res, pathname)) {
      return;
    }

    if (await handleArticleChunkImport(req, res, url)) {
      return;
    }

    if (handleLocalSession(req, res, pathname)) {
      return;
    }

    if (await handleLocalSessionAsync(req, res, pathname)) {
      return;
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return proxyApi(req, res, url);
    }

    if (pathname in legalRoutes) {
      return sendFile(res, legalRoutes[pathname]);
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const requestedPath = path.normalize(path.join(distDir, relativePath));

    if (requestedPath.startsWith(distDir) && existsSync(requestedPath)) {
      const info = await stat(requestedPath);
      if (info.isFile()) {
        return sendFile(res, requestedPath);
      }
    }

    return sendFile(res, path.join(distDir, "index.html"));
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Internal Server Error");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`AutoPost web running at http://0.0.0.0:${port}`);
});
