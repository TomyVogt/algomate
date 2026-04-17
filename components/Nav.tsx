'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavProps {
  userRole?: string;
}

export default function Nav({ userRole }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="font-bold text-lg">Algomate</Link>
      <div className="flex gap-2 ml-auto">
        <Link href="/profile" className={pathname === '/profile' ? 'nav-link-active' : 'nav-link'}>Profile</Link>
        <Link href="/matching-playground" className={pathname === '/matching-playground' ? 'nav-link-active' : 'nav-link'}>Playground</Link>
        <Link href="/messages" className={pathname === '/messages' ? 'nav-link-active' : 'nav-link'}>Messages</Link>
        {(userRole === 'admin' || userRole === 'mod') && (
          <Link href="/admin" className={pathname === '/admin' ? 'nav-link-active' : 'nav-link'}>Admin</Link>
        )}
      </div>
    </nav>
  );
}