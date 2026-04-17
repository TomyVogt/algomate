'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getMutualMatches, getMessages, sendMessage, getProfile, revealProfile, createFlag, getUserById, getUnreadCount, markMessagesAsRead } from '@/lib/db';
import { Match, Message, Profile, User } from '@/lib/types';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

interface EnrichedMatch extends Match {
  otherProfile?: Profile;
  otherUser?: User;
  unreadCount?: number;
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
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadMatches = async (uid: string) => {
    const mutual = await getMutualMatches(uid);
    const enriched: EnrichedMatch[] = await Promise.all(
      mutual.map(async (m) => {
        const otherId = m.userA === uid ? m.userB : m.userA;
        const prof = await getProfile(otherId);
        const user = await getUserById(otherId);
        const unread = await getUnreadCount(m.id, uid);
        return { ...m, otherProfile: prof || undefined, otherUser: user || undefined, unreadCount: unread };
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
    setShowProfileInfo(false);
    const msgs = await getMessages(matchId);
    setMessages(msgs);
    if (userId) {
      await markMessagesAsRead(matchId, userId);
      await loadMatches(userId);
    }
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
      <Nav userRole={userRole} unreadMessages={matches.reduce((sum, m) => sum + (m.unreadCount || 0), 0)} />
      <div className="container-main"><p>Loading...</p></div>
    </div>
  );

  const currentMatch = matches.find(m => m.id === selected);
  const bothRevealed = currentMatch?.profileRevealedA && currentMatch?.profileRevealedB;
  const iRevealed = currentMatch ? (currentMatch.userA === userId ? currentMatch.profileRevealedA : currentMatch.profileRevealedB) : false;

  return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} unreadMessages={matches.reduce((sum, m) => sum + (m.unreadCount || 0), 0)} />
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
                  className="p-3 rounded-lg cursor-pointer mb-1 transition-colors flex justify-between items-center"
                  style={{ background: selected === m.id ? '#dbeafe' : 'transparent' }}
                >
                  <div>
                    <p className="font-semibold">{m.otherProfile?.displayName || 'Loading...'}</p>
                    <p className="text-xs mt-1" style={{ color: '#666' }}>
                      {matchBothRevealed ? '✓ Profiles revealed' : matchIRevealed ? '✓ You revealed yours' : '🔒 Profiles hidden'}
                    </p>
                  </div>
                  {m.unreadCount && m.unreadCount > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-xs font-bold min-w-6 flex items-center justify-center" style={{ background: '#f97316', color: 'white' }}>
                      {m.unreadCount > 99 ? '99+' : m.unreadCount}
                    </span>
                  )}
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
                  <div className="p-3 flex flex-col" style={{ background: '#90c367' }}>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <p className="font-bold text-lg" style={{ color: 'white' }}>{currentMatch.otherProfile.displayName}</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {currentMatch.otherProfile.location && `${currentMatch.otherProfile.location} · `}
                          Age {currentMatch.otherProfile.age}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!iRevealed && (
                          <button className="text-xs px-3 py-2 rounded-lg font-medium" onClick={handleRevealProfile} disabled={revealing} style={{ background: 'white', color: '#166534' }}>
                            {revealing ? 'Revealing...' : 'Disclose Full Profile'}
                          </button>
                        )}
                        {bothRevealed && (
                          <span className="text-xs" style={{ color: 'white' }}>✓ Profiles Shared</span>
                        )}
                        {!bothRevealed && iRevealed && (
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Waiting...</span>
                        )}
                        {!reporting && !reportSent && (
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            style={{ borderColor: 'white', color: 'white', background: 'transparent' }}
                            onClick={() => setReporting(true)}
                          >
                            Report
                          </button>
                        )}
                        {reportSent && (
                          <span className="text-xs" style={{ color: 'white' }}>✓ Sent</span>
                        )}
                      </div>
                    </div>
                    {reporting && (
                      <div className="mt-3 p-3 rounded text-xs" style={{ background: '#fef2f2', border: '1px solid #EF4444' }}>
                        <p className="mb-1 font-medium" style={{ color: '#EF4444' }}>Report (50+ chars):</p>
                        <textarea
                          className="input bg-white w-full text-xs"
                          value={reportComment}
                          onChange={e => setReportComment(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-1 mt-1">
                          <button className="btn-danger text-xs" onClick={handleReport} disabled={reportComment.trim().length < 50}>Send</button>
                          <button className="btn-secondary text-xs" onClick={() => { setReporting(false); setReportComment(''); }}>×</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 flex flex-col">
                  {bothRevealed && (
                    <div className="p-3 border-b cursor-pointer hover:bg-gray-50" style={{ borderColor: '#e5e5e5' }} onClick={() => setShowProfileInfo(!showProfileInfo)}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium" style={{ color: '#166534' }}>Full Profile Info</span>
                        <span style={{ color: '#666' }}>{showProfileInfo ? '▲' : '▼'}</span>
                      </div>
                      {showProfileInfo && (
                        <div className="mt-2 p-3 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Bio:</span> {currentMatch.otherProfile?.bio || 'No bio'}</div>
                            <div><span className="font-medium">Looking for:</span> {currentMatch.otherProfile?.friendSex} friends, age {currentMatch.otherProfile?.friendMinAge}-{currentMatch.otherProfile?.friendMaxAge}</div>
                            <div><span className="font-medium">Location:</span> {currentMatch.otherProfile?.location || 'Unknown'}</div>
                            <div><span className="font-medium">Max Distance:</span> {currentMatch.otherProfile?.maxDistance} km</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                  <form onSubmit={handleSend} className="p-4 border-t" style={{ borderColor: '#e5e5e5' }}>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                      />
                      <button type="submit" className="btn-primary">Send</button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}