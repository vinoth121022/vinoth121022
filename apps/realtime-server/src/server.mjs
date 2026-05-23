import { createServer } from "node:http";
import { mkdirSync, readFileSync, appendFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { Firestore } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";
import { WebSocketServer } from "ws";

const port = Number(process.env.CHESSALIVE_REALTIME_PORT ?? 8982);
const webRoot = process.env.CHESSALIVE_WEB_ROOT ? normalize(process.env.CHESSALIVE_WEB_ROOT) : "";
const sitePassword = process.env.CHESSALIVE_SITE_PASSWORD ?? "";
const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = [1, 2, 3, 4, 5, 6, 7, 8];
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(root, "data");
const uploadDir = join(dataDir, "uploads");
const eventLogPath = join(dataDir, "events.jsonl");
const localPersistencePath = join(dataDir, "persistent-state.json");
const localKvPath = join(dataDir, "kv-store.json");
const rooms = new Map();
const socketsByRoom = new Map();
const pendingOtps = new Map();
const p2pInvites = new Map();
const p2pInviteTtlMs = Number(process.env.CHESSALIVE_P2P_INVITE_TTL_MS ?? 15 * 60 * 1000);
const premiumAmountPaise = Number(process.env.RAZORPAY_PREMIUM_AMOUNT_PAISE ?? 10000);
const premiumCurrency = String(process.env.RAZORPAY_PREMIUM_CURRENCY ?? "INR").trim().toUpperCase();
const premiumPlanId = String(process.env.RAZORPAY_PREMIUM_PLAN_ID ?? "").trim();
const premiumTotalCount = Number(process.env.RAZORPAY_PREMIUM_TOTAL_COUNT ?? 120);
const gcpProjectId = String(process.env.CHESSALIVE_GCP_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? "").trim();
const gcsBucketName = String(process.env.CHESSALIVE_GCS_BUCKET ?? "").trim();
const firestorePrefix = safeCollectionName(process.env.CHESSALIVE_FIRESTORE_PREFIX ?? "chessalive");
const gcpPersistenceExplicit = String(process.env.CHESSALIVE_GCP_PERSISTENCE ?? "").trim() === "1";
const firestoreEnabled = String(process.env.CHESSALIVE_FIRESTORE_ENABLED ?? "1").trim() !== "0" && (gcpPersistenceExplicit || Boolean(gcpProjectId) || Boolean(gcsBucketName));
let firestoreClient = null;
let storageClient = null;

function ensureDataDir() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(uploadDir, { recursive: true });
  if (!existsSync(eventLogPath)) appendFileSync(eventLogPath, "");
}

function appendEvent(type, payload) {
  ensureDataDir();
  appendFileSync(eventLogPath, `${JSON.stringify({ type, payload, createdAt: new Date().toISOString() })}\n`);
  void appendDurableEvent("server", { type, payload }).catch(() => undefined);
}

function safeCollectionName(value) {
  return String(value || "chessalive")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "chessalive";
}

function safeDocId(value, fallback = "guest") {
  const raw = String(value || fallback);
  return Buffer.from(raw).toString("base64url").slice(0, 900) || fallback;
}

function firestore() {
  if (!firestoreEnabled) return null;
  if (!firestoreClient) {
    firestoreClient = new Firestore(gcpProjectId ? { projectId: gcpProjectId } : undefined);
  }
  return firestoreClient;
}

function storage() {
  if (!gcsBucketName) return null;
  if (!storageClient) {
    storageClient = new Storage(gcpProjectId ? { projectId: gcpProjectId } : undefined);
  }
  return storageClient;
}

function appStateDoc() {
  return firestore()?.collection(`${firestorePrefix}_app`).doc("state") ?? null;
}

function userStateDoc(userId) {
  return firestore()?.collection(`${firestorePrefix}_users`).doc(safeDocId(userId)) ?? null;
}

function kvDoc(key) {
  return firestore()?.collection(`${firestorePrefix}_kv`).doc(safeDocId(key, "key")) ?? null;
}

function eventStreamDoc(stream) {
  return firestore()?.collection(`${firestorePrefix}_event_streams`).doc(safeDocId(stream, "stream")) ?? null;
}

function assetDoc(assetId) {
  return firestore()?.collection(`${firestorePrefix}_assets`).doc(safeDocId(assetId, "asset")) ?? null;
}

function readLocalJson(path, fallback) {
  try {
    ensureDataDir();
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeLocalJson(path, value) {
  ensureDataDir();
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function localPersistentState() {
  return readLocalJson(localPersistencePath, { app: {}, users: {}, puzzles: {} });
}

function writeLocalPersistentState(next) {
  writeLocalJson(localPersistencePath, next);
}

function localKvState() {
  return readLocalJson(localKvPath, { kv: {}, events: {} });
}

function writeLocalKvState(next) {
  writeLocalJson(localKvPath, next);
}

function storageDriverName() {
  if (firestoreEnabled && gcsBucketName) return "gcp-firestore-gcs";
  if (firestoreEnabled) return "gcp-firestore";
  return "jsonl";
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpEmailTemplate(email, code) {
  return `
    <div style="margin:0;background:#f5f8fb;padding:32px;font-family:Inter,Arial,sans-serif;color:#102033">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8e4ef;border-radius:22px;overflow:hidden">
        <div style="background:#102334;padding:28px 30px;color:#ffffff">
          <div style="font-size:44px;line-height:1">♘</div>
          <h1 style="margin:12px 0 0;font-size:26px;letter-spacing:-0.02em">Your ChessAlive login code</h1>
        </div>
        <div style="padding:30px">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.55">Use this one-time code to sign in to ChessAlive as <strong>${email}</strong>.</p>
          <div style="margin:22px 0;padding:18px 20px;text-align:center;background:#edf7ff;border:1px solid #bee0fb;border-radius:16px;font-size:34px;font-weight:900;letter-spacing:0.18em;color:#12324a">${code}</div>
          <p style="margin:0;color:#5b6d7f;font-size:14px;line-height:1.5">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
        </div>
      </div>
    </div>
  `;
}

async function sendOtpEmail(email, code) {
  const apiKey = process.env.CHESSALIVE_RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.CHESSALIVE_OTP_FROM ?? "ChessAlive <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your ChessAlive login code",
      html: otpEmailTemplate(email, code),
      text: `Your ChessAlive login code is ${code}. It expires in 5 minutes.`,
    }),
  });
  return response.ok;
}

