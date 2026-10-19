import type { Metadata } from "next";
import { InstallGuide } from "@/components/settings/InstallGuide";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";

export const metadata: Metadata = { title: t.meta.titles.install };

export default function InstallPage() {
  return (
    <>
      <PageHeader title={t.install.title} subtitle={t.install.subtitle} />
      <InstallGuide />
    </>
  );
}
