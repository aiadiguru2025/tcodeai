'use client';

import { VoteButtons } from '@/components/feedback/VoteButtons';

interface TCodeFeedbackProps {
  tcodeId: number;
  tcode: string;
}

export function TCodeFeedback({ tcodeId, tcode }: TCodeFeedbackProps) {
  return (
    <div className="border-t pt-4 mt-4">
      <VoteButtons tcodeId={tcodeId} tcode={tcode} />
    </div>
  );
}
