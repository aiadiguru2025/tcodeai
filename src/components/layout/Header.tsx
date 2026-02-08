'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Bookmark, AppWindow, HelpCircle } from 'lucide-react';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">
              <span className="text-primary">TCode</span>AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm" aria-label="Main navigation">
            <Link
              href="/modules"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Modules
            </Link>
            <Link
              href="/fiori"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Fiori Apps
            </Link>
            <Link
              href="/bookmarks"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Bookmarks
            </Link>
            <Link
              href="/help"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Help
            </Link>
            <Link
              href="/about"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fiori Apps"
            className="min-h-[44px] min-w-[44px]"
            asChild
          >
            <Link href="/fiori">
              <AppWindow className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bookmarks"
            className="min-h-[44px] min-w-[44px]"
            asChild
          >
            <Link href="/bookmarks">
              <Bookmark className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Help"
            className="min-h-[44px] min-w-[44px]"
            asChild
          >
            <Link href="/help">
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[44px] min-w-[44px]"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
