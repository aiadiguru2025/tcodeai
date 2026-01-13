import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

export default function ModuleNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-4 text-4xl font-bold">Module Not Found</h1>
          <p className="mb-8 text-muted-foreground">
            The SAP module you&apos;re looking for doesn&apos;t exist or has no transaction codes.
          </p>
          <Button asChild>
            <Link href="/modules">Browse All Modules</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
