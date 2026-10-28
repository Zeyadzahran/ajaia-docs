import Link from "next/link";
import { signOut } from "@/app/actions";
import type { User } from "@/lib/session";

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-sm text-white">A</span>
          Ajaia Docs
        </Link>
        <form action={signOut} className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{user.name}</span>
          </span>
          <button className="rounded-md border border-slate-300 px-2.5 py-1 hover:bg-slate-50">Switch user</button>
        </form>
      </div>
    </header>
  );
}
