export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 animate-page-fade-in">{children}</div>;
}