function userFromBody(body, fallbackId = "guest") {
  return {
    id: body?.id ?? fallbackId,
    displayName: body?.displayName ?? "Guest Player",
    avatarEmoji: body?.avatarEmoji ?? "♟",
    rating: body?.rating ?? { blitz: 1000, rapid: 1000, bullet: 1000, funny: 1000 },
  };
}

function roomSummary(room) {
  return {
    id: room.id,
    code: room.code,
    status: room.status,
    timeControl: room.timeControl,
    rated: room.rated,
    funnyMode: room.funnyMode,
    region: room.region,
    latencyMs: room.latencyMs,
    spectators: Math.max(0, (socketsByRoom.get(room.id)?.size ?? 0) - 2),
    createdAt: room.createdAt,
    lastActivityAt: room.lastActivityAt,
    players: room.players,
    snapshot: createSnapshot(room),
  };
}

function createRoom(options = {}) {
  const id = `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const room = {
    id,
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    status: "waiting",
    timeControl: options.timeControl ?? "5|0",
    rated: Boolean(options.rated),
    funnyMode: options.funnyMode ?? true,
    region: "local-edge",
    latencyMs: 14,
    createdAt: now,
    lastActivityAt: now,
    players: {
      white: options.user,
      black: undefined,
    },
    chess: new Chess(),
    history: [],
    captured: { white: [], black: [] },
  };
  rooms.set(id, room);
  appendEvent("room.created", roomSummary(room));
  return room;
}

function legalMoveMap(chess) {
  const result = {};
  for (const file of files) {
    for (const rank of ranks) {
      const square = `${file}${rank}`;
      result[square] = chess.moves({ square, verbose: true }).map((move) => move.to);
    }
  }
  return result;
}

function boardCells(chess) {
  return files.flatMap((file) =>
    ranks.map((rank) => {
      const square = `${file}${rank}`;
      const piece = chess.get(square);
      return {
        square,
        piece: piece ? { color: piece.color, kind: piece.type } : null,
      };
    }),
  );
}

function resultText(chess) {
  if (chess.isCheckmate()) return `${chess.turn() === "w" ? "Black" : "White"} wins by checkmate`;
  if (chess.isStalemate()) return "Draw by stalemate";
  if (chess.isDraw()) return "Draw";
  if (chess.isCheck()) return `${chess.turn() === "w" ? "White" : "Black"} to move, in check`;
  return `${chess.turn() === "w" ? "White" : "Black"} to move`;
}

function createSnapshot(room) {
  const chess = room.chess;
  return {
    id: room.id,
    fen: chess.fen(),
    board: boardCells(chess),
    legalMoves: legalMoveMap(chess),
    history: room.history,
    status: {
      turn: chess.turn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),
      isGameOver: chess.isGameOver(),
      resultText: resultText(chess),
    },
    captured: {
      white: [...room.captured.white],
      black: [...room.captured.black],
    },
  };
}

function applyMove(room, intent) {
  const before = room.chess.fen();
  const move = room.chess.move({
    from: intent.from,
    to: intent.to,
    promotion: intent.promotion ?? "q",
  });
  if (!move) return null;
  const normalized = {
    from: move.from,
    to: move.to,
    san: move.san,
    lan: `${move.from}${move.to}${move.promotion ?? ""}`,
    color: move.color,
    piece: move.piece,
    captured: move.captured,
    promotion: move.promotion,
    before,
    after: move.after,
  };
  room.history.push(normalized);
  if (normalized.captured) {
    const bucket = normalized.color === "w" ? room.captured.white : room.captured.black;
    bucket.push(normalized.captured);
  }
  room.status = room.chess.isGameOver() ? "completed" : "playing";
  room.lastActivityAt = new Date().toISOString();
  appendEvent("move.accepted", { roomId: room.id, move: normalized, fen: room.chess.fen() });
  return normalized;
}

function broadcast(roomId, message) {
  const sockets = socketsByRoom.get(roomId);
  if (!sockets) return;
  const payload = JSON.stringify(message);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function readBuffer(request, limitBytes = 75 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limitBytes) throw new Error("Upload is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function razorpayKeyId() {
  return String(process.env.RAZORPAY_KEY_ID ?? process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? "").trim();
}

function razorpayKeySecret() {
  return String(process.env.RAZORPAY_KEY_SECRET ?? "").trim();
}

function razorpayConfigured() {
  return Boolean(razorpayKeyId() && razorpayKeySecret());
}

function billingConfig() {
  return {
    amount: premiumAmountPaise,
    currency: premiumCurrency,
    enabled: razorpayConfigured() && Boolean(premiumPlanId),
    interval: "monthly",
    keyConfigured: Boolean(razorpayKeyId()),
    planConfigured: Boolean(premiumPlanId),
    planId: premiumPlanId ? `${premiumPlanId.slice(0, 8)}...` : "",
    productName: "ChessAlive Premium",
  };
}

function razorpayAuthHeader() {
  return `Basic ${Buffer.from(`${razorpayKeyId()}:${razorpayKeySecret()}`).toString("base64")}`;
}

async function razorpayApi(pathname, { method = "GET", body } = {}) {
  if (!razorpayConfigured()) {
    const error = new Error("Razorpay credentials are not configured.");
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(`https://api.razorpay.com/v1${pathname}`, {
    method,
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) {
    const error = new Error(payload?.error?.description ?? payload?.error?.reason ?? `Razorpay API failed with HTTP ${response.status}.`);
    error.statusCode = response.status;
    error.details = payload;
    throw error;
  }
  return payload;
}

