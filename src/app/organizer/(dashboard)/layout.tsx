import type { Metadata } from "next";
import { requireOrganizer } from "@/lib/auth";
import { OrganizerShell } from "@/components/organizer/shell";

export const metadata: Metadata = {
  title: "Organizer Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const organizer = await requireOrganizer();
  return (
    <OrganizerShell email={organizer.email} role={organizer.role}>
      {children}
    </OrganizerShell>
  );
}
