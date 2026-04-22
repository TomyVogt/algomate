export type TopicPreference = {
  topic: string;
  score: number;
};

function extractTopicPreferences(bio: string, topics: string[], maxPrefs = 8): TopicPreference[] {
  const prefs: TopicPreference[] = [];
  const bioLower = (bio || '').toLowerCase();

  for (const topic of topics) {
    if (prefs.length >= maxPrefs) break;

    const topicLower = topic.toLowerCase();
    const idx = bioLower.indexOf(topicLower);

    if (idx === -1) {
      prefs.push({ topic, score: 0 });
      continue;
    }

    const windowStart = Math.max(0, idx - 30);
    const windowEnd = Math.min(bioLower.length, idx + topicLower.length + 30);
    const window = bioLower.slice(windowStart, windowEnd);

    let score = 0;

    if (/\b(love|obsessed|passionate|die\s*hard|fanatic)\b/.test(window)) {
      score = 2;
    } else if (/\b(like|enjoy|into|prefer|keen|eager)\b/.test(window)) {
      score = 1;
    }

    if (/\b(hate|despise|can'?t\s*stand|cannot\s*stand|avoid|loathe)\b/.test(window)) {
      score = -2;
    } else if (/\b(not\s*into|don'?t\s*like|do\s*not\s*like|avoid|prefer\s*not)\b/.test(window)) {
      score = -1;
    }

    prefs.push({ topic, score });
  }

  return prefs;
}

export { extractTopicPreferences };