function hmacSha256Hex(message, secret) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function secureHexEqual(expected, received) {
  if (!expected || !received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

function verifyRazorpaySubscriptionSignature({ paymentId, subscriptionId, signature }) {
  const expected = hmacSha256Hex(`${paymentId}|${subscriptionId}`, razorpayKeySecret());
  return secureHexEqual(expected, signature);
}

function verifyRazorpayWebhookSignature(rawBody, signature) {
  const webhookSecret = String(process.env.RAZORPAY_WEBHOOK_SECRET ?? "").trim();
  if (!webhookSecret) {
    const error = new Error("Razorpay webhook secret is not configured.");
    error.statusCode = 503;
    throw error;
  }
  const expected = hmacSha256Hex(rawBody, webhookSecret);
  return secureHexEqual(expected, signature);
}

function safeNote(value, fallback = "") {
  return String(value ?? fallback).slice(0, 240);
}

function safeAssetName(value, fallback = "asset") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 80) || fallback;
}

function publicOrigin(request) {
  const protocol = request.headers["x-forwarded-proto"] ?? "http";
  return `${protocol}://${request.headers.host ?? `localhost:${port}`}`;
}

function mergePersistedState(appState = {}, userState = {}) {
  return {
    animationClips: Array.isArray(appState.animationClips) ? appState.animationClips : undefined,
    animationSets: Array.isArray(appState.animationSets) ? appState.animationSets : undefined,
    currentUser: userState.currentUser ?? null,
    pieceSets: Array.isArray(appState.pieceSets) ? appState.pieceSets : undefined,
    settings: userState.settings ?? appState.defaultSettings,
  };
}

async function readPersistedState(userId = "guest") {
  const appDocRef = appStateDoc();
  const userDocRef = userStateDoc(userId);
  if (appDocRef && userDocRef) {
    const [appSnapshot, userSnapshot] = await Promise.all([appDocRef.get(), userDocRef.get()]);
    return mergePersistedState(appSnapshot.exists ? appSnapshot.data() : {}, userSnapshot.exists ? userSnapshot.data() : {});
  }
  const state = localPersistentState();
  return mergePersistedState(state.app, state.users?.[userId] ?? {});
}

async function writePersistedState(userId = "guest", state = {}) {
  const now = new Date().toISOString();
  const appPayload = {
    updatedAt: now,
    ...(Array.isArray(state.animationClips) ? { animationClips: state.animationClips } : {}),
    ...(Array.isArray(state.animationSets) ? { animationSets: state.animationSets } : {}),
    ...(Array.isArray(state.pieceSets) ? { pieceSets: state.pieceSets } : {}),
  };
  const userPayload = {
    updatedAt: now,
    ...(state.currentUser !== undefined ? { currentUser: state.currentUser } : {}),
    ...(state.settings ? { settings: state.settings } : {}),
  };
  const appDocRef = appStateDoc();
  const userDocRef = userStateDoc(userId);
  if (appDocRef && userDocRef) {
    await Promise.all([
      Object.keys(appPayload).length > 1 ? appDocRef.set(appPayload, { merge: true }) : Promise.resolve(),
      userDocRef.set(userPayload, { merge: true }),
    ]);
    return;
  }
  const local = localPersistentState();
  local.app = { ...(local.app ?? {}), ...appPayload };
  local.users = { ...(local.users ?? {}), [userId]: { ...(local.users?.[userId] ?? {}), ...userPayload } };
  writeLocalPersistentState(local);
}

async function readPuzzleRating(userId) {
  const userDocRef = userStateDoc(userId);
  if (userDocRef) {
    const snapshot = await userDocRef.get();
    return snapshot.exists ? snapshot.data()?.puzzleRatingState ?? null : null;
  }
  return localPersistentState().puzzles?.[userId]?.ratingState ?? null;
}

async function writePuzzleRating(userId, state) {
  const userDocRef = userStateDoc(userId);
  if (userDocRef) {
    await userDocRef.set({ puzzleRatingState: state, updatedAt: new Date().toISOString() }, { merge: true });
    return;
  }
  const local = localPersistentState();
  local.puzzles = local.puzzles ?? {};
  local.puzzles[userId] = { ...(local.puzzles[userId] ?? {}), ratingState: state };
  writeLocalPersistentState(local);
}

