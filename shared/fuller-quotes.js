// Buckminster Fuller, in his own published words. Only quotes traced to the
// book they appear in; many lines attributed to him online are not his.
export const FULLER_QUOTES = Object.freeze([
  {text: 'We are all astronauts.', source: 'Operating Manual for Spaceship Earth, 1969'},
  {text: 'Now there is one outstandingly important fact regarding Spaceship Earth, and that is that no instruction book came with it.', source: 'Operating Manual for Spaceship Earth, 1969'},
  {text: 'I seem to be a verb.', source: 'I Seem to Be a Verb, 1970'},
  {text: 'Dare to be naïve.', source: 'Synergetics, 1975'}
]);
// One quote a day, the same all day, so it changes once in a while.
export const quoteOfTheDay = (date = new Date()) =>
  FULLER_QUOTES[Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) % FULLER_QUOTES.length];
