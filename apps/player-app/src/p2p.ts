import { MoveIntent, SquareName } from "@chessalive/chess-core";

export type P2PConnectionState =
  | "idle"
  | "creating-offer"
  | "waiting-answer"
  | "creating-answer"
  | "answer-ready"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

export interface P2PPlayerProfile {
  id: string;
  displayName: string;
  avatarEmoji: string;
  rapidRating: number;
}

export interface P2PMatchMeta {
  createdAt: string;
  funnyMode: boolean;
  gameId: string;
  host: P2PPlayerProfile;
  rated: boolean;
  timeControl: string;
  witnessCount: number;
}

export interface P2PSignalEnvelope {
  description: RTCSessionDescriptionInit;
  kind: "offer" | "answer";
  meta: P2PMatchMeta;
  v: 1;
}

export type P2PChessMessage =
  | {
      color: "w" | "b";
      player: P2PPlayerProfile;
      type: "hello";
    }
  | {
      fenAfter?: string;
      gameId: string;
      intent: MoveIntent;
      ply: number;
      san?: string;
      sentAt: number;
      type: "move";
    }
  | {
      color: "w" | "b";
      sentAt: number;
      type: "resign";
    }
  | {
      body: string;
      sentAt: number;
      type: "chat";
    };

interface P2PCallbacks {
  onConnectionStateChange?: (state: P2PConnectionState) => void;
  onMessage?: (message: P2PChessMessage) => void;
}

function p2pDebug(label: string, details?: unknown) {
  const consoleLike = (globalThis as { console?: Console }).console;
  if (!consoleLike) return;
  if (details === undefined) {
    consoleLike.info(`[ChessAlive P2P] ${label}`);
  } else {
    consoleLike.info(`[ChessAlive P2P] ${label}`, details);
  }
}

function p2pError(label: string, error?: unknown) {
  const consoleLike = (globalThis as { console?: Console }).console;
  if (!consoleLike) return;
  consoleLike.error(`[ChessAlive P2P] ${label}`, error);
}

function summarizeDescription(description?: RTCSessionDescription | RTCSessionDescriptionInit | null) {
  const sdp = description?.sdp ?? "";
  const candidateLines = sdp.split(/\r?\n/).filter((line) => line.startsWith("a=candidate:"));
  const summary = {
    candidateCount: candidateLines.length,
    host: 0,
    relay: 0,
    srflx: 0,
    tcp: 0,
    udp: 0,
  };
  for (const line of candidateLines) {
    if (line.includes(" typ host")) summary.host += 1;
    if (line.includes(" typ relay")) summary.relay += 1;
    if (line.includes(" typ srflx")) summary.srflx += 1;
    if (line.includes(" tcp ")) summary.tcp += 1;
    if (line.includes(" udp ")) summary.udp += 1;
  }
  return summary;
}

function browserGlobals() {
  return globalThis as typeof globalThis & {
    fetch?: typeof fetch;
    RTCPeerConnection?: typeof RTCPeerConnection;
    RTCSessionDescription?: typeof RTCSessionDescription;
    atob?: (value: string) => string;
    btoa?: (value: string) => string;
    location?: { hash?: string; origin?: string; search?: string };
    process?: { env?: Record<string, string | undefined> };
  };
}

function publicEnv(name: string) {
  return browserGlobals().process?.env?.[name];
}

function envFlag(name: string, fallback: boolean) {
  const value = publicEnv(name);
  if (!value) return fallback;
  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
}

