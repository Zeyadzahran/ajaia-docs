import { redirect } from "next/navigation";
import { signInAs } from "@/app/actions";
import { getCurrentUser, listUsers } from "@/lib/session";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const users = await listUsers();
  const { error } = await searchParams;

  return (
    <main className="grid flex-1 place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to Ajaia Docs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Demo build: pick a seeded user. There are no passwords, so you can switch users to test sharing.
        </p>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">That user does not exist.</p>}
        <div className="mt-5 space-y-2">
          {users.map((user) => (
            <form key={user.id} action={signInAs}>
              <input type="hidden" name="userId" value={user.id} />
              <button className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50">
                <span>
                  <span className="block font-medium">{user.name}</span>
                  <span className="block text-sm text-slate-500">{user.email}</span>
                </span>
                <span className="text-sm text-blue-600">Continue →</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
