// puzzles.js — Puzzle data for Departures
// Each puzzle defines a start word, destination, clues, and timezone

const PUZZLES = [
  {
    id: 1,
    start: "PARIS",
    end: "PROVO",
    clues: [
      "City ranked among the most conservative in the U.S.",
      "Nicknamed 'The Garden City'",
      "Home to large faith-based university",
      "Fourth-largest city in Utah",
      "South of Salt Lake City, on Utah Lake"
    ],
    timezone: "America/Denver"
  },
  {
    id: 2,
    start: "ROME",
    end: "ISTANBUL",
    clues: [
      "City that has been capital of three empires",
      "Spans two continents",
      "Famous for its Grand Bazaar",
      "Formerly known as Constantinople",
      "Largest city in Turkey"
    ],
    timezone: "Europe/Istanbul"
  },
  {
    id: 3,
    start: "LIMA",
    end: "STOCKHOLM",
    clues: [
      "City built on fourteen islands",
      "Home to a famous annual prize ceremony",
      "Known for its old town, Gamla Stan",
      "Capital of a Scandinavian country",
      "Largest city in Sweden"
    ],
    timezone: "Europe/Stockholm"
  }
];

// Get puzzle by index (for daily rotation, use date-based index)
export const getPuzzleByIndex = (index) => {
  return PUZZLES[index % PUZZLES.length];
};

// Get today's puzzle based on date
export const getDailyPuzzle = () => {
  const today = new Date();
  const epoch = new Date(2026, 0, 1); // Jan 1 2026
  const daysSinceEpoch = Math.floor((today - epoch) / (1000 * 60 * 60 * 24));
  return PUZZLES[daysSinceEpoch % PUZZLES.length];
};

export default PUZZLES;
