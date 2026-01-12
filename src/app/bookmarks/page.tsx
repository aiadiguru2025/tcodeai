'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, Trash2, Download, Upload } from 'lucide-react';

interface BookmarkData {
  id: string;
  tcode: string;
  notes: string | null;
  createdAt: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = () => {
    try {
      const stored = localStorage.getItem('tcodeai_bookmarks');
      setBookmarks(stored ? JSON.parse(stored) : []);
    } catch {
      setBookmarks([]);
    }
  };

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    localStorage.setItem('tcodeai_bookmarks', JSON.stringify(updated));
    setBookmarks(updated);
  };

  const exportBookmarks = () => {
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tcodeai-bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBookmarks = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as BookmarkData[];

        // Merge with existing, avoiding duplicates
        const existing = new Set(bookmarks.map((b) => b.tcode));
        const newBookmarks = imported.filter((b) => !existing.has(b.tcode));
        const merged = [...bookmarks, ...newBookmarks];

        localStorage.setItem('tcodeai_bookmarks', JSON.stringify(merged));
        setBookmarks(merged);
      } catch {
        alert('Failed to import bookmarks. Please check the file format.');
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Bookmarks</h1>
              <p className="text-muted-foreground">
                Your saved transaction codes ({bookmarks.length})
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportBookmarks}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={importBookmarks}>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>

          {bookmarks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bookmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="mb-2 text-lg font-medium">No bookmarks yet</h2>
                <p className="text-muted-foreground">
                  Start searching for T-codes and bookmark your favorites for quick access.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/">Search T-codes</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((bookmark) => (
                <Card key={bookmark.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <Link
                      href={`/tcode/${bookmark.tcode}`}
                      className="flex-1 hover:underline"
                    >
                      <code className="text-lg font-bold text-primary">
                        {bookmark.tcode}
                      </code>
                      <p className="text-sm text-muted-foreground">
                        Added {new Date(bookmark.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBookmark(bookmark.id)}
                      title="Remove bookmark"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