async function appendPuzzleAttempt(userId, attempt) {
  const userDocRef = userStateDoc(userId);
  if (userDocRef) {
    const snapshot = await userDocRef.get();
    const attempts = Array.isArray(snapshot.data()?.puzzleAttempts) ? snapshot.data().puzzleAttempts : [];
    attempts.push(attempt);
    await userDocRef.set({ puzzleAttempts: attempts.slice(-500), updatedAt: new Date().toISOString() }, { merge: true });
    return;
  }
  const local = localPersistentState();
  local.puzzles = local.puzzles ?? {};
  const entry = local.puzzles[userId] ?? {};
  const attempts = Array.isArray(entry.attempts) ? entry.attempts : [];
  attempts.push(attempt);
  local.puzzles[userId] = { ...entry, attempts: attempts.slice(-500) };
  writeLocalPersistentState(local);
}

async function readDatabaseValue(key) {
  const doc = kvDoc(key);
  if (doc) {
    const snapshot = await doc.get();
    return snapshot.exists ? snapshot.data()?.value ?? null : null;
  }
  return localKvState().kv?.[key] ?? null;
}

async function writeDatabaseValue(key, value) {
  const doc = kvDoc(key);
  if (doc) {
    await doc.set({ key, value, updatedAt: new Date().toISOString() }, { merge: true });
    return;
  }
  const local = localKvState();
  local.kv = { ...(local.kv ?? {}), [key]: value };
  writeLocalKvState(local);
}

async function appendDurableEvent(stream, event) {
  const createdAt = new Date().toISOString();
  const eventDoc = eventStreamDoc(stream);
  if (eventDoc) {
    await eventDoc.collection("events").add({ createdAt, createdAtMs: Date.now(), payload: event, stream });
    return;
  }
  const local = localKvState();
  local.events = local.events ?? {};
  local.events[stream] = [...(local.events[stream] ?? []), { createdAt, payload: event, stream }].slice(-500);
  writeLocalKvState(local);
}

async function listDurableEvents(stream, limit = 50) {
  const eventDoc = eventStreamDoc(stream);
  if (eventDoc) {
    const snapshot = await eventDoc.collection("events").orderBy("createdAtMs", "desc").limit(limit).get();
    return snapshot.docs
      .map((doc) => doc.data())
      .reverse()
      .map((event) => ({ createdAt: event.createdAt, ...(event.payload ?? {}) }));
  }
  const events = localKvState().events?.[stream] ?? [];
  return events.slice(-limit).map((event) => ({ createdAt: event.createdAt, ...(event.payload ?? {}) }));
}

async function databaseRecordCount() {
  const db = firestore();
  if (!db) {
    const local = localKvState();
    return Object.keys(local.kv ?? {}).length + Object.values(local.events ?? {}).reduce((sum, events) => sum + events.length, 0);
  }
  return -1;
}

async function uploadAssetToCloudStorage({ body, contentType, fileName, metadata, storedFileName }) {
  const client = storage();
  if (!client) return null;
  const objectName = `uploads/${storedFileName}`;
  const file = client.bucket(gcsBucketName).file(objectName);
  await file.save(body, {
    contentType,
    resumable: false,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata,
    },
  });
  const publicBaseUrl = String(process.env.CHESSALIVE_GCS_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  return {
    objectName,
    url: publicBaseUrl ? `${publicBaseUrl}/${objectName}` : `/uploads/${storedFileName}`,
    fileName,
  };
}

async function persistAssetMetadata(asset) {
  const doc = assetDoc(asset.assetId);
  if (doc) {
    await doc.set({ ...asset, createdAt: new Date().toISOString() }, { merge: true });
    return;
  }
  const local = localPersistentState();
  local.assets = { ...(local.assets ?? {}), [asset.assetId]: { ...asset, createdAt: new Date().toISOString() } };
  writeLocalPersistentState(local);
}

function pruneP2PInvites() {
  const now = Date.now();
  for (const [id, invite] of p2pInvites) {
    if (invite.expiresAtMs <= now) p2pInvites.delete(id);
  }
}

function createP2PInviteUrl(request, id) {
  return `${publicOrigin(request)}/#p2pInvite=${encodeURIComponent(id)}`;
}

function p2pInviteResponse(request, invite, options = {}) {
  return {
    answerReady: Boolean(invite.answerToken),
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    id: invite.id,
    inviteUrl: createP2PInviteUrl(request, invite.id),
    meta: invite.meta,
    status: invite.answerToken ? "answered" : "waiting",
    ...(options.includeOffer ? { offerToken: invite.offerToken } : {}),
    ...(options.includeAnswer ? { answerToken: invite.answerToken ?? null } : {}),
  };
}

function normalizeTurnUrls(urls) {
  const values = (Array.isArray(urls) ? urls : [urls]).filter(Boolean).map(String);
  const allowed = values.filter((url) => /^turns?:/i.test(url) && !url.includes(":53?"));
  const score = (url) => {
    if (url.startsWith("turns:") && url.includes(":443")) return 0;
    if (url.startsWith("turns:") && url.includes(":5349")) return 1;
    if (url.includes("transport=tcp") && url.includes(":3478")) return 2;
    if (url.includes("transport=tcp") && url.includes(":80")) return 3;
    if (url.includes("transport=udp") && url.includes(":3478")) return 4;
    return 5;
  };
  return [...new Set(allowed)].sort((a, b) => score(a) - score(b));
}

function relayOnlyIceServers(iceServers) {
  return iceServers
    .map((server) => ({
      credential: server.credential,
      credentialType: server.credentialType,
      urls: normalizeTurnUrls(server.urls),
      username: server.username,
    }))
    .filter((server) => server.urls.length > 0 && server.username && server.credential);
}

