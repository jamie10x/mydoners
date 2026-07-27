interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/** Inline failure notice with a retry action — for screens where a fetch failed. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <p className="text-2xl">📡</p>
      <p className="px-6 text-sm font-medium text-stone-500">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-xl bg-stone-900 px-5 py-2 text-sm font-semibold text-white active:bg-stone-700"
      >
        Retry
      </button>
    </div>
  );
}
