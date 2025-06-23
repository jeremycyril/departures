// App.jsx — Solari board integration
import { useState, useEffect } from "react";
import "./App_Board_Animated.css";

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

const getLocalTime = (destination) => {
  // Get current time in destination's timezone
  const timeZones = {
    'PROVO': 'America/Denver', // Mountain Time
    'PARIS': 'Europe/Paris',
    // Add more destinations as needed
  };
  
  const timeZone = timeZones[destination] || 'America/Denver';
  const now = new Date();
  
  return now.toLocaleString('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
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
  const [showRules, setShowRules] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(true);
  const [showHintDisplay, setShowHintDisplay] = useState(false);
  const [showRulesHover, setShowRulesHover] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const MAX_HINTS = 5;

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

  // All columns now use uniform 5-letter width - no dynamic adjustment needed

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
      const localTime = getLocalTime(END);
      setStatus(`ARRIVED AT ${END}\nLOCAL TIME: ${localTime}\n\nOn behalf of the captain and crew, we want to thank you for flying Departure Air. We hope to see you again soon.`);
      setGameOver(true);
    } else if (newGuesses.length - 1 >= MAX_GUESSES || resets >= MAX_RESETS) {
      setGameOver(true);
      setStatus(`FLIGHT TERMINATED\nThe mystery destination was: ${END}\n\nThank you for flying Departure Air.`);
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
    if (clueIndex < CLUES.length && hintsUsed < MAX_HINTS) {
      setClueIndex(clueIndex + 1);
      setHintsUsed(hintsUsed + 1);
      setCurrentHint(CLUES[clueIndex]);
      // Auto-hide hint display after 8 seconds
      setTimeout(() => setShowHintDisplay(false), 8000);
    }
  };


  const renderAlignedTiles = (reusable, word, feedback, status, progress, rowIndex) => {
    return (
      <>
        {/* CARRY ON Section */}
        <div className="column-section reusable-column" data-column="reusable">
          {reusable.split('').map((char, i) => (
            <div 
              key={`${rowIndex}-reusable-${i}`}
              className="letter-tile flip reusable-section"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {char}
            </div>
          ))}
        </div>

        {/* Blank spacer tile between CARRY ON and GUESS */}
        <div 
          key={`${rowIndex}-spacer-1`}
          className="letter-tile flip blank-tile"
          style={{ animationDelay: `${5 * 0.05}s` }}
        >
          {' '}
        </div>

        {/* GUESS Section */}
        <div className="column-section guess-column" data-column="guess">
          {word.split('').map((char, i) => (
            <div 
              key={`${rowIndex}-word-${i}`}
              className={`letter-tile flip ${feedback ? feedback[i] : 'gray'}`}
              style={{ animationDelay: `${(10 + i) * 0.05}s` }}
            >
              {char}
            </div>
          ))}
        </div>

        {/* Blank spacer tile between GUESS and STATUS */}
        <div 
          key={`${rowIndex}-spacer-2`}
          className="letter-tile flip blank-tile"
          style={{ animationDelay: `${15 * 0.05}s` }}
        >
          {' '}
        </div>

        {/* STATUS Section */}
        <div className="column-section status-column" data-column="status">
          {status.split('').map((char, i) => (
            <div 
              key={`${rowIndex}-status-${i}`}
              className="letter-tile flip status-section"
              style={{ animationDelay: `${(20 + i) * 0.05}s` }}
            >
              {char}
            </div>
          ))}
        </div>

        {/* Blank spacer tile between STATUS and PROGRESS */}
        <div 
          key={`${rowIndex}-spacer-3`}
          className="letter-tile flip blank-tile"
          style={{ animationDelay: `${25 * 0.05}s` }}
        >
          {' '}
        </div>

        {/* PROGRESS Section */}
        <div className="column-section progress-column" data-column="progress">
          {progress.split('').map((char, i) => (
            <div 
              key={`${rowIndex}-progress-${i}`}
              className="letter-tile flip progress-section"
              style={{ animationDelay: `${(30 + i) * 0.05}s` }}
            >
              {char}
            </div>
          ))}
        </div>
      </>
    );
  };

  const fullBoardRows = Array.from({ length: MAX_GUESSES }, (_, i) => {
    const guess = guesses[i];
    const isActive = !!guess;
    const word = isActive ? guess.padEnd(5, " ") : generateGibberish(5);
    const feedback = isActive ? getLetterFeedback(guess, END) : null;
    const signal = isActive ? getDistance(guess, END) : null;

    // Format reusable letters to max 5 characters
    const reusableLetters = [...unlockedLetters];
    const reusableText = reusableLetters.length > 0 
      ? reusableLetters.slice(0, 5).join("").padEnd(5, " ") 
      : "-----";
    
    // 5-letter status words
    let statusText = "READY"; // default
    if (isActive) {
      if (guess === END) statusText = "FINAL";
      else if (i === guesses.length - 1) statusText = "ROUTE";
      else statusText = "BOARD";
    } else if (gameOver) {
      statusText = "FINAL";
    }
    
    // 5-letter progress words
    let progressText = "START"; // default
    if (isActive) {
      if (guess === END) progressText = "FOUND";
      else if (signal <= 1) progressText = "CLOSE";
      else if (signal <= 3) progressText = "TRACK";
      else progressText = "STUCK";
    }

    return (
      <div key={i} className="board-row">
        {renderAlignedTiles(reusableText, word, feedback, statusText, progressText, i)}
      </div>
    );
  });

  return (
    <div className="main-flex">
      <div className="game-container">
        <header>
          <div className="header-title-row">
            <h1> 🛄 DEPARTURES </h1>
            <button 
              className="help-icon"
              onMouseEnter={() => setShowRulesHover(true)}
              onMouseLeave={() => setShowRulesHover(false)}
              onClick={() => setShowRules(true)}
            >
              ℹ️
            </button>
            {showRulesHover && (
              <div className="help-hover">
                <h3>How to Play</h3>
                <p>Click for instructions</p>
              </div>
            )}
          </div>
          <p className="subhead"> Rebooks Left: {MAX_RESETS - resets}</p>
        </header>

        <div className="departure-board">
          <div className="board-header">
            <div className="header-column reusable-header">CARRY ON</div>
            <div className="header-column guess-header">GUESS</div>
            <div className="header-column status-header">STATUS</div>
            <div className="header-column progress-header">PROGRESS</div>
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
          </div>
        )}
        
        {/* Boarding Pass Hint Button */}
        {!gameOver && (
          <div className="hint-button-container">
            <button 
              className="hint-button boarding-pass"
              onClick={revealNextClue}
              disabled={hintsUsed >= MAX_HINTS || clueIndex >= CLUES.length}
            >
              <div className="boarding-pass-content">
                <div className="boarding-pass-icon">🎫</div>
                <div className="boarding-pass-text">HINT</div>
                <div className="hint-lights">
                  {Array.from({ length: MAX_HINTS }, (_, i) => (
                    <div 
                      key={i} 
                      className={`hint-light ${i < hintsUsed ? 'used' : 'available'}`}
                    >
                    </div>
                  ))}
                </div>
              </div>
            </button>
          </div>
        )}

        {status && <p className="status-msg">{status}</p>}

        {/* Hint Display */}
        {showHint && currentHint && (
          <div className="hint-overlay">
            <div className="hint-popup">
              <div className="hint-header">✈️ FLIGHT HINT</div>
              <div className="hint-content">{currentHint}</div>
              <button className="hint-close" onClick={() => setShowHint(false)}>×</button>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Side Hint Panel */}
      {!gameOver && (
        <div className="hint-panel">
          <button 
            className="hint-button boarding-pass"
            onClick={() => {
              revealNextClue();
              setShowHintDisplay(true);
            }}
            disabled={hintsUsed >= MAX_HINTS || clueIndex >= CLUES.length}
          >
            <div className="boarding-pass-content">
              <div className="boarding-pass-icon">🎫</div>
              <div className="boarding-pass-text">HINT</div>
              <div className="hint-lights">
                {Array.from({ length: MAX_HINTS }, (_, i) => (
                  <div 
                    key={i} 
                    className={`hint-light ${i < hintsUsed ? 'used' : 'available'}`}
                  >
                  </div>
                ))}
              </div>
            </div>
          </button>
          
          {showHintDisplay && currentHint && (
            <div className="hint-display-panel">
              <div className="hint-display-header">✈️ FLIGHT HINT</div>
              <div className="hint-display-content">{currentHint}</div>
              <button className="hint-display-close" onClick={() => setShowHintDisplay(false)}>×</button>
            </div>
          )}
        </div>
      )}
      
      {/* Quick Start Guide */}
      {showQuickStart && (
        <div className="rules-modal-overlay" onClick={() => setShowQuickStart(false)}>
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowQuickStart(false)}>×</button>
            <aside className="rules-box">
              <h2>Welcome to DEPARTURES</h2>
              <p><strong>Find the mystery destination starting from {START} in 6 guesses!</strong></p>
              <ul>
                <li>Each guess must be a real word (3-10 letters)</li>
                <li>Only 2 new letters per guess - reuse previous letters</li>
                <li>🟢 Green = correct position, 🟡 Yellow = wrong position</li>
                <li>3 resets and 5 hints available</li>
              </ul>
              <p><em>Click anywhere to start your journey!</em></p>
            </aside>
          </div>
        </div>
      )}
      
      {showRules && (
        <div className="rules-modal-overlay" onClick={() => setShowRules(false)}>
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowRules(false)}>×</button>
            <aside className="rules-box">
              <h2>Flight Plan</h2>
              <p>Welcome aboard your journey from {START} to your mystery destination.</p>
              
              <h3>Pre-Flight Instructions</h3>
              <ul>
                <li>Each guess must be a real word (3-10 letters) to clear for takeoff</li>
                <li>You may board with only 2 new letters per flight - all other letters must come from your previous journeys</li>
                <li>There are {MAX_GUESSES} flights available to reach your final destination</li>
              </ul>
              
              <h3>In-Flight Services</h3>
              <ul>
                <li>{MAX_RESETS} resets available for unexpected turbulence</li>
                <li>Should you lose your way, 5 complimentary hints are available with your call button</li>
              </ul>
              
              <h3>Cabin Crew Signals</h3>
              <ul>
                <li>🟢 Letter secured in correct position</li>
                <li>🟡 Letter in transit (right letter, wrong position)</li>
                <li>⬜ Letter left at departure gate (not in destination)</li>
              </ul>
              
              <p>Letters highlighted in 🟢 green or 🟡 yellow are your carry-on items, feel free to use them again.</p>
              
              <p><em>Thank You for flying Departures Air</em></p>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}