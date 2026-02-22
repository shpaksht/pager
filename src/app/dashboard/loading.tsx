import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <div className="h-6 w-28 animate-pulse rounded-sm bg-accent/40" />
          <div className="ml-auto h-9 w-40 animate-pulse rounded-sm bg-accent/40" />
          <div className="h-9 w-20 animate-pulse rounded-sm bg-accent/40" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="h-10 animate-pulse rounded-sm bg-accent/35" />
          <div className="h-10 animate-pulse rounded-sm bg-accent/35" />
          <div className="h-10 animate-pulse rounded-sm bg-accent/35" />
          <div className="h-10 animate-pulse rounded-sm bg-accent/35" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="pt-5">
              <div className="grid gap-4 md:grid-cols-[84px_1fr]">
                <div className="h-28 w-20 animate-pulse rounded-sm bg-accent/40" />
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="h-5 w-72 max-w-full animate-pulse rounded-sm bg-accent/40" />
                      <div className="h-4 w-40 animate-pulse rounded-sm bg-accent/30" />
                      <div className="h-5 w-20 animate-pulse rounded-full bg-accent/35" />
                    </div>
                    <div className="h-9 w-9 animate-pulse rounded-sm bg-accent/35" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="h-4 w-32 animate-pulse rounded-sm bg-accent/30" />
                    <div className="h-4 w-28 animate-pulse rounded-sm bg-accent/30" />
                    <div className="h-4 w-24 animate-pulse rounded-sm bg-accent/30" />
                    <div className="h-4 w-28 animate-pulse rounded-sm bg-accent/30" />
                    <div className="h-4 w-28 animate-pulse rounded-sm bg-accent/30" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded-sm bg-accent/30" />
                    <div className="h-2 w-full animate-pulse rounded bg-accent/30" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