async function generateCloudflareTurnIceServers() {
  const keyId = process.env.CHESSALIVE_CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CHESSALIVE_CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !apiToken) {
    const error = new Error("Cloudflare TURN credentials are not configured on the server.");
    error.statusCode = 503;
    throw error;
  }
  const ttl = Number(process.env.CHESSALIVE_TURN_TTL_SECONDS ?? 86400);
  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(`Cloudflare TURN credential generation failed with HTTP ${response.status}.`);
    error.statusCode = 502;
    error.details = text.slice(0, 300);
    throw error;
  }
  const payload = await response.json();
  if (!Array.isArray(payload.iceServers) || payload.iceServers.length === 0) {
    const error = new Error("Cloudflare TURN returned no ICE servers.");
    error.statusCode = 502;
    throw error;
  }
  const relayServers = relayOnlyIceServers(payload.iceServers);
  if (relayServers.length === 0) {
    const error = new Error("Cloudflare TURN returned no usable relay servers.");
    error.statusCode = 502;
    throw error;
  }
  return relayServers;
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type,x-file-name",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(data));
}

function unauthorized(response) {
  response.writeHead(401, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="ChessAlive Private Beta", charset="UTF-8"',
  });
  response.end("ChessAlive private beta requires a password.");
}

function validSitePassword(request) {
  if (!sitePassword) return true;
  const header = request.headers.authorization ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return false;
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : decoded;
    return password === sitePassword;
  } catch {
    return false;
  }
}

function requireSitePassword(request, response) {
  if (validSitePassword(request)) return false;
  unauthorized(response);
  return true;
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".webp", "image/webp"],
  [".glb", "model/gltf-binary"],
  [".gltf", "model/gltf+json"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function uploadedFileFor(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded.startsWith("/api/uploads/") ? decoded.slice(5) : decoded;
  if (!requested.startsWith("/uploads/")) return null;
  const candidate = normalize(join(dataDir, requested.replace(/^\/+/, "")));
  if (!candidate.startsWith(uploadDir)) return null;
  return existsSync(candidate) && statSync(candidate).isFile() ? candidate : null;
}

async function serveUploadedAsset(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const filePath = uploadedFileFor(url.pathname);
  if (filePath) {
    const type = contentTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream";
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Content-Type": type,
      "Expires": "0",
      "Pragma": "no-cache",
    });
    if (request.method === "HEAD") response.end();
    else response.end(readFileSync(filePath));
    return true;
  }
  const client = storage();
  if (!client) return false;
  const decoded = decodeURIComponent(url.pathname);
  const requested = decoded.startsWith("/api/uploads/") ? decoded.slice(5) : decoded;
  if (!requested.startsWith("/uploads/")) return false;
  const storedFileName = safeAssetName(requested.replace(/^\/uploads\//, ""), "");
  if (!storedFileName) return false;
  const objectName = `uploads/${storedFileName}`;
  try {
    const [contents] = await client.bucket(gcsBucketName).file(objectName).download();
    const type = contentTypes.get(extname(storedFileName).toLowerCase()) ?? "application/octet-stream";
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Content-Type": type,
      "Expires": "0",
      "Pragma": "no-cache",
    });
    if (request.method === "HEAD") response.end();
    else response.end(contents);
    return true;
  } catch {
    return false;
  }
}

