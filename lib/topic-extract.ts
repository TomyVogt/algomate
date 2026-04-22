const TOPIC_BANKS: Record<string, string[]> = {
  nightlife: ['nightlife', 'night life', 'night-life', 'going out', 'clubbing', 'clubs', 'party', 'parties', 'bars', 'bar hopping', 'pub', 'pubs'],
  cafe: ['cafe', 'café', 'coffee shop', 'coffee shops', 'tea', 'tea house', 'cafes', 'cafés'],
  outdoor: ['hiking', 'nature', 'mountains', 'forest', 'beach', 'camping', 'trail', 'trails', 'outdoors', 'outdoor', 'adventure', 'adventures', 'travel', 'backpacking'],
  fitness: ['gym', 'workout', 'fitness', 'running', 'yoga', 'sports', 'exercise', 'training', 'fit', 'active', 'athlete', 'sport'],
  foodie: ['foodie', 'food', 'restaurants', 'restaurant', 'cooking', 'baking', 'chef', 'sushi', 'ramen', 'brunch', 'dinner', 'lunch', 'breakfast', 'eating', 'eater', 'cuisine'],
  movies: ['movies', 'movie', 'cinema', 'film', 'films', 'netflix', 'hollywood', 'actor', 'actress', 'director', 'watching movies', 'watch'],
  music: ['music', 'concert', 'concerts', 'gig', 'gigs', 'festival', 'festivals', 'spotify', 'playlist', 'band', 'bands', 'singer', 'listening', 'listen', 'playing music'],
  gaming: ['gaming', 'games', 'video games', 'videogames', 'gamer', 'gamers', 'pc gaming', 'console', 'playstation', 'xbox', 'nintendo', 'steam', 'esports'],
  tech: ['tech', 'technology', 'coding', 'programming', 'developer', 'ai', 'gadget', 'gadgets', 'software', 'hardware', 'startup', 'geek', 'nerd'],
  books: ['books', 'book', 'reading', 'read', 'novels', 'literature', 'library', 'author', 'authors', 'kindle', 'bookworm', 'bookworms'],
  creative: ['creative', 'art', 'artist', 'design', 'photography', 'drawing', 'painting', 'writing', 'music', 'craft', 'crafts', 'maker', 'diy'],
  social: ['social', 'friends', 'friend', 'people', 'community', 'socializing', 'hang out', 'hanging out', 'chill', 'vibes', 'meetup'],
  career: ['career', 'work', 'job', 'profession', 'business', 'entrepreneur', 'startup', 'office', 'remote', 'wfh'],
  family: ['family', 'kids', 'children', 'parent', 'parents', 'mom', 'dad', 'siblings', 'sibling', 'brother', 'sister'],
  pets: ['pets', 'pet', 'dog', 'dogs', 'cat', 'cats', 'animal', 'animals', 'puppy', 'puppies', 'kitten', 'kittens'],
  sports: ['sports', 'sport', 'football', 'soccer', 'basketball', 'tennis', 'baseball', 'running', 'swimming', 'cycling', 'marathon'],
  movies_tv: ['tv', 'tv shows', 'shows', 'series', 'netflix', 'hulu', 'amazon prime', 'disney+', 'streaming', 'binge'],
  gaming_videogames: ['video games', 'videogames', 'gamer', 'pc', 'ps5', 'xbox', 'switch', 'steam', 'gaming'],
  outdoors_hiking: ['hiking', 'trail', 'trails', 'hike', 'mountains', 'nature walk', 'nature walks'],
  travel_adventure: ['travel', 'traveling', 'travelling', 'trip', 'trips', 'backpacking', 'adventure', 'explore', 'exploring', 'wanderlust', 'world', 'countries'],
  food_dining: ['food', 'foodie', 'restaurants', 'dining', 'eating out', 'brunch', 'dinner', 'lunch', 'cuisine'],
  music_concerts: ['concerts', 'concert', 'festival', 'festivals', 'live music', 'gigs', 'gig'],
  books_reading: ['reading', 'books', 'book', 'novel', 'novels', 'read', 'author'],
  creative_art: ['art', 'artist', 'creative', 'design', 'photography', 'drawing', 'painting', 'craft'],
  drinks: ['drinks', 'drinking', 'beer', 'wine', 'cocktail', 'cocktails', 'bar', 'bars', 'pub', 'pubs', 'brewery', 'coffee', 'tea', 'cafe'],
  smoking: ['smoking', 'smoker', 'cigarette', 'cigarettes', 'vape', 'vaping', 'hookah', 'weed', 'marijuana', 'cannabis'],
  politics: ['politics', 'political', 'democrat', 'republican', 'liberal', 'conservative', 'election', 'government', 'policy'],
  spirituality: ['spiritual', 'spirituality', 'religion', 'religious', 'faith', 'church', 'meditation', 'mindfulness', 'buddhism', 'christian', 'jewish', 'muslim', 'hindu'],
  mental_health: ['mental health', 'therapy', 'therapist', 'anxiety', 'depression', 'self-care', 'wellness', 'mental wellness'],
  education: ['education', 'college', 'university', 'school', 'student', 'studying', 'degree', 'graduate', 'learning', 'curious', 'curiosity'],
  music_genres: ['rock', 'pop', 'hip hop', 'hiphop', 'rap', 'jazz', 'classical', 'electronic', 'edm', 'techno', 'house', 'metal', 'indie', 'country', 'r&b', 'soul', 'blues', 'reggae'],
  movie_genres: ['comedy', 'comedies', 'horror', 'thriller', 'action', 'drama', 'romance', 'romantic', 'sci-fi', 'scifi', 'fantasy', 'documentary', 'animation', 'animated'],
  tv_genres: ['drama', 'comedy', 'sitcom', 'thriller', 'horror', 'reality tv', 'reality', 'documentary', 'docu-series', 'anime', 'cartoon', 'kids shows'],
  diet: ['vegan', 'vegetarian', 'pescatarian', 'keto', 'paleo', 'organic', 'gluten-free', 'gluten free', 'dairy-free', 'allergy', 'intolerance', 'diet', 'eating'],
  lifestyle: ['minimalist', 'minimalism', 'simple living', 'sustainable', 'eco-friendly', 'green', 'environment', 'frugal', 'simple', 'minimal'],
  introversion: ['introvert', 'introverted', 'quiet', 'reserved', 'shy', 'solitude', 'alone time', 'recharge', 'lowkey', 'chill'],
  extroversion: ['extrovert', 'extroverted', 'outgoing', 'social', 'people person', 'party', 'networking', 'mingle', 'mingling'],
};

function normalizeTopic(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function findTopics(text: string, banks: Record<string, string[]>): string[] {
  const normalized = normalizeTopic(text);
  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(banks)) {
    for (const kw of keywords) {
      if (normalized.includes(normalizeTopic(kw))) {
        if (!found.includes(topic)) found.push(topic);
        break;
      }
    }
  }
  return found;
}

export function extractConcreteTopics(bio: string, maxTopics = 12): string[] {
  const raw = bio || '';
  const topics = findTopics(raw, TOPIC_BANKS);
  return topics.slice(0, maxTopics);
}

export function jaccardList(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let intersection = 0;
  for (let i = 0; i < a.length; i++) {
    if (setB.has(a[i])) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}
