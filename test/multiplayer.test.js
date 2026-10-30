import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import { setImmediate as nextTurn } from "node:timers/promises";

const source = readFileSync(new URL("../multiplayer.js", import.meta.url), "utf8");

function network() {
  const registry = new Map();
  const clock = { now: 1000 };
  let nextId = 1;
  class Connection extends EventEmitter {
    constructor(peer, metadata) {
      super();
      this.peer = peer;
      this.metadata = metadata;
      this.open = false;
      this.bufferSize = 0;
      this.dataChannel = { bufferedAmount: 0 };
    }
    send(message) {
      if (!this.open) throw new Error("Connection is not open");
      const copy = structuredClone(message);
      queueMicrotask(() => { if (this.partner.open) this.partner.emit("data", copy); });
    }
    close() {
      if (!this.open && !this.partner?.open) return;
      this.open = false;
      this.partner.open = false;
      queueMicrotask(() => { this.emit("close"); this.partner.emit("close"); });
    }
  }
  class Peer extends EventEmitter {
    constructor(id) {
      super();
      this.id = typeof id === "string" ? id : "guest-" + nextId++;
      this.destroyed = false;
      this.disconnected = false;
      this.connections = [];
      if (registry.has(this.id)) {
        queueMicrotask(() => this.emit("error", { type: "unavailable-id" }));
      } else {
        registry.set(this.id, this);
        queueMicrotask(() => { if (!this.destroyed) this.emit("open", this.id); });
      }
    }
    connect(id, options) {
      const outgoing = new Connection(id, options.metadata);
      this.connections.push(outgoing);
      const remote = registry.get(id);
      if (!remote) {
        queueMicrotask(() => this.emit("error", { type: "peer-unavailable" }));
        return outgoing;
      }
      const incoming = new Connection(this.id, options.metadata);
      outgoing.partner = incoming;
      incoming.partner = outgoing;
      remote.connections.push(incoming);
      queueMicrotask(() => {
        remote.emit("connection", incoming);
        outgoing.open = true;
        incoming.open = true;
        outgoing.emit("open");
        incoming.emit("open");
      });
      return outgoing;
    }
    reconnect() { this.disconnected = false; this.emit("open", this.id); }
    destroy() {
      this.destroyed = true;
      if (registry.get(this.id) === this) registry.delete(this.id);
      for (const connection of this.connections) connection.close();
      this.emit("close");
    }
  }
  function client(name, invite = "") {
    const nodes = new Map();
    const intervals = new Map();
    const timeouts = new Map();
    let timerId = 1;
    function element(id) {
      if (!nodes.has(id)) nodes.set(id, { value: "", textContent: "", hidden: false, children: [],
        append(node) { this.children.push(node); }, replaceChildren(...children) { this.children = children; }, remove() {} });
      return nodes.get(id);
    }
    element("playerName").value = name;
    const document = { getElementById: element, createElement: () => element(Symbol()), head: element("head") };
    const context = vm.createContext({ document, window: { Peer, addEventListener() {} }, crypto: webcrypto, Uint8Array,
      location: { href: "https://arcade.example/game/" + invite }, URL, navigator: { clipboard: { async writeText() {} } },
      Date: { now: () => clock.now }, setInterval: callback => { const id = timerId++; intervals.set(id, callback); return id; },
      clearInterval: id => intervals.delete(id), setTimeout: callback => { const id = timerId++; timeouts.set(id, callback); return id; },
      clearTimeout: id => timeouts.delete(id) });
    vm.runInContext(source, context);
    const api = context.multiplayer;
    let state = { x: 0, z: 0, heading: 0, offsetX: 0, offsetZ: 0, jump: 0, swimming: false, paused: false, catches: 0, lastCatch: "" };
    api.stateProvider = () => ({ ...state });
    api.onJoined = spawn => { state = { ...state, ...spawn }; };
    return { api, element, context, state: values => Object.assign(state, values),
      create: () => element("createRoom").onclick(), join: code => { element("roomCode").value = code; return element("joinRoom").onclick(); },
      step: () => { for (const callback of intervals.values()) callback(); },
      timeout: () => { for (const callback of [...timeouts.values()]) callback(); },
      peer: () => [...registry.values()].find(peer => peer.id === (api.peers.keys().next().value || "")) };
  }
  return { client, registry, clock };
}

async function flush() { await nextTurn(); await nextTurn(); }
async function pump(clients, clock) {
  clock.now += 100;
  for (const client of clients) client.step();
  await flush();
  clock.now += 100;
  for (const client of clients) client.step();
  await flush();
}

