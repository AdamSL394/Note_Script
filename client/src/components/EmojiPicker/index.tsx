import { useEffect, useRef, useState } from 'react';
import './emojiPicker.css';

// A small, curated set spanning the themes this app's tags actually
// use (activities, mood, food, objects) -- not a full emoji database
// library, to keep this app's dependency footprint light. The text
// input below covers anything not in this list.
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
// centered overlay on click -- fixed to the viewport rather than
// anchored to this (small, easy-to-be-near-an-edge) trigger button,
// so it can never run off-screen regardless of where the button
// happens to sit.
export const EmojiPicker = (props: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCustomInput('');
    }
  }, [open]);

  const commitCustomInput = () => {
    const trimmed = customInput.trim();
    if (trimmed) {
      props.onSelect(trimmed);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="emojiPickerTrigger"
        aria-label={props.ariaLabel}
        onClick={() => setOpen(true)}
      >
        {props.value || '🏷️'}
      </button>
      {open && (
        <div className="emojiPickerBackdrop" onClick={() => setOpen(false)}>
          <div
            className="emojiPickerModal"
            role="dialog"
            aria-label="Choose a tag icon"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="emojiPickerHeader">
              <span className="emojiPickerCurrentPreview" aria-hidden="true">
                {props.value || '🏷️'}
              </span>
              <span className="emojiPickerHeaderText">
                {props.value ? 'Current icon' : 'No icon chosen yet'}
              </span>
              {props.value && (
                <button
                  type="button"
                  className="emojiPickerClearButton"
                  onClick={() => {
                    props.onSelect('');
                    setOpen(false);
                  }}
                >
                  ✕ Clear
                </button>
              )}
            </div>

            <div className="emojiPickerSectionLabel">Choose one:</div>
            <div className="emojiPickerGrid" role="listbox">
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

            <div className="emojiPickerSectionLabel">
              Don&apos;t see it? Type or paste your own here (this box does not
              filter the list above):
            </div>
            <div className="emojiPickerCustomRow">
              <input
                ref={inputRef}
                type="text"
                className="emojiPickerCustomInput"
                placeholder="Paste an emoji"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCustomInput();
                }}
                maxLength={8}
              />
              <button
                type="button"
                className="emojiPickerUseButton"
                disabled={!customInput.trim()}
                onClick={commitCustomInput}
              >
                Use
              </button>
            </div>

            <button type="button" className="emojiPickerClose" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};
