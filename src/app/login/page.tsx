import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <div className="mx-auto mt-20 max-w-sm rounded-lg border border-zinc-200 p-6 shadow-sm dark:border-zinc-800">
      <h1 className="mb-4 text-center text-xl font-bold">🏈 Draft Hub</h1>
      <form action={login} className="space-y-3">
        <input type="hidden" name="next" value={searchParams.next ?? "/"} />
        <label className="block text-sm font-medium">
          Passcode
          <input
            type="password"
            name="password"
            autoFocus
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        {searchParams.error && <p className="text-sm text-rose-600">Incorrect passcode.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-gridiron-500 px-4 py-2 font-semibold text-white hover:bg-gridiron-600"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
