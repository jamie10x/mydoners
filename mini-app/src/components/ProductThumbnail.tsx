interface ProductThumbnailProps {
  imageUrl: string | null;
  size?: "sm" | "md";
}

// Shared photo/placeholder box for the menu list and cart — a real photo
// gets object-cover (correct — it's meant to fill the square), but a
// missing photo shows the logo mark at its own small natural size instead
// of stretching/cropping something into the frame (that's what made every
// placeholder look "zoomed in" before real photos existed for most items).
export function ProductThumbnail({ imageUrl, size = "md" }: ProductThumbnailProps) {
  const dimension = size === "sm" ? "h-12 w-12" : "h-16 w-16";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${dimension} shrink-0 rounded-xl border border-stone-100 object-cover`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`flex ${dimension} shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50`}>
      <img src="/logo.svg" alt="" className="h-6 w-6 rounded-md opacity-70" />
    </div>
  );
}
