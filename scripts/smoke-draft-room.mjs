#!/usr/bin/env node
import { io } from "socket.io-client";

const BASE_URL =
  process.env.BASE_URL || process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const DRAFT_ID = process.env.DRAFT_ID;
const LEAGUE_ID = process.env.LEAGUE_ID;

function assertRequired(value, name) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response from ${url}: ${text.slice(0, 160)}`);
  }

  if (!res.ok) {
    const message = json.error || json.message || `${res.status} ${res.statusText}`;
    throw new Error(`Request failed (${url}): ${message}`);
  }

  return json;
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fn()) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function run() {
  assertRequired(ACCESS_TOKEN, "ACCESS_TOKEN");
  assertRequired(DRAFT_ID, "DRAFT_ID");
  assertRequired(LEAGUE_ID, "LEAGUE_ID");

  console.log("=== Draft Room Smoke Test ===");
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`DRAFT_ID: ${DRAFT_ID}`);
  console.log(`LEAGUE_ID: ${LEAGUE_ID}`);

  const headers = {
    "Content-Type": "application/json",
    accessToken: ACCESS_TOKEN,
  };

  console.log("\n[1/4] Checking draft snapshot endpoint...");
  const stateResp = await fetchJson(
    `${BASE_URL}/api/v2/draft/state?draftId=${encodeURIComponent(DRAFT_ID)}`,
    { method: "GET", headers }
  );

  const draftState = stateResp.draftState || stateResp.data?.draftState;
  const meta = stateResp.meta || stateResp.data?.meta || {};
  if (!draftState) {
    throw new Error("No draftState returned from /api/v2/draft/state");
  }
  console.log(
    `✅ Snapshot OK (status=${draftState.status}, pickStatus=${draftState.pickStatus}, round=${draftState.currentRound}, pick=${draftState.pickNumber})`
  );

  const seasonId = meta.seasonId;
  if (!seasonId) {
    throw new Error("No seasonId in draft state meta");
  }

  console.log("\n[2/4] Checking players + rosters hydration endpoints...");
  const [playersResp, rostersResp, squadsResp] = await Promise.all([
    fetchJson(
      `${BASE_URL}/api/v2/draft/available-players?seasonId=${encodeURIComponent(seasonId)}`,
      { method: "GET", headers }
    ),
    fetchJson(
      `${BASE_URL}/api/v2/league/season-rosters?seasonId=${encodeURIComponent(seasonId)}`,
      { method: "GET", headers }
    ),
    fetchJson(
      `${BASE_URL}/api/v2/league/squads?leagueId=${encodeURIComponent(LEAGUE_ID)}`,
      { method: "GET", headers }
    ),
  ]);

  const playersCount = Array.isArray(playersResp.players) ? playersResp.players.length : 0;
  const rostersCount = Array.isArray(rostersResp.rosters) ? rostersResp.rosters.length : 0;
  const squadsCount = Array.isArray(squadsResp) ? squadsResp.length : 0;
  console.log(
    `✅ Hydration OK (players=${playersCount}, rosters=${rostersCount}, squads=${squadsCount})`
  );

  console.log("\n[3/4] Checking socket join + initial draft update...");
  const socket = io(BASE_URL, {
    path: "/socket.io",
    auth: { token: ACCESS_TOKEN },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 10000,
    forceNew: true,
  });

  let connectCount = 0;
  let initialStateReceived = false;
  let reconnectStateReceived = false;
  let forcedDropStarted = false;

  socket.on("connect", () => {
    connectCount += 1;
    socket.emit("joinDraftV2", { leagueId: LEAGUE_ID, draftId: DRAFT_ID });
    socket.emit("getDraftStateV2", { draftId: DRAFT_ID });
  });

  socket.on("draftStateUpdate", (payload) => {
    if (!forcedDropStarted) {
      initialStateReceived = true;
      console.log(
        `✅ Initial socket state received (status=${payload.status}, pickStatus=${payload.pickStatus})`
      );
      return;
    }
    if (connectCount >= 2) {
      reconnectStateReceived = true;
      console.log("✅ Post-reconnect draft state received");
    }
  });

  socket.on("draftError", (err) => {
    console.error("❌ draftError:", err?.message || err);
  });

  socket.on("connect_error", (err) => {
    console.error("⚠️ connect_error:", err?.message || err);
  });

  await waitFor(() => socket.connected, 15000, "initial socket connect");
  await waitFor(() => initialStateReceived, 15000, "initial draftStateUpdate");

  console.log("\n[4/4] Simulating deploy disconnect and verifying recovery...");
  forcedDropStarted = true;
  if (socket.io?.engine) {
    socket.io.engine.close();
  } else {
    socket.disconnect();
    socket.connect();
  }

  await waitFor(() => connectCount >= 2, 30000, "socket reconnect");
  await waitFor(() => reconnectStateReceived, 30000, "post-reconnect draftStateUpdate");

  socket.disconnect();
  console.log("\n✅ PASS: draft room hydration + socket reconnect smoke test passed.");
}

run().catch((error) => {
  console.error(`\n❌ FAIL: ${error.message}`);
  process.exitCode = 1;
});
