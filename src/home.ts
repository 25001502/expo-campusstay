/** Presentation derived from the optional session profile; no identity is stored here. */
export function getHomeIdentity(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    title: words.length ? `Hey, ${words[0]}!` : 'Hey there!',
    initials: words.slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase(),
  };
}

export function getTimeGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
