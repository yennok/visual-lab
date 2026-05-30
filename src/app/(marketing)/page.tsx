import { SignInButton, SignUpButton, UserButton, Show } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Visual Lab</h1>
      <p className="mt-4 max-w-xl text-lg text-zinc-600">
        One place to generate consistent, on-brand images. Set up your brand
        once, generate forever.
      </p>
      <div className="mt-8 flex gap-3">
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <button className="px-6 py-3 rounded-full bg-black text-white font-medium">
              Start free trial
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="px-6 py-3 rounded-full border border-black font-medium">
              Sign in
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/app"
            className="px-6 py-3 rounded-full bg-black text-white font-medium"
          >
            Open Studio
          </Link>
          <UserButton />
        </Show>
      </div>
    </main>
  );
}
