'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '@/lib/auth';
import { getProfile, getMatchesForUser, createMatch, updateMatchStatus, getUserById } from '@/lib/db';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);

      const profile = await getProfile(payload.userId);
      if (!profile || !profile.displayName) {
        router.push('/profile');
        return;
      }
      setMyProfile(profile);

      const { initDB } = await import('@/lib/db');
      const db = await initDB();
      const allUsersResult = db.exec('SELECT userId FROM profiles WHERE userId != ?', [payload.userId]);
      const users: Array<{ id: string; profile: Profile }> = [];
      if (allUsersResult.length) {
        for (const row of allUsersResult[0].values) {
          const uid = row[0] as string;
          const p = await getProfile(uid);
          if (p && p.displayName) users.push({ id: uid, profile: p });
        }
      }
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

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div>
      <nav className="nav container">
        <Link href="/">Algomate</Link>
        <Link href="/profile">My Profile</Link>
        <Link href="/matching-playground" className="active">Matching Playground</Link>
        <Link href="/messages">Messages</Link>
      </nav>
      <div className="container" style={{ maxWidth: '700px' }}>
        <h1>Matching Playground</h1>
        <p style={{ color: '#666', marginBottom: '24px' }}>See how you compare with others. Only when you both match, you connect.</p>

        {!otherProfile ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>No more profiles to compare</h2>
            <p style={{ color: '#666' }}>Come back later when new people join!</p>
          </div>
        ) : (
          <div className="card">
            <div style={{ textAlign: 'center' }}>
              <div className="score-circle">{score?.toFixed(1)}</div>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Compatibility Score</p>
            </div>

            {comparison && (
              <div className="comparison-grid">
                <div className="comparison-col">
                  <strong>You</strong>
                  <p>{comparison.displayName.a}</p>
                  <p>Age: {comparison.age.a}</p>
                  <p>Location: {comparison.location.a || '—'}</p>
                  <p>Looking for: {comparison.lookingFor.a || '—'}</p>
                </div>
                <div className="comparison-col">
                  <strong>Them</strong>
                  <p>{comparison.displayName.b}</p>
                  <p>Age: {comparison.age.b}</p>
                  <p>Location: {comparison.location.b || '—'}</p>
                  <p>Looking for: {comparison.lookingFor.b || '—'}</p>
                </div>
              </div>
            )}

            {comparison && (comparison.sharedValues.length > 0 || comparison.sharedInterests.length > 0 || comparison.sharedHobbies.length > 0) && (
              <div className="shared-section">
                <strong>Shared Values</strong>
                <div style={{ marginTop: '8px' }}>
                  {comparison.sharedValues.map(v => <span key={v} className="tag">{v}</span>)}
                </div>
                {comparison.sharedInterests.length > 0 && (
                  <>
                    <strong style={{ display: 'block', marginTop: '12px' }}>Shared Interests</strong>
                    <div style={{ marginTop: '8px' }}>
                      {comparison.sharedInterests.map(i => <span key={i} className="tag">{i}</span>)}
                    </div>
                  </>
                )}
                {comparison.sharedHobbies.length > 0 && (
                  <>
                    <strong style={{ display: 'block', marginTop: '12px' }}>Shared Hobbies</strong>
                    <div style={{ marginTop: '8px' }}>
                      {comparison.sharedHobbies.map(h => <span key={h} className="tag">{h}</span>)}
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn-match" onClick={() => handleAction('match')} disabled={processing}>Match</button>
              <button className="btn-decline" onClick={() => handleAction('decline')} disabled={processing}>Decline</button>
              <button className="btn-secondary" onClick={() => handleAction('disregard')} disabled={processing}>Disregard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
