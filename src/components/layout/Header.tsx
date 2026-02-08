'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sun, Moon, Bookmark, AppWindow, HelpCircle, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/modules', label: 'Modules' },
  { href: '/fiori', label: 'Fiori Apps' },
  { href: '/bookmarks', label: 'Bookmarks' },
  { href: '/help', label: 'Help' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    function updateCount() {
      try {
        const tcodes = JSON.parse(localStorage.getItem('tcodeai_bookmarks') || '[]');
        const fiori = JSON.parse(localStorage.getItem('tcodeai_fiori_bookmarks') || '[]');
        setBookmarkCount(tcodes.length + fiori.length);
      } catch {
        setBookmarkCount(0);
      }
    }
    updateCount();
    window.addEventListener('storage', updateCount);
    return () => window.removeEventListener('storage', updateCount);
  }, []);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function navLinkClass(href: string) {
    return cn(
      'transition-colors',
      isActive(href)
        ? 'text-foreground font-medium'
        : 'text-muted-foreground hover:text-foreground'
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          {/* Mobile hamburger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden min-h-[44px] min-w-[44px] mr-2"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <span className="text-primary">TCode</span>AI
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile navigation">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm transition-colors min-h-[44px] flex items-center',
                      isActive(href)
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                    {...(isActive(href) ? { 'aria-current': 'page' as const } : {})}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">
              <span className="text-primary">TCode</span>AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm" aria-label="Main navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={navLinkClass(href)}
                {...(isActive(href) ? { 'aria-current': 'page' as const } : {})}
              >
                {label}
              </Link>
            ))}
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
            aria-label={`Bookmarks${bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}`}
            className="min-h-[44px] min-w-[44px] relative"
            asChild
          >
            <Link href="/bookmarks">
              <Bookmark className="h-5 w-5" aria-hidden="true" />
              {bookmarkCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {bookmarkCount > 99 ? '99+' : bookmarkCount}
                </span>
              )}
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
