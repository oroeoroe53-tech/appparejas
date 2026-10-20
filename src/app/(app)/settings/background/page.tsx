import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BackgroundPicker } from "@/components/settings/BackgroundPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { signedUrls } from "@/server/media";
import { getAppContext, getPhotos } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.background };
export const dynamic = "force-dynamic";

const MAX = 90;

export default async function BackgroundPage() {
  const [ctx, photos] = await Promise.all([getAppContext(), getPhotos()]);
  if (!ctx) redirect("/login");
  const list = photos.slice(0, MAX);
  const urls = await signedUrls(list.map((p) => p.storage_path));
  return (
    <>
      <Link href="/settings" className="mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm text-muted"><ArrowLeft className="h-4 w-4" aria-hidden /> {t.settings.title}</Link>
      <PageHeader title={t.settings.background.title} subtitle={t.settings.background.subtitle} className="pt-2" />
      <BackgroundPicker
        photos={list.filter((p) => urls[p.storage_path]).map((p) => ({ id: p.id, path: p.storage_path, url: urls[p.storage_path] as string, caption: p.caption }))}
        currentPath={ctx.preferences.home_bg_path}
      />
    </>
  );
}
