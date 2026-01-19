import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import prisma from '@/lib/db';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: { module: string };
  searchParams: { page?: string };
}

const MODULE_INFO: Record<string, { name: string; description: string }> = {
  MM: { name: 'Materials Management', description: 'Procurement and inventory management' },
  SD: { name: 'Sales and Distribution', description: 'Sales, shipping, and billing' },
  FI: { name: 'Financial Accounting', description: 'General ledger, A/R, A/P' },
  CO: { name: 'Controlling', description: 'Cost accounting and management' },
  PP: { name: 'Production Planning', description: 'Manufacturing and production' },
  HR: { name: 'Human Resources', description: 'Personnel management' },
  PM: { name: 'Plant Maintenance', description: 'Equipment maintenance' },
  WM: { name: 'Warehouse Management', description: 'Warehouse operations' },
  QM: { name: 'Quality Management', description: 'Quality control and assurance' },
  PS: { name: 'Project System', description: 'Project management' },
  BASIS: { name: 'Basis/Admin', description: 'System administration' },
  ABAP: { name: 'ABAP Development', description: 'Programming and development' },
  LE: { name: 'Logistics Execution', description: 'Logistics and shipping' },
  TR: { name: 'Treasury', description: 'Treasury management' },
  IM: { name: 'Investment Management', description: 'Capital investment' },
  RE: { name: 'Real Estate', description: 'Real estate management' },
};

const PAGE_SIZE = 50;

async function getModuleTCodes(module: string, page: number) {
  const skip = (page - 1) * PAGE_SIZE;

  // Use case-insensitive matching to support both short codes (MM) and full names (Materials Management)
  const [tcodes, total] = await Promise.all([
    prisma.transactionCode.findMany({
      where: {
        module: { equals: module, mode: 'insensitive' },
        isDeprecated: false,
      },
      select: {
        tcode: true,
        description: true,
        program: true,
        module: true,
      },
      orderBy: { tcode: 'asc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.transactionCode.count({
      where: {
        module: { equals: module, mode: 'insensitive' },
        isDeprecated: false,
      },
    }),
  ]);

  return { tcodes, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export default async function ModulePage({ params, searchParams }: Props) {
  // Decode URL-encoded module name (e.g., "Sales%20and%20Distribution" -> "Sales and Distribution")
  const decodedModule = decodeURIComponent(params.module);
  const page = parseInt(searchParams.page || '1', 10);

  const { tcodes, total, totalPages } = await getModuleTCodes(decodedModule, page);

  if (tcodes.length === 0 && page === 1) {
    notFound();
  }

  // Get the actual module name from the first result for display
  const actualModuleName = tcodes[0]?.module || decodedModule;

  // Check if it's a known short code for badge styling
  const moduleUpperCase = decodedModule.toUpperCase();
  const info = MODULE_INFO[moduleUpperCase] || {
    name: actualModuleName,
    description: 'SAP Module',
  };

  const moduleVariant = moduleUpperCase.toLowerCase() as
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
            href="/modules"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to modules
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3">
              <Badge variant={moduleVariant || 'secondary'} className="text-lg px-3 py-1">
                {actualModuleName}
              </Badge>
              <h1 className="text-2xl font-bold">{info.name !== actualModuleName ? info.name : ''}</h1>
            </div>
            <p className="mt-2 text-muted-foreground">{info.description}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {total.toLocaleString()} transaction codes
            </p>
          </div>

          <div className="space-y-2">
            {tcodes.map((tcode) => (
              <Link key={tcode.tcode} href={`/tcode/${encodeURIComponent(tcode.tcode)}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <code className="font-bold text-primary">{tcode.tcode}</code>
                      <span className="text-sm text-muted-foreground">
                        {tcode.description || 'No description'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/modules/${encodeURIComponent(actualModuleName)}?page=${page - 1}`}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/modules/${encodeURIComponent(actualModuleName)}?page=${page + 1}`}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
