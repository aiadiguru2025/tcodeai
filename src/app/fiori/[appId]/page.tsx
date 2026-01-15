import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/lib/db';
import { ArrowLeft, AppWindow, ExternalLink } from 'lucide-react';

interface Props {
  params: { appId: string };
}

async function getFioriApp(appId: string) {
  const app = await prisma.fioriApp.findUnique({
    where: { appId },
    include: {
      tcodeMappings: {
        include: {
          tcode: {
            select: {
              id: true,
              tcode: true,
              description: true,
              module: true,
            },
          },
        },
      },
    },
  });

  return app;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const decodedAppId = decodeURIComponent(params.appId);
  const app = await getFioriApp(decodedAppId);

  if (!app) {
    return {
      title: 'Fiori App Not Found | TCodeAI',
    };
  }

  return {
    title: `${app.appId} - ${app.appName} | TCodeAI`,
    description: `SAP Fiori App ${app.appId}: ${app.appName}. UI Technology: ${app.uiTechnology}`,
  };
}

const UI_TECH_STYLES: Record<string, string> = {
  'SAP GUI': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'SAP Fiori elements': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'SAP Fiori (SAPUI5)': 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  'Web Dynpro': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
};

export default async function FioriAppPage({ params }: Props) {
  const decodedAppId = decodeURIComponent(params.appId);
  const app = await getFioriApp(decodedAppId);

  if (!app) {
    notFound();
  }

  const techStyle =
    UI_TECH_STYLES[app.uiTechnology] ||
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  const linkedTCodes = app.tcodeMappings.filter((m) => m.tcode);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/fiori"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fiori Apps
          </Link>

          <div className="space-y-6">
            {/* Main Info Card */}
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <AppWindow className="h-6 w-6 text-primary" />
                    <code className="text-2xl font-bold text-primary">{app.appId}</code>
                    <Badge variant="outline" className={techStyle}>
                      {app.uiTechnology}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-normal">{app.appName}</CardTitle>
                  {app.appLauncherTitle && app.appLauncherTitle !== app.appName && (
                    <p className="text-muted-foreground">{app.appLauncherTitle}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {app.appComponentDesc && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Component</dt>
                      <dd className="mt-1 text-sm">{app.appComponentDesc}</dd>
                    </div>
                  )}
                  {app.businessCatalogTitle && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Business Catalog
                      </dt>
                      <dd className="mt-1 text-sm">{app.businessCatalogTitle}</dd>
                    </div>
                  )}
                  {app.lineOfBusiness.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground">
                        Line of Business
                      </dt>
                      <dd className="mt-2 flex flex-wrap gap-1">
                        {app.lineOfBusiness.map((lob) => (
                          <Badge key={lob} variant="secondary">
                            {lob}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                  {app.semanticObjectAction.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground">
                        Semantic Objects
                      </dt>
                      <dd className="mt-2 flex flex-wrap gap-1">
                        {app.semanticObjectAction.map((soa) => (
                          <Badge key={soa} variant="outline" className="font-mono text-xs">
                            {soa}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Linked T-Codes */}
            {linkedTCodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Linked Transaction Codes ({linkedTCodes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {linkedTCodes.map((mapping) => (
                      <Link
                        key={mapping.id}
                        href={`/tcode/${mapping.tcode!.tcode}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <code className="font-bold text-primary">{mapping.tcode!.tcode}</code>
                          {mapping.tcode!.module && (
                            <Badge variant="secondary" className="text-xs">
                              {mapping.tcode!.module}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {mapping.tcode!.description || 'No description'}
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unmapped T-Codes */}
            {app.tcodeMappings.some((m) => !m.tcode) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-muted-foreground">
                    Other Referenced T-Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {app.tcodeMappings
                      .filter((m) => !m.tcode)
                      .map((mapping) => (
                        <Badge key={mapping.id} variant="outline">
                          {mapping.tcodeRaw}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
