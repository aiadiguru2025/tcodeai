'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FioriBookmarkButtonProps {
  appId: string;
  appName?: string;
  className?: string;
}

export function FioriBookmarkButton({ appId, appName, className }: FioriBookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const bookmarks = getFioriBookmarks();
    setIsBookmarked(bookmarks.some((b) => b.appId === appId));
  }, [appId]);

  const toggleBookmark = () => {
    const bookmarks = getFioriBookmarks();
    const existingIndex = bookmarks.findIndex((b) => b.appId === appId);

    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1);
      setIsBookmarked(false);
    } else {
      bookmarks.push({
        id: crypto.randomUUID(),
        appId,
        appName: appName || null,
        notes: null,
        createdAt: new Date().toISOString(),
      });
      setIsBookmarked(true);
    }

    localStorage.setItem('tcodeai_fiori_bookmarks', JSON.stringify(bookmarks));
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleBookmark}
      title={isBookmarked ? 'Remove from favorites' : 'Add to favorites'}
      className={className}
    >
      <Bookmark
        className={cn('h-4 w-4', isBookmarked && 'fill-current text-yellow-500')}
      />
    </Button>
  );
}

interface FioriBookmark {
  id: string;
  appId: string;
  appName: string | null;
  notes: string | null;
  createdAt: string;
}

export function getFioriBookmarks(): FioriBookmark[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('tcodeai_fiori_bookmarks');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
