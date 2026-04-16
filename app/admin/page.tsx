'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import { getFlags, resolveFlag, getProfile } from '@/lib/db';
import { Flag, Profile } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Admin() {
  const [flags, setFlags] = useState<(Flag & { reporterProfile?: Profile; reportedProfile?: Profile })>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload || (payload.role !== 'admin' && payload.role !== 'mod')) {
        router.push('/');
        return;
      }
      setUserRole(payload.role);

      const flagsData = await getFlags();
      const enriched = await Promise.all(
        flagsData.map(async (f) => {
          const reporterProfile = await getProfile(f.reporterId);
          const reportedProfile = await getProfile(f.reportedUserId);
          return { ...f, reporterProfile: reporterProfile || undefined, reportedProfile: reportedProfile || undefined };
        })
      );
      setFlags(enriched);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleResolve(flagId: string) {
    await resolveFlag(flagId);
    setFlags(flags.filter(f => f.id !== flagId));
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div>
      <nav className="nav container">
        <Link href="/">Algomate</Link>
        <Link href="/profile">My Profile</Link>
        <Link href="/matching-playground">Matching Playground</Link>
        <Link href="/messages">Messages</Link>
        <Link href="/admin" className="active">Admin Panel</Link>
      </nav>
      <div className="container">
        <h1>Admin Panel — {userRole === 'admin' ? 'Administrator' : 'Moderator'}</h1>
        <div className="card">
          <h2>Flagged Users</h2>
          {flags.length === 0 && <p style={{ color: '#666' }}>No flagged users. Community is doing great!</p>}
          {flags.map(flag => (
            <div key={flag.id} style={{ border: '1px solid #e74c3c', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <p><strong>Reported User:</strong> {flag.reportedProfile?.displayName || flag.reportedUserId}</p>
              <p><strong>Reported by:</strong> {flag.reporterProfile?.displayName || flag.reporterId}</p>
              <p><strong>Reason:</strong> {flag.comment}</p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>Flagged on {new Date(flag.createdAt).toLocaleDateString()}</p>
              <button className="btn-secondary" style={{ marginTop: '12px' }} onClick={() => handleResolve(flag.id)}>Mark Resolved</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
