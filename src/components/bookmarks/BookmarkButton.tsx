'use client';

import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  tcode: string;
  className?: string;
}

export function BookmarkButton({ tcode, className }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const bookmarks = getBookmarks();
    setIsBookmarked(bookmarks.some((b) => b.tcode === tcode));
  }, [tcode]);

  const toggleBookmark = () => {
    const bookmarks = getBookmarks();
    const existingIndex = bookmarks.findIndex((b) => b.tcode === tcode);

    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1);
      setIsBookmarked(false);
    } else {
      bookmarks.push({
        id: crypto.randomUUID(),
        tcode,
        notes: null,
        createdAt: new Date().toISOString(),
      });
      setIsBookmarked(true);
    }

    localStorage.setItem('tcodeai_bookmarks', JSON.stringify(bookmarks));
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleBookmark}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      className={className}
    >
      <Bookmark
        className={cn('h-4 w-4', isBookmarked && 'fill-current text-yellow-500')}
      />
    </Button>
  );
}

function getBookmarks(): { id: string; tcode: string; notes: string | null; createdAt: string }[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('tcodeai_bookmarks');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
