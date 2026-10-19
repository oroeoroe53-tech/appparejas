"use client";

import type { MessageType } from "@/lib/message-types";
import { HeartMessage } from "./HeartMessage";
import { HugInWords } from "./HugInWords";
import { LittleNote } from "./LittleNote";
import { LoveLetter } from "./LoveLetter";
import { SecretMessage } from "./SecretMessage";
import type { ExperienceProps } from "./shared";

const EXPERIENCES: Record<MessageType, (props: ExperienceProps) => React.ReactElement> = {
  love_letter: LoveLetter,
  little_note: LittleNote,
  heart_message: HeartMessage,
  hug_in_words: HugInWords,
  secret_message: SecretMessage,
};

export function MessageExperience({ type, ...props }: ExperienceProps & { type: MessageType }) {
  const Experience = EXPERIENCES[type];
  return <Experience {...props} />;
}
