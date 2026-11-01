const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export const brandAsset = (file: string) => `${base}/brand/${file}`;

/** S-with-star logo mark (tight-cropped copy of user-supplied asset). */
export function BrandMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={brandAsset("logo-tight.svg")}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}

/** Standalone Scholix star, used as a small ornament. */
export function BrandStar({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={brandAsset("star-tight.svg")}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}

/** Mark + wordmark lockup. `tone="light"` for dark backgrounds. */
export function Brand({
  size = 30,
  tone = "dark",
  className = "",
  label = true,
}: {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
  label?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center justify-center rounded-xl ${tone === "light" ? "bg-[#faf7f0]" : ""}`}
        style={tone === "light" ? { padding: size * 0.12 } : undefined}
      >
        <BrandMark size={tone === "light" ? size * 0.76 : size} />
      </span>
      {label && (
        <span
          className={`font-display font-bold tracking-tight ${tone === "light" ? "text-[#faf7f0]" : "text-brand-navy"}`}
          style={{ fontSize: size * 0.62 }}
        >
          Scholix
        </span>
      )}
    </span>
  );
}

/** Full horizontal banner/wordmark (original asset). */
export function BrandBanner({ className = "" }: { className?: string }) {
  return <img src={brandAsset("Full-Banner.svg")} alt="Scholix" className={`object-contain ${className}`} />;
}
