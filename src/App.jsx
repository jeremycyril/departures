// App.jsx — Solari board integration
import { useState, useEffect } from "react";
import "./App_Board_Animated.css";

const PLACE_NAMES = new Set([
  "PARIS", "TOKYO", "SEOUL", "DOHA", "OSAKA", "LUZON", "PRATO", "PROVO", "KYOTO",
  "PUNE", "CAGAYAN", "HOBART", "LOMZA", "HANOI", "SUCRE", "SYDNEY", "DURBAN", "BAKU",
  "ROME", "BERLIN", "BOSTON", "DALLAS", "VIENNA", "MOSCOW", "MUNICH", "NAPLES",
  "OSLO", "ZURICH", "LAGOS", "JAKARTA"
]);

const START = "PARIS";
const END = "PROVO";
const MAX_RESETS = 3;
const MAX_GUESSES = 6;

const CLUES = [
  "City ranked among the most conservative in the U.S.",
  "Nicknamed 'The Garden City'",
  "Home to large faith-based university",
  "Fourth-largest city in Utah",
  "South of Salt Lake City, on Utah Lake"
];

const generateGibberish = (length) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let word = "";
  for (let i = 0; i < length; i++) {
    word += chars[Math.floor(Math.random() * chars.length)];
  }
  return word;
};

