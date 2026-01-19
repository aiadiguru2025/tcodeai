import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const MODULE_INFO: Record<string, { name: string; description: string; color: string }> = {
  MM: { name: 'Materials Management', description: 'Procurement and inventory', color: 'blue' },
  SD: { name: 'Sales and Distribution', description: 'Sales, shipping, billing', color: 'green' },
  FI: { name: 'Financial Accounting', description: 'General ledger, A/R, A/P', color: 'amber' },
  CO: { name: 'Controlling', description: 'Cost accounting', color: 'purple' },
  PP: { name: 'Production Planning', description: 'Manufacturing', color: 'rose' },
  HR: { name: 'Human Resources', description: 'Personnel management', color: 'cyan' },
  PM: { name: 'Plant Maintenance', description: 'Equipment maintenance', color: 'orange' },
  WM: { name: 'Warehouse Management', description: 'Warehouse operations', color: 'teal' },
  QM: { name: 'Quality Management', description: 'Quality control', color: 'pink' },
  PS: { name: 'Project System', description: 'Project management', color: 'indigo' },
  BASIS: { name: 'Basis/Admin', description: 'System administration', color: 'slate' },
  ABAP: { name: 'ABAP Development', description: 'Programming', color: 'zinc' },
};

async function getModuleCounts() {
  const counts = await prisma.transactionCode.groupBy({
    by: ['module'],
    _count: { module: true },
    where: {
      isDeprecated: false,
      module: { not: null },
    },
    orderBy: { _count: { module: 'desc' } },
  });

  return counts;
}

export default async function ModulesPage() {
  const moduleCounts = await getModuleCounts();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">SAP Modules</h1>
            <p className="text-muted-foreground">
              Browse transaction codes by SAP module
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moduleCounts.map(({ module, _count }) => {
              const info = MODULE_INFO[module || ''] || {
                name: module || 'Other',
                description: 'Other transactions',
                color: 'gray',
              };

              return (
                <Link key={module} href={`/modules/${encodeURIComponent(module || 'other')}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            (module?.toLowerCase() as 'mm' | 'sd' | 'fi' | 'co' | 'pp' | 'hr' | 'basis') ||
                            'secondary'
                          }
                        >
                          {module}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {_count.module.toLocaleString()} T-codes
                        </span>
                      </div>
                      <CardTitle className="text-lg">{info.name !== module ? info.name : ''}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Unclassified section */}
          <div className="mt-8">
            <Link href="/modules/other">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">Other / Unclassified</h3>
                    <p className="text-sm text-muted-foreground">
                      Transaction codes not assigned to a specific module
                    </p>
                  </div>
                  <Badge variant="outline">Browse</Badge>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
