import { useCallback, useLayoutEffect, useRef, useState } from 'react';

type CrashRound = {
  multiplier: number;
  busted: boolean;
};

type CrashHistoryPillsProps = {
  history: CrashRound[];
};

const getCanScroll = (el: HTMLUListElement) => ({
  left: el.scrollLeft > 4,
  right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
});

export function CrashHistoryPills({ history }: CrashHistoryPillsProps) {
  const ref = useRef<HTMLUListElement>(null);

  const drag = useRef({ x: 0, left: 0 });
  const [dragging, setDragging] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges(getCanScroll(el));
  }, []);

  useLayoutEffect(() => update(), [update]);

  const onDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;

    setDragging(true);
    drag.current = { x: e.pageX, left: el.scrollLeft };
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !ref.current) return;
      ref.current.scrollLeft = drag.current.left - (e.pageX - drag.current.x);
    },
    [dragging],
  );

  const onEnd = useCallback(() => setDragging(false), []);

  return (
    <div className="relative w-full">
      <ul
        ref={ref}
        onScroll={update}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        className={`flex items-center gap-2 overflow-x-auto select-none [&::-webkit-scrollbar]:hidden ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {history.map((i) => (
          <li
            key={i.multiplier}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              i.busted
                ? 'bg-loss-red/10 border border-loss-red/40 text-loss-red'
                : 'bg-neon-green/10 border border-neon-green/30 text-neon-green'
            }`}
          >
            {i.multiplier.toFixed(2)}x
          </li>
        ))}
      </ul>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-linear-to-r from-deep-slate via-deep-slate/60 to-transparent transition-opacity"
        style={{ opacity: edges.left ? 1 : 0 }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-linear-to-l from-deep-slate via-deep-slate/60 to-transparent transition-opacity"
        style={{ opacity: edges.right ? 1 : 0 }}
      />
    </div>
  );
}
