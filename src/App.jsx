// App.jsx — Departures: variable-length with dual feedback
import { useState, useEffect } from "react";
import { getDailyPuzzle } from "./puzzles";
import "./App_Board_Animated.css";

const PUZZLE = getDailyPuzzle();
const START = PUZZLE.start;
const END = PUZZLE.end;
const CLUES = PUZZLE.clues;
const MAX_RESETS = 3;
const MAX_GUESSES = 6;

const generateGibberish = (length) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let word = "";
  for (let i = 0; i < length; i++) {
    word += chars[Math.floor(Math.random() * chars.length)];
  }
  return word;
};

const getLocalTime = () => {
  const timeZone = PUZZLE.timezone || "UTC";
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
  const [showHintDisplay, setShowHintDisplay] = useState(false);
  const [showRulesHover, setShowRulesHover] = useState(false);
  const [currentHint, setCurrentHint] = useState("");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [lengthMatched, setLengthMatched] = useState(false);
  const [showLengthAlert, setShowLengthAlert] = useState(false);
  const MAX_HINTS = 5;

  // Store feedback per guess for rendering
  const [guessFeedback, setGuessFeedback] = useState([]);

  useEffect(() => {
    fetch("/words.txt")
      .then((res) => res.text())
      .then((text) => {
        const words = new Set(
          text.toUpperCase().split("\n").map((word) => word.trim())
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

  // Letter-presence feedback (for wrong-length guesses)
  const getPresenceFeedback = (guess, answer) => {
    const answerChars = new Set(answer);
    return guess.split("").map((char) => {
      return answerChars.has(char) ? "present" : "absent";
    });
  };

  // Positional feedback (for right-length guesses) — standard Wordle logic
  const getPositionalFeedback = (guess, answer) => {
    const result = Array(guess.length).fill("gray");
    const answerArr = answer.split("");
    const guessArr = guess.split("");
    const used = Array(answer.length).fill(false);

    // Green pass
    for (let i = 0; i < guessArr.length; i++) {
      if (guessArr[i] === answerArr[i]) {
        result[i] = "green";
        used[i] = true;
      }
    }

    // Yellow pass
    for (let i = 0; i < guessArr.length; i++) {
      if (result[i] === "green") continue;
      for (let j = 0; j < answerArr.length; j++) {
        if (!used[j] && guessArr[i] === answerArr[j]) {
          result[i] = "yellow";
          used[j] = true;
          break;
        }
      }
    }

    return result;
  };

  // Determine feedback type based on length match
  const getFeedback = (guess, answer) => {
    if (guess.length === answer.length) {
      return {
        type: "positional",
        colors: getPositionalFeedback(guess, answer),
      };
    } else {
      return {
        type: "presence",
        colors: getPresenceFeedback(guess, answer),
      };
    }
  };

  const handleSubmit = () => {
    const current = guesses[guesses.length - 1];
    const next = input.toUpperCase();

    if (next.length < 3 || next.length > 10) {
      setStatus("Word must be 3-10 letters long");
      return;
    }
    if (!dictionary.has(next)) {
      setStatus("Not in dictionary");
      return;
    }
    if (countNewLettersUsed(current, next, unlockedLetters) > 2) {
      setStatus("Too many new letters! Only 2 new letters allowed per guess");
      return;
    }

    const feedback = getFeedback(next, END);
    const newGuesses = [...guesses, next];
    const newFeedback = [...guessFeedback, feedback];

    // Update carry-on letters
    const newUnlocked = new Set(unlockedLetters);
    next.split("").forEach((char, i) => {
      if (feedback.type === "positional") {
        if (feedback.colors[i] === "green" || feedback.colors[i] === "yellow") {
          newUnlocked.add(char);
        }
      } else {
        if (feedback.colors[i] === "present") {
          newUnlocked.add(char);
        }
      }
    });

    setUnlockedLetters(newUnlocked);
    setGuesses(newGuesses);
    setGuessFeedback(newFeedback);
    setInput("");

    // Check for length match — notify once
    if (next.length === END.length && !lengthMatched) {
      setLengthMatched(true);
      setShowLengthAlert(true);
      setTimeout(() => setShowLengthAlert(false), 4000);
    }

    if (next === END) {
      const localTime = getLocalTime();
      setStatus(
        `ARRIVED AT ${END}\nLOCAL TIME: ${localTime}\n\nOn behalf of the captain and crew, we want to thank you for flying Departures Air. We hope to see you again soon.`
      );
      setGameOver(true);
    } else if (newGuesses.length - 1 >= MAX_GUESSES) {
      setGameOver(true);
      setStatus(
        `FLIGHT TERMINATED\nThe mystery destination was: ${END}\n\nThank you for flying Departures Air.`
      );
    } else {
      if (feedback.type === "positional") {
        setStatus("\u2708\uFE0F LENGTH LOCKED \u2014 positional feedback active");
      } else {
        const presentCount = feedback.colors.filter((c) => c === "present").length;
        setStatus(
          `${presentCount} of ${next.length} letters are in the destination`
        );
      }
    }
  };

  const handleReset = () => {
    if (resets < MAX_RESETS) {
      setGuesses([START]);
      setGuessFeedback([]);
      setResets(resets + 1);
      setUnlockedLetters(new Set());
      setClueIndex(0);
      setLengthMatched(false);
      setShowLengthAlert(false);
      setStatus("");
    } else {
      setStatus("No resets remaining");
    }
  };

  const revealNextClue = () => {
    if (clueIndex < CLUES.length && hintsUsed < MAX_HINTS) {
      setCurrentHint(CLUES[clueIndex]);
      setClueIndex(clueIndex + 1);
      setHintsUsed(hintsUsed + 1);
      setShowHintDisplay(true);
      setTimeout(() => setShowHintDisplay(false), 8000);
    }
  };

  // Render a single guess row with variable-width tiles
  const renderGuessRow = (guess, feedback, rowIndex, isStart) => {
    const word = guess.toUpperCase();
    const tiles = word.split("").map((char, i) => {
      let tileClass = "letter-tile flip";

      if (isStart) {
        tileClass += " start-tile";
      } else if (feedback) {
        tileClass += ` ${feedback.colors[i]}`;
      }

      return (
        <div
          key={`${rowIndex}-tile-${i}`}
          className={tileClass}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          {char}
        </div>
      );
    });

    // Feedback type indicator
    let feedbackLabel = "";
    if (isStart) {
      feedbackLabel = "ORIGIN";
    } else if (feedback) {
      feedbackLabel = feedback.type === "positional" ? "LOCKED" : "SCAN";
    }

    return (
      <div key={rowIndex} className="board-row variable-row">
        <div className="row-tiles">
          {tiles}
        </div>
        <div className="row-info">
          <span className={`feedback-type ${isStart ? "start" : feedback?.type || ""}`}>
            {feedbackLabel}
          </span>
        </div>
      </div>
    );
  };

  // Render empty future rows
  const renderEmptyRow = (rowIndex) => {
    const gibberishLen = 4 + Math.floor(Math.random() * 4);
    const gibberish = generateGibberish(gibberishLen);

    return (
      <div key={`empty-${rowIndex}`} className="board-row variable-row empty-row">
        <div className="row-tiles">
          {gibberish.split("").map((char, i) => (
            <div
              key={`${rowIndex}-empty-${i}`}
              className="letter-tile flip empty-tile"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {char}
            </div>
          ))}
        </div>
        <div className="row-info">
          <span className="feedback-type empty">READY</span>
        </div>
      </div>
    );
  };

  const guessCount = guesses.length - 1;
  const remainingRows = MAX_GUESSES - guessCount;

  return (
    <div className="main-flex">
      <div className="game-container">
        <header>
          <div className="header-title-row">
            <h1>\uD83D\uDEC4 DEPARTURES</h1>
            <button
              className="help-icon"
              onMouseEnter={() => setShowRulesHover(true)}
              onMouseLeave={() => setShowRulesHover(false)}
              onClick={() => setShowRules(true)}
            >
              \u2139\uFE0F
            </button>
            {showRulesHover && (
              <div className="help-hover">
                <h3>How to Play</h3>
                <p>Click for instructions</p>
              </div>
            )}
          </div>
          <p className="subhead">
            Rebooks: {MAX_RESETS - resets} &nbsp;|&nbsp; Guesses: {guessCount}/{MAX_GUESSES}
          </p>
        </header>

        {/* Carry-on display */}
        <div className="carryon-bar">
          <span className="carryon-label">CARRY ON:</span>
          <span className="carryon-letters">
            {unlockedLetters.size > 0
              ? [...unlockedLetters].join("  ")
              : "\u2014"}
          </span>
        </div>

        {/* Length match alert */}
        {showLengthAlert && (
          <div className="length-alert">
            \u2708\uFE0F LENGTH MATCHED \u2014 Positional feedback now active!
          </div>
        )}

        {/* Departure board */}
        <div className="departure-board">
          <div className="board-header-v2">
            <span className="header-col-guess">FLIGHT PATH</span>
            <span className="header-col-status">MODE</span>
          </div>

          {/* Start word */}
          {renderGuessRow(START, null, 0, true)}

          {/* Player guesses */}
          {guesses.slice(1).map((guess, i) =>
            renderGuessRow(guess, guessFeedback[i], i + 1, false)
          )}

          {/* Empty future rows */}
          {!gameOver &&
            Array.from({ length: remainingRows }, (_, i) =>
              renderEmptyRow(guesses.length + i)
            )}
        </div>

        {/* Input */}
        {!gameOver && (
          <div className="input-zone">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter next stop..."
              className="input-box"
              autoFocus
            />
            <button className="btn submit" onClick={handleSubmit}>
              Board
            </button>
            <button className="btn reset" onClick={handleReset}>
              Rebook
            </button>
          </div>
        )}

        {/* Hint button */}
        {!gameOver && (
          <div className="hint-button-container">
            <button
              className="hint-button boarding-pass"
              onClick={revealNextClue}
              disabled={hintsUsed >= MAX_HINTS || clueIndex >= CLUES.length}
            >
              <div className="boarding-pass-content">
                <div className="boarding-pass-icon">\uD83C\uDFAB</div>
                <div className="boarding-pass-text">HINT</div>
                <div className="hint-lights">
                  {Array.from({ length: MAX_HINTS }, (_, i) => (
                    <div
                      key={i}
                      className={`hint-light ${i < hintsUsed ? "used" : "available"}`}
                    />
                  ))}
                </div>
              </div>
            </button>
          </div>
        )}

        {status && <p className="status-msg">{status}</p>}
      </div>

      {/* Right side hint panel */}
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
              <div className="boarding-pass-icon">\uD83C\uDFAB</div>
              <div className="boarding-pass-text">HINT</div>
              <div className="hint-lights">
                {Array.from({ length: MAX_HINTS }, (_, i) => (
                  <div
                    key={i}
                    className={`hint-light ${i < hintsUsed ? "used" : "available"}`}
                  />
                ))}
              </div>
            </div>
          </button>

          {showHintDisplay && currentHint && (
            <div className="hint-display-panel">
              <div className="hint-display-header">\u2708\uFE0F FLIGHT HINT</div>
              <div className="hint-display-content">{currentHint}</div>
              <button
                className="hint-display-close"
                onClick={() => setShowHintDisplay(false)}
              >
                \u00D7
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Start Modal */}
      {showQuickStart && (
        <div
          className="rules-modal-overlay"
          onClick={() => setShowQuickStart(false)}
        >
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setShowQuickStart(false)}
            >
              \u00D7
            </button>
            <aside className="rules-box">
              <h2>Welcome to DEPARTURES</h2>
              <p>
                <strong>
                  Find the mystery destination starting from {START} in {MAX_GUESSES} guesses!
                </strong>
              </p>
              <ul>
                <li>Each guess must be a real word (3-10 letters)</li>
                <li>Only 2 new letters per guess \u2014 reuse previous letters</li>
                <li>You don't know the destination's length</li>
                <li>
                  Wrong length \u2192 you learn which letters are <em>in</em> the destination
                </li>
                <li>
                  Right length \u2192 full positional feedback: \uD83D\uDFE2 correct spot, \uD83D\uDFE1 wrong spot
                </li>
                <li>3 rebooks and 5 hints available</li>
              </ul>
              <p>
                <em>Click anywhere to start your journey!</em>
              </p>
            </aside>
          </div>
        </div>
      )}

      {/* Full Rules Modal */}
      {showRules && (
        <div
          className="rules-modal-overlay"
          onClick={() => setShowRules(false)}
        >
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setShowRules(false)}
            >
              \u00D7
            </button>
            <aside className="rules-box">
              <h2>Flight Plan</h2>
              <p>
                Welcome aboard your journey from {START} to your mystery destination.
              </p>

              <h3>Pre-Flight Instructions</h3>
              <ul>
                <li>Each guess must be a real word (3-10 letters) to clear for takeoff</li>
                <li>You may board with only 2 new letters per flight \u2014 all other letters must come from your carry-on</li>
                <li>There are {MAX_GUESSES} flights available to reach your final destination</li>
                <li>You do not know how long the destination name is \u2014 figuring that out is part of the puzzle</li>
              </ul>

              <h3>In-Flight Signals</h3>
              <ul>
                <li><strong>SCAN mode</strong> (wrong length): You learn which of your letters appear in the destination</li>
                <li><strong>LOCKED mode</strong> (right length): Full positional feedback activates</li>
                <li>\uD83D\uDFE2 Letter secured in correct position</li>
                <li>\uD83D\uDFE1 Letter in transit (right letter, wrong position)</li>
                <li>\u2B1C Letter left at departure gate (not in destination)</li>
                <li>\uD83D\uDD35 Letter is in the destination (SCAN mode)</li>
                <li>\u2B1B Letter is not in the destination (SCAN mode)</li>
              </ul>

              <h3>In-Flight Services</h3>
              <ul>
                <li>{MAX_RESETS} rebooks available for unexpected turbulence</li>
                <li>5 complimentary hints available with your call button</li>
              </ul>

              <p>Letters confirmed present (via either mode) are added to your carry-on \u2014 reuse them freely.</p>
              <p><em>Thank You for flying Departures Air</em></p>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
