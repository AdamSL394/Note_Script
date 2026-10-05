import { useState } from 'react';
import { toLocalDateString, formatHumanDate } from '../../utils/date';
import './datePicker.css';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  ariaLabel: string;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Parses a YYYY-MM-DD string via the (year, month, day) numeric
// constructor rather than `new Date(isoString)` -- a bare date string
// parses as UTC midnight per the JS spec, which rolls back to the
// previous calendar day for anyone west of UTC in the evening (see
// utils/date.ts's toLocalDateString comment for the same bug this
// avoids).
function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// A button showing the current date in human-readable form (matching
// this app's own formatHumanDate, used everywhere else a date is
// displayed), opening a centered calendar overlay on click -- mirrors
// EmojiPicker's trigger+modal pattern, both in structure and in being
// fixed to the viewport rather than anchored to this small trigger, so
// it can never run off-screen regardless of where the button sits.
// Replaces the native <input type="date">, whose calendar popup is
// drawn by the OS/browser and can't be themed to match the app at all.
export const DatePicker = (props: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(props.value);
  // The month currently shown in the grid -- starts on the selected
  // date's month but can be paged independently of it via prev/next,
  // without touching the actual selected value until a day is chosen.
  const [viewDate, setViewDate] = useState(selected);

  const openPicker = () => {
    setViewDate(parseLocalDate(props.value));
    setOpen(true);
  };

  const changeMonth = (delta: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const selectDay = (day: number) => {
    const picked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    props.onChange(toLocalDateString(picked));
    setOpen(false);
  };

  const goToToday = () => {
    const today = new Date();
    props.onChange(toLocalDateString(today));
    setViewDate(today);
    setOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const today = new Date();

  const cells: Array<number | null> = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      <button
        type="button"
        className="datePickerTrigger"
        aria-label={props.ariaLabel}
        onClick={openPicker}
      >
        <span className="datePickerTriggerIcon" aria-hidden="true">📅</span>
        {formatHumanDate(props.value)}
      </button>
      {open && (
        <div className="datePickerBackdrop" onClick={() => setOpen(false)}>
          <div
            className="datePickerModal"
            role="dialog"
            aria-label="Choose a date"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="datePickerHeader">
              <button
                type="button"
                className="datePickerNavButton"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                ‹
              </button>
              <span className="datePickerMonthLabel">
                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                className="datePickerNavButton"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                ›
              </button>
            </div>

            <div className="datePickerWeekdayRow">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="datePickerWeekdayLabel">
                  {label}
                </span>
              ))}
            </div>

            <div className="datePickerGrid" role="listbox">
              {cells.map((day, index) => {
                if (day === null) {
                  return <span key={`blank-${index}`} className="datePickerCellBlank" />;
                }
                const cellDate = new Date(year, month, day);
                const isSelected = isSameDay(cellDate, selected);
                const isToday = isSameDay(cellDate, today);
                const className = [
                  'datePickerCell',
                  isSelected ? 'datePickerCellSelected' : '',
                  isToday && !isSelected ? 'datePickerCellToday' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    key={day}
                    type="button"
                    className={className}
                    onClick={() => selectDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <button type="button" className="datePickerTodayButton" onClick={goToToday}>
              Today
            </button>
          </div>
        </div>
      )}
    </>
  );
};
