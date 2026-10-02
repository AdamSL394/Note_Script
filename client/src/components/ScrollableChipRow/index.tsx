import { useEffect, useRef, useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import './scrollableChipRow.css';

interface ScrollableChipRowProps {
  children: React.ReactNode;
  ariaLabel: string;
}

// A horizontally-scrollable row of chips with always-visible
// (translucent) arrow buttons as a fallback for anyone who can't do a
// trackpad/mouse-wheel horizontal scroll, and the only such fallback
// at all on a touch device, which has no hover to reveal anything
// with -- native swipe/scroll still works for everyone else. The
// arrows are a genuine functional affordance, not decoration, so they
// stay keyboard-reachable (no tabIndex={-1}).
//
// Both arrows track actual scroll position rather than just existing
// unconditionally: the pair disappears together when the row doesn't
// overflow its container at all (nothing to scroll, so nothing to
// hint at), and each one individually disables/dims itself once
// there's nothing further to scroll in that direction -- otherwise an
// arrow sitting there fully lit with nowhere left to go reads as
// broken, not as "you've reached the end."
export const ScrollableChipRow = (props: ScrollableChipRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    // 1px slack absorbs sub-pixel rounding from the browser's own
    // layout math, which would otherwise occasionally leave one arrow
    // stuck "live" right at the scroll boundary.
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    // Covers every way the overflow can change after mount: the chip
    // row's own content changing size/count (ResizeObserver), the
    // viewport changing width (resize), and the user actually
    // scrolling the row (scroll) -- any one of these can flip whether
    // there's more to scroll to in either direction.
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.children]);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const hasOverflow = canScrollLeft || canScrollRight;

  return (
    <div className="scrollableChipRowWrap">
      {hasOverflow && (
        <button
          type="button"
          className="scrollArrowButton scrollArrowLeft"
          aria-label="Scroll left"
          onClick={() => scrollBy(-120)}
          disabled={!canScrollLeft}
        >
          <ChevronLeftIcon fontSize="small" />
        </button>
      )}
      <div className="scrollableChipRow" ref={scrollRef} aria-label={props.ariaLabel}>
        {props.children}
      </div>
      {hasOverflow && (
        <button
          type="button"
          className="scrollArrowButton scrollArrowRight"
          aria-label="Scroll right"
          onClick={() => scrollBy(120)}
          disabled={!canScrollRight}
        >
          <ChevronRightIcon fontSize="small" />
        </button>
      )}
    </div>
  );
};
