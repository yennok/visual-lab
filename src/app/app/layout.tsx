import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r p-4 space-y-3">
        <Link href="/app" className="block font-bold">
          Visual Lab
        </Link>
        <nav className="text-sm space-y-1">
          <Link href="/app" className="block">
            Workspace
          </Link>
          <Link href="/app/brands" className="block">
            Brands
          </Link>
          <Link href="/app/billing" className="block">
            Billing
          </Link>
        </nav>
      </aside>
      <main className="p-6">
        <header className="flex justify-end mb-6">
          <UserButton />
        </header>
        {children}
      </main>
    </div>
  );
}
