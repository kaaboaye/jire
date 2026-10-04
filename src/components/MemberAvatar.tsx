import { hueFromKey } from "./ProjectAvatar";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? [Array.from(words[0])[0], Array.from(words[words.length - 1])[0]]
      : Array.from(words[0] ?? "?").slice(0, 2);
  return letters.join("").toLocaleUpperCase("pl");
}

const SIZES = {
  sm: "size-5 text-[9px]",
  md: "size-7 text-[11px]",
  lg: "size-10 text-sm",
};

/** Round, to tell people apart from the square project avatars. */
export function MemberAvatar({
  name,
  size = "lg",
  labelled = false,
}: {
  name: string;
  size?: keyof typeof SIZES;
  /** Announce the person's name; leave off when the name is shown next to it. */
  labelled?: boolean;
}) {
  return (
    <span
      {...(labelled
        ? { role: "img", "aria-label": `Osoba: ${name}`, title: name }
        : { "aria-hidden": true })}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZES[size]}`}
      style={{ background: `hsl(${hueFromKey(name)} 45% 40%)` }}
    >
      {initials(name)}
    </span>
  );
}
