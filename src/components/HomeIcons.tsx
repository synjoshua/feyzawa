/** Minimal Charlie's Tea–style flat icons (original, not brand assets). */

type IconProps = { className?: string };

export function IconIntern({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7 7h10v2H7V7zm-2 4h14v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9zm3 2v2h2v-2H8zm4 0v2h2v-2h-2zm-4 4v2h2v-2H8zm4 0v2h2v-2h-2zM9 4a3 3 0 1 1 6 0v1H9V4z" />
    </svg>
  );
}

export function IconCalifornia({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c4.4 0 8 3.2 8 7.6 0 5.2-6.2 11-8 12.4C10.2 20.6 4 14.8 4 9.6 4 5.2 7.6 2 12 2zm0 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
    </svg>
  );
}

export function IconRemote({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4 6h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l2 3h-6l2-3H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm2 3v5h12V9H6z" />
    </svg>
  );
}

export function IconTracker({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1.5V9h4.5L14 4.5zM8 12h8v1.5H8V12zm0 3.5h8V17H8v-1.5zm0 3.5h5V20.5H8V19z" />
    </svg>
  );
}
