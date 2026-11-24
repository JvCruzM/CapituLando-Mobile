export function imageFrame(
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  fit: "cover" | "contain" = "contain",
  position: "top" | "center" | "bottom" = "center",
) {
  const scale = (fit === "cover" ? Math.max : Math.min)(
    width / imageWidth,
    height / imageHeight,
  );
  const w = imageWidth * scale,
    h = imageHeight * scale;
  return {
    width: w,
    height: h,
    left: (width - w) / 2,
    top:
      position === "top"
        ? 0
        : position === "bottom"
          ? height - h
          : (height - h) / 2,
  };
}

export function loadedImageSize(event: unknown) {
  if (!event || typeof event !== "object") return null;
  const value = event as {
    source?: { width?: number; height?: number };
    target?: { naturalWidth?: number; naturalHeight?: number };
  };
  const width = value.source?.width ?? value.target?.naturalWidth;
  const height = value.source?.height ?? value.target?.naturalHeight;
  return typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0 &&
    Number.isFinite(width) &&
    Number.isFinite(height)
    ? { width, height }
    : null;
}
