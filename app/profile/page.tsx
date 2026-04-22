'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getProfile, updateProfile, deleteUser, getMutualMatches } from '@/lib/db';
import { Profile } from '@/lib/types';
import { geocodeSwissLocation } from '@/lib/geo';

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState(18);
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [friendSex, setFriendSex] = useState<Profile['friendSex']>('Male');
  const [friendMinAge, setFriendMinAge] = useState(18);
  const [friendMaxAge, setFriendMaxAge] = useState(99);
  const [maxDistance, setMaxDistance] = useState(150);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'searching' | 'found' | 'notfound'>('idle');
  const [mutualMatchCount, setMutualMatchCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const token = document.cookie.split(';').find(c => c.trim().startsWith('algomate_token='))?.split('=')[1];
      if (!token) { router.push('/login'); return; }
      const payload = await verifyToken(token);
      if (!payload) { router.push('/login'); return; }
      setUserId(payload.userId);
      setUserRole(payload.role);
      const data = await getProfile(payload.userId);
      const mutual = await getMutualMatches(payload.userId);
      setMutualMatchCount(mutual.length);
      if (data) {
        setDisplayName(data.displayName || '');
        setAge(data.age || 18);
        setBio(data.bio || '');
        setFriendSex(data.friendSex || 'Male');
        setFriendMinAge(data.friendMinAge || 18);
        setFriendMaxAge(data.friendMaxAge || 99);
        setMaxDistance(data.maxDistance || 150);
        if (data.latitude && data.longitude) {
          setLocation(data.location || '');
          setLocationCoords({ lat: data.latitude, lon: data.longitude });
          setLocationStatus('found');
        } else if (data.location) {
          setLocation(data.location);
          setLocationStatus('idle');
        }
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLocationChange(value: string) {
    setLocation(value);
    setLocationCoords(null);
    setLocationStatus('idle');

    if (!value.trim()) return;
    setLocationStatus('searching');
    const geo = await geocodeSwissLocation(value.trim());
    if (geo) {
      setLocationCoords({ lat: geo.latitude, lon: geo.longitude });
      setLocation(geo.name);
      setLocationStatus('found');
    } else {
      setLocationStatus('notfound');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!locationCoords) {
      setMessage('Please enter a valid Swiss location first');
      return;
    }
    setSaving(true);
    setMessage('');

    await updateProfile(userId, {
      displayName: displayName || 'Anonymous',
      age,
      location,
      latitude: locationCoords.lat,
      longitude: locationCoords.lon,
      bio,
      friendSex,
      friendMinAge,
      friendMaxAge,
      maxDistance,
    });

    setMessage('Profile saved with confirmed location: ' + location);
    setSaving(false);
  }

  async function handleDelete() {
    if (!userId) return;
    if (!confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
    await deleteUser(userId);
    document.cookie = 'algomate_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    router.push('/');
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
      <div className="container-main max-w-2xl">
        <div className="card">
          <h1 className="headline text-2xl font-bold mb-6">My Profile</h1>
          {message && <p className="success bg-emerald-50 p-3 rounded-lg mb-4">{message}</p>}
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="label">Display Name</label>
              <input type="text" className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="label">Age</label>
              <input type="number" className="input" value={age} onChange={e => setAge(parseInt(e.target.value) || 18)} min={13} max={120} />
            </div>
            <div className="form-group">
              <label className="label">Location (Swiss city or village)</label>
              <input
                type="text"
                className="input"
                value={location}
                onChange={e => handleLocationChange(e.target.value)}
                placeholder="Zurich, Bern, Geneva, Basel, etc."
              />
              {locationStatus === 'searching' && (
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Searching...</p>
              )}
              {locationStatus === 'found' && locationCoords && (
                <p className="text-sm mt-1" style={{ color: '#10B981' }}>
                  Found: {locationCoords.lat.toFixed(4)}, {locationCoords.lon.toFixed(4)}
                </p>
              )}
              {locationStatus === 'notfound' && (
                <p className="text-sm mt-1" style={{ color: '#EF4444' }}>Location not found — please check spelling</p>
              )}
            </div>
            <div className="form-group">
              <label className="label">Bio — Tell others about yourself</label>
              <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} rows={6} placeholder="I am passionate about..." />
            </div>
            <div className="form-group">
              <label className="label">Looking for friends who are:</label>
              <select className="input" value={friendSex} onChange={e => setFriendSex(e.target.value as Profile['friendSex'])}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Min Friend Age</label>
                <input type="number" className="input" value={friendMinAge} onChange={e => setFriendMinAge(parseInt(e.target.value) || 18)} min={13} max={120} />
              </div>
              <div className="form-group">
                <label className="label">Max Friend Age</label>
                <input type="number" className="input" value={friendMaxAge} onChange={e => setFriendMaxAge(parseInt(e.target.value) || 99)} min={13} max={120} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Max Distance (km)</label>
              <input type="number" className="input" value={maxDistance} onChange={e => setMaxDistance(parseInt(e.target.value) || 150)} min={1} max={50000} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving || locationStatus === 'searching'}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
        <div className="card border-2 mt-6" style={{ borderColor: '#EF4444', backgroundColor: '#fef2f2' }}>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#EF4444' }}>Danger Zone</h2>
          <p className="mb-4" style={{ color: '#666' }}>Permanently delete your account and all data.</p>
          <button className="btn-danger" onClick={handleDelete}>Delete My Account</button>
        </div>
      </div>
    </div>
  );
}