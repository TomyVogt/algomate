'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getProfile, getMatchesForUser, createMatch, updateMatchStatus, createFlag, getAllUsersWithProfiles } from '@/lib/db';
import { calculateCompatibility, generateComparison } from '@/lib/compatibility';
import { Profile, Match } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function MatchingPlayground() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comparison, setComparison] = useState<ReturnType<typeof generateComparison> | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; profile: Profile }>>([]);
  const [flagging, setFlagging] = useState(false);
  const [flagComment, setFlagComment] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);
      setUserRole(payload.role);

      const profile = await getProfile(payload.userId);
      if (!profile || !profile.displayName) {
        router.push('/profile');
        return;
      }
      setMyProfile(profile);

      const users = await getAllUsersWithProfiles(payload.userId);
      setAllUsers(users);

      const userMatches = await getMatchesForUser(payload.userId);
      setMatches(userMatches);
      setLoading(false);
    }
    load();
  }, [router]);

  async function loadNextComparison() {
    const remaining = allUsers.filter(u => {
      const existing = matches.find(m => m.userA === u.id || m.userB === u.id);
      return !existing;
    });
    if (!remaining.length) { setOtherProfile(null); setScore(null); setComparison(null); return; }

    const next = remaining[0];
    setOtherProfile(next.profile);
    setOtherUserId(next.id);

    const s = calculateCompatibility(myProfile!, next.profile);
    setScore(s);
    setComparison(generateComparison(myProfile!, next.profile));
  }

  useEffect(() => {
    if (myProfile && allUsers.length) loadNextComparison();
  }, [myProfile, allUsers.length]);

  async function handleAction(action: 'match' | 'disregard' | 'decline') {
    if (!userId || !otherUserId || !score) return;
    setProcessing(true);

    const existing = matches.find(m => m.userA === otherUserId || m.userB === otherUserId);
    if (existing) {
      await updateMatchStatus(existing.id, userId, action);
    } else {
      await createMatch(userId, otherUserId, score);
    }

    const updated = await getMatchesForUser(userId);
    setMatches(updated);
    await loadNextComparison();
    setProcessing(false);
  }

  async function handleFlag() {
    if (!userId || !otherUserId || !flagComment.trim()) return;
    setFlagging(false);
    await createFlag(userId, otherUserId, flagComment.trim());
    setFlagComment('');
    await handleAction('decline');
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
      <div className="container-main max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Matching Playground</h1>
        <p className="text-gray-600 mb-6">See how you compare with others. Only when you both match, you connect.</p>

        {!otherProfile ? (
          <div className="card text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No more profiles to compare</h2>
            <p className="text-gray-500">Come back later when new people join!</p>
          </div>
        ) : (
          <div className="card">
            <div className="text-center mb-6">
              <div className="score-circle">{score?.toFixed(1)}</div>
              <p className="text-gray-500 text-sm">Compatibility Score</p>
            </div>

            {comparison && (
              <div className="comparison-grid">
                <div className="comparison-col">
                  <p className="font-bold text-violet-600 mb-2">You</p>
                  <p className="font-semibold">{comparison.displayName.a}</p>
                  <p className="text-sm text-gray-600">Age: {comparison.age.a}</p>
                  <p className="text-sm text-gray-600">{comparison.location.a || '—'}</p>
                  <p className="text-sm text-gray-600">Looking for: {comparison.lookingFor.a || '—'}</p>
                </div>
                <div className="comparison-col">
                  <p className="font-bold text-emerald-600 mb-2">Them</p>
                  <p className="font-semibold">{comparison.displayName.b}</p>
                  <p className="text-sm text-gray-600">Age: {comparison.age.b}</p>
                  <p className="text-sm text-gray-600">{comparison.location.b || '—'}</p>
                  <p className="text-sm text-gray-600">Looking for: {comparison.lookingFor.b || '—'}</p>
                </div>
              </div>
            )}

            {comparison && (comparison.sharedValues.length > 0 || comparison.sharedInterests.length > 0 || comparison.sharedHobbies.length > 0) && (
              <div className="shared-section">
                <p className="font-semibold text-indigo-700 mb-2">What you share</p>
                {comparison.sharedValues.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">Values: </span>
                    {comparison.sharedValues.map(v => <span key={v} className="tag bg-violet-100 text-violet-700">{v}</span>)}
                  </div>
                )}
                {comparison.sharedInterests.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">Interests: </span>
                    {comparison.sharedInterests.map(i => <span key={i} className="tag bg-emerald-100 text-emerald-700">{i}</span>)}
                  </div>
                )}
                {comparison.sharedHobbies.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Hobbies: </span>
                    {comparison.sharedHobbies.map(h => <span key={h} className="tag bg-amber-100 text-amber-700">{h}</span>)}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center mt-6">
              <button className="btn-match" onClick={() => handleAction('match')} disabled={processing}>Match</button>
              <button className="btn-decline" onClick={() => handleAction('decline')} disabled={processing}>Decline</button>
              <button className="btn-secondary" onClick={() => handleAction('disregard')} disabled={processing}>Disregard</button>
            </div>

            {!flagging ? (
              <div className="text-center mt-4">
                <button className="text-red-500 hover:text-red-700 text-sm hover:underline" onClick={() => setFlagging(true)}>
                  Flag as Dangerous
                </button>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-700 mb-2">Why are you flagging this user?</p>
                <textarea
                  className="input bg-white"
                  value={flagComment}
                  onChange={e => setFlagComment(e.target.value)}
                  placeholder="Please describe why this user is dangerous (required)"
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button className="btn-danger text-sm" onClick={handleFlag} disabled={!flagComment.trim()}>Submit Flag</button>
                  <button className="btn-secondary text-sm" onClick={() => { setFlagging(false); setFlagComment(''); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}