'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getFlags, resolveFlag, getProfile } from '@/lib/db';
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Nav userRole={userRole} />
      <div className="container-main"><p className="text-gray-500">Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav userRole={userRole} />
      <div className="container-main">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Panel — {userRole === 'admin' ? 'Administrator' : 'Moderator'}
        </h1>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Flagged Users</h2>
          {flags.length === 0 && (
            <div className="text-center py-8">
              <p className="text-emerald-600 text-lg">✓ Community is doing great!</p>
              <p className="text-gray-500 mt-1">No flagged users at the moment.</p>
            </div>
          )}
          {flags.map(flag => (
            <div key={flag.id} className="border-2 border-red-200 rounded-lg p-4 mb-4 bg-red-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-lg text-red-700">
                    {flag.reportedProfile?.displayName || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-600">Reported by: {flag.reporterProfile?.displayName || 'Unknown'}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(flag.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="bg-white p-3 rounded border border-red-100 mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Reason for flag:</p>
                <p className="text-gray-800">{flag.comment}</p>
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