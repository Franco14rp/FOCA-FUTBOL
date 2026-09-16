import React, { useState, useEffect } from 'react';
import './App.css';

const TypingEffect = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (index < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 100); // Typing speed
      return () => clearTimeout(timeoutId);
    } else {
      // Text is fully displayed, make cursor disappear after a short delay
      const cursorTimeout = setTimeout(() => setShowCursor(false), 500);
      return () => clearTimeout(cursorTimeout);
    }
  }, [index, text]);

  useEffect(() => {
    // Only blink cursor if text is not fully displayed
    if (index < text.length) {
      const cursorInterval = setInterval(() => {
        setShowCursor((prev) => !prev);
      }, 500); // Cursor blink speed
      return () => clearInterval(cursorInterval);
    } else {
      setShowCursor(false); // Ensure cursor is off when typing is done
    }
  }, [index, text.length]);

  return (
    <p className="Welcome-message">
      {displayedText}
      {showCursor && <span className="Typing-cursor">|</span>}
    </p>
  );
};

export default TypingEffect;
