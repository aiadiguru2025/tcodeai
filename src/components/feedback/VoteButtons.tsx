'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoteButtonsProps {
  tcodeId: number;
  tcode: string;
  onVote?: (vote: 1 | -1) => void;
}

export function VoteButtons({ tcodeId, tcode, onVote }: VoteButtonsProps) {
  const [vote, setVote] = useState<1 | -1 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async (newVote: 1 | -1) => {
    if (isSubmitting) return;

    // If clicking the same vote, remove it
    if (vote === newVote) {
      setVote(null);
      return;
    }

    setIsSubmitting(true);
    setVote(newVote);

    try {
      await fetch('/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tcodeId,
          tcode,
          vote: newVote,
        }),
      });

      onVote?.(newVote);
    } catch {
      // Revert on error
      setVote(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="mr-2 text-xs text-muted-foreground">Helpful?</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(1)}
        disabled={isSubmitting}
        className={cn(
          'h-8 px-2',
          vote === 1 && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
        )}
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={isSubmitting}
        className={cn(
          'h-8 px-2',
          vote === -1 && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        )}
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
