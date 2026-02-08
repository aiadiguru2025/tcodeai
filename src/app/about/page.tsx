import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import {
  Database,
  Brain,
  Layers,
  Zap,
  Search,
  Globe,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AppWindow,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About - TCodeAI',
  description:
    'TCodeAI is an AI-powered search engine for SAP transaction codes. Learn about our data coverage, technology, and mission.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* Hero */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              About <span className="text-primary">TCode</span>AI
            </h1>
            <p className="text-lg text-muted-foreground">
              The fastest way to find any SAP transaction code. Search by name, keyword, or
              describe what you need in plain English.
            </p>
          </div>

          {/* Mission */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Why TCodeAI?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SAP systems contain thousands of transaction codes spanning dozens of modules.
              Finding the right T-code is a daily challenge for consultants, developers, and
              end users. TCodeAI solves this by combining a comprehensive T-code database with
              AI-powered natural language search &mdash; so you can describe what you need
              instead of memorizing codes.
            </p>
          </section>

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard value="134K+" label="Transaction Codes" />
            <StatCard value="20+" label="SAP Modules" />
            <StatCard value="3K+" label="Fiori App Mappings" />
          </section>

          {/* How it works */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">How It Works</h2>
            <div className="space-y-4">
              <StepCard
                step={1}
                icon={<Search className="h-5 w-5" aria-hidden="true" />}
                title="Enter your query"
                description="Type a T-code name like ME21N, or describe what you need in plain English like 'create a purchase order'. TCodeAI auto-detects the best search mode."
              />
              <StepCard
                step={2}
                icon={<Brain className="h-5 w-5" aria-hidden="true" />}
                title="AI analyzes your intent"
                description="For natural language queries, our AI pipeline expands your query with SAP terminology, searches by semantic similarity, and ranks results using GPT-powered relevance scoring."
              />
              <StepCard
                step={3}
                icon={<Zap className="h-5 w-5" aria-hidden="true" />}
                title="Get ranked results"
                description="Results are ranked by confidence with explanations of why each T-code matches. The top result is highlighted as the best match."
              />
            </div>
          </section>

          {/* Technology */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Technology</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TechCard
                icon={<Layers className="h-4 w-4" aria-hidden="true" />}
                title="Hybrid Search"
                description="Combines exact match, fuzzy matching, full-text search, and vector similarity for comprehensive results."
              />
              <TechCard
                icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                title="AI Ranking"
                description="GPT-powered relevance scoring with SAP domain knowledge to rank T-codes by relevance to your query."
              />
              <TechCard
                icon={<Database className="h-4 w-4" aria-hidden="true" />}
                title="Vector Embeddings"
                description="T-code descriptions are embedded as vectors using OpenAI, enabling semantic search across the entire database."
              />
              <TechCard
                icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                title="LLM Validation"
                description="An AI judge validates low-confidence results to reduce hallucinations and improve accuracy."
              />
            </div>
          </section>

          {/* Data coverage */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Data Coverage</h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our database covers transaction codes across all major SAP modules:
                </p>
                <div className="flex flex-wrap gap-2">
                  {MODULES.map((mod) => (
                    <span
                      key={mod}
                      className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {mod}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Each T-code includes its description, associated program, module
                  classification, deprecation status, and S/4HANA compatibility where available.
                </p>
                <Link
                  href="/modules"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Browse all modules
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Fiori */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AppWindow className="h-5 w-5 text-primary" aria-hidden="true" />
              S/4HANA &amp; Fiori
            </h2>
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm text-muted-foreground">
                  TCodeAI includes mappings between classic T-codes and their SAP Fiori app
                  equivalents. This is especially useful for organizations migrating from SAP
                  ECC to S/4HANA, where many transactions have been replaced or enhanced with
                  Fiori-based experiences.
                </p>
                <Link
                  href="/fiori"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Explore Fiori app mappings
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          </section>

          {/* Open source / built with */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Built With</h2>
            <div className="flex flex-wrap gap-2">
              {TECH_STACK.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-xl border bg-primary/5 p-6 text-center space-y-3">
            <h3 className="font-semibold">Ready to find your T-code?</h3>
            <p className="text-sm text-muted-foreground">
              Try searching with natural language &mdash; it works better than you&apos;d expect.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Start searching
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <p className="text-2xl font-bold text-primary">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">
              <span className="text-muted-foreground mr-1.5">Step {step}.</span>
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TechCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <h3 className="font-medium text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

const MODULES = [
  'MM (Materials Management)',
  'SD (Sales & Distribution)',
  'FI (Financial Accounting)',
  'CO (Controlling)',
  'PP (Production Planning)',
  'HR / HCM',
  'PM (Plant Maintenance)',
  'QM (Quality Management)',
  'WM (Warehouse Management)',
  'PS (Project System)',
  'Basis / BC',
  'ABAP',
  'CRM',
  'SRM',
  'BW / BI',
  'GRC',
  'IS (Industry Solutions)',
];

const TECH_STACK = [
  'Next.js 14',
  'React',
  'TypeScript',
  'Tailwind CSS',
  'PostgreSQL',
  'Prisma',
  'pgvector',
  'OpenAI',
  'Vercel',
];
