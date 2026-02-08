'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bookmark, Trash2, Download, Upload, AppWindow, Terminal, Pencil } from 'lucide-react';

interface TCodeBookmark {
  id: string;
  tcode: string;
  notes: string | null;
  createdAt: string;
}

interface FioriBookmark {
  id: string;
  appId: string;
  appName: string | null;
  notes: string | null;
  createdAt: string;
}

export default function BookmarksPage() {
  const [tcodeBookmarks, setTcodeBookmarks] = useState<TCodeBookmark[]>([]);
  const [fioriBookmarks, setFioriBookmarks] = useState<FioriBookmark[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = () => {
    try {
      const tcodeStored = localStorage.getItem('tcodeai_bookmarks');
      setTcodeBookmarks(tcodeStored ? JSON.parse(tcodeStored) : []);

      const fioriStored = localStorage.getItem('tcodeai_fiori_bookmarks');
      setFioriBookmarks(fioriStored ? JSON.parse(fioriStored) : []);
    } catch {
      setTcodeBookmarks([]);
      setFioriBookmarks([]);
    }
  };

  const removeTcodeBookmark = (id: string) => {
    const updated = tcodeBookmarks.filter((b) => b.id !== id);
    localStorage.setItem('tcodeai_bookmarks', JSON.stringify(updated));
    setTcodeBookmarks(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const removeFioriBookmark = (id: string) => {
    const updated = fioriBookmarks.filter((b) => b.id !== id);
    localStorage.setItem('tcodeai_fiori_bookmarks', JSON.stringify(updated));
    setFioriBookmarks(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const saveNote = (bookmarkId: string, type: 'tcode' | 'fiori') => {
    if (type === 'tcode') {
      const updated = tcodeBookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, notes: noteText || null } : b
      );
      localStorage.setItem('tcodeai_bookmarks', JSON.stringify(updated));
      setTcodeBookmarks(updated);
    } else {
      const updated = fioriBookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, notes: noteText || null } : b
      );
      localStorage.setItem('tcodeai_fiori_bookmarks', JSON.stringify(updated));
      setFioriBookmarks(updated);
    }
    setEditingNoteId(null);
    setNoteText('');
  };

  const startEditNote = (id: string, currentNote: string | null) => {
    setEditingNoteId(id);
    setNoteText(currentNote || '');
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNoteText('');
  };

  const exportBookmarks = () => {
    const data = {
      tcodes: tcodeBookmarks,
      fioriApps: fioriBookmarks,
    };
    const dataStr = JSON.stringify(data, null, 2);
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
        const imported = JSON.parse(text);

        if (imported.tcodes || imported.fioriApps) {
          if (imported.tcodes) {
            const existing = new Set(tcodeBookmarks.map((b) => b.tcode));
            const newBookmarks = imported.tcodes.filter((b: TCodeBookmark) => !existing.has(b.tcode));
            const merged = [...tcodeBookmarks, ...newBookmarks];
            localStorage.setItem('tcodeai_bookmarks', JSON.stringify(merged));
            setTcodeBookmarks(merged);
          }
          if (imported.fioriApps) {
            const existing = new Set(fioriBookmarks.map((b) => b.appId));
            const newBookmarks = imported.fioriApps.filter((b: FioriBookmark) => !existing.has(b.appId));
            const merged = [...fioriBookmarks, ...newBookmarks];
            localStorage.setItem('tcodeai_fiori_bookmarks', JSON.stringify(merged));
            setFioriBookmarks(merged);
          }
        } else if (Array.isArray(imported)) {
          const existing = new Set(tcodeBookmarks.map((b) => b.tcode));
          const newBookmarks = imported.filter((b: TCodeBookmark) => !existing.has(b.tcode));
          const merged = [...tcodeBookmarks, ...newBookmarks];
          localStorage.setItem('tcodeai_bookmarks', JSON.stringify(merged));
          setTcodeBookmarks(merged);
        }
        window.dispatchEvent(new Event('storage'));
      } catch {
        alert('Failed to import bookmarks. Please check the file format.');
      }
    };
    input.click();
  };

  const totalBookmarks = tcodeBookmarks.length + fioriBookmarks.length;

  return (
    <div className="flex-1 bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Bookmarks</h1>
              <p className="text-muted-foreground">
                Your saved items ({totalBookmarks})
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

          {totalBookmarks === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bookmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="mb-2 text-lg font-medium">No bookmarks yet</h2>
                <p className="text-muted-foreground">
                  Start exploring T-codes and Fiori apps, then bookmark your favorites for quick access.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button asChild>
                    <Link href="/">Search T-codes</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/fiori">Browse Fiori Apps</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="tcodes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tcodes" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  T-Codes ({tcodeBookmarks.length})
                </TabsTrigger>
                <TabsTrigger value="fiori" className="flex items-center gap-2">
                  <AppWindow className="h-4 w-4" />
                  Fiori Apps ({fioriBookmarks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tcodes" className="mt-4">
                {tcodeBookmarks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No T-code bookmarks yet.</p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link href="/">Search T-codes</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {tcodeBookmarks.map((bookmark) => (
                      <Card key={bookmark.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/tcode/${encodeURIComponent(bookmark.tcode)}`}
                              className="flex-1 hover:underline"
                            >
                              <code className="text-lg font-bold text-primary">
                                {bookmark.tcode}
                              </code>
                              <p className="text-sm text-muted-foreground">
                                Added {new Date(bookmark.createdAt).toLocaleDateString()}
                              </p>
                            </Link>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditNote(bookmark.id, bookmark.notes)}
                                className="text-xs text-muted-foreground min-h-[44px]"
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                {bookmark.notes ? 'Edit note' : 'Add note'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTcodeBookmark(bookmark.id)}
                                aria-label={`Remove ${bookmark.tcode} bookmark`}
                                className="min-h-[44px] min-w-[44px]"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {bookmark.notes && editingNoteId !== bookmark.id && (
                            <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                              {bookmark.notes}
                            </p>
                          )}

                          {editingNoteId === bookmark.id && (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Add a note..."
                                className="text-sm"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveNote(bookmark.id, 'tcode')}
                                  className="min-h-[44px]"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditNote}
                                  className="min-h-[44px]"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fiori" className="mt-4">
                {fioriBookmarks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No Fiori app bookmarks yet.</p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link href="/fiori">Browse Fiori Apps</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {fioriBookmarks.map((bookmark) => (
                      <Card key={bookmark.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/fiori/${encodeURIComponent(bookmark.appId)}`}
                              className="flex-1 hover:underline"
                            >
                              <div className="flex items-center gap-2">
                                <AppWindow className="h-4 w-4 text-muted-foreground" />
                                <code className="text-lg font-bold text-primary">
                                  {bookmark.appId}
                                </code>
                              </div>
                              {bookmark.appName && (
                                <p className="text-sm">{bookmark.appName}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Added {new Date(bookmark.createdAt).toLocaleDateString()}
                              </p>
                            </Link>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditNote(bookmark.id, bookmark.notes)}
                                className="text-xs text-muted-foreground min-h-[44px]"
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                {bookmark.notes ? 'Edit note' : 'Add note'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFioriBookmark(bookmark.id)}
                                aria-label={`Remove ${bookmark.appId} bookmark`}
                                className="min-h-[44px] min-w-[44px]"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {bookmark.notes && editingNoteId !== bookmark.id && (
                            <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                              {bookmark.notes}
                            </p>
                          )}

                          {editingNoteId === bookmark.id && (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Add a note..."
                                className="text-sm"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => saveNote(bookmark.id, 'fiori')}
                                  className="min-h-[44px]"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditNote}
                                  className="min-h-[44px]"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
