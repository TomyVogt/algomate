'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getProfile, getMatchesForUser, createMatchWithMutualCheck, createMatch, updateMatchStatus, createFlag, getAllUsersWithProfiles, getMutualMatches } from '@/lib/db';
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
  const [mutualMatches, setMutualMatches] = useState<Match[]>([]);
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
  const [showMatchNotification, setShowMatchNotification] = useState(false);
  const [matchedWithName, setMatchedWithName] = useState('');
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

      const mutual = await getMutualMatches(payload.userId);
      setMutualMatches(mutual);
      setLoading(false);
    }
    load();
  }, [router]);

  async function loadNextComparison() {
    const remaining = allUsers.filter(u => {
      const hasMutual = mutualMatches.find(m => m.userA === u.id || m.userB === u.id);
      return !hasMutual;
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

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(async () => {
      const mutual = await getMutualMatches(userId);
      setMutualMatches(mutual);
    }, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  async function handleAction(action: 'match' | 'disregard' | 'decline') {
    if (!userId || !otherUserId || !score) return;
    setProcessing(true);

    if (action === 'match') {
      const { match, isMutual } = await createMatchWithMutualCheck(userId, otherUserId, score);
      if (isMutual) {
        setMatchedWithName(otherProfile?.displayName || 'User');
        setShowMatchNotification(true);
        setTimeout(() => setShowMatchNotification(false), 5000);
      }
    } else {
      const existing = matches.find(m => m.userA === otherUserId || m.userB === otherUserId);
      if (existing) {
        await updateMatchStatus(existing.id, userId, action);
      } else {
        await createMatch(userId, otherUserId, score);
      }
    }

    const updated = await getMatchesForUser(userId);
    setMatches(updated);
    const mutual = await getMutualMatches(userId);
    setMutualMatches(mutual);
    setOtherUserId(null);
    setOtherProfile(null);
    setScore(null);
    setComparison(null);
    const users = await getAllUsersWithProfiles(userId);
    setAllUsers(users);
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
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} unreadMessages={0} />
      <div className="container-main"><p>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} unreadMessages={0} />
      {showMatchNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <span>It's a match with <strong>{matchedWithName}</strong>! Check Messages to start chatting.</span>
          <button onClick={() => setShowMatchNotification(false)} className="ml-2 hover:opacity-80">×</button>
        </div>
      )}
      <div className="container-main max-w-2xl">
        <h1 className="headline text-3xl font-bold mb-2">Matching Playground</h1>
        <p className="mb-6" style={{ color: '#666' }}>See how you compare with others. Only when you both match, you connect.</p>

        {!otherProfile ? (
          <div className="card text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No more profiles to compare</h2>
            <p style={{ color: '#666' }}>Come back later when new people join!</p>
          </div>
        ) : (
          <div className="card">
            <div className="text-center mb-6">
              <div className="score-circle">{score?.toFixed(1)}</div>
              <p className="text-sm" style={{ color: '#666' }}>Compatibility Score</p>
            </div>

            {comparison && (
              <div className="comparison-grid">
                <div className="comparison-col">
                  <p className="font-bold mb-2" style={{ color: '#90c367' }}>You</p>
                  <p className="font-semibold">{comparison.displayName.a}</p>
                  <p className="text-sm mt-2" style={{ color: '#666' }}>{comparison.bio.a || 'No bio yet'}</p>
                </div>
                <div className="comparison-col">
                  <p className="font-bold mb-2" style={{ color: '#849fcf' }}>Them</p>
                  <p className="font-semibold">{comparison.displayName.b}</p>
                  <p className="text-sm mt-2" style={{ color: '#666' }}>{comparison.bio.b || 'No bio yet'}</p>
                </div>
              </div>
            )}

            {comparison && (
              <div className="shared-section">
                <p className="font-semibold mb-2">How you compare</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded" style={{ background: '#f3f4f6' }}>
                    <span className="font-medium">Distance:</span> {comparison.distance !== null ? `${comparison.distance} km` : 'Unknown'}
                  </div>
                  <div className="p-2 rounded" style={{ background: '#f3f4f6' }}>
                    <span className="font-medium">Bio Overlap:</span> {comparison.bioOverlap} words
                  </div>
                  <div className="p-2 rounded" style={{ background: '#f3f4f6' }}>
                    <span className="font-medium">Your Age Range:</span> {comparison.friendAgeRange.a}
                  </div>
                  <div className="p-2 rounded" style={{ background: '#f3f4f6' }}>
                    <span className="font-medium">Their Age Range:</span> {comparison.friendAgeRange.b}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <button className="btn-match" onClick={() => handleAction('match')} disabled={processing}>Match</button>
              <button className="btn-decline" onClick={() => handleAction('decline')} disabled={processing}>Decline</button>
              <button className="btn-secondary" onClick={() => handleAction('disregard')} disabled={processing}>Disregard</button>
            </div>

            {!flagging ? (
              <div className="text-center mt-4">
                <button className="text-sm underline" style={{ color: '#EF4444' }} onClick={() => setFlagging(true)}>
                  Flag as Dangerous
                </button>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #EF4444' }}>
                <p className="font-semibold mb-2" style={{ color: '#EF4444' }}>Why are you flagging this user?</p>
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