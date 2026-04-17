import { Profile } from './types';

export function calculateCompatibility(profileA: Profile, profileB: Profile): number {
  let score = 0;
  let maxScore = 0;

  const weights = {
    agePreference: 3,
    sexPreference: 3,
    location: 2,
    bio: 2,
    ageDifference: 2,
  };

  maxScore += weights.agePreference * 2;
  const agePrefScore = calculateAgePreferenceScore(profileA, profileB);
  score += agePrefScore * weights.agePreference;

  maxScore += weights.sexPreference * 2;
  const sexPrefScore = calculateSexPreferenceScore(profileA, profileB);
  score += sexPrefScore * weights.sexPreference;

  maxScore += weights.location;
  if (profileA.location && profileB.location && profileA.location.toLowerCase() === profileB.location.toLowerCase()) {
    score += weights.location;
  }

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
  const aInBsRange = profileB.friendMinAge <= profileA.age && profileA.age <= profileB.friendMaxAge;
  const bInAsRange = profileA.friendMinAge <= profileB.age && profileB.age <= profileA.friendMaxAge;
  if (aInBsRange && bInAsRange) return 2;
  if (aInBsRange || bInAsRange) return 1;
  return 0;
}

function calculateSexPreferenceScore(profileA: Profile, profileB: Profile): number {
  return 1;
}

export function generateComparison(profileA: Profile, profileB: Profile) {
  return {
    displayName: { a: profileA.displayName, b: profileB.displayName },
    age: { a: profileA.age, b: profileB.age },
    location: { a: profileA.location, b: profileB.location },
    bio: { a: profileA.bio, b: profileB.bio },
    friendSex: { a: profileA.friendSex, b: profileB.friendSex },
    friendAgeRange: {
      a: `${profileA.friendMinAge}-${profileA.friendMaxAge}`,
      b: `${profileB.friendMinAge}-${profileB.friendMaxAge}`,
    },
    maxDistance: { a: profileA.maxDistance, b: profileB.maxDistance },
    ageDifference: Math.abs(profileA.age - profileB.age),
    bioOverlap: calculateBioOverlap(profileA.bio, profileB.bio),
  };
}

function calculateBioOverlap(bioA: string, bioB: string): number {
  if (!bioA || !bioB) return 0;
  const wordsA = new Set(bioA.toLowerCase().split(/\s+/));
  const wordsB = new Set(bioB.toLowerCase().split(/\s+/));
  return [...wordsA].filter(w => wordsB.has(w)).length;
}