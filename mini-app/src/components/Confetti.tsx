const COLORS = ["#e2231a", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

/**
 * One-shot CSS confetti burst — no animation library, just a handful of
 * absolutely-positioned pieces falling with staggered timing. Purely
 * decorative (aria-hidden); plays once on mount and never loops.
 */
export function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.8 + Math.random() * 1.2,
    color: COLORS[i % COLORS.length],
    rotate: Math.random() * 360,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute -top-3 h-2.5 w-2.5 rounded-sm"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s 1 forwards`,
          }}
        />
      ))}
    </div>
  );
}
