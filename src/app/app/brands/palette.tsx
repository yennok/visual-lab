export function Palette({ palette }: { palette: string[] }) {
  if (!palette.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {palette.map((hex) => (
        <div
          key={hex}
          className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3"
        >
          <span
            className="h-6 w-6 rounded-full border"
            style={{ backgroundColor: hex }}
          />
          <span className="text-xs text-zinc-600">{hex}</span>
        </div>
      ))}
    </div>
  );
}
