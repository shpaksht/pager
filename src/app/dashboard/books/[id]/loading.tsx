export default function BookPageLoading() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-[148px_minmax(0,1fr)]">
            <div className="h-44 w-32 animate-pulse rounded-sm bg-accent/40 md:h-52 md:w-36" />

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="h-7 w-[32rem] max-w-full animate-pulse rounded-sm bg-accent/40" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-accent/35" />
                  <div className="ml-auto h-9 w-9 animate-pulse rounded-sm bg-accent/35" />
                </div>
                <div className="h-4 w-48 animate-pulse rounded-sm bg-accent/30" />
              </div>

              <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
                <div className="space-y-2">
                  <div className="h-4 w-16 animate-pulse rounded-sm bg-accent/30" />
                  <div className="h-10 w-28 animate-pulse rounded-sm bg-accent/40" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-16 animate-pulse rounded-sm bg-accent/30" />
                  <div className="h-10 w-20 animate-pulse rounded-sm bg-accent/40" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded-sm bg-accent/30" />
                  <div className="h-10 w-24 animate-pulse rounded-sm bg-accent/40" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-16 animate-pulse rounded-sm bg-accent/30" />
                  <div className="h-10 w-20 animate-pulse rounded-sm bg-accent/40" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded-sm bg-accent/30" />
                  <div className="h-10 w-24 animate-pulse rounded-sm bg-accent/40" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-sm bg-accent/30" />
                <div className="h-2 w-full animate-pulse rounded bg-accent/30" />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="h-10 w-24 animate-pulse rounded-sm bg-accent/35" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="space-y-3">
          <div className="h-6 w-44 animate-pulse rounded-sm bg-accent/35" />
          <div className="h-16 animate-pulse rounded-sm border border-border bg-accent/25" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-sm border border-border bg-accent/25" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
