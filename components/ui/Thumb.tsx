/* eslint-disable @next/next/no-img-element */
export function Thumb({ src, size = 44, alt = "" }: { src: string | null; size?: number; alt?: string }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-lg object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div className="shrink-0 rounded-lg bg-line" style={{ width: size, height: size }} />
  );
}