function staticFileFor(pathname) {
  if (!webRoot) return null;
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = normalize(join(webRoot, requested));
  if (!candidate.startsWith(webRoot)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(webRoot, "index.html");
}

function serveStatic(request, response, url) {
  if (!webRoot || (request.method !== "GET" && request.method !== "HEAD")) return false;
  const filePath = staticFileFor(url.pathname);
  if (!filePath || !existsSync(filePath)) return false;
  const type = contentTypes.get(extname(filePath)) ?? "application/octet-stream";
  response.writeHead(200, {
    "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    "Content-Type": type,
  });
  if (request.method === "HEAD") response.end();
  else response.end(readFileSync(filePath));
  return true;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = url.pathname === "/api" ? "/" : url.pathname.startsWith("/api/") ? url.pathname.slice(4) : url.pathname;
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method === "POST" && pathname === "/billing/razorpay/webhook") {
    try {
      const rawBodyBuffer = await readBuffer(request, 2 * 1024 * 1024);
      const rawBody = rawBodyBuffer.toString("utf8");
      const signature = String(request.headers["x-razorpay-signature"] ?? "").trim();
      if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
        sendJson(response, 401, { error: "Invalid Razorpay webhook signature." });
        return;
      }
      const payload = JSON.parse(rawBody || "{}");
      appendEvent("billing.razorpay.webhook", {
        event: payload.event,
        paymentId: payload.payload?.payment?.entity?.id,
        subscriptionId: payload.payload?.subscription?.entity?.id,
        status: payload.payload?.subscription?.entity?.status ?? payload.payload?.payment?.entity?.status,
      });
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, { error: error instanceof Error ? error.message : "Razorpay webhook failed." });
    }
    return;
  }
  if (requireSitePassword(request, response)) return;
  if (request.method === "GET" && pathname === "/billing/razorpay/config") {
    sendJson(response, 200, billingConfig());
    return;
  }
  if (request.method === "POST" && pathname === "/billing/razorpay/subscription") {
    try {
      const body = await readJson(request);
      if (!premiumPlanId) {
        sendJson(response, 503, { ...billingConfig(), error: "Razorpay premium plan is not configured. Set RAZORPAY_PREMIUM_PLAN_ID." });
        return;
      }
      if (!razorpayConfigured()) {
        sendJson(response, 503, { ...billingConfig(), error: "Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });
        return;
      }
      const user = body.user ?? {};
      const subscription = await razorpayApi("/subscriptions", {
        method: "POST",
        body: {
          customer_notify: 1,
          notes: {
            chessalive_email: safeNote(user.email),
            chessalive_product: "premium",
            chessalive_user_id: safeNote(user.id, "guest"),
            chessalive_user_name: safeNote(user.displayName),
          },
          plan_id: premiumPlanId,
          quantity: 1,
          total_count: premiumTotalCount,
        },
      });
      appendEvent("billing.subscription.created", {
        email: user.email,
        status: subscription.status,
        subscriptionId: subscription.id,
        userId: user.id,
      });
      sendJson(response, 201, {
        amount: premiumAmountPaise,
        currency: premiumCurrency,
        keyId: razorpayKeyId(),
        productName: "ChessAlive Premium",
        status: subscription.status,
        subscriptionId: subscription.id,
      });
    } catch (error) {
      appendEvent("billing.subscription.create_failed", {
        message: error instanceof Error ? error.message : "unknown",
        statusCode: error?.statusCode ?? 500,
      });
      sendJson(response, error?.statusCode ?? 500, { error: error instanceof Error ? error.message : "Could not create Razorpay subscription." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/billing/razorpay/verify") {
    try {
      const body = await readJson(request);
      const paymentId = String(body.razorpay_payment_id ?? "").trim();
      const subscriptionId = String(body.razorpay_subscription_id ?? body.subscriptionId ?? "").trim();
      const signature = String(body.razorpay_signature ?? "").trim();
      if (!paymentId || !subscriptionId || !signature) {
        sendJson(response, 400, { error: "Payment id, subscription id, and signature are required." });
        return;
      }
      if (!verifyRazorpaySubscriptionSignature({ paymentId, signature, subscriptionId })) {
        appendEvent("billing.subscription.verify_failed", { paymentId, subscriptionId });
        sendJson(response, 401, { error: "Invalid Razorpay payment signature.", premiumActive: false });
        return;
      }
      appendEvent("billing.subscription.verified", {
        email: body.user?.email,
        paymentId,
        subscriptionId,
        userId: body.user?.id,
      });
      sendJson(response, 200, {
        premiumActive: true,
        productName: "ChessAlive Premium",
        subscriptionId,
        verifiedAt: new Date().toISOString(),
      });
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, { error: error instanceof Error ? error.message : "Could not verify Razorpay payment." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/auth/otp/request") {
    const body = await readJson(request);
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(response, 400, { error: "Valid email required" });
      return;
    }
    const code = createOtpCode();
    pendingOtps.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    let sent = false;
    try {
      sent = await sendOtpEmail(email, code);
    } catch (error) {
      appendEvent("auth.otp.email_failed", { email, message: error instanceof Error ? error.message : "unknown" });
    }
    appendEvent("auth.otp.requested", { delivery: sent ? "email" : "dev", email });
    sendJson(response, 200, {
      delivery: sent ? "email" : "dev",
      email,
      expiresInSeconds: 300,
      ...(sent ? {} : { previewCode: code }),
    });
    return;
  }
  if (request.method === "POST" && pathname === "/auth/otp/verify") {
    const body = await readJson(request);
    const email = String(body.email ?? "").trim().toLowerCase();
    const code = String(body.code ?? "").trim();
    const pending = pendingOtps.get(email);
    if (!pending || pending.expiresAt < Date.now() || pending.code !== code) {
      sendJson(response, 401, { error: "Invalid or expired OTP", ok: false });
      return;
    }
    pendingOtps.delete(email);
    appendEvent("auth.otp.verified", { email });
    sendJson(response, 200, { email, ok: true });
    return;
  }
  if (request.method === "GET" && pathname === "/health") {
    sendJson(response, 200, {
      online: true,
      endpoint: `ws://localhost:${port}`,
      activeRooms: rooms.size,
      activePlayers: [...rooms.values()].reduce((sum, room) => sum + Number(Boolean(room.players.white)) + Number(Boolean(room.players.black)), 0),
      p95LatencyMs: 18,
      storage: storageDriverName(),
    });
    return;
  }
  if (request.method === "GET" && pathname === "/persistence/state") {
    try {
      const userId = url.searchParams.get("userId") || "guest";
      sendJson(response, 200, await readPersistedState(userId));
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not read persisted state." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/persistence/state") {
    try {
      const body = await readJson(request);
      const userId = String(body.userId ?? "guest");
      await writePersistedState(userId, body.state ?? {});
      sendJson(response, 200, { ok: true, storage: storageDriverName() });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not save persisted state." });
    }
    return;
  }
  if (request.method === "GET" && pathname === "/persistence/puzzle-rating") {
    try {
      const userId = url.searchParams.get("userId") || "guest";
      sendJson(response, 200, { state: await readPuzzleRating(userId) });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not read puzzle rating." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/persistence/puzzle-rating") {
    try {
      const body = await readJson(request);
      const state = body.state ?? body;
      const userId = String(body.userId ?? state.userId ?? "guest");
      await writePuzzleRating(userId, state);
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not save puzzle rating." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/persistence/puzzle-attempts") {
    try {
      const body = await readJson(request);
      const attempt = body.attempt ?? body;
      const userId = String(body.userId ?? attempt.userId ?? "guest");
      await appendPuzzleAttempt(userId, attempt);
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not save puzzle attempt." });
    }
    return;
  }
  if (request.method === "GET" && pathname === "/database/health") {
    sendJson(response, 200, {
      driver: storageDriverName(),
      durableStore: firestoreEnabled ? `Firestore${gcsBucketName ? ` + gs://${gcsBucketName}` : ""}` : "server local JSON fallback",
      estimatedMonthlyCostUsd: 0,
      hotStore: "in-memory room state",
      latencyBudgetMs: firestoreEnabled ? 120 : 25,
      records: await databaseRecordCount(),
    });
    return;
  }
  if (request.method === "GET" && pathname === "/database/kv") {
    try {
      const key = url.searchParams.get("key") ?? "";
      if (!key) {
        sendJson(response, 400, { error: "key is required" });
        return;
      }
      sendJson(response, 200, { value: await readDatabaseValue(key) });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not read database value." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/database/kv") {
    try {
      const body = await readJson(request);
      if (!body.key) {
        sendJson(response, 400, { error: "key is required" });
        return;
      }
      await writeDatabaseValue(String(body.key), body.value ?? null);
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not save database value." });
    }
    return;
  }
  if (request.method === "GET" && pathname === "/database/events") {
    try {
      const stream = url.searchParams.get("stream") ?? "";
      const limit = Number(url.searchParams.get("limit") ?? 50);
      if (!stream) {
        sendJson(response, 400, { error: "stream is required" });
        return;
      }
      sendJson(response, 200, { events: await listDurableEvents(stream, limit) });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not list events." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/database/events") {
    try {
      const body = await readJson(request);
      if (!body.stream) {
        sendJson(response, 400, { error: "stream is required" });
        return;
      }
      await appendDurableEvent(String(body.stream), body.event ?? {});
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Could not append event." });
    }
    return;
  }
  if (request.method === "GET" && pathname === "/p2p/turn") {
    try {
      const iceServers = await generateCloudflareTurnIceServers();
      sendJson(response, 200, {
        iceServers,
        provider: "cloudflare-turn",
        relayOnly: true,
      });
    } catch (error) {
      appendEvent("p2p.turn.failed", {
        message: error instanceof Error ? error.message : "unknown",
        statusCode: error?.statusCode ?? 500,
      });
      sendJson(response, error?.statusCode ?? 500, {
        error: error instanceof Error ? error.message : "TURN credential generation failed.",
        provider: "cloudflare-turn",
      });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/p2p/invites") {
    pruneP2PInvites();
    const body = await readJson(request);
    const offerToken = String(body.offerToken ?? "").trim();
    if (!offerToken) {
      sendJson(response, 400, { error: "offerToken is required." });
      return;
    }
    const nowMs = Date.now();
    const id = `p2p-${randomUUID().slice(0, 12)}`;
    const invite = {
      answerToken: null,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + p2pInviteTtlMs).toISOString(),
      expiresAtMs: nowMs + p2pInviteTtlMs,
      host: body.host ?? null,
      id,
      meta: body.meta ?? null,
      offerToken,
    };
    p2pInvites.set(id, invite);
    appendEvent("p2p.invite.created", { id, meta: invite.meta });
    sendJson(response, 201, p2pInviteResponse(request, invite));
    return;
  }
  const p2pInviteMatch = pathname.match(/^\/p2p\/invites\/([^/]+)$/);
  if (request.method === "GET" && p2pInviteMatch) {
    pruneP2PInvites();
    const invite = p2pInvites.get(p2pInviteMatch[1]);
    if (!invite) {
      sendJson(response, 404, { error: "P2P invite not found or expired." });
      return;
    }
    sendJson(response, 200, p2pInviteResponse(request, invite, { includeOffer: true }));
    return;
  }
  const p2pInviteAnswerMatch = pathname.match(/^\/p2p\/invites\/([^/]+)\/answer$/);
  if (request.method === "POST" && p2pInviteAnswerMatch) {
    pruneP2PInvites();
    const invite = p2pInvites.get(p2pInviteAnswerMatch[1]);
    if (!invite) {
      sendJson(response, 404, { error: "P2P invite not found or expired." });
      return;
    }
    const body = await readJson(request);
    const answerToken = String(body.answerToken ?? "").trim();
    if (!answerToken) {
      sendJson(response, 400, { error: "answerToken is required." });
      return;
    }
    invite.answerToken = answerToken;
    invite.guest = body.guest ?? null;
    invite.answeredAt = new Date().toISOString();
    appendEvent("p2p.invite.answered", { id: invite.id, guest: invite.guest });
    sendJson(response, 200, p2pInviteResponse(request, invite));
    return;
  }
  if (request.method === "GET" && p2pInviteAnswerMatch) {
    pruneP2PInvites();
    const invite = p2pInvites.get(p2pInviteAnswerMatch[1]);
    if (!invite) {
      sendJson(response, 404, { error: "P2P invite not found or expired." });
      return;
    }
    sendJson(response, 200, p2pInviteResponse(request, invite, { includeAnswer: true }));
    return;
  }
  if (request.method === "GET" && pathname === "/rooms") {
    sendJson(response, 200, [...rooms.values()].map(roomSummary));
    return;
  }
  if (request.method === "GET" && pathname === "/events") {
    ensureDataDir();
    const lines = readFileSync(eventLogPath, "utf8").trim().split("\n").filter(Boolean).slice(-100);
    sendJson(response, 200, lines.map((line) => JSON.parse(line)));
    return;
  }
  if (request.method === "POST" && pathname === "/assets/upload") {
    try {
      ensureDataDir();
      const fileName = safeAssetName(url.searchParams.get("fileName") ?? request.headers["x-file-name"], "asset.glb");
      const piece = safeAssetName(url.searchParams.get("piece"), "piece");
      const slot = safeAssetName(url.searchParams.get("slot"), "static");
      const extension = extname(fileName).toLowerCase() || ".glb";
      const allowedExtensions = new Set([".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp"]);
      if (!allowedExtensions.has(extension)) {
        sendJson(response, 400, { error: "Only GLB, GLTF, PNG, JPG, and WEBP assets are supported." });
        return;
      }
      const assetId = `${piece}-${slot}-${Date.now()}-${randomUUID().slice(0, 8)}`;
      const storedFileName = `${assetId}${extension}`;
      const body = await readBuffer(request);
      if (body.length === 0) {
        sendJson(response, 400, { error: "Empty upload body." });
        return;
      }
      const contentType = contentTypes.get(extension) ?? "application/octet-stream";
      const cloudAsset = await uploadAssetToCloudStorage({
        body,
        contentType,
        fileName,
        metadata: { assetId, fileName, piece, slot },
        storedFileName,
      });
      let assetUrl = cloudAsset?.url ? (cloudAsset.url.startsWith("/") ? `${publicOrigin(request)}${cloudAsset.url}` : cloudAsset.url) : "";
      if (!cloudAsset) {
        writeFileSync(join(uploadDir, storedFileName), body);
        assetUrl = `${publicOrigin(request)}/uploads/${storedFileName}`;
      }
      const assetMetadata = {
        assetId,
        assetUrl,
        bytes: body.length,
        fileName,
        kind: extension === ".glb" || extension === ".gltf" ? "glb" : "image",
        objectName: cloudAsset?.objectName ?? `uploads/${storedFileName}`,
        piece,
        slot,
        storage: cloudAsset ? "gcs" : "local-disk",
      };
      await persistAssetMetadata(assetMetadata);
      appendEvent("asset.uploaded", { assetId, piece, slot, fileName, bytes: body.length, storage: assetMetadata.storage });
      sendJson(response, 201, {
        ...assetMetadata,
      });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Upload failed." });
    }
    return;
  }
  if (request.method === "POST" && pathname === "/rooms") {
    const body = await readJson(request);
    const room = createRoom({
      user: userFromBody(body.user, body.userId),
      timeControl: body.timeControl,
      rated: body.rated,
      funnyMode: body.funnyMode,
    });
    sendJson(response, 201, roomSummary(room));
    return;
  }
  const joinMatch = pathname.match(/^\/rooms\/([^/]+)\/join$/);
  if (request.method === "POST" && joinMatch) {
    const room = rooms.get(joinMatch[1]);
    if (!room) {
      sendJson(response, 404, { error: "Room not found" });
      return;
    }
    const body = await readJson(request);
    if (!room.players.black && body.userId !== room.players.white?.id) {
      room.players.black = userFromBody(body.user, body.userId);
      room.status = "playing";
    }
    room.lastActivityAt = new Date().toISOString();
    const summary = roomSummary(room);
    broadcast(room.id, { type: "room.updated", room: summary, snapshot: summary.snapshot });
    appendEvent("room.joined", summary);
    sendJson(response, 200, summary);
    return;
  }
  const moveMatch = pathname.match(/^\/rooms\/([^/]+)\/move$/);
  if (request.method === "POST" && moveMatch) {
    const room = rooms.get(moveMatch[1]);
    if (!room) {
      sendJson(response, 404, { error: "Room not found" });
      return;
    }
    const body = await readJson(request);
    const move = applyMove(room, body.intent ?? body);
    const snapshot = createSnapshot(room);
    if (!move) {
      sendJson(response, 400, { move: null, snapshot, error: "Illegal move" });
      return;
    }
    const message = { type: "move.accepted", room: roomSummary(room), snapshot, move };
    broadcast(room.id, message);
    sendJson(response, 200, message);
    return;
  }
  if (await serveUploadedAsset(request, response, url)) return;
  if (serveStatic(request, response, url)) return;
  sendJson(response, 404, { error: "Not found" });
});

const wss = new WebSocketServer({
  server,
  verifyClient: (info, done) => {
    if (validSitePassword(info.req)) {
      done(true);
      return;
    }
    done(false, 401, "Unauthorized", {
      "WWW-Authenticate": 'Basic realm="ChessAlive Private Beta", charset="UTF-8"',
    });
  },
});

wss.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const roomId = url.searchParams.get("room");
  if (!roomId || !rooms.has(roomId)) {
    socket.send(JSON.stringify({ type: "error", error: "Room not found" }));
    socket.close();
    return;
  }
  const room = rooms.get(roomId);
  if (!socketsByRoom.has(roomId)) socketsByRoom.set(roomId, new Set());
  socketsByRoom.get(roomId).add(socket);
  socket.send(JSON.stringify({ type: "room.updated", room: roomSummary(room), snapshot: createSnapshot(room) }));
  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === "move.intent") {
        const move = applyMove(room, message.intent);
        const snapshot = createSnapshot(room);
        if (move) broadcast(room.id, { type: "move.accepted", room: roomSummary(room), snapshot, move });
        else socket.send(JSON.stringify({ type: "move.rejected", snapshot }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", error: "Invalid message" }));
    }
  });
  socket.on("close", () => {
    socketsByRoom.get(roomId)?.delete(socket);
  });
});

ensureDataDir();
if (rooms.size === 0) {
  createRoom({
    user: userFromBody({ displayName: "Open Seat", avatarEmoji: "⚡" }, "open-seat"),
    timeControl: "5|0",
    rated: false,
    funnyMode: true,
  });
}

server.listen(port, () => {
  console.log(`ChessAlive realtime server listening on http://localhost:${port}`);
});
