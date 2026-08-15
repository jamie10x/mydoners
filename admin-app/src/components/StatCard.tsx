export function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={`text-2xl font-extrabold ${accent ? "text-brand" : "text-stone-900"}`}>{value}</p>
    </div>
  );
}
