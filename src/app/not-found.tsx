import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-md text-center pt-20">
          <h1 className="mb-4 text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="mb-4 text-2xl font-bold">Page Not Found</h2>
          <p className="mb-8 text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
