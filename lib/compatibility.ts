import { Profile } from './types';
import { calculateDistance } from './geo';
import { buildConcreteMatchSummary } from './match-summary';

export { buildConcreteMatchSummary };

export function calculateCompatibility(profileA: Profile, profileB: Profile): number {
  let score = 0;
  let maxScore = 0;

  const weights = {
    agePreference: 3,
    sexPreference: 3,
    distance: 3,
    bio: 2,
    ageDifference: 2,
  };

  maxScore += weights.agePreference * 2;
  const agePrefScore = calculateAgePreferenceScore(profileA, profileB);
  score += agePrefScore * weights.agePreference;

  maxScore += weights.sexPreference * 2;
  const sexPrefScore = calculateSexPreferenceScore(profileA, profileB);
  score += sexPrefScore * weights.sexPreference;

  maxScore += weights.distance;
  const distanceScore = calculateDistanceScore(profileA, profileB);
  score += distanceScore * weights.distance;

  maxScore += weights.bio;
  if (profileA.bio && profileB.bio) {
    const bioWordsA = new Set(profileA.bio.toLowerCase().split(/\s+/));
    const bioWordsB = new Set(profileB.bio.toLowerCase().split(/\s+/));
    const bioOverlap = [...bioWordsA].filter(w => bioWordsB.has(w)).length;
    const bioScore = Math.min(bioOverlap / 5, 1);
    score += bioScore * weights.bio;
  }

  maxScore += weights.ageDifference;
  const ageDiff = Math.abs(profileA.age - profileB.age);
  const ageScore = Math.max(0, 1 - ageDiff / 30);
  score += ageScore * weights.ageDifference;

  const normalized = maxScore > 0 ? (score / maxScore) * 10 : 0;
  return Math.round(normalized * 10) / 10;
}

function calculateAgePreferenceScore(profileA: Profile, profileB: Profile): number {
  if (profileA.ageFilter !== 'specific' && profileB.ageFilter !== 'specific') return 2;
  if (profileA.ageFilter !== 'specific' || profileB.ageFilter !== 'specific') return 1;
  const aInBsRange = profileB.friendMinAge <= profileA.age && profileA.age <= profileB.friendMaxAge;
  const bInAsRange = profileA.friendMinAge <= profileB.age && profileB.age <= profileA.friendMaxAge;
  if (aInBsRange && bInAsRange) return 2;
  if (aInBsRange || bInAsRange) return 1;
  return 0;
}

export function shouldAppearInPlayground(myProfile: Profile, otherProfile: Profile): boolean {
  if (myProfile.genderFilter === 'male' && otherProfile.gender !== 'male') {
    return false;
  }
  if (myProfile.genderFilter === 'female' && otherProfile.gender !== 'female') {
    return false;
  }

  if (myProfile.ageFilter === 'specific') {
    if (otherProfile.age < myProfile.friendMinAge || otherProfile.age > myProfile.friendMaxAge) {
      return false;
    }
  }

  if (myProfile.distanceFilter === 'specific' && myProfile.latitude && myProfile.longitude && otherProfile.latitude && otherProfile.longitude) {
    const distance = calculateDistance(myProfile.latitude, myProfile.longitude, otherProfile.latitude, otherProfile.longitude);
    if (distance > myProfile.maxDistance) return false;
  }

  return true;
}

function calculateSexPreferenceScore(profileA: Profile, profileB: Profile): number {
  if (profileA.genderFilter === 'all' || profileB.genderFilter === 'all') return 2;
  if (profileA.gender === profileB.gender) return 2;
  return 0;
}

function calculateDistanceScore(profileA: Profile, profileB: Profile): number {
  if (!profileA.latitude || !profileA.longitude || !profileB.latitude || !profileB.longitude) {
    return 1;
  }

  const distance = calculateDistance(
    profileA.latitude,
    profileA.longitude,
    profileB.latitude,
    profileB.longitude
  );

  const maxDist = Math.min(profileA.maxDistance, profileB.maxDistance);

  if (distance <= maxDist) return 2;
  if (distance <= maxDist * 2) return 1;
  return 0;
}

export function generateComparison(profileA: Profile, profileB: Profile) {
  let distance: number | null = null;

  if (profileA.latitude && profileA.longitude && profileB.latitude && profileB.longitude) {
    distance = calculateDistance(
      profileA.latitude,
      profileA.longitude,
      profileB.latitude,
      profileB.longitude
    );
  }

  const matchSummary = buildConcreteMatchSummary({
    bioA: profileA.bio || '',
    bioB: profileB.bio || '',
    nameA: profileA.displayName,
    nameB: profileB.displayName,
    distanceKm: distance,
  });

  return {
    displayName: { a: profileA.displayName, b: profileB.displayName },
    age: { a: profileA.age, b: profileB.age },
    location: { a: profileA.location, b: profileB.location },
    bio: { a: profileA.bio, b: profileB.bio },
    gender: { a: profileA.gender, b: profileB.gender },
    genderFilter: { a: profileA.genderFilter, b: profileB.genderFilter },
    friendAgeRange: {
      a: profileA.ageFilter === 'all' ? 'Any age' : `${profileA.friendMinAge}-${profileA.friendMaxAge}`,
      b: profileB.ageFilter === 'all' ? 'Any age' : `${profileB.friendMinAge}-${profileB.friendMaxAge}`,
    },
    distanceFilter: { a: profileA.distanceFilter, b: profileB.distanceFilter },
    maxDistance: { a: profileA.maxDistance, b: profileB.maxDistance },
    ageDifference: Math.abs(profileA.age - profileB.age),
    bioOverlap: calculateBioOverlap(profileA.bio, profileB.bio),
    distance,
    matchSummary,
  };
}

function calculateBioOverlap(bioA: string, bioB: string): number {
  if (!bioA || !bioB) return 0;
  const wordsA = new Set(bioA.toLowerCase().split(/\s+/));
  const wordsB = new Set(bioB.toLowerCase().split(/\s+/));
  return [...wordsA].filter(w => wordsB.has(w)).length;
}