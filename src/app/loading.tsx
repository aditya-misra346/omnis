export default function RootLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading OMNIS Intelligence Platform"
      className="min-h-[calc(100dvh-3.5rem)] bg-[var(--bg-obsidian)] px-4 sm:px-8 py-12"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 min-w-0 space-y-5">
          <div className="h-6 w-56 rounded-full bg-[var(--bg-slate)] border border-[var(--border-subtle)] animate-pulse" />
          <div className="space-y-2.5">
            <div className="h-12 w-full max-w-lg rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] animate-pulse" />
            <div className="h-12 w-4/5 max-w-md rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] animate-pulse" />
          </div>
          <div className="h-20 w-full max-w-xl rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] animate-pulse" />
          <div className="h-12 w-full max-w-xl rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] animate-pulse" />
          <div className="flex gap-3 pt-2">
            <div className="h-12 w-56 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] animate-pulse" />
            <div className="h-12 w-44 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] animate-pulse" />
          </div>
        </div>
        <div className="lg:col-span-6 min-w-0">
          <div className="h-[440px] w-full rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
