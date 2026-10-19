export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-md bg-neutral-200" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-neutral-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-neutral-200" />
    </div>
  );
}
