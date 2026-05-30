import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold">Welcome to Visual Lab</h1>
      <p className="mt-3 max-w-md text-zinc-600">
        Phase 0 stub — the brand-setup wizard arrives in Phase 1. For now, head
        straight into your workspace.
      </p>
      <Link
        href="/app"
        className="mt-6 px-6 py-3 rounded-full bg-black text-white font-medium"
      >
        Open Studio
      </Link>
    </main>
  );
}
