"use strict";

globalThis.multiplayer = (() => {
  const element = id => document.getElementById(id);
  const peers = new Map();
  const players = new Map();
  const api = { peers, stateProvider: null, onJoined: null };
  const protocol = "stillwater-v1";
  let peer = null;
  let hostConnection = null;
  let session = null;
  let busy = false;
  let generation = 0;
  let startupTimeout = null;
  let reconnectTimeout = null;
  let libraryPromise = null;
  let receivedAt = 0;

  function status(text) { element("multiplayerStatus").textContent = text; }
  function cleanName(name) {
    return String(name || "Angler").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24) || "Angler";
  }
  function roomId(code) { return protocol + "-" + code; }
  function spawn(slot) {
    return { x: slot * 45, z: 0, heading: 0, offsetX: 0, offsetZ: 0, jump: 0,
      swimming: false, paused: false, catches: 0, lastCatch: "" };
  }
  function validState(state) {
    if (!state || typeof state !== "object") return null;
    const limits = { x: 1000000, z: 1000000, heading: Math.PI * 2, offsetX: 100000, offsetZ: 100000, jump: 5, catches: 1000000000 };
    for (const [key, limit] of Object.entries(limits)) {
      if (typeof state[key] !== "number" || !Number.isFinite(state[key]) || Math.abs(state[key]) > limit) return null;
    }
    if (state.jump < 0 || state.catches < 0 || !Number.isSafeInteger(state.catches)) return null;
    return { ...Object.fromEntries(Object.keys(limits).map(key => [key, state[key]])),
      swimming: state.swimming === true, paused: state.paused === true,
      lastCatch: typeof state.lastCatch === "string" ? state.lastCatch.slice(0, 64) : "" };
  }
  function localState() {
    if (!api.stateProvider) return null;
    const state = { ...api.stateProvider() };
    state.heading = Math.atan2(Math.sin(state.heading), Math.cos(state.heading));
    return validState(state);
  }
  function controls() {
    element("createRoom").disabled = busy || Boolean(session);
    element("joinRoom").disabled = busy || Boolean(session);
    element("leaveRoom").hidden = !session && !busy;
    element("leaveRoom").textContent = busy && !session ? "Cancel" : "Leave room";
    element("copyRoom").hidden = !session;
    element("roomCode").disabled = busy || Boolean(session);
    element("playerName").disabled = busy || Boolean(session);
    element("multiplayerBadge").hidden = !session;
    element("multiplayerBadge").textContent = session
      ? "Room " + session.code + " · " + (peers.size + 1) + "/8 players" + (session.host ? " · host" : "") : "";
  }
  function send(connection, message) {
    if (!connection?.open || connection.bufferSize > 4 || connection.dataChannel?.bufferedAmount > 65536) return;
    try { connection.send(message); } catch {}
  }
  function applySnapshot(snapshot) {
    if (!session || !snapshot || snapshot.code !== session.code || !Array.isArray(snapshot.players)) return;
    const present = new Set();
    const rows = [];
    for (const player of snapshot.players.slice(0, 8)) {
      const state = validState(player);
      if (!state || typeof player.id !== "string" || player.id.length > 128) continue;
      const name = cleanName(player.name);
      const row = document.createElement("li");
      row.textContent = name + (player.id === session.id ? " (you)" : "") + " · " + state.catches + " catches" +
        (state.paused ? " · menu open" : "") + (state.lastCatch ? " · last catch: " + state.lastCatch : "");
      rows.push(row);
      if (player.id === session.id) continue;
      present.add(player.id);
      const previous = peers.get(player.id);
      peers.set(player.id, { id: player.id, name, ...state, drawX: previous?.drawX ?? state.x,
        drawZ: previous?.drawZ ?? state.z, drawHeading: previous?.drawHeading ?? state.heading, label: previous?.label ?? null });
    }
    for (const [id, player] of peers) {
      if (!present.has(id)) { player.label?.remove(); peers.delete(id); }
    }
    element("playerList").replaceChildren(...rows);
    controls();
  }
  function broadcast() {
    if (!session?.host) return;
    const snapshot = { type: "snapshot", code: session.code,
      players: [...players.values()].map(player => ({ id: player.id, name: player.name, ...player.state })) };
    applySnapshot(snapshot);
    for (const player of players.values()) if (player.connection) send(player.connection, snapshot);
  }
  function leave(message = "You left the room. Your single-player game is still available.") {
    generation++;
    clearTimeout(startupTimeout);
    clearTimeout(reconnectTimeout);
    const oldPeer = peer;
    peer = null;
    hostConnection = null;
    session = null;
    busy = false;
    players.clear();
    oldPeer?.destroy();
    for (const player of peers.values()) player.label?.remove();
    peers.clear();
    element("playerList").replaceChildren();
    controls();
    status(message);
  }
  function loadLibrary() {
    if (typeof window.Peer === "function") return Promise.resolve();
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      const timeout = setTimeout(() => {
        script.remove();
        libraryPromise = null;
        reject(new Error("PeerJS could not load. Check your internet connection and try again."));
      }, 12000);
      script.onload = () => {
        clearTimeout(timeout);
        if (typeof window.Peer === "function") resolve();
        else { libraryPromise = null; reject(new Error("PeerJS is unavailable. Try again.")); }
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        libraryPromise = null;
        reject(new Error("PeerJS could not load. Check your internet connection and try again."));
      };
      document.head.append(script);
    });
    return libraryPromise;
  }
  function acceptGuest(connection, currentGeneration) {
    connection.on("error", () => connection.close());
    const timeout = setTimeout(() => connection.close(), 12000);
    connection.on("open", () => {
      clearTimeout(timeout);
      if (currentGeneration !== generation || !session?.host) { connection.close(); return; }
      if (connection.metadata?.protocol !== protocol) {
        send(connection, { type: "reject", message: "This game uses a different multiplayer version. Refresh both games." });
        setTimeout(() => connection.close(), 200);
        return;
      }
      if (players.size >= 8 || players.has(connection.peer)) {
        send(connection, { type: "reject", message: "This room is full (8 players)." });
        setTimeout(() => connection.close(), 200);
        return;
      }
      const occupied = new Set([...players.values()].map(player => player.slot));
      let slot = 1;
      while (occupied.has(slot)) slot++;
      const player = { id: connection.peer, name: cleanName(connection.metadata?.name), slot,
        state: spawn(slot), connection, seen: Date.now(), lastUpdate: 0 };
      players.set(connection.peer, player);
      send(connection, { type: "welcome", code: session.code, id: connection.peer, spawn: player.state });
      broadcast();
    });
    connection.on("data", message => {
      if (currentGeneration !== generation || !session?.host || !message || message.type !== "state") return;
      const player = players.get(connection.peer);
      if (!player || player.connection !== connection || Date.now() - player.lastUpdate < 50) return;
      const state = validState(message.state);
      if (!state) return;
      player.state = state;
      player.seen = Date.now();
      player.lastUpdate = player.seen;
    });
    connection.on("close", () => {
      clearTimeout(timeout);
      if (currentGeneration !== generation || players.get(connection.peer)?.connection !== connection) return;
      players.delete(connection.peer);
      broadcast();
    });
  }
  function joinHost(code, name, currentGeneration) {
    hostConnection = peer.connect(roomId(code), { serialization: "json", reliable: true,
      metadata: { protocol, name } });
    const connection = hostConnection;
    connection.on("error", () => {
      if (currentGeneration === generation) leave("Could not connect to the host. Check the room code and try again.");
    });
    connection.on("data", message => {
      if (currentGeneration !== generation || !message || typeof message !== "object") return;
      if (message.type === "reject") { leave(String(message.message || "Could not join the room.").slice(0, 150)); return; }
      if (message.type === "welcome" && !session && message.code === code && message.id === peer.id) {
        const state = validState(message.spawn);
        if (!state) return;
        clearTimeout(startupTimeout);
        session = { id: peer.id, code, host: false };
        busy = false;
        receivedAt = Date.now();
        api.onJoined?.(state);
        controls();
        status("Joined room " + code + ". Connected directly to your host with PeerJS.");
      }
      if (message.type === "snapshot" && session) {
        receivedAt = Date.now();
        applySnapshot(message);
      }
    });
    connection.on("close", () => {
      if (currentGeneration === generation) leave("The host left or the connection closed. You can keep playing solo or join another room.");
    });
  }
  async function join(create) {
    if (busy || session) return;
    const name = cleanName(element("playerName").value);
    let code = element("roomCode").value.trim().toUpperCase();
    if (!create && !/^[A-F0-9]{6}$/.test(code)) { status("Enter your friend’s six-character room code."); return; }
    if (create) {
      const random = crypto.getRandomValues(new Uint8Array(3));
      code = [...random].map(value => value.toString(16).padStart(2, "0")).join("").toUpperCase();
    }
    busy = true;
    const currentGeneration = ++generation;
    controls();
    status(create ? "Creating a PeerJS room…" : "Connecting to your friend with PeerJS…");
    try {
      await loadLibrary();
      if (currentGeneration !== generation) return;
      const options = { secure: true, debug: 0, ...(window.STILLWATER_PEER_OPTIONS || {}) };
      peer = create ? new window.Peer(roomId(code), options) : new window.Peer(options);
      startupTimeout = setTimeout(() => {
        if (currentGeneration === generation) leave("Connection timed out. Keep the host’s game open and check the code. This network may need a TURN relay.");
      }, 18000);
      peer.on("open", id => {
        if (currentGeneration !== generation) return;
        if (session) { status("Room signaling reconnected."); return; }
        if (create) {
          clearTimeout(startupTimeout);
          session = { id, code, host: true };
          busy = false;
          element("roomCode").value = code;
          players.set(id, { id, name, slot: 0, state: spawn(0), connection: null, seen: Date.now() });
          api.onJoined?.(spawn(0));
          const state = localState();
          if (state) players.get(id).state = state;
          broadcast();
          controls();
          status("Room " + code + " is ready. Share the code and keep this game open as the host.");
        } else joinHost(code, name, currentGeneration);
      });
      peer.on("connection", connection => {
        if (currentGeneration === generation && create) acceptGuest(connection, currentGeneration);
        else { connection.on("error", () => {}); connection.close(); }
      });
      peer.on("disconnected", () => {
        if (currentGeneration !== generation) return;
        status("Room signaling disconnected. Existing connections can continue; reconnecting invites…");
        reconnectTimeout = setTimeout(() => {
          if (currentGeneration === generation && peer?.disconnected && !peer.destroyed) peer.reconnect();
        }, 1500);
      });
      peer.on("close", () => {
        if (currentGeneration === generation) leave("The PeerJS session closed. Create or join a room to reconnect.");
      });
      peer.on("error", error => {
        if (currentGeneration !== generation) return;
        if (session && !peer.destroyed && ["network", "socket-error", "socket-closed", "disconnected"].includes(error.type)) {
          status("Signaling is unavailable. Existing connections can continue; new players may need to retry.");
          return;
        }
        const messages = {
          "peer-unavailable": "Room not found. Check the code and make sure the host’s game is open.",
          "unavailable-id": "That room code is already in use. Press Create room to get a new one.",
          "browser-incompatible": "This browser does not support PeerJS / WebRTC. Try a current browser.",
          "webrtc": "The direct connection failed. Try another network or configure a TURN relay.",
        };
        leave(messages[error.type] || "Could not connect to PeerJS. Check your internet connection and try again.");
      });
    } catch (error) {
      if (currentGeneration === generation) leave(error.message || "Could not start PeerJS.");
    }
  }
  function sync() {
    if (!session) return;
    const now = Date.now();
    const state = localState();
    if (session.host) {
      if (state) players.get(session.id).state = state;
      for (const [id, player] of players) {
        if (player.connection && now - player.seen > 30000) { players.delete(id); player.connection.close(); }
      }
      broadcast();
    } else {
      if (now - receivedAt > 30000) { leave("The host stopped responding. Rejoin the room when the host is back."); return; }
      if (state) send(hostConnection, { type: "state", state });
    }
  }
  element("createRoom").onclick = () => join(true);
  element("joinRoom").onclick = () => join(false);
  element("leaveRoom").onclick = () => leave();
  element("copyRoom").onclick = async () => {
    if (!session) return;
    const invite = new URL(location.href);
    invite.searchParams.set("room", session.code);
    if (!/^https?:$/.test(invite.protocol)) { status("Share room code " + session.code + " with your friend on the hosted game."); return; }
    try { await navigator.clipboard.writeText(invite.href); status("Invite link copied! Send it to your friend."); }
    catch { status("Invite link: " + invite.href); }
  };
  const inviteCode = new URL(location.href).searchParams.get("room");
  if (inviteCode && /^[A-F0-9]{6}$/i.test(inviteCode)) {
    element("roomCode").value = inviteCode.toUpperCase();
    status("A friend invited you to room " + inviteCode.toUpperCase() + ". Enter your name and press Join room.");
  }
  controls();
  const interval = setInterval(sync, 100);
  window.addEventListener("pagehide", () => { clearInterval(interval); leave(); });
  api.leave = leave;
  return api;
})();
