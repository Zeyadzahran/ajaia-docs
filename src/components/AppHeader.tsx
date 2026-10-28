import { SignOutIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { button } from "@/components/ui";
import type { User } from "@/lib/session";

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="border-b border-ink-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="All documents" className="rounded-lg">
          <Logo />
        </Link>
        <form action={signOut} className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
              {user.name[0]}
            </span>
            <span className="hidden font-medium text-ink-900 sm:inline">{user.name}</span>
          </span>
          <button className={button("ghost", "sm")}>
            <SignOutIcon size={16} />
            Switch user
          </button>
        </form>
      </div>
    </header>
  );
}
