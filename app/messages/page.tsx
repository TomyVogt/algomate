'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getMutualMatches, getMessages, sendMessage, getProfile, revealProfile, createFlag, getUserById } from '@/lib/db';
import { Match, Message, Profile, User } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

interface EnrichedMatch extends Match {
  otherProfile?: Profile;
  otherUser?: User;
}

export default function Messages() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [reporting, setReporting] = useState(false);
  const [reportComment, setReportComment] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadMatches = async (uid: string) => {
    const mutual = await getMutualMatches(uid);
    const enriched: EnrichedMatch[] = await Promise.all(
      mutual.map(async (m) => {
        const otherId = m.userA === uid ? m.userB : m.userA;
        const prof = await getProfile(otherId);
        const user = await getUserById(otherId);
        return { ...m, otherProfile: prof || undefined, otherUser: user || undefined };
      })
    );
    setMatches(enriched);
    return enriched;
  };

  useEffect(() => {
    async function load() {
      const token = getCookie('algomate_token');
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);
      setUserRole(payload.role);

      await loadMatches(payload.userId);
      setLoading(false);
    }
    load();
  }, [router]);

  async function selectMatch(matchId: string) {
    setSelected(matchId);
    setReportSent(false);
    setReportComment('');
    const msgs = await getMessages(matchId);
    setMessages(msgs);
  }

  useEffect(() => {
    if (selected) {
      const interval = setInterval(async () => {
        const msgs = await getMessages(selected);
        setMessages(msgs);
        if (userId) {
          await loadMatches(userId);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selected, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !userId || !newMessage.trim()) return;
    await sendMessage(selected, userId, newMessage.trim());
    const msgs = await getMessages(selected);
    setMessages(msgs);
    setNewMessage('');
  }

  async function handleRevealProfile() {
    if (!selected || !userId) return;
    setRevealing(true);
    await revealProfile(selected, userId);
    const enriched = await loadMatches(userId);
    setSelected(enriched.find(m => m.id === selected)?.id || null);
    setRevealing(false);
  }

  async function handleReport() {
    if (!selected || !userId) return;
    const match = matches.find(m => m.id === selected);
    if (!match) return;
    const otherId = match.userA === userId ? match.userB : match.userA;
    if (reportComment.trim().length < 50) return;
    await createFlag(userId, otherId, reportComment.trim());
    setReportSent(true);
    setReporting(false);
    setReportComment('');
  }

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} newMutualMatches={matches.length} />
      <div className="container-main"><p>Loading...</p></div>
    </div>
  );

  const currentMatch = matches.find(m => m.id === selected);
  const bothRevealed = currentMatch?.profileRevealedA && currentMatch?.profileRevealedB;
  const iRevealed = currentMatch ? (currentMatch.userA === userId ? currentMatch.profileRevealedA : currentMatch.profileRevealedB) : false;

  return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} newMutualMatches={matches.length} />
      <div className="container-main">
        <h1 className="headline text-3xl font-bold mb-6">Messages</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ height: '70vh' }}>
          <div className="card overflow-y-auto">
            {matches.length === 0 && <p style={{ color: '#666' }}>No mutual matches yet. Go to the Matching Playground!</p>}
            {matches.map(m => {
              const matchBothRevealed = m.profileRevealedA && m.profileRevealedB;
              const matchIRevealed = m.userA === userId ? m.profileRevealedA : m.profileRevealedB;
              return (
                <div
                  key={m.id}
                  onClick={() => selectMatch(m.id)}
                  className="p-3 rounded-lg cursor-pointer mb-1 transition-colors"
                  style={{ background: selected === m.id ? '#dbeafe' : 'transparent' }}
                >
                  <p className="font-semibold">{m.otherProfile?.displayName || 'Loading...'}</p>
                  <p className="text-xs mt-1" style={{ color: '#666' }}>
                    {matchBothRevealed ? '✓ Profiles revealed' : matchIRevealed ? '✓ You revealed yours' : '🔒 Profiles hidden'}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="card md:col-span-3 flex flex-col">
            {!selected ? (
              <p className="text-center mt-12" style={{ color: '#666' }}>Select a conversation to start chatting</p>
            ) : (
              <>
                {currentMatch?.otherProfile && (
                  <div className="pb-4 mb-4 p-4 rounded-lg" style={{ borderBottom: '1px solid #e5e5e5', background: '#849fcf' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-lg" style={{ color: 'white' }}>{currentMatch.otherProfile.displayName}</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {currentMatch.otherProfile.location && `${currentMatch.otherProfile.location} · `}
                          Age {currentMatch.otherProfile.age}
                        </p>
                        {currentMatch.otherProfile.bio && (
                          <p className="text-sm mt-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.9)' }}>{currentMatch.otherProfile.bio}</p>
                        )}
                      </div>
                      {!iRevealed && (
                        <button className="btn-primary text-sm ml-3" onClick={handleRevealProfile} disabled={revealing}>
                          {revealing ? 'Revealing...' : 'Disclose Full Profile'}
                        </button>
                      )}
                    </div>
                    {!bothRevealed && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
                        {!iRevealed ? (
                          <p className="text-sm">You have not revealed your profile yet. Once you both reveal, you will see each other&apos;s full profiles.</p>
                        ) : (
                          <p className="text-sm">Waiting for the other person to reveal their profile...</p>
                        )}
                      </div>
                    )}
                    {bothRevealed && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: '#dcfce7' }}>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="font-medium">Bio:</span> {currentMatch.otherProfile.bio || 'No bio'}</div>
                          <div><span className="font-medium">Looking for:</span> {currentMatch.otherProfile.friendSex} friends, age {currentMatch.otherProfile.friendMinAge}-{currentMatch.otherProfile.friendMaxAge}</div>
                          <div><span className="font-medium">Location:</span> {currentMatch.otherProfile.location || 'Unknown'}</div>
                          <div><span className="font-medium">Max Distance:</span> {currentMatch.otherProfile.maxDistance} km</div>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      {!reporting && !reportSent && (
                        <button
                          className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                          style={{ borderColor: '#EF4444', color: '#EF4444' }}
                          onClick={() => setReporting(true)}
                        >
                          Report
                        </button>
                      )}
                      {reportSent && (
                        <span className="text-sm" style={{ color: '#10B981' }}>✓ Report sent to admin</span>
                      )}
                    </div>
                    {reporting && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #EF4444' }}>
                        <p className="text-sm font-medium mb-2" style={{ color: '#EF4444' }}>Report this user (min 50 characters)</p>
                        <textarea
                          className="input bg-white w-full"
                          value={reportComment}
                          onChange={e => setReportComment(e.target.value)}
                          placeholder="Describe why you are reporting this user..."
                          rows={3}
                        />
                        <p className="text-xs mt-1" style={{ color: '#666' }}>{reportComment.length}/50 characters minimum</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="btn-danger text-sm"
                            onClick={handleReport}
                            disabled={reportComment.trim().length < 50}
                          >
                            Send Report
                          </button>
                          <button
                            className="btn-secondary text-sm"
                            onClick={() => { setReporting(false); setReportComment(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-sm" style={{ color: '#666' }}>No messages yet. Say hello!</p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className="flex" style={{ justifyContent: msg.senderId === userId ? 'flex-end' : 'flex-start' }}>
                      <span className="inline-block px-4 py-2 rounded-xl max-w-xs" style={{ background: msg.senderId === userId ? '#90c367' : '#e5e5e5', color: msg.senderId === userId ? 'white' : '#111' }}>
                        {msg.content}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                  />
                  <button type="submit" className="btn-primary">Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}