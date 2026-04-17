'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavProps {
  userRole?: string;
  newMutualMatches?: number;
}

export default function Nav({ userRole, newMutualMatches }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="font-bold text-lg">Algomate</Link>
      <div className="flex gap-2 ml-auto">
        <Link href="/profile" className={pathname === '/profile' ? 'nav-link-active' : 'nav-link'}>Profile</Link>
        <Link href="/matching-playground" className={pathname === '/matching-playground' ? 'nav-link-active' : 'nav-link'}>Playground</Link>
        <Link href="/messages" className={pathname === '/messages' ? 'nav-link-active' : 'nav-link'}>
          Messages
          {newMutualMatches && newMutualMatches > 0 && (
            <span className="ml-1 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{newMutualMatches}</span>
          )}
        </Link>
        {(userRole === 'admin' || userRole === 'mod') && (
          <Link href="/admin" className={pathname === '/admin' ? 'nav-link-active' : 'nav-link'}>Admin</Link>
        )}
      </div>
    </nav>
  );
}