import { Heart, HeartHandshake, HandHeart, MoonStar, Smile } from "lucide-react";
import type { Reaction } from "@/lib/message-types";

export const REACTION_ICONS: Record<Reaction, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  love: Heart,
  smile: Smile,
  miss: MoonStar,
  thanks: HandHeart,
  hug: HeartHandshake,
};
