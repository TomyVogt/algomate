import { Profile } from './types';

export function calculateCompatibility(profileA: Profile, profileB: Profile): number {
  let score = 0;
  let maxScore = 0;

  const weights = {
    values: 4,
    interests: 3,
    hobbies: 3,
    lookingFor: 2,
    location: 1,
    bio: 2,
    age: 1,
  };

  maxScore += weights.values * 2;
  const valuesMatch = countMatches(profileA.values, profileB.values);
  score += valuesMatch * weights.values;

  maxScore += weights.interests * 2;
  const interestsMatch = countMatches(profileA.interests, profileB.interests);
  score += interestsMatch * weights.interests;

  maxScore += weights.hobbies * 2;
  const hobbiesMatch = countMatches(profileA.hobbies, profileB.hobbies);
  score += hobbiesMatch * weights.hobbies;

  maxScore += weights.lookingFor;
  if (profileA.lookingFor === profileB.lookingFor) score += weights.lookingFor;

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

  maxScore += weights.age;
  const ageDiff = Math.abs(profileA.age - profileB.age);
  const ageScore = Math.max(0, 1 - ageDiff / 30);
  score += ageScore * weights.age;

  const normalized = maxScore > 0 ? (score / maxScore) * 10 : 0;
  return Math.round(normalized * 10) / 10;
}

function countMatches(arr1: string[], arr2: string[]): number {
  if (!arr1.length || !arr2.length) return 0;
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  return arr1.filter(s => set2.has(s.toLowerCase())).length;
}

export function generateComparison(profileA: Profile, profileB: Profile) {
  return {
    displayName: { a: profileA.displayName, b: profileB.displayName },
    age: { a: profileA.age, b: profileB.age },
    location: { a: profileA.location, b: profileB.location },
    lookingFor: { a: profileA.lookingFor, b: profileB.lookingFor },
    bio: { a: profileA.bio, b: profileB.bio },
    sharedValues: profileA.values.filter(v => profileB.values.map(vv => vv.toLowerCase()).includes(v.toLowerCase())),
    sharedInterests: profileA.interests.filter(i => profileB.interests.map(ii => ii.toLowerCase()).includes(i.toLowerCase())),
    sharedHobbies: profileA.hobbies.filter(h => profileB.hobbies.map(hh => hh.toLowerCase()).includes(h.toLowerCase())),
    uniqueToA: {
      values: profileA.values.filter(v => !profileB.values.map(vv => vv.toLowerCase()).includes(v.toLowerCase())),
      interests: profileA.interests.filter(i => !profileB.interests.map(ii => ii.toLowerCase()).includes(i.toLowerCase())),
      hobbies: profileA.hobbies.filter(h => !profileB.hobbies.map(hh => hh.toLowerCase()).includes(h.toLowerCase())),
    },
    uniqueToB: {
      values: profileB.values.filter(v => !profileA.values.map(vv => vv.toLowerCase()).includes(v.toLowerCase())),
      interests: profileB.interests.filter(i => !profileA.interests.map(ii => ii.toLowerCase()).includes(i.toLowerCase())),
      hobbies: profileB.hobbies.filter(h => !profileA.hobbies.map(hh => hh.toLowerCase()).includes(h.toLowerCase())),
    },
  };
}
