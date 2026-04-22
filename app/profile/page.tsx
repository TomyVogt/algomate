'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { verifyToken } from '@/lib/auth';
import { getProfile, updateProfile, deleteUser, getMutualMatches, getTotalUnreadCount } from '@/lib/db';
import { Profile } from '@/lib/types';
import { geocodeSwissLocation } from '@/lib/geo';

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState(18);
  const [gender, setGender] = useState<'male' | 'female' | 'nonbinary'>('male');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'specific'>('all');
  const [friendMinAge, setFriendMinAge] = useState(18);
  const [friendMaxAge, setFriendMaxAge] = useState(99);
  const [distanceFilter, setDistanceFilter] = useState<'all' | 'specific'>('all');
  const [maxDistance, setMaxDistance] = useState(150);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'searching' | 'found' | 'notfound'>('idle');
  const [mutualMatchCount, setMutualMatchCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
      const unread = await getTotalUnreadCount(payload.userId);
      setUnreadMessages(unread);
      if (data) {
        setDisplayName(data.displayName || '');
        setAge(data.age || 18);
        setGender((data as any).gender || 'male');
        setBio(data.bio || '');
        if ('genderFilter' in data) {
          setGenderFilter(data.genderFilter || 'all');
        } else if (data.friendSex === 'Male') {
          setGenderFilter('male');
        } else if (data.friendSex === 'Female') {
          setGenderFilter('female');
        } else {
          setGenderFilter('all');
        }
        if ('ageFilter' in data) {
          setAgeFilter(data.ageFilter || 'all');
        } else {
          setAgeFilter('all');
        }
        setFriendMinAge(data.friendMinAge || 18);
        setFriendMaxAge(data.friendMaxAge || 99);
        if ('distanceFilter' in data) {
          setDistanceFilter(data.distanceFilter || 'all');
        } else {
          setDistanceFilter('all');
        }
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
      gender,
      location,
      latitude: locationCoords.lat,
      longitude: locationCoords.lon,
      bio,
      genderFilter,
      ageFilter,
      friendMinAge,
      friendMaxAge,
      distanceFilter,
      maxDistance,
    });

    setMessage('Profile saved with confirmed location: ' + location);
    setSaving(false);
    setSaved(true);
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
      <Nav userRole={userRole} unreadMessages={unreadMessages} />
      <div className="container-main"><p>Loading...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Nav userRole={userRole} unreadMessages={unreadMessages} />
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
              <label className="label">I am</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className="px-4 py-2 rounded-l-lg font-medium text-sm"
                  style={{
                    backgroundColor: gender === 'male' ? 'var(--color-primary)' : '#e5e7eb',
                    color: gender === 'male' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (gender === 'male' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (gender === 'male' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (gender === 'male' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid ' + (gender === 'male' ? 'var(--color-primary)' : '#d1d5db'),
                  }}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className="px-4 py-2 font-medium text-sm"
                  style={{
                    backgroundColor: gender === 'female' ? 'var(--color-primary)' : '#e5e7eb',
                    color: gender === 'female' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (gender === 'female' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (gender === 'female' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (gender === 'female' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid transparent',
                  }}
                >
                  Female
                </button>
                <button
                  type="button"
                  onClick={() => setGender('nonbinary')}
                  className="px-4 py-2 rounded-r-lg font-medium text-sm"
                  style={{
                    backgroundColor: gender === 'nonbinary' ? 'var(--color-primary)' : '#e5e7eb',
                    color: gender === 'nonbinary' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (gender === 'nonbinary' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (gender === 'nonbinary' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (gender === 'nonbinary' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid transparent',
                  }}
                >
                  Non-binary
                </button>
              </div>
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
              <label className="label">Age preference</label>
              <div className="flex gap-1 items-center flex-wrap">
                <button
                  type="button"
                  onClick={() => setAgeFilter('all')}
                  className="px-4 py-2 rounded-l-lg font-medium text-sm"
                  style={{
                    backgroundColor: ageFilter === 'all' ? 'var(--color-primary)' : '#e5e7eb',
                    color: ageFilter === 'all' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (ageFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (ageFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (ageFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid ' + (ageFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                  }}
                >
                  Any age
                </button>
                <button
                  type="button"
                  onClick={() => setAgeFilter('specific')}
                  className="px-4 py-2 rounded-r-lg font-medium text-sm"
                  style={{
                    backgroundColor: ageFilter === 'specific' ? 'var(--color-primary)' : '#e5e7eb',
                    color: ageFilter === 'specific' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (ageFilter === 'specific' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (ageFilter === 'specific' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (ageFilter === 'specific' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid transparent',
                  }}
                >
                  Specific age group
                </button>
                {ageFilter === 'specific' && (
                  <div className="flex gap-1 items-center ml-2">
                    <span className="text-sm">Min</span>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '70px', height: '32px' }}
                      value={friendMinAge}
                      onChange={e => setFriendMinAge(parseInt(e.target.value) || 18)}
                      min={13}
                      max={120}
                    />
                    <span className="text-sm ml-2">Max</span>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '70px', height: '32px' }}
                      value={friendMaxAge}
                      onChange={e => setFriendMaxAge(parseInt(e.target.value) || 99)}
                      min={13}
                      max={120}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="label">Gender preference</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  className="px-4 py-2 rounded-l-lg font-medium text-sm"
                  style={{
                    backgroundColor: genderFilter === 'all' ? 'var(--color-primary)' : '#e5e7eb',
                    color: genderFilter === 'all' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (genderFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (genderFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (genderFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid ' + (genderFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                  }}
                >
                  Any gender
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('male')}
                  className="px-4 py-2 font-medium text-sm"
                  style={{
                    backgroundColor: genderFilter === 'male' ? 'var(--color-primary)' : '#e5e7eb',
                    color: genderFilter === 'male' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (genderFilter === 'male' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (genderFilter === 'male' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (genderFilter === 'male' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid transparent',
                  }}
                >
                  Males only
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('female')}
                  className="px-4 py-2 rounded-r-lg font-medium text-sm"
                  style={{
                    backgroundColor: genderFilter === 'female' ? 'var(--color-primary)' : '#e5e7eb',
                    color: genderFilter === 'female' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (genderFilter === 'female' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (genderFilter === 'female' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (genderFilter === 'female' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid transparent',
                  }}
                >
                  Females only
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Distance preference</label>
              <div className="flex gap-1 items-center flex-wrap">
                <button
                  type="button"
                  onClick={() => setDistanceFilter('all')}
                  className="px-4 py-2 rounded-l-lg font-medium text-sm"
                  style={{
                    backgroundColor: distanceFilter === 'all' ? 'var(--color-primary)' : '#e5e7eb',
                    color: distanceFilter === 'all' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (distanceFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (distanceFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (distanceFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid ' + (distanceFilter === 'all' ? 'var(--color-primary)' : '#d1d5db'),
                  }}
                >
                  Any distance
                </button>
                <button
                  type="button"
                  onClick={() => setDistanceFilter('specific')}
                  className="px-4 py-2 rounded-r-lg font-medium text-sm"
                  style={{
                    backgroundColor: distanceFilter === 'specific' ? 'var(--color-primary)' : '#e5e7eb',
                    color: distanceFilter === 'specific' ? 'white' : '#374151',
                    borderTop: '1px solid ' + (distanceFilter === 'specific' ? 'var(--color-primary)' : '#d1d5db'),
                    borderRight: '1px solid ' + (distanceFilter === 'specific' ? 'var(--color-primary)' : '#d1d5db'),
                    borderBottom: '1px solid ' + (distanceFilter === 'specific' ? 'var(--color-primary)' : '#d1d5db'),
                    borderLeft: '1px solid transparent',
                  }}
                >
                  Maximum distance
                </button>
                {distanceFilter === 'specific' && (
                  <div className="flex gap-1 items-center ml-2">
                    <span className="text-sm">Max</span>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '100px', height: '32px' }}
                      value={maxDistance}
                      onChange={e => setMaxDistance(parseInt(e.target.value) || 50)}
                      min={1}
                      max={50000}
                    />
                    <span className="text-sm">km</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving || locationStatus === 'searching'}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              {saved && (
                <Link href="/matching-playground">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      animation: 'fadeIn 0.5s ease-out',
                      opacity: 1,
                    }}
                  >
                    Visit Playground
                  </button>
                </Link>
              )}
            </div>
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