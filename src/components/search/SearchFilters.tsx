'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const MODULES = [
  'Basis Components',
  'Controlling',
  'Cross-Application Components',
  'Enterprise Controlling',
  'Environment, Health and Safety',
  'Financial Accounting',
  'Financial Services',
  'Financials',
  'Global Trade Services',
  'Logistics - General',
  'Logistics Execution',
  'Materials Management',
  'Payroll',
  'Personnel Management',
  'Plant Maintenance',
  'Production Planning and Control',
  'Project System',
  'Public Sector Management',
  'Quality Management',
  'Real Estate Management',
  'Sales and Distribution',
  'Service',
  'Supplier Relationship Management',
  'Treasury',
];

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentModule = searchParams.get('module') || '';
  const includeDeprecated = searchParams.get('deprecated') === 'true';
  const sort = searchParams.get('sort') || 'relevance';

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/search?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={currentModule}
        onChange={(e) => updateParam('module', e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm min-h-[44px]"
        aria-label="Filter by module"
      >
        <option value="">All Modules</option>
        {MODULES.map((mod) => (
          <option key={mod} value={mod}>
            {mod}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-muted-foreground min-h-[44px] cursor-pointer">
        <input
          type="checkbox"
          checked={includeDeprecated}
          onChange={(e) => updateParam('deprecated', e.target.checked ? 'true' : '')}
          className="h-4 w-4 rounded border-input"
        />
        Include deprecated
      </label>

      <select
        value={sort}
        onChange={(e) => updateParam('sort', e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm min-h-[44px]"
        aria-label="Sort results"
      >
        <option value="relevance">Sort: Relevance</option>
        <option value="name-asc">Sort: Name A-Z</option>
        <option value="name-desc">Sort: Name Z-A</option>
      </select>
    </div>
  );
}
