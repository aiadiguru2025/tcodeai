import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { CopyButton } from '@/components/tcode/CopyButton';
import { TCodeFeedback } from '@/components/tcode/TCodeFeedback';
import prisma from '@/lib/db';
import { ArrowLeft, ExternalLink, AppWindow } from 'lucide-react';
import { FioriAppList } from '@/components/fiori/FioriAppCard';
import type { FioriApp } from '@/types';

interface Props {
  params: { code: string };
}

async function getTCode(code: string) {
  const tcode = await prisma.transactionCode.findUnique({
    where: { tcode: code.toUpperCase() },
  });

  return tcode;
}

async function getFioriApps(tcode: string): Promise<FioriApp[]> {
  const mappings = await prisma.fioriTCodeMapping.findMany({
    where: {
      OR: [
        { tcode: { tcode: tcode.toUpperCase() } },
        { tcodeRaw: { equals: tcode.toUpperCase(), mode: 'insensitive' } },
      ],
    },
    include: {
      fioriApp: true,
    },
    take: 10,
  });

  return mappings.map((m) => ({
    id: m.fioriApp.id,
    appId: m.fioriApp.appId,
    appName: m.fioriApp.appName,
    appLauncherTitle: m.fioriApp.appLauncherTitle,
    uiTechnology: m.fioriApp.uiTechnology,
    appComponentDesc: m.fioriApp.appComponentDesc,
    lineOfBusiness: m.fioriApp.lineOfBusiness,
    semanticObjectAction: m.fioriApp.semanticObjectAction,
    businessCatalogTitle: m.fioriApp.businessCatalogTitle,
    createdAt: m.fioriApp.createdAt,
  }));
}

async function getRelatedTCodes(tcode: string, module: string | null) {
  // Find related T-codes by prefix pattern
  const prefix = tcode.replace(/[0-9N]+$/, '');

  const related = await prisma.transactionCode.findMany({
    where: {
      tcode: {
        startsWith: prefix,
        not: tcode,
      },
      isDeprecated: false,
    },
    take: 5,
    orderBy: { tcode: 'asc' },
  });

  // If module is known, also get popular T-codes from same module
  let sameModule: typeof related = [];
  if (module && related.length < 5) {
    sameModule = await prisma.transactionCode.findMany({
      where: {
        module,
        NOT: {
          tcode: {
            in: [...related.map((r) => r.tcode), tcode],
          },
        },
        isDeprecated: false,
        description: { not: null },
      },
      take: 5 - related.length,
    });
  }

  return [...related, ...sameModule];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tcode = await getTCode(params.code);

  if (!tcode) {
    return {
      title: 'T-Code Not Found | TCodeAI',
    };
  }

  return {
    title: `${tcode.tcode} - ${tcode.description || 'SAP Transaction'} | TCodeAI`,
    description: `SAP Transaction Code ${tcode.tcode}: ${tcode.description || 'View details, related codes, and usage information.'}`,
    openGraph: {
      title: `${tcode.tcode} - SAP Transaction Code`,
      description: tcode.description || 'View SAP transaction code details',
    },
  };
}

export default async function TCodePage({ params }: Props) {
  const tcode = await getTCode(params.code);

  if (!tcode) {
    notFound();
  }

  const [relatedTCodes, fioriApps] = await Promise.all([
    getRelatedTCodes(tcode.tcode, tcode.module),
    getFioriApps(tcode.tcode),
  ]);

  const moduleVariant = tcode.module?.toLowerCase() as
    | 'mm'
    | 'sd'
    | 'fi'
    | 'co'
    | 'pp'
    | 'hr'
    | 'basis'
    | undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to search
          </Link>

          <div className="space-y-6">
            {/* Main Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <code className="text-3xl font-bold text-primary">{tcode.tcode}</code>
                      {tcode.module && (
                        <Badge variant={moduleVariant || 'secondary'} className="text-sm">
                          {tcode.module}
                        </Badge>
                      )}
                      {tcode.isDeprecated && (
                        <Badge variant="destructive">Deprecated</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-normal">
                      {tcode.description || tcode.descriptionEnriched || 'No description available'}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <CopyButton text={tcode.tcode} />
                    <BookmarkButton tcode={tcode.tcode} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Program</dt>
                    <dd className="mt-1 font-mono text-sm">{tcode.program || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Module</dt>
                    <dd className="mt-1 text-sm">{tcode.module || 'Unclassified'}</dd>
                  </div>
                  {tcode.usageCategory && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                      <dd className="mt-1 text-sm capitalize">{tcode.usageCategory}</dd>
                    </div>
                  )}
                  {tcode.s4hanaStatus && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">S/4HANA Status</dt>
                      <dd className="mt-1 text-sm capitalize">{tcode.s4hanaStatus}</dd>
                    </div>
                  )}
                </dl>
                <TCodeFeedback tcodeId={tcode.id} tcode={tcode.tcode} />
              </CardContent>
            </Card>

            {/* SAP Fiori Apps */}
            {fioriApps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AppWindow className="h-5 w-5" />
                    SAP Fiori Apps ({fioriApps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FioriAppList apps={fioriApps} showLink={false} />
                </CardContent>
              </Card>
            )}

            {/* Related T-Codes */}
            {relatedTCodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Transaction Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatedTCodes.map((related) => (
                      <Link
                        key={related.tcode}
                        href={`/tcode/${related.tcode}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <code className="font-bold text-primary">{related.tcode}</code>
                          <span className="text-sm text-muted-foreground">
                            {related.description || 'No description'}
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://help.sap.com/docs/search?q=${tcode.tcode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      SAP Help
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://www.google.com/search?q=SAP+${tcode.tcode}+transaction`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Search Google
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

