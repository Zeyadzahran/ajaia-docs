import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { signInAs } from "@/app/actions";
import { getCurrentUser, listUsers } from "@/lib/session";

// What each seeded user can do with the welcome doc, so reviewers know whom to pick.
const DEMO_ROLES: Record<string, string> = {
  alice: "Owns the welcome doc",
  bob: "Can edit Alice's doc",
  carol: "Can only view Alice's doc",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const users = await listUsers();
  const { error } = await searchParams;

  return (
    <main className="grid flex-1 place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-7 shadow-[0_16px_40px_-16px_rgba(24,24,27,0.18)] ring-1 ring-ink-200">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Choose a demo account</h1>
        <p className="mt-1 text-sm text-ink-600">
          Sign-in is simulated for this demo, with no passwords. Switch accounts any time to test sharing.
        </p>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">That user does not exist.</p>}
        <div className="mt-5 space-y-2">
          {users.map((user) => (
            <form key={user.id} action={signInAs}>
              <input type="hidden" name="userId" value={user.id} />
              <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left ring-1 ring-ink-200 transition-colors hover:bg-ink-50 hover:ring-ink-300 active:scale-[0.99]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-700">
                  {user.name[0]}
                </span>
                <span>
                  <span className="block font-medium">{user.name}</span>
                  <span className="block text-sm text-ink-500">{DEMO_ROLES[user.id] ?? user.email}</span>
                </span>
                <ArrowRightIcon size={16} className="ml-auto text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700" />
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
