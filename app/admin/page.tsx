'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getFlags, resolveFlag, getProfile, getMutualMatches } from '@/lib/db';
import { Flag, Profile } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

interface EnrichedFlag extends Flag {
  reporterProfile?: Profile;
  reportedProfile?: Profile;
}

export default function Admin() {
  const [flags, setFlags] = useState<EnrichedFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [mutualMatchCount, setMutualMatchCount] = useState(0);
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
      const mutual = await getMutualMatches(payload.userId);
      setMutualMatchCount(mutual.length);
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

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} unreadMessages={0} />
      <div className="container-main"><p>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} unreadMessages={0} />
      <div className="container-main">
        <h1 className="headline text-3xl font-bold mb-2">
          Admin Panel — {userRole === 'admin' ? 'Administrator' : 'Moderator'}
        </h1>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Flagged Users</h2>
          {flags.length === 0 && (
            <div className="text-center py-8">
              <p className="text-lg" style={{ color: '#10B981' }}>✓ Community is doing great!</p>
              <p className="mt-1" style={{ color: '#666' }}>No flagged users at the moment.</p>
            </div>
          )}
          {flags.map(flag => (
            <div key={flag.id} className="rounded-lg p-4 mb-4" style={{ background: '#fef2f2', border: '2px solid #EF4444' }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-lg" style={{ color: '#EF4444' }}>
                    {flag.reportedProfile?.displayName || 'Unknown User'}
                  </p>
                  <p className="text-sm" style={{ color: '#666' }}>Reported by: {flag.reporterProfile?.displayName || 'Unknown'}</p>
                </div>
                <span className="text-xs" style={{ color: '#999' }}>
                  {new Date(flag.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3 rounded bg-white mb-3" style={{ border: '1px solid #fecaca' }}>
                <p className="text-sm font-medium mb-1">Reason for flag:</p>
                <p>{flag.comment}</p>
              </div>
              <button className="btn-secondary text-sm" onClick={() => handleResolve(flag.id)}>
                Mark Resolved
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}