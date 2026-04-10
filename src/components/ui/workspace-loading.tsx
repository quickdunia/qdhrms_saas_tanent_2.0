export function WorkspaceLoading({
  title = "Loading workspace",
}: {
  title?: string;
}) {
  return (
    <div className="space-y-6">
      <div className="animate-pulse rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-premium">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-72 max-w-full rounded-full bg-slate-200" />
        <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="animate-pulse rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-premium" key={index}>
            <div className="h-4 w-20 rounded-full bg-slate-200" />
            <div className="mt-4 h-8 w-24 rounded-full bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-premium">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="h-14 animate-pulse rounded-2xl bg-slate-100" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
