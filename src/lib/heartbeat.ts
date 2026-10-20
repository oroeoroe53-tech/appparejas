/** A soft "lub-dub" made with the Web Audio API, so no sound file is needed. Returns false if the browser blocks audio. */
export function playHeartbeat(beats = 3): boolean {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    if (ctx.state === "suspended") void ctx.resume();
    const thump = (at: number, strength: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(70, at);
      osc.frequency.exponentialRampToValueAtTime(38, at + 0.16);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(strength, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.22);
    };
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < beats; i++) {
      thump(t0 + i * 0.95, 0.5);
      thump(t0 + i * 0.95 + 0.28, 0.32);
    }
    window.setTimeout(() => void ctx.close(), beats * 950 + 600);
    return ctx.state !== "suspended";
  } catch {
    return false;
  }
}
