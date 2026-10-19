"use client";

import { Eraser, Send, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessageAction, type SendResult } from "@/app/actions/messages";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import { discardUpload, uploadMedia } from "@/lib/media-client";
import { useOnline } from "@/lib/use-client";
import { cn } from "@/lib/utils";
import { SchedulePicker, scheduleToIso } from "./SchedulePicker";

const SIZE = 900;
const PAPER = "#fffdf8";
const COLORS = ["#382d2a", "#9d394d", "#e9b8b8", "#4a6fd6", "#3f8f5a", "#e3a53b"];
const SIZES = [6, 16, 34];

interface Stroke {
  color: string;
  size: number;
  points: Array<[number, number]>;
}

function paint(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0]![0], pts[0]![1], stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i]!;
    const [nx, ny] = pts[i + 1]!;
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const last = pts[pts.length - 1]!;
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

export function DrawingComposer({ spaceId, minDate, onSent }: { spaceId: string; minDate: string; onSent: (r: Extract<SendResult, { ok: true }>) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[0]!);
  const [size, setSize] = useState(SIZES[1]!);
  const [erasing, setErasing] = useState(false);
  const [count, setCount] = useState(0);
  const [caption, setCaption] = useState("");
  const [capsule, setCapsule] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const online = useOnline();
  const clientId = useRef(crypto.randomUUID());
  const uploaded = useRef<string | null>(null);
  const lock = useRef(false);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (const s of strokes.current) paint(ctx, s);
    if (current.current) paint(ctx, current.current);
  }, []);

  useEffect(() => redraw(), [redraw]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * SIZE, ((e.clientY - rect.top) / rect.height) * SIZE];
  };

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = { color: erasing ? PAPER : color, size: erasing ? size * 1.6 : size, points: [point(e)] };
    redraw();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!current.current) return;
    current.current.points.push(point(e));
    redraw();
  }
  function up() {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    setCount(strokes.current.length);
    uploaded.current = null;
    redraw();
  }

  async function send() {
    const el = canvas.current;
    if (lock.current || !el || strokes.current.length === 0) {
      if (strokes.current.length === 0) setError(t.drawing.emptyError);
      return;
    }
    if (!navigator.onLine) {
      setError(t.write.offline);
      return;
    }
    lock.current = true;
    setSending(true);
    setError(undefined);
    try {
      if (!uploaded.current) {
        const blob = await new Promise<Blob | null>((resolve) => el.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("encode");
        uploaded.current = await uploadMedia(spaceId, "drawing", blob, "png", "image/png");
      }
      const res = await sendMessageAction({
        content: caption,
        type: "drawing",
        clientId: clientId.current,
        attachment: { path: uploaded.current },
        deliverAt: capsule ? scheduleToIso(capsule) : null,
      });
      if (res.ok) onSent(res);
      else {
        uploaded.current = null;
        setError(res.error);
      }
    } catch {
      if (uploaded.current) void discardUpload(uploaded.current);
      uploaded.current = null;
      setError(t.media.errors.upload);
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-serif text-2xl">{t.drawing.title}</h2>
        <p className="mt-1 text-[15px] text-muted">{t.drawing.hint}</p>
      </div>

      <canvas
        ref={canvas}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label={t.drawing.canvasLabel}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="aspect-square w-full touch-none rounded-2xl bg-[#fffdf8] shadow-soft"
        style={{ cursor: "crosshair" }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label={t.drawing.colors} className="flex gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={!erasing && color === c} aria-label={c} onClick={() => { setColor(c); setErasing(false); }} style={{ background: c }} className={cn("h-9 w-9 rounded-full border border-black/10", !erasing && color === c && "ring-2 ring-cherry ring-offset-2 ring-offset-cream")} />
          ))}
        </div>
        <div role="radiogroup" aria-label={t.drawing.sizes} className="flex items-center gap-2">
          {SIZES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={size === s} aria-label={`${s}`} onClick={() => setSize(s)} className={cn("grid h-9 w-9 place-items-center rounded-full border", size === s ? "border-cherry" : "border-line")}>
              <span className="rounded-full bg-ink" style={{ width: Math.max(4, s / 2.4), height: Math.max(4, s / 2.4) }} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={erasing ? "primary" : "secondary"} className="min-h-10 px-4" onClick={() => setErasing((v) => !v)} aria-pressed={erasing}><Eraser className="h-4 w-4" aria-hidden /> {t.drawing.eraser}</Button>
        <Button variant="secondary" className="min-h-10 px-4" disabled={count === 0} onClick={() => { strokes.current.pop(); setCount(strokes.current.length); uploaded.current = null; redraw(); }}><Undo2 className="h-4 w-4" aria-hidden /> {t.drawing.undo}</Button>
        <Button variant="ghost" className="min-h-10 px-4" disabled={count === 0} onClick={() => { strokes.current = []; setCount(0); uploaded.current = null; redraw(); }}><Trash2 className="h-4 w-4" aria-hidden /> {t.drawing.clear}</Button>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="drawing-caption" className="block text-sm font-medium">{t.drawing.captionLabel}</label>
        <textarea id="drawing-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={300} className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25" />
      </div>
      <SchedulePicker value={capsule} onChange={setCapsule} minDate={minDate} />
      <FormMessage error={error} />
      <Button className="w-full" onClick={send} disabled={sending || !online || count === 0} aria-busy={sending}>
        {sending ? (<><Spinner /> {t.drawing.sending}</>) : (<><Send className="h-4 w-4" aria-hidden /> {t.drawing.send}</>)}
      </Button>
    </div>
  );
}
