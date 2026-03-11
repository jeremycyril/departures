import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const START = "PARIS";
const END = "PROVO";
const MAX_RESETS = 3;
const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

const CLUES = [
  "City ranked among the most conservative in the U.S.",
  "Nicknamed 'The Garden City'",
  "Home to large faith-based university",
  "Fourth-largest city in Utah",
  "South of Salt Lake City, on Utah Lake",
];

const getLocalTime = (destination) => {
  const timeZones = {
    PROVO: "America/Denver",
    PARIS: "Europe/Paris",
  };
  const timeZone = timeZones[destination] || "America/Denver";
  const now = new Date();
  return now.toLocaleString("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    weekday: "long",
    month: "long",
    day: "numeric",
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
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedClues, setRevealedClues] = useState([]);
  const inputRef = useRef(null);
  const MAX_HINTS = 5;

  useEffect(() => {
    fetch("/words.txt")
      .then((res) => res.text())
      .then((text) => {
        const words = new Set(
          text
            .toUpperCase()
            .split("\n")
            .map((word) => word.trim())
        );
        setDictionary(words);
      });
  }, []);

  // Focus the hidden input on mount and whenever game state changes
  useEffect(() => {
    if (!gameOver && !showRules && !showQuickStart) {
      inputRef.current?.focus();
    }
  }, [gameOver, showRules, showQuickStart, guesses]);

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
    const aChars = a.split("").sort().join("");
    const bChars = b.split("").sort().join("");
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
    return guess.split("").map((char, i) => {
      if (char === answer[i]) return "correct";
      else if (answer.includes(char)) return "present";
      else return "absent";
    });
  };

  const handleSubmit = useCallback(() => {
    const current = guesses[guesses.length - 1];
    const next = input.toUpperCase();

    if (next.length < 3 || next.length > 10) {
      setStatus("Word must be 3–10 letters");
      return;
    }
    if (!dictionary.has(next)) {
      setStatus("Not in word list");
      return;
    }
    if (countNewLettersUsed(current, next, unlockedLetters) > 2) {
      setStatus("Max 2 new letters per guess");
      return;
    }

    const newGuesses = [...guesses, next];
    const previousDistance = getDistance(current, END);
    const newDistance = getDistance(next, END);

    let feedback = "";
    if (newDistance < previousDistance) feedback = "Getting closer";
    else if (newDistance > previousDistance) feedback = "Getting farther";
    else feedback = "Same distance";

    const feedbackColors = getLetterFeedback(next, END);
    const newUnlocked = new Set(unlockedLetters);
    next.split("").forEach((char, i) => {
      if (
        feedbackColors[i] === "correct" ||
        feedbackColors[i] === "present"
      ) {
        newUnlocked.add(char);
      }
    });

    setUnlockedLetters(newUnlocked);
    setGuesses(newGuesses);
    setInput("");
    if (next === END) {
      const localTime = getLocalTime(END);
      setStatus(
        `ARRIVED — ${END}\nLocal time: ${localTime}\n\nThank you for flying Departures.`
      );
      setGameOver(true);
    } else if (newGuesses.length - 1 >= MAX_GUESSES) {
      setGameOver(true);
      setStatus(
        `FLIGHT CANCELLED\nDestination was ${END}\n\nThank you for flying Departures.`
      );
    } else {
      setStatus(feedback);
    }
  }, [input, guesses, dictionary, unlockedLetters]);

  const handleReset = () => {
    if (resets < MAX_RESETS) {
      setGuesses([START]);
      setResets(resets + 1);
      setUnlockedLetters(new Set());
      setClueIndex(0);
      setRevealedClues([]);
      setStatus("");

    }
  };

  const revealNextClue = () => {
    if (clueIndex < CLUES.length && hintsUsed < MAX_HINTS) {
      setRevealedClues((prev) => [...prev, CLUES[clueIndex]]);
      setClueIndex(clueIndex + 1);
      setHintsUsed(hintsUsed + 1);
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (gameOver || showRules || showQuickStart) return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setInput((prev) => prev.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key) && input.length < 10) {
        e.preventDefault();
        setInput((prev) => prev + e.key.toUpperCase());
      }
    },
    [gameOver, showRules, showQuickStart, input, handleSubmit]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Click anywhere on the board area to focus
  const handleBoardClick = () => {
    if (!gameOver) {
      inputRef.current?.focus();
    }
  };

  // Render a row of Solari tiles for a word
  const renderWord = (word, feedback = null, animated = false) => {
    const padded = word.padEnd(WORD_LENGTH, " ");
    return padded.split("").map((char, i) => {
      const fb = feedback ? feedback[i] : "";
      const cls = [
        fb,
        animated ? "flip-in" : "",
        char === " " ? "empty" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return (
        <div
          key={i}
          className={`solari-tile ${cls}`}
          style={animated ? { animationDelay: `${i * 0.12}s` } : {}}
        >
          <div className="solari-flap">
            <div className="flap-top">{char}</div>
            <div className="flap-bottom">{char}</div>
          </div>
        </div>
      );
    });
  };

  // Render the input row as Solari tiles
  const renderInputRow = () => {
    const chars = input.split("");
    const tiles = [];
    for (let i = 0; i < WORD_LENGTH; i++) {
      const char = chars[i] || "";
      const isActive = i === chars.length;
      const isFilled = i < chars.length;
      tiles.push(
        <div
          key={i}
          className={`solari-tile input-tile ${isActive ? "cursor" : ""} ${isFilled ? "filled" : "empty"}`}
        >
          <div className="solari-flap">
            <div className="flap-top">{char}</div>
            <div className="flap-bottom">{char}</div>
          </div>
        </div>
      );
    }
    return tiles;
  };

  const guessCount = guesses.length - 1; // subtract START
  const won = gameOver && guesses[guesses.length - 1] === END;

  return (
    <div className="departures-app" onClick={handleBoardClick}>
      {/* Hidden input for mobile keyboard */}
      <input
        ref={inputRef}
        className="hidden-input"
        value={input}
        onChange={(e) => {
          const val = e.target.value
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .slice(0, 10);
          setInput(val);
        }}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />

      <header className="board-header">
        <div className="header-left">
          <h1 className="title">DEPARTURES</h1>
        </div>
        <div className="header-right">
          <button
            className="header-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowRules(true);
            }}
          >
            ?
          </button>
        </div>
      </header>

      <div className="board-chrome">
        {/* Route info bar */}
        <div className="route-bar">
          <div className="route-segment">
            <span className="route-label">FROM</span>
            <span className="route-city">{START}</span>
          </div>
          <div className="route-arrow">→</div>
          <div className="route-segment">
            <span className="route-label">TO</span>
            <span className="route-city">?????</span>
          </div>
          <div className="route-meta">
            <span className="meta-item">
              GUESSES {guessCount}/{MAX_GUESSES}
            </span>
            <span className="meta-item">
              REBOOKS {MAX_RESETS - resets}
            </span>
          </div>
        </div>

        {/* The board */}
        <div className="solari-board">
          {/* Header row */}
          <div className="solari-row header-row">
            <div className="row-label header-label">#</div>
            <div className="row-tiles header-tiles">
              {"WORD".padEnd(WORD_LENGTH, " ").split("").map((c, i) => (
                <div key={i} className="solari-tile header-tile">
                  <div className="solari-flap">
                    <div className="flap-top">{c}</div>
                    <div className="flap-bottom">{c}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row-status header-status">STATUS</div>
          </div>

          {/* Guess rows */}
          {Array.from({ length: MAX_GUESSES }, (_, i) => {
            const guessIndex = i + 1; // +1 because guesses[0] is START
            const guess = guesses[guessIndex];
            const isCurrentInput = guessIndex === guesses.length && !gameOver;
            const isFuture = guessIndex > guesses.length;
            const isPast = guessIndex < guesses.length;

            let feedback = null;
            let statusText = "";
            let statusClass = "";

            if (isPast && guess) {
              feedback = getLetterFeedback(guess, END);
              const dist = getDistance(guess, END);
              const prevDist = getDistance(
                guesses[guessIndex - 1],
                END
              );
              if (guess === END) {
                statusText = "ARRIVED";
                statusClass = "status-arrived";
              } else if (dist < prevDist) {
                statusText = "CLOSER";
                statusClass = "status-closer";
              } else if (dist > prevDist) {
                statusText = "FARTHER";
                statusClass = "status-farther";
              } else {
                statusText = "SAME";
                statusClass = "status-same";
              }
            } else if (isCurrentInput) {
              statusText = "BOARDING";
              statusClass = "status-boarding";
            } else if (isFuture) {
              statusText = "—";
              statusClass = "status-empty";
            } else if (gameOver && !guess) {
              statusText = "—";
              statusClass = "status-empty";
            }

            return (
              <div
                key={i}
                className={`solari-row ${isCurrentInput ? "active-row" : ""} ${isPast ? "past-row" : ""} ${isFuture ? "future-row" : ""}`}
              >
                <div className="row-label">{i + 1}</div>
                <div className="row-tiles">
                  {isCurrentInput
                    ? renderInputRow()
                    : isPast && guess
                      ? renderWord(guess, feedback, true)
                      : renderWord("     ")}
                </div>
                <div className={`row-status ${statusClass}`}>
                  {statusText}
                </div>
              </div>
            );
          })}

          {/* Start word shown at bottom as reference */}
          <div className="solari-row start-row">
            <div className="row-label">⌂</div>
            <div className="row-tiles">
              {renderWord(START)}
            </div>
            <div className="row-status status-origin">ORIGIN</div>
          </div>
        </div>

        {/* Controls */}
        {!gameOver && (
          <div className="controls">
            <button className="ctrl-btn submit-btn" onClick={handleSubmit}>
              BOARD ↵
            </button>
            <button
              className="ctrl-btn rebook-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              disabled={resets >= MAX_RESETS}
            >
              REBOOK
            </button>
            <button
              className="ctrl-btn hint-btn"
              onClick={(e) => {
                e.stopPropagation();
                revealNextClue();
              }}
              disabled={hintsUsed >= MAX_HINTS || clueIndex >= CLUES.length}
            >
              HINT {hintsUsed}/{MAX_HINTS}
            </button>
          </div>
        )}

        {/* Carry-on letters */}
        {unlockedLetters.size > 0 && !gameOver && (
          <div className="carry-on">
            <span className="carry-on-label">CARRY-ON LETTERS</span>
            <div className="carry-on-letters">
              {[...unlockedLetters].map((letter) => (
                <span key={letter} className="carry-on-letter">
                  {letter}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status message */}
        {status && (
          <div className={`status-display ${won ? "won" : ""}`}>
            {status}
          </div>
        )}

        {/* Revealed hints */}
        {revealedClues.length > 0 && (
          <div className="clues-panel">
            <div className="clues-header">FLIGHT INTEL</div>
            {revealedClues.map((clue, i) => (
              <div key={i} className="clue-item">
                <span className="clue-number">{i + 1}.</span> {clue}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Modal */}
      {showQuickStart && (
        <div
          className="modal-overlay"
          onClick={() => setShowQuickStart(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowQuickStart(false)}
            >
              ×
            </button>
            <h2>DEPARTURES</h2>
            <p className="modal-subtitle">
              Find the mystery destination from <strong>{START}</strong>{" "}
              in {MAX_GUESSES} guesses.
            </p>
            <div className="modal-rules">
              <div className="rule">
                <span className="rule-icon">✈</span>
                Each guess must be a real word (3–10 letters)
              </div>
              <div className="rule">
                <span className="rule-icon">🧳</span>
                Only 2 new letters per guess — reuse from previous words
              </div>
              <div className="rule">
                <span className="rule-icon tile-demo correct">A</span>
                Correct letter, correct position
              </div>
              <div className="rule">
                <span className="rule-icon tile-demo present">A</span>
                Correct letter, wrong position
              </div>
              <div className="rule">
                <span className="rule-icon tile-demo absent">A</span>
                Letter not in destination
              </div>
            </div>
            <p className="modal-cta">Click anywhere to begin</p>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div
          className="modal-overlay"
          onClick={() => setShowRules(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowRules(false)}
            >
              ×
            </button>
            <h2>Flight Plan</h2>
            <p>
              Find the mystery destination starting from{" "}
              <strong>{START}</strong>.
            </p>

            <h3>Rules</h3>
            <ul>
              <li>Each guess must be a real word (3–10 letters)</li>
              <li>
                Only 2 new letters per guess — all others must come from
                previous words
              </li>
              <li>
                You have {MAX_GUESSES} guesses to reach your destination
              </li>
            </ul>

            <h3>Signals</h3>
            <ul>
              <li>
                <span className="tile-demo correct inline">A</span>{" "}
                Correct position
              </li>
              <li>
                <span className="tile-demo present inline">A</span>{" "}
                Wrong position
              </li>
              <li>
                <span className="tile-demo absent inline">A</span> Not
                in destination
              </li>
            </ul>

            <h3>Help</h3>
            <ul>
              <li>{MAX_RESETS} rebooks to restart from {START}</li>
              <li>{MAX_HINTS} hints available for clues about the destination</li>
              <li>
                Letters in green or yellow are your carry-on — free to
                reuse
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
