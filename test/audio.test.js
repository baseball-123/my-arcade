import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../audio.js", import.meta.url), "utf8");

function music(savedPreference) {
  const events = new Map();
  const storage = new Map(savedPreference ? [["stillwater-music", savedPreference]] : []);
  const button = { textContent: "", setAttribute() {} };
  const scheduled = [];
  const intervals = [];
  const contexts = [];
  const node = () => ({ connect() {}, disconnect() {} });
  const document = { hidden: false, getElementById: () => button,
    addEventListener: (name, callback) => events.set(name, callback) };
  class AudioContext {
    constructor() { this.state = "suspended"; this.currentTime = 0; this.destination = node(); contexts.push(this); }
    createOscillator() {
      return { ...node(), frequency: { value: 0 }, start(time) { scheduled.push({ time, frequency: this.frequency.value }); }, stop() {} };
    }
    createGain() {
      return { ...node(), gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } };
    }
    createBiquadFilter() { return { ...node(), frequency: { value: 0 } }; }
    async resume() { this.state = "running"; }
    async suspend() { this.state = "suspended"; }
  }
  vm.runInNewContext(source, { document, window: { AudioContext, addEventListener() {} },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    setInterval: callback => { intervals.push(callback); return intervals.length; }, clearInterval() {} });
  return { button, events, document, scheduled, intervals, contexts, storage };
}

test("peaceful music waits for a user gesture and schedules actual musical notes", async () => {
  const audio = music();
  assert.equal(audio.contexts.length, 0);
  assert.equal(audio.button.textContent, "Music: On");
  await audio.events.get("pointerdown")();
  assert.equal(audio.contexts.length, 1);
  assert.equal(audio.contexts[0].state, "running");
  assert(audio.scheduled.length >= 5);
  assert(audio.scheduled.every(note => note.frequency > 0 && Number.isFinite(note.time)));
  await audio.events.get("keydown")();
  assert.equal(audio.intervals.length, 1);
});

test("music can be muted, resumed, and suspended while the game is hidden", async () => {
  const audio = music();
  await audio.events.get("pointerdown")();
  await audio.button.onclick();
  assert.equal(audio.contexts[0].state, "suspended");
  assert.equal(audio.storage.get("stillwater-music"), "off");
  await audio.button.onclick();
  assert.equal(audio.contexts[0].state, "running");
  audio.document.hidden = true;
  audio.events.get("visibilitychange")();
  assert.equal(audio.contexts[0].state, "suspended");
  audio.document.hidden = false;
  audio.events.get("visibilitychange")();
  await Promise.resolve();
  assert.equal(audio.contexts[0].state, "running");
});

test("remembers when the player turned music off", async () => {
  const audio = music("off");
  await audio.events.get("pointerdown")();
  assert.equal(audio.contexts.length, 0);
  assert.equal(audio.button.textContent, "Music: Off");
  await audio.button.onclick();
  assert.equal(audio.contexts.length, 1);
  assert.equal(audio.button.textContent, "Music: On");
});
