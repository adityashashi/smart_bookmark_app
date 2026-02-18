"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Bookmark = {
    id: string;
    url: string;
    title: string;
    created_at: string;
};

type Props = {
    userId: string;
    userEmail: string;
    initialBookmarks: Bookmark[];
};

function isValidHttpUrl(input: string) {
    try {
        const parsed = new URL(input);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

export function BookmarksDashboard({ userId, userEmail, initialBookmarks }: Props) {
    const supabase = useMemo(() => createClient(), []);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setBookmarks(initialBookmarks);
    }, [initialBookmarks]);

    useEffect(() => {
        const channel = supabase
            .channel(`bookmarks-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "bookmarks",
                    filter: `user_id=eq.${userId}`,
                },
                (payload: RealtimePostgresInsertPayload<Bookmark>) => {
                    const nextItem = payload.new;
                    setBookmarks((current) => {
                        if (current.some((item) => item.id === nextItem.id)) {
                            return current;
                        }
                        return [nextItem, ...current];
                    });
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "bookmarks",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const removedId = String(payload.old.id ?? "");
                    setBookmarks((current) => current.filter((item) => item.id !== removedId));
                },
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [supabase, userId]);

    const addBookmark = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const nextTitle = title.trim();
        const nextUrl = url.trim();

        if (!nextTitle) {
            setError("Title is required.");
            return;
        }

        if (!isValidHttpUrl(nextUrl)) {
            setError("Enter a valid URL starting with http:// or https://");
            return;
        }

        setIsSaving(true);
        const { error: insertError } = await supabase
            .from("bookmarks")
            .insert({ title: nextTitle, url: nextUrl, user_id: userId });
        setIsSaving(false);

        if (insertError) {
            setError(insertError.message);
            return;
        }

        setTitle("");
        setUrl("");
    };

    const deleteBookmark = async (id: string) => {
        setError(null);
        const { data: deletedRows, error: deleteError } = await supabase
            .from("bookmarks")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)
            .select("id");

        if (deleteError) {
            setError(deleteError.message);
            return;
        }

        if (!deletedRows || deletedRows.length === 0) {
            setError("Delete was blocked. Re-run SQL policies, then try deleting bookmarks created after policy setup.");
            return;
        }

        setBookmarks((current) => current.filter((item) => item.id !== id));
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-3 rounded-xl border border-foreground/15 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Smart Bookmark App</h1>
                    <p className="text-sm text-foreground/70">Signed in as {userEmail}</p>
                </div>
                <button
                    type="button"
                    onClick={signOut}
                    className="w-fit rounded-md border border-foreground/25 px-3 py-2 text-sm"
                >
                    Sign out
                </button>
            </header>

            <form onSubmit={addBookmark} className="space-y-3 rounded-xl border border-foreground/15 p-5">
                <h2 className="text-lg font-medium">Add bookmark</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Title"
                        className="rounded-md border border-foreground/25 bg-background px-3 py-2 text-sm"
                    />
                    <input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="https://example.com"
                        className="rounded-md border border-foreground/25 bg-background px-3 py-2 text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? "Saving..." : "Add"}
                </button>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>

            <div className="rounded-xl border border-foreground/15 p-5">
                <h2 className="mb-3 text-lg font-medium">My bookmarks</h2>
                {bookmarks.length === 0 ? (
                    <p className="text-sm text-foreground/70">No bookmarks yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {bookmarks.map((bookmark) => (
                            <li
                                key={bookmark.id}
                                className="flex flex-col gap-2 rounded-md border border-foreground/15 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-medium">{bookmark.title}</p>
                                    <a
                                        href={bookmark.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="break-all text-sm text-blue-700 underline"
                                    >
                                        {bookmark.url}
                                    </a>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => deleteBookmark(bookmark.id)}
                                    className="w-fit rounded-md border border-foreground/25 px-3 py-1.5 text-sm"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}