import { useEffect, useRef, useState } from 'react';
import './emojiPicker.css';

// A small, curated set spanning the themes this app's tags actually
// use (activities, mood, food, objects) rather than a full emoji
// database library -- keeps this lightweight, matching the rest of
// the app's dependency footprint, at the cost of not covering every
// possible emoji. The OS's own native emoji keyboard remains
// available too (this is a convenience picker, not the only path).
const CURATED_EMOJIS = [
  '🏃', '🏋️', '🧘', '🚴', '⚽', '🏀', '🎾', '🏊', '⛳', '🥊',
  '📚', '✍️', '🎨', '🎵', '🎸', '📷', '💻', '🎮', '🎬', '🧩',
  '☕️', '🍕', '🥗', '🍷', '🍺', '🌮', '🍔', '🍜', '🍎', '🍩',
  '😊', '😴', '🧠', '❤️', '🙏', '✨', '🎯', '🔥', '💤', '😤',
  '🌱', '🌞', '🌙', '🌧️', '❄️', '🏠', '✈️', '🚗', '🚲', '🚀',
  '💰', '🎉', '🎁', '📞', '🧹', '🐶', '🐱', '🌊', '⛰️', '🎓',
];

interface EmojiPickerProps {
  value: string;
  onSelect: (emoji: string) => void;
  ariaLabel: string;
}

// A button showing the current icon (or a placeholder), opening a
// small grid popover of curated emoji on click -- lets a user pick a
// tag icon without leaving the app for a native emoji keyboard.
export const EmojiPicker = (props: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Closes on an outside click -- without this, the popover would
  // stay open until the user picks something, with no way to dismiss
  // it by clicking elsewhere, which is the behavior anyone would
  // expect from a small popover like this.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="emojiPickerContainer" ref={containerRef}>
      <button
        type="button"
        className="emojiPickerTrigger"
        aria-label={props.ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {props.value || '🏷️'}
      </button>
      {open && (
        <div className="emojiPickerPopover" role="listbox">
          <div className="emojiPickerGrid">
            {CURATED_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emojiPickerOption"
                onClick={() => {
                  props.onSelect(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
