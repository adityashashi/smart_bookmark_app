import { BookmarksDashboard } from "@/components/bookmarks-dashboard";
import { SignInButton } from "@/components/sign-in-button";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-20">
        <div className="w-full rounded-xl border border-black/10 p-8 shadow-sm">
          <h1 className="text-3xl font-semibold">Smart Bookmark App</h1>
          <p className="mt-3 text-sm text-black/70">
            Sign in with Google to create private bookmarks with realtime sync.
          </p>
          <div className="mt-6">
            <SignInButton />
          </div>
        </div>
      </main>
    );
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("id, url, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <BookmarksDashboard
        userId={user.id}
        userEmail={user.email ?? ""}
        initialBookmarks={bookmarks ?? []}
      />
    </main>
  );
}