function csv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function publicTurnIceServers(): RTCIceServer[] {
  return [
    {
      urls: ["turn:openrelay.metered.ca:443?transport=tcp", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:80?transport=tcp"],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];
}

function normalizeTurnUrls(urls: RTCIceServer["urls"]) {
  const values = (Array.isArray(urls) ? urls : [urls]).filter(Boolean).map(String);
  const allowed = values.filter((url) => /^turns?:/i.test(url) && !url.includes(":53?"));
  const score = (url: string) => {
    if (url.startsWith("turns:") && url.includes(":443")) return 0;
    if (url.startsWith("turns:") && url.includes(":5349")) return 1;
    if (url.includes("transport=tcp") && url.includes(":3478")) return 2;
    if (url.includes("transport=tcp") && url.includes(":80")) return 3;
    if (url.includes("transport=udp") && url.includes(":3478")) return 4;
    return 5;
  };
  return [...new Set(allowed)].sort((a, b) => score(a) - score(b));
}

function relayOnlyIceServers(iceServers: RTCIceServer[]) {
  return iceServers
    .map((server) => ({
      credential: server.credential,
      urls: normalizeTurnUrls(server.urls),
      username: server.username,
    }))
    .filter((server) => server.urls.length > 0 && server.username && server.credential);
}

async function buildIceConfig(): Promise<{ iceServers: RTCIceServer[]; provider: string; relayOnly: boolean }> {
  const relayOnly = envFlag("EXPO_PUBLIC_CHESSALIVE_FORCE_TURN_RELAY", true);
  const configuredTurnUrls = csv(publicEnv("EXPO_PUBLIC_CHESSALIVE_TURN_URLS"));
  const configuredTurnUsername = publicEnv("EXPO_PUBLIC_CHESSALIVE_TURN_USERNAME");
  const configuredTurnCredential = publicEnv("EXPO_PUBLIC_CHESSALIVE_TURN_CREDENTIAL");
  if (configuredTurnUrls.length > 0) {
    return {
      iceServers: [{ urls: configuredTurnUrls, username: configuredTurnUsername, credential: configuredTurnCredential }],
      provider: "configured-public-env",
      relayOnly,
    };
  }
  const fetcher = browserGlobals().fetch;
  if (fetcher) {
    try {
      const response = await fetcher("/p2p/turn", { headers: { Accept: "application/json" } });
      if (response.ok) {
        const payload = (await response.json()) as { iceServers?: RTCIceServer[]; provider?: string; relayOnly?: boolean };
        if (Array.isArray(payload.iceServers) && payload.iceServers.length > 0) {
          const relayServers = relayOnlyIceServers(payload.iceServers);
          if (relayServers.length === 0) {
            throw new Error("TURN credential endpoint returned no usable relay URLs.");
          }
          return {
            iceServers: relayServers,
            provider: payload.provider ?? "server",
            relayOnly: payload.relayOnly ?? relayOnly,
          };
        }
      } else {
        p2pError("TURN credential endpoint returned an error", { status: response.status });
      }
    } catch (error) {
      p2pError("TURN credential endpoint unavailable", error);
    }
  }
  if (envFlag("EXPO_PUBLIC_CHESSALIVE_USE_PUBLIC_TURN", true)) {
    return {
      iceServers: publicTurnIceServers(),
      provider: "public-openrelay-fallback",
      relayOnly,
    };
  }
  throw new Error("No TURN relay is configured. Set Cloudflare TURN credentials on the ChessAlive server.");
}

function assertWebRtcSupported() {
  if (!browserGlobals().RTCPeerConnection) {
    throw new Error("This browser does not expose WebRTC DataChannels.");
  }
}

function base64UrlEncode(value: string) {
  const encoded = browserGlobals().btoa?.(encodeURIComponent(value));
  if (!encoded) throw new Error("This browser cannot encode P2P invite data.");
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const decoded = browserGlobals().atob?.(padded);
  if (!decoded) throw new Error("This browser cannot decode P2P invite data.");
  return decodeURIComponent(decoded);
}

export function encodeP2PSignal(envelope: P2PSignalEnvelope) {
  return base64UrlEncode(JSON.stringify(envelope));
}

export function decodeP2PSignal(token: string): P2PSignalEnvelope {
  const parsed = JSON.parse(base64UrlDecode(token.trim())) as P2PSignalEnvelope;
  if (parsed.v !== 1 || !parsed.description || (parsed.kind !== "offer" && parsed.kind !== "answer")) {
    throw new Error("This is not a valid ChessAlive P2P signal.");
  }
  return parsed;
}

export function readP2PInviteTokenFromLocation() {
  const hash = browserGlobals().location?.hash ?? "";
  const query = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(query);
  return params.get("p2p") ?? undefined;
}

export function readP2PInviteIdFromLocation() {
  const hash = browserGlobals().location?.hash ?? "";
  const search = browserGlobals().location?.search ?? "";
  const hashQuery = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(hashQuery);
  const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return hashParams.get("p2pInvite") ?? searchParams.get("p2pInvite") ?? undefined;
}

export function p2pInviteUrl(inviteId: string) {
  const origin = browserGlobals().location?.origin ?? "https://chessalive.com";
  return `${origin}/#p2pInvite=${encodeURIComponent(inviteId)}`;
}

export class BrowserP2PChessPeer {
  private channel: RTCDataChannel | null = null;
  private localColor: "w" | "b" = "w";
  private localPlayer: P2PPlayerProfile | null = null;
  private meta: P2PMatchMeta | null = null;
  private pc: RTCPeerConnection | null = null;

  constructor(private callbacks: P2PCallbacks = {}) {}

  isOpen() {
    return this.channel?.readyState === "open";
  }

  async createOffer(meta: P2PMatchMeta, localPlayer: P2PPlayerProfile) {
    assertWebRtcSupported();
    p2pDebug("creating offer", { gameId: meta.gameId, rated: meta.rated, timeControl: meta.timeControl });
    this.meta = meta;
    this.localPlayer = localPlayer;
    this.localColor = "w";
    this.callbacks.onConnectionStateChange?.("creating-offer");
    const pc = await this.createConnection();
    this.channel = pc.createDataChannel("chessalive-p2p", { ordered: true });
    this.attachChannel(this.channel);
    await pc.setLocalDescription(await pc.createOffer());
    await this.waitForIceGathering();
    p2pDebug("offer ready", {
      candidates: summarizeDescription(pc.localDescription),
      iceGatheringState: pc.iceGatheringState,
      localDescriptionType: pc.localDescription?.type,
      signalingState: pc.signalingState,
    });
    this.callbacks.onConnectionStateChange?.("waiting-answer");
    return encodeP2PSignal({
      description: pc.localDescription?.toJSON() as RTCSessionDescriptionInit,
      kind: "offer",
      meta,
      v: 1,
    });
  }

  async createAnswer(offerToken: string, localPlayer: P2PPlayerProfile) {
    assertWebRtcSupported();
    const offer = decodeP2PSignal(offerToken);
    if (offer.kind !== "offer") throw new Error("Paste the host invite code first.");
    p2pDebug("creating answer", {
      gameId: offer.meta.gameId,
      rated: offer.meta.rated,
      timeControl: offer.meta.timeControl,
    });
    this.meta = offer.meta;
    this.localPlayer = localPlayer;
    this.localColor = "b";
    this.callbacks.onConnectionStateChange?.("creating-answer");
    const pc = await this.createConnection();
    pc.ondatachannel = (event) => {
      p2pDebug("data channel received", { label: event.channel.label, readyState: event.channel.readyState });
      this.channel = event.channel;
      this.attachChannel(this.channel);
    };
    await pc.setRemoteDescription(offer.description);
    await pc.setLocalDescription(await pc.createAnswer());
    await this.waitForIceGathering();
    p2pDebug("answer ready", {
      candidates: summarizeDescription(pc.localDescription),
      iceGatheringState: pc.iceGatheringState,
      localDescriptionType: pc.localDescription?.type,
      signalingState: pc.signalingState,
    });
    this.callbacks.onConnectionStateChange?.("answer-ready");
    return {
      answerToken: encodeP2PSignal({
        description: pc.localDescription?.toJSON() as RTCSessionDescriptionInit,
        kind: "answer",
        meta: offer.meta,
        v: 1,
      }),
      meta: offer.meta,
    };
  }

  async acceptAnswer(answerToken: string) {
    if (!this.pc) throw new Error("Create a P2P invite before accepting an answer.");
    const answer = decodeP2PSignal(answerToken);
    if (answer.kind !== "answer") throw new Error("Paste the answer code from your friend.");
    if (this.pc.signalingState !== "have-local-offer") {
      p2pDebug("answer accept skipped because peer is not waiting for an answer", {
        answerCandidates: summarizeDescription(answer.description),
        gameId: answer.meta.gameId,
        localDescriptionType: this.pc.localDescription?.type,
        remoteDescriptionType: this.pc.remoteDescription?.type,
        signalingState: this.pc.signalingState,
      });
      if (this.pc.signalingState === "stable" && this.pc.remoteDescription?.type === "answer") {
        return "already-applied" as const;
      }
      throw new Error(`This P2P invite is not waiting for an answer anymore. Current WebRTC state: ${this.pc.signalingState}. Reset P2P and create a fresh invite.`);
    }
    p2pDebug("accepting answer", {
      answerCandidates: summarizeDescription(answer.description),
      gameId: answer.meta.gameId,
      localDescriptionType: this.pc.localDescription?.type,
      offerCandidates: summarizeDescription(this.pc.localDescription),
      signalingState: this.pc.signalingState,
    });
    await this.pc.setRemoteDescription(answer.description);
    this.callbacks.onConnectionStateChange?.("connecting");
    return "applied" as const;
  }

  send(message: P2PChessMessage) {
    if (!this.isOpen()) {
      p2pDebug("send skipped because data channel is not open", {
        readyState: this.channel?.readyState ?? "missing",
        type: message.type,
      });
      return false;
    }
    try {
      this.channel?.send(JSON.stringify(message));
      p2pDebug("sent message", { type: message.type });
      return true;
    } catch (error) {
      p2pError(`failed to send ${message.type} message`, error);
      this.callbacks.onConnectionStateChange?.("error");
      return false;
    }
  }

  sendMove(intent: MoveIntent, ply: number, san?: string, fenAfter?: string) {
    if (!this.meta) return false;
    return this.send({
      fenAfter,
      gameId: this.meta.gameId,
      intent,
      ply,
      san,
      sentAt: Date.now(),
      type: "move",
    });
  }

  sendResign(color: "w" | "b") {
    return this.send({ color, sentAt: Date.now(), type: "resign" });
  }

  close() {
    this.channel?.close();
    this.pc?.close();
    this.channel = null;
    this.pc = null;
    this.callbacks.onConnectionStateChange?.("closed");
  }

  private attachChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      p2pDebug("data channel open", { label: channel.label, readyState: channel.readyState });
      this.callbacks.onConnectionStateChange?.("connected");
      if (this.localPlayer) {
        this.send({ color: this.localColor, player: this.localPlayer, type: "hello" });
      }
    };
    channel.onclose = () => {
      p2pDebug("data channel closed", { label: channel.label, readyState: channel.readyState });
      this.callbacks.onConnectionStateChange?.("closed");
    };
    channel.onerror = (event) => {
      p2pError("data channel error", event);
      this.callbacks.onConnectionStateChange?.("error");
    };
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as P2PChessMessage;
        p2pDebug("received message", { type: message.type });
        this.callbacks.onMessage?.(message);
      } catch (error) {
        p2pError("failed to parse incoming message", { error, raw: event.data });
      }
    };
  }

  private async createConnection() {
    const Peer = browserGlobals().RTCPeerConnection!;
    const iceConfig = await buildIceConfig();
    p2pDebug("using ICE servers", {
      provider: iceConfig.provider,
      relayOnly: iceConfig.relayOnly,
      serverCount: iceConfig.iceServers.length,
    });
    const pc = new Peer({
      iceCandidatePoolSize: 8,
      iceServers: iceConfig.iceServers,
      iceTransportPolicy: iceConfig.relayOnly ? "relay" : "all",
    });
    pc.onconnectionstatechange = () => {
      p2pDebug("peer connection state changed", {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState,
      });
      if (pc.connectionState === "connected") this.callbacks.onConnectionStateChange?.("connected");
      if (pc.connectionState === "connecting") this.callbacks.onConnectionStateChange?.("connecting");
      if (pc.connectionState === "closed") this.callbacks.onConnectionStateChange?.("closed");
      if (pc.connectionState === "failed") this.callbacks.onConnectionStateChange?.("error");
    };
    pc.onicecandidateerror = (event) => {
      const extendedEvent = event as RTCPeerConnectionIceErrorEvent & { hostCandidate?: string };
      const details = {
        errorCode: event.errorCode,
        errorText: event.errorText,
        hostCandidate: extendedEvent.hostCandidate,
        url: event.url,
      };
      if (event.errorCode === 701) {
        p2pDebug("ice server probe timed out", details);
        return;
      }
      p2pError("ice candidate error", details);
    };
    pc.oniceconnectionstatechange = () => {
      p2pDebug("ice connection state changed", {
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
      });
      if (pc.iceConnectionState === "failed") this.callbacks.onConnectionStateChange?.("error");
    };
    this.pc = pc;
    return pc;
  }

  private waitForIceGathering(timeoutMs = 8000) {
    const pc = this.pc;
    if (!pc || pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => {
        pc.removeEventListener("icegatheringstatechange", onChange);
        clearTimeout(timer);
        resolve();
      };
      const onChange = () => {
        p2pDebug("ice gathering state changed", { iceGatheringState: pc.iceGatheringState });
        if (pc.iceGatheringState === "complete") done();
      };
      const timer = setTimeout(() => {
        p2pDebug("ice gathering timed out; continuing with current local description", {
          iceGatheringState: pc.iceGatheringState,
          timeoutMs,
        });
        done();
      }, timeoutMs);
      pc.addEventListener("icegatheringstatechange", onChange);
    });
  }
}

export function p2pMoveFromLan(lan: string): MoveIntent | null {
  if (lan.length < 4) return null;
  return {
    from: lan.slice(0, 2) as SquareName,
    promotion: lan[4] as MoveIntent["promotion"],
    to: lan.slice(2, 4) as SquareName,
  };
}