export default function NameChainGame() {
  const [dictionary, setDictionary] = useState(new Set());
  const [guesses, setGuesses] = useState([START]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [resets, setResets] = useState(0);
  const [unlockedLetters, setUnlockedLetters] = useState(new Set());
  const [clueIndex, setClueIndex] = useState(0);

  useEffect(() => {
    fetch("/words.txt")
      .then(res => res.text())
      .then(text => {
        const words = new Set(
          text.toUpperCase().split("\n").map(word => word.trim())
        );
        setDictionary(words);
      });
  }, []);

  const countNewLettersUsed = (a, b, unlocked) => {
    const aChars = new Set(a);
    const bChars = new Set(b);
    let count = 0;
    for (const char of bChars) {
      if (!aChars.has(char) && !unlocked.has(char)) {
        count++;
      }
    }
    return count;
  };

  const getDistance = (a, b) => {
    const aChars = a.split('').sort().join('');
    const bChars = b.split('').sort().join('');
    let distance = Math.abs(a.length - b.length);
    
    const minLength = Math.min(a.length, b.length);
    for (let i = 0; i < minLength; i++) {
      if (aChars[i] !== bChars[i]) {
        distance++;
      }
    }
    return distance;
  };

  const getLetterFeedback = (guess, answer) => {
    return guess.split('').map((char, i) => {
      if (char === answer[i]) return 'green';
      else if (answer.includes(char)) return 'yellow';
      else return 'gray';
    });
  };

  const handleSubmit = () => {
    const current = guesses[guesses.length - 1];
    const next = input.toUpperCase();

    if (next.length < 3 || next.length > 10) {
      setStatus(`Word must be 3-10 letters long`);
      return;
    }
    if (!dictionary.has(next)) {
      setStatus("Not in dictionary");
      return;
    }
    if (countNewLettersUsed(current, next, unlockedLetters) > 2) {
      setStatus("Too many new letters used! Only two new letters allowed unless reused");
      return;
    }

    const newGuesses = [...guesses, next];
    const previousDistance = getDistance(current, END);
    const newDistance = getDistance(next, END);

    let feedback = "";
    if (newDistance < previousDistance) feedback = "(Getting closer)";
    else if (newDistance > previousDistance) feedback = "(Getting farther)";
    else feedback = "(Same distance)";

    const feedbackColors = getLetterFeedback(next, END);
    const newUnlocked = new Set(unlockedLetters);
    next.split('').forEach((char, i) => {
      if (feedbackColors[i] === 'green' || feedbackColors[i] === 'yellow') {
        newUnlocked.add(char);
      }
    });

    setUnlockedLetters(newUnlocked);
    setGuesses(newGuesses);
    setInput("");

    if (next === END) {
      setStatus("🎉 You found the mystery place: " + END);
      setGameOver(true);
    } else if (newGuesses.length - 1 >= MAX_GUESSES || resets >= MAX_RESETS) {
      setGameOver(true);
      setStatus(`Out of guesses or resets! The mystery place was: ${END}`);
    } else {
      setStatus(feedback);
    }
  };

  const handleReset = () => {
    if (resets < MAX_RESETS) {
      setGuesses([START]);
      setResets(resets + 1);
      setUnlockedLetters(new Set());
      setClueIndex(0);
      setStatus("");
    } else {
      setStatus("No resets remaining");
    }
  };

  const revealNextClue = () => {
    if (clueIndex < CLUES.length) {
      setClueIndex(clueIndex + 1);
    }
  };

  const renderTiles = (word, feedback) => {
    return (
      <div className="board-word">
        {word.split('').map((char, i) => (
          <div 
            key={i} 
            className={`letter-tile flip ${feedback ? feedback[i] : 'gray'}`}
            style={{
              animationDelay: `${i * 0.2}s`
            }}
          >
            {char}
          </div>
        ))}
      </div>
    );
  };

  const renderSolariText = (text, columnIndex, rowIndex) => {
    const chars = text.toString().split('');
    return (
      <div className="solari-column">
        {chars.map((char, i) => (
          <div 
            key={`${rowIndex}-${columnIndex}-${i}-${char}`}
            className="letter-tile flip"
            style={{
              animationDelay: `${(columnIndex * 0.3) + (i * 0.1)}s`
            }}
          >
            {char}
          </div>
        ))}
      </div>
    );
  };

  const fullBoardRows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    const guess = guesses[i];
    const isActive = !!guess;
    const word = isActive ? guess : generateGibberish(5);
    const feedback = isActive ? getLetterFeedback(guess, END) : null;
    const signal = isActive ? getDistance(guess, END) : null;

    return (
      <div key={i} className="board-row">
        <div>{renderSolariText([...unlockedLetters].join(", ") || "—", 0, i)}</div>
        <div>{renderTiles(word, feedback)}</div>
        <div>{renderSolariText(isActive ? (guess === END ? "ARRIVED" : "EN ROUTE") : "WAITING", 2, i)}</div>
        <div>{renderSolariText(isActive && i === guesses.length - 1 && clueIndex > 0 ? CLUES[clueIndex - 1] : "—", 3, i)}</div>
        <div>{renderSolariText(isActive ? (signal <= 1 ? "FINAL APPR" : signal <= 3 ? "ON COURSE" : "OFF COURSE") : "STANDBY", 4, i)}</div>
      </div>
    );
  });

  return (
    <div className="main-flex">
      <div className="game-container">
        <header>
          <h1>🛫 DEPARTURES</h1>
          <p className="subhead">Reusable: {[...unlockedLetters].join(", ") || "—"} | Resets Left: {MAX_RESETS - resets}</p>
        </header>

        <div className="departure-board">
          <div className="board-row board-header">
            <div className="header-text">Reusable</div><div className="header-text">Guess</div><div className="header-text">Status</div><div className="header-text">Hint</div><div className="header-text">Progress</div>
          </div>
          {fullBoardRows}
        </div>

        {!gameOver && (
          <div className="input-zone">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter next stop..."
              className="input-box"
            />
            <button className="btn submit" onClick={handleSubmit}>Board</button>
            <button className="btn reset" onClick={handleReset}>Rebook</button>
            {clueIndex < CLUES.length && <button className="btn clue" onClick={revealNextClue}>Request Hint</button>}
          </div>
        )}

        {status && <p className="status-msg">{status}</p>}
      </div>
      <aside className="rules-box">
        <h2>How to Play</h2>
        <ul>
          <li>Welcome aboard your journey from {START} to your mystery destination</li>
		      <li> Please ensure each guess is a real word, 3–10 letters in length, before takeoff. </li>
	        <li>You are permitted to bring only 2 new letters per guess. All other letters must be recycled from previous flights.</li>
	        <li>Letters highlighted in green or yellow are now cleared for future travel—feel free to use them again.</li>
	        <li>You’ll have {MAX_GUESSES} guesses to reach your final destination, along with {MAX_RESETS} resets for unexpected turbulence.</li>
	        <li>Should you lose your way, hints will descend from the overhead compartment to assist you.</li>
          <li>Once you reach your destination, you can continue playing with new words or reset the game.</li>
          <li>Thank You for flying Departures Air</li>
        
        </ul>
      </aside>
    </div>
  );
}