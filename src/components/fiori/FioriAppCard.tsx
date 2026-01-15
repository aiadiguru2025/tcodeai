'use client';

import { Badge } from '@/components/ui/badge';
import type { FioriApp } from '@/types';
import { AppWindow, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const UI_TECH_STYLES: Record<string, string> = {
  'SAP GUI': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'SAP Fiori elements':
    'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'SAP Fiori (SAPUI5)':
    'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  'Web Dynpro': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'SAP Fiori: Generic Job Scheduling Framework':
    'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  'Web Client UI': 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
};

interface FioriAppCardProps {
  app: FioriApp;
  showLink?: boolean;
}

export function FioriAppCard({ app, showLink = true }: FioriAppCardProps) {
  const techStyle =
    UI_TECH_STYLES[app.uiTechnology] ||
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  const content = (
    <div className="flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <AppWindow className="h-4 w-4 shrink-0 text-muted-foreground" />
            <code className="font-semibold text-primary">{app.appId}</code>
          </div>
          <Badge variant="outline" className={`text-xs ${techStyle}`}>
            {app.uiTechnology.replace('SAP Fiori: ', '').replace('SAP ', '')}
          </Badge>
        </div>
        <p className="text-sm">{app.appName}</p>
        {app.appLauncherTitle && app.appLauncherTitle !== app.appName && (
          <p className="text-xs text-muted-foreground">{app.appLauncherTitle}</p>
        )}
        {app.lineOfBusiness.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {app.lineOfBusiness.slice(0, 3).map((lob) => (
              <Badge key={lob} variant="secondary" className="text-xs">
                {lob}
              </Badge>
            ))}
            {app.lineOfBusiness.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{app.lineOfBusiness.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
      {showLink && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
    </div>
  );

  if (showLink) {
    return <Link href={`/fiori/${encodeURIComponent(app.appId)}`}>{content}</Link>;
  }

  return content;
}

interface FioriAppListProps {
  apps: FioriApp[];
  showLink?: boolean;
  emptyMessage?: string;
}

export function FioriAppList({
  apps,
  showLink = true,
  emptyMessage = 'No Fiori apps found',
}: FioriAppListProps) {
  if (apps.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {apps.map((app) => (
        <FioriAppCard key={app.id} app={app} showLink={showLink} />
      ))}
    </div>
  );
}