test("PeerJS rooms synchronize movement, jumps, swimming, names and catches", async () => {
  const { client, clock } = network();
  const host = client("Captain");
  await host.create(); await flush();
  const code = host.element("roomCode").value;
  assert.match(code, /^[A-F0-9]{6}$/);
  const friend = client("Friend", "?room=" + code);
  assert.equal(friend.element("roomCode").value, code);
  await friend.join(code.toLowerCase()); await flush();
  assert.equal(host.api.peers.size, 1);
  assert.equal(friend.api.peers.size, 1);
  friend.state({ x: 75, z: -31, heading: 40, offsetX: 12, jump: 1.4, swimming: true, catches: 3, lastCatch: "Cod" });
  await pump([friend, host], clock);
  const remote = [...host.api.peers.values()][0];
  assert.equal(remote.name, "Friend");
  assert.equal(remote.x, 75);
  assert.equal(remote.jump, 1.4);
  assert.equal(remote.swimming, true);
  assert.equal(remote.lastCatch, "Cod");
  assert(Math.abs(remote.heading) <= Math.PI);
  assert.equal(host.element("playerList").children.length, 2);
  friend.api.leave(); await flush();
  assert.equal(host.api.peers.size, 0);
  host.api.leave();
});

test("isolates rooms, handles the host leaving and removes player labels", async () => {
  const { client } = network();
  const host = client("First"), otherHost = client("Other");
  await host.create(); await otherHost.create(); await flush();
  const guest = client("Friend");
  await guest.join(host.element("roomCode").value); await flush();
  assert.equal(otherHost.api.peers.size, 0);
  let removed = false;
  [...guest.api.peers.values()][0].label = { remove() { removed = true; } };
  host.api.leave(); await flush();
  assert.equal(guest.api.peers.size, 0);
  assert(removed);
  assert.match(guest.element("multiplayerStatus").textContent, /host left|connection closed/);
  assert.equal(guest.element("createRoom").disabled, false);
  otherHost.api.leave();
});

test("limits rooms to eight players and allows a replacement after someone leaves", async () => {
  const { client } = network();
  const host = client("Host");
  await host.create(); await flush();
  const code = host.element("roomCode").value;
  const guests = [];
  for (let index = 0; index < 7; index++) {
    const guest = client("Friend " + index);
    await guest.join(code); await flush(); guests.push(guest);
  }
  assert.equal(host.api.peers.size, 7);
  const extra = client("Extra");
  await extra.join(code); await flush();
  assert.match(extra.element("multiplayerStatus").textContent, /full/);
  guests[0].api.leave(); await flush();
  await extra.join(code); await flush();
  assert.equal(host.api.peers.size, 7);
  host.api.leave(); await flush();
});

test("rejects invalid state updates and keeps paused players connected", async () => {
  const { client, clock } = network();
  const host = client("Host");
  await host.create(); await flush();
  const guest = client("Guest");
  await guest.join(host.element("roomCode").value); await flush();
  guest.state({ x: Number.NaN });
  await pump([guest, host], clock);
  assert.equal([...host.api.peers.values()][0].x, 45);
  guest.state({ x: 52, paused: true });
  await pump([guest, host], clock);
  assert.equal([...host.api.peers.values()][0].paused, true);
  clock.now += 20000;
  await pump([guest, host], clock);
  assert.equal(host.api.peers.size, 1);
  host.api.leave(); await flush();
});

test("shows a useful error for missing rooms and supports cancelling startup", async () => {
  const { client } = network();
  const guest = client("Guest");
  await guest.join("ABCDEF"); await flush();
  assert.match(guest.element("multiplayerStatus").textContent, /Room not found/);
  assert.equal(guest.element("joinRoom").disabled, false);
  const pending = guest.create();
  guest.api.leave();
  await pending; await flush();
  assert.equal(guest.element("createRoom").disabled, false);
  assert.equal(guest.element("multiplayerBadge").hidden, true);
});

test("loads PeerJS only when requested and reports a CDN failure without breaking solo play", async () => {
  const { client } = network();
  const guest = client("Guest");
  guest.context.window.Peer = undefined;
  assert.equal(guest.element("head").children.length, 0);
  const pending = guest.create();
  const script = guest.element("head").children[0];
  assert.match(script.src, /peerjs@1\.5\.5/);
  script.onerror();
  await pending;
  assert.match(guest.element("multiplayerStatus").textContent, /PeerJS could not load/);
  assert.equal(guest.element("createRoom").disabled, false);
  assert.equal(guest.api.peers.size, 0);
});
