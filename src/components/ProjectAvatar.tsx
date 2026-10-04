function hueFromKey(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

export function ProjectAvatar({
  projectKey,
  size = "md",
}: {
  projectKey: string;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "size-6 text-[10px]" : "size-9 text-xs";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-semibold tracking-wide text-white ${dimensions}`}
      style={{ background: `hsl(${hueFromKey(projectKey)} 45% 40%)` }}
    >
      {projectKey.slice(0, 2)}
    </span>
  );
}
