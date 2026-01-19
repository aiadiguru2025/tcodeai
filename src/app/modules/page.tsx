import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import prisma from '@/lib/db';
import {
  Building2,
  Users,
  Package,
  TrendingUp,
  Cog,
  Globe,
  Briefcase,
  Factory,
  FileText,
  Layers,
  Server,
  ShoppingCart,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Comprehensive module info with categories
const MODULE_INFO: Record<
  string,
  { description: string; category: string }
> = {
  // Finance & Controlling
  'Financial Accounting': {
    description: 'General ledger, accounts receivable/payable, asset accounting',
    category: 'Finance',
  },
  'Financials': {
    description: 'Core financial management and reporting',
    category: 'Finance',
  },
  'Financial Services': {
    description: 'Banking, insurance, and financial products',
    category: 'Finance',
  },
  'Controlling': {
    description: 'Cost center accounting, profitability analysis',
    category: 'Finance',
  },
  'Treasury': {
    description: 'Cash management, treasury operations',
    category: 'Finance',
  },
  'Enterprise Controlling': {
    description: 'Group consolidation, profit center accounting',
    category: 'Finance',
  },
  'Bank Components': {
    description: 'Bank communication, electronic banking',
    category: 'Finance',
  },
  'FI': {
    description: 'Financial accounting (legacy module code)',
    category: 'Finance',
  },

  // Sales & Customer
  'Sales and Distribution': {
    description: 'Sales orders, pricing, shipping, billing',
    category: 'Sales',
  },
  'Customer Relationship Management': {
    description: 'CRM, customer service, sales force automation',
    category: 'Sales',
  },
  'Supplier Relationship Management': {
    description: 'Supplier collaboration, sourcing, contracts',
    category: 'Sales',
  },
  'Incentive and Commission Management (ICM)': {
    description: 'Sales incentives, commission calculations',
    category: 'Sales',
  },
  'Global Trade Services': {
    description: 'Trade compliance, customs management',
    category: 'Sales',
  },
  'Service': {
    description: 'Customer service, service contracts',
    category: 'Sales',
  },

  // Logistics & Supply Chain
  'Materials Management': {
    description: 'Procurement, inventory, vendor management',
    category: 'Logistics',
  },
  'Logistics - General': {
    description: 'Cross-functional logistics components',
    category: 'Logistics',
  },
  'Logistics Execution': {
    description: 'Warehouse management, transportation',
    category: 'Logistics',
  },
  'Production Planning and Control': {
    description: 'Manufacturing, MRP, shop floor control',
    category: 'Logistics',
  },
  'Plant Maintenance': {
    description: 'Equipment maintenance, work orders',
    category: 'Logistics',
  },
  'Quality Management': {
    description: 'Quality planning, inspection, certificates',
    category: 'Logistics',
  },

  // HR & Personnel
  'Personnel Management': {
    description: 'Employee master data, organizational management',
    category: 'HR',
  },
  'Payroll': {
    description: 'Payroll processing, wage types, tax',
    category: 'HR',
  },
  'Training and Event Management': {
    description: 'Training administration, event planning',
    category: 'HR',
  },

  // Technical & Development
  'Basis Components': {
    description: 'System administration, transport, monitoring',
    category: 'Technical',
  },
  'Cross-Application Components': {
    description: 'Shared services, workflow, archiving',
    category: 'Technical',
  },
  'Application Platform': {
    description: 'Core platform services, integration',
    category: 'Technical',
  },
  'Without Description': {
    description: 'Uncategorized system transactions',
    category: 'Technical',
  },

  // Industry Solutions
  'Public Sector Management': {
    description: 'Government, public administration',
    category: 'Industry',
  },
  'Real Estate Management': {
    description: 'Property management, lease accounting',
    category: 'Industry',
  },
  'SAP Media': {
    description: 'Media industry solutions',
    category: 'Industry',
  },
  'Project System': {
    description: 'Project planning, budgeting, execution',
    category: 'Industry',
  },
  'Environment, Health and Safety': {
    description: 'EHS compliance, safety management',
    category: 'Industry',
  },
  'Industry Solution Oil': {
    description: 'Oil & gas industry processes',
    category: 'Industry',
  },
  'SAP Utilities': {
    description: 'Utility company operations',
    category: 'Industry',
  },
  'Industry-Specific Component Automotive': {
    description: 'Automotive manufacturing solutions',
    category: 'Industry',
  },
  'Defense Forces and Public Security': {
    description: 'Defense and security solutions',
    category: 'Industry',
  },
};

// Category configuration with icons and colors
const CATEGORIES: Record<
  string,
  { label: string; icon: typeof Building2; color: string }
> = {
  Finance: { label: 'Finance & Controlling', icon: TrendingUp, color: 'text-emerald-600' },
  Sales: { label: 'Sales & Customer', icon: ShoppingCart, color: 'text-blue-600' },
  Logistics: { label: 'Supply Chain & Logistics', icon: Package, color: 'text-orange-600' },
  HR: { label: 'Human Resources', icon: Users, color: 'text-purple-600' },
  Technical: { label: 'Technical & Development', icon: Server, color: 'text-slate-600' },
  Industry: { label: 'Industry Solutions', icon: Building2, color: 'text-cyan-600' },
  Other: { label: 'Other Modules', icon: Layers, color: 'text-gray-600' },
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

  // Group modules by category
  const groupedModules: Record<
    string,
    { module: string | null; count: number; description: string }[]
  > = {
    Finance: [],
    Sales: [],
    Logistics: [],
    HR: [],
    Technical: [],
    Industry: [],
    Other: [],
  };

  let totalTCodes = 0;

  moduleCounts.forEach(({ module, _count }) => {
    totalTCodes += _count.module;
    const info = MODULE_INFO[module || ''];
    const category = info?.category || 'Other';
    const description = info?.description || 'SAP module transactions';

    groupedModules[category].push({
      module,
      count: _count.module,
      description,
    });
  });

  // Filter out empty categories
  const activeCategories = Object.entries(groupedModules).filter(
    ([, modules]) => modules.length > 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {/* Header with stats */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">SAP Modules</h1>
            <p className="mt-1 text-muted-foreground">
              Browse {totalTCodes.toLocaleString()} transaction codes across{' '}
              {moduleCounts.length} modules
            </p>
          </div>

          {/* Grouped modules */}
          <div className="space-y-10">
            {activeCategories.map(([category, modules]) => {
              const categoryInfo = CATEGORIES[category] || CATEGORIES.Other;
              const Icon = categoryInfo.icon;

              return (
                <section key={category}>
                  <div className="mb-4 flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${categoryInfo.color}`} />
                    <h2 className="text-xl font-semibold">{categoryInfo.label}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({modules.length} modules)
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map(({ module, count, description }) => (
                      <Link
                        key={module}
                        href={`/modules/${encodeURIComponent(module || 'other')}`}
                      >
                        <Card className="h-full transition-all hover:shadow-md hover:border-primary/30">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium leading-tight">{module}</h3>
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                {count.toLocaleString()}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {description}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Quick stats footer */}
          <div className="mt-12 rounded-lg border bg-muted/30 p-6">
            <div className="grid gap-4 text-center sm:grid-cols-3">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {moduleCounts.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Modules</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {totalTCodes.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Transaction Codes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {activeCategories.length}
                </p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
