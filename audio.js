"use strict";

(() => {
  const button = document.getElementById("musicToggle");
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  let enabled = true;
  try { enabled = localStorage.getItem("stillwater-music") !== "off"; } catch {}
  let context = null;
  let master = null;
  let nextBeat = 0;
  let beat = 0;
  let scheduler = null;
  const beatLength = 60 / 68;
  const chords = [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]];
  const melody = [72, null, 76, 79, null, 76, 74, null, 72, 69, null, 72, 76, null, 74, null];

  function updateButton() {
    button.textContent = "Music: " + (enabled ? "On" : "Off");
    button.setAttribute("aria-pressed", String(enabled));
  }

  function note(pitch, start, duration, volume, waveform) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.12);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.1);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  function schedule() {
    if (!context || context.state !== "running" || !enabled || document.hidden) return;
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + 0.05;
    while (nextBeat < context.currentTime + 0.4) {
      if (beat % 8 === 0) {
        const chord = chords[Math.floor(beat / 8) % chords.length];
        for (const pitch of chord) note(pitch, nextBeat, beatLength * 9, 0.12, "sine");
      }
      const pitch = melody[beat % melody.length];
      if (pitch !== null) note(pitch, nextBeat, beatLength * 2.5, 0.15, "triangle");
      nextBeat += beatLength;
      beat++;
    }
  }

  async function start() {
    if (!enabled || !AudioEngine || document.hidden) return;
    try {
      if (!context) {
        context = new AudioEngine();
        master = context.createGain();
        master.gain.value = 0.13;
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1800;
        master.connect(filter);
        filter.connect(context.destination);
        scheduler = setInterval(schedule, 250);
      }
      await context.resume();
      schedule();
    } catch {
      enabled = false;
      updateButton();
    }
  }

  button.onclick = async () => {
    enabled = !enabled;
    try { localStorage.setItem("stillwater-music", enabled ? "on" : "off"); } catch {}
    updateButton();
    if (enabled) await start();
    else if (context) await context.suspend();
  };
  for (const eventName of ["pointerdown", "keydown"]) {
    document.addEventListener(eventName, start, { once: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) context?.suspend();
    else if (enabled && context) start();
  });
  window.addEventListener("pagehide", () => {
    clearInterval(scheduler);
    context?.suspend();
  });
  if (!AudioEngine) {
    enabled = false;
    button.disabled = true;
    button.textContent = "Music unavailable";
  } else updateButton();
})();
