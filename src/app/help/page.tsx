import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Sparkles,
  Zap,
  Bookmark,
  Keyboard,
  AppWindow,
  ArrowRight,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help - TCodeAI',
  description: 'Learn how to use TCodeAI to find SAP transaction codes with natural language search.',
};

export default function HelpPage() {
  return (
    <div className="flex-1 bg-background">
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* Page header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
            <p className="text-muted-foreground">
              Everything you need to know about finding SAP T-codes with TCodeAI.
            </p>
          </div>

          {/* Search modes */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" aria-hidden="true" />
              Search Modes
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="font-medium">Keyword Search</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Search by T-code name or keyword. Best for when you know the code (e.g.,
                    ME21N, VA01) or a specific term.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uses exact, fuzzy, and full-text matching across 134K+ T-codes.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="font-medium">AI Search</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Describe what you want to do in plain English. AI understands your intent and
                    finds the right T-code.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Example: &ldquo;create a purchase order in materials management&rdquo;
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <h3 className="font-medium">Auto Mode</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  By default, TCodeAI automatically detects your query type. Short alphanumeric
                  strings (like &ldquo;ME21N&rdquo;) use keyword search. Multi-word phrases
                  (like &ldquo;post goods receipt&rdquo;) use AI search. You can override this
                  with the mode toggle below the search bar.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* How to search */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Search Tips</h2>
            <div className="space-y-3">
              {SEARCH_TIPS.map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Features</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureHelp
                icon={<Bookmark className="h-4 w-4" aria-hidden="true" />}
                title="Bookmarks"
                description="Save T-codes for quick access. Click the bookmark icon on any T-code detail page. Your bookmarks are stored locally in your browser."
              />
              <FeatureHelp
                icon={<AppWindow className="h-4 w-4" aria-hidden="true" />}
                title="Fiori App Mapping"
                description="See which SAP Fiori apps replace or extend classic T-codes. Helpful for S/4HANA migration planning."
              />
              <FeatureHelp
                icon={<Search className="h-4 w-4" aria-hidden="true" />}
                title="Module Browsing"
                description="Browse T-codes organized by SAP module (MM, SD, FI, CO, PP, HR, and more) to discover related transactions."
              />
              <FeatureHelp
                icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
                title="Related T-Codes"
                description="Each T-code detail page shows related transactions so you can explore similar functionality."
              />
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-primary" aria-hidden="true" />
              Keyboard Shortcuts
            </h2>
            <Card>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <ShortcutRow keys={['/']} description="Focus the search bar from anywhere" />
                  <ShortcutRow keys={['\u2191', '\u2193']} description="Navigate autocomplete suggestions" />
                  <ShortcutRow keys={['Enter']} description="Select highlighted suggestion or submit search" />
                  <ShortcutRow keys={['Esc']} description="Close autocomplete dropdown" />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* FAQ */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((faq, i) => (
                <Card key={i}>
                  <CardContent className="p-5 space-y-2">
                    <h3 className="font-medium">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-xl border bg-muted/30 p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Still have questions? Start searching and the right T-code is just a query away.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Go to search
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureHelp({
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

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

const SEARCH_TIPS = [
  {
    title: 'Use module names for better AI results',
    description:
      'Include SAP module abbreviations like MM, SD, FI, CO, PP, or HR to narrow AI results to the right area.',
  },
  {
    title: 'Be specific with natural language',
    description:
      'Instead of "purchase order", try "create a purchase order for materials management". More context produces better matches.',
  },
  {
    title: 'Use keyword search for known T-codes',
    description:
      'If you know part of the code, keyword search with fuzzy matching will find it even with typos.',
  },
  {
    title: 'Browse by module to discover T-codes',
    description:
      'Visit the Modules page to explore all T-codes organized by SAP functional area.',
  },
  {
    title: 'Check Fiori alternatives',
    description:
      'T-code detail pages show Fiori app alternatives when available, useful for S/4HANA migrations.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How many T-codes does TCodeAI cover?',
    answer:
      'Our database contains over 134,000 SAP transaction codes spanning all major modules including MM, SD, FI, CO, PP, HR, Basis, and many more.',
  },
  {
    question: 'How does AI search work?',
    answer:
      'AI search uses semantic understanding to match your natural language description to the most relevant T-codes. It combines vector similarity search with GPT-powered ranking to find the best matches.',
  },
  {
    question: 'Are AI-suggested T-codes always accurate?',
    answer:
      'AI suggestions are ranked by confidence. Results marked with "AI Suggestion" are generated from SAP knowledge but not verified in our database. Always verify critical T-codes in your SAP system.',
  },
  {
    question: 'Where are my bookmarks stored?',
    answer:
      'Bookmarks are stored locally in your browser using localStorage. They are not synced across devices. Clearing your browser data will remove your bookmarks.',
  },
  {
    question: 'What does the confidence percentage mean?',
    answer:
      'The confidence score indicates how closely a T-code matches your query. Higher percentages mean a stronger match. For keyword search, it reflects text similarity. For AI search, it reflects semantic relevance.',
  },
  {
    question: 'Can I use TCodeAI for S/4HANA migration planning?',
    answer:
      'Yes. T-code detail pages show S/4HANA status and Fiori app alternatives when available. You can also browse the Fiori Apps page to see all available app-to-T-code mappings.',
  },
];
