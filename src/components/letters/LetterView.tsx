"use client";

import { motion } from "framer-motion";
import { RotateCcw, Reply } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { SongPlayer, type SongPlayerHandle } from "@/components/songs/SongPlayer";
import type { SongClip } from "@/lib/songs";
import { saveLetterSongAction } from "@/app/actions/love";
import { markReadAction, reactAction } from "@/app/actions/messages";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { t } from "@/content";
import { REACTIONS, type MessageType, type Reaction } from "@/lib/message-types";
import { cn, formatDateTime } from "@/lib/utils";
import { MessageExperience } from "./MessageExperience";
import { REACTION_ICONS } from "./reactions";

interface Props {
  id: string;
  type: MessageType;
  text: string;
  createdAt: string;
  readAt: string | null;
  reaction: Reaction | null;
  isRecipient: boolean;
  senderName: string;
  partnerName: string;
  song: SongClip | null;
  media: { url: string; seconds: number | null } | null;
}

export function LetterView({ id, type, text, createdAt, readAt, reaction: initialReaction, isRecipient, senderName, partnerName, song, media }: Props) {
  const songPlayer = useRef<SongPlayerHandle>(null);
  const songStarted = useRef(false);
  const alreadyRead = readAt !== null;
  const [opened, setOpened] = useState(alreadyRead || !isRecipient);
  const [replay, setReplay] = useState(0);
  const [skipCeremony, setSkipCeremony] = useState(alreadyRead || !isRecipient);
  const [reaction, setReaction] = useState<Reaction | null>(initialReaction);
  const [notice, setNotice] = useState<string>();
  const [playlistState, setPlaylistState] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();

  const handleOpened = useCallback(() => {
    if (!isRecipient) return;
    setOpened(true);
    // Some styles open without a tap (note, hug): try to start the song, the button is the fallback.
    if (song && !alreadyRead && !songStarted.current) void songPlayer.current?.play();
    if (alreadyRead) return;
    // Only now, after the reader actually opened it, is the letter marked as read.
    startTransition(async () => {
      const res = await markReadAction(id);
      if (!res.ok) setNotice(t.experience.markFailed);
    });
  }, [alreadyRead, id, isRecipient, song]);

  function react(next: Reaction) {
    const target = reaction === next ? null : next;
    const previous = reaction;
    setReaction(target);
    setNotice(undefined);
    startTransition(async () => {
      const res = await reactAction(id, target);
      if (!res.ok) {
        setReaction(previous);
        setNotice(t.settings.errors.generic);
      } else setNotice(target ? t.experience.reactionSaved : undefined);
    });
  }

  return (
    <div>
      <div className="min-h-[300px]">
        <MessageExperience
          key={replay}
          type={type}
          text={text}
          senderName={senderName}
          dateLabel={formatDateTime(createdAt)}
          media={media ?? undefined}
          autoOpen={skipCeremony}
          onOpened={isRecipient ? handleOpened : undefined}
          // The tap that opens the seal is the moment browsers allow sound to start.
          onOpenStart={song ? () => { songStarted.current = true; void songPlayer.current?.play(); } : undefined}
        />
      </div>

      {song && (
        <div className="mt-6" hidden={!opened}>
          <p className="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{isRecipient ? t.song.heading(senderName) : t.song.headingSent}</p>
          <SongPlayer ref={songPlayer} clip={song} />
          <p className="mt-2 text-[11px] text-muted">{isRecipient ? `${t.song.tapHint} ${t.song.attribution}` : t.song.attribution}</p>
          <div className="mt-3">
            <button
              type="button"
              disabled={playlistState === "saved" || playlistState === "saving"}
              onClick={() => {
                setPlaylistState("saving");
                startTransition(async () => {
                  const res = await saveLetterSongAction(id);
                  setPlaylistState(res.ok ? "saved" : "idle");
                  setNotice(res.ok ? t.playlist.savedFromLetter : res.error);
                });
              }}
              className="text-sm text-cherry underline underline-offset-4 disabled:no-underline disabled:text-muted"
            >
              {playlistState === "saved" ? t.playlist.savedFromLetter : t.playlist.saveFromLetter}
            </button>
          </div>
        </div>
      )}

      {!isRecipient && (
        <dl className="mt-6 space-y-1 text-sm text-muted">
          <div className="flex gap-2"><dt className="sr-only">{t.common.sent}</dt><dd>{t.experience.sentAt(formatDateTime(createdAt))}</dd></div>
          <div className="flex gap-2"><dt className="sr-only">{t.common.opened}</dt><dd>{readAt ? t.experience.openedAt(formatDateTime(readAt)) : t.experience.notOpened}</dd></div>
          {reaction && (
            <div className="flex items-center gap-2 text-ink">
              {(() => { const Icon = REACTION_ICONS[reaction]; return <Icon className="h-4 w-4 text-cherry" aria-hidden />; })()}
              <dd>{t.experience.theirReaction(partnerName)}: {t.reactions[reaction]}</dd>
            </div>
          )}
        </dl>
      )}

      {isRecipient && opened && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="mt-8" aria-label={t.experience.react}>
          <p className="text-xs tracking-[0.2em] text-muted uppercase">{t.experience.react}</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t.experience.react}>
            {REACTIONS.map((r) => {
              const Icon = REACTION_ICONS[r];
              const active = reaction === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={active}
                  onClick={() => react(r)}
                  className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition active:scale-95", active ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper text-ink hover:border-stone")}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {t.reactions[r]}
                </button>
              );
            })}
          </div>
          <p role="status" className="mt-3 min-h-5 text-sm text-muted">{notice}</p>
        </motion.section>
      )}

      {opened && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass("secondary", "min-h-11 px-5")}
            onClick={() => { setSkipCeremony(false); setReplay((n) => n + 1); }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> {t.experience.readAgain}
          </button>
          {isRecipient && (
            <ButtonLink href={`/write?reply=${id}`} className="min-h-11 px-5">
              <Reply className="h-4 w-4" aria-hidden /> {t.experience.reply}
            </ButtonLink>
          )}
        </div>
      )}
      <p className="mt-8"><Link href="/letters" className="text-sm text-muted underline underline-offset-4">{t.experience.backToLetters}</Link></p>
    </div>
  );
}
