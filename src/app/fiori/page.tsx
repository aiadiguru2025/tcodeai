import { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import prisma from '@/lib/db';
import { FioriAppList } from '@/components/fiori/FioriAppCard';
import { FioriSearch } from '@/components/fiori/FioriSearch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppWindow } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SAP Fiori Apps | TCodeAI',
  description:
    'Browse and search SAP Fiori applications. Find Fiori apps by name, UI technology, or business area.',
};

async function getFioriStats() {
  const [total, byTech] = await Promise.all([
    prisma.fioriApp.count(),
    prisma.fioriApp.groupBy({
      by: ['uiTechnology'],
      _count: { uiTechnology: true },
      orderBy: { _count: { uiTechnology: 'desc' } },
      take: 6,
    }),
  ]);

  return { total, byTech };
}

async function getRecentFioriApps() {
  return prisma.fioriApp.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
  });
}

export default async function FioriPage() {
  const [stats, recentApps] = await Promise.all([getFioriStats(), getRecentFioriApps()]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <AppWindow className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold">SAP Fiori Reference Library</h1>
            </div>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Browse {stats.total.toLocaleString()} Fiori applications. Search by app name, ID,
              or use natural language to find the right app.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {stats.byTech.map(({ uiTechnology, _count }) => (
              <Card key={uiTechnology} className="text-center">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">
                    {_count.uiTechnology.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {uiTechnology
                      .replace('SAP Fiori: ', '')
                      .replace('SAP Fiori ', '')
                      .replace('SAP ', '')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Search Fiori Apps</CardTitle>
            </CardHeader>
            <CardContent>
              <FioriSearch />
            </CardContent>
          </Card>

          {/* Recent Apps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Browse Apps</span>
                <Badge variant="secondary">{stats.total.toLocaleString()} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FioriAppList apps={recentApps} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
