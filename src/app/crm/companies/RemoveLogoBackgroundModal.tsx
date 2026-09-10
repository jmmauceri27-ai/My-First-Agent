"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

/** Logos rarely need to be bigger than this to look sharp in the app's thumbnails, and capping resolution
 * keeps the per-pixel color-key recompute below fast enough to run on every tolerance-slider tick. */
const MAX_DIM = 512;

/** Standard Photoshop-style checkerboard, so a transparent area reads as "removed" rather than as an empty box. */
const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundColor: "#2a2540",
  backgroundImage:
    "linear-gradient(45deg, #3a3550 25%, transparent 25%), linear-gradient(-45deg, #3a3550 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3a3550 75%), linear-gradient(-45deg, transparent 75%, #3a3550 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

/** Makes every pixel within `tolerancePct` of `color` transparent, with a soft feather band at the edge of the
 * threshold so the cut isn't a hard, jagged line. Operates on a copy -- `base` is never mutated, so the slider
 * can be dragged back and forth from the original pixels every time instead of compounding rounding error. */
function applyColorKey(base: ImageData, color: [number, number, number], tolerancePct: number): ImageData {
  const out = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
  const [tr, tg, tb] = color;
  const maxDist = Math.sqrt(3 * 255 * 255);
  const threshold = (tolerancePct / 100) * maxDist;
  const feather = Math.max(threshold * 0.25, 8);
  const data = out.data;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - tr;
    const dg = data[i + 1] - tg;
    const db = data[i + 2] - tb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist <= threshold) {
      data[i + 3] = 0;
    } else if (dist <= threshold + feather) {
      data[i + 3] = Math.round(data[i + 3] * ((dist - threshold) / feather));
    }
  }
  return out;
}

function imageDataToPngFile(data: ImageData): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not supported in this browser."));
  ctx.putImageData(data, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to process image."));
        return;
      }
      resolve(new File([blob], "logo.png", { type: "image/png" }));
    }, "image/png");
  });
}

export default function RemoveLogoBackgroundModal({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (result: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<ImageData | null>(null);
  const [pickedColor, setPickedColor] = useState<[number, number, number] | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setLoadError("Canvas is not supported in this browser.");
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      setBaseImage(ctx.getImageData(0, 0, width, height));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => setLoadError("Failed to load the image.");
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = useMemo(() => {
    if (!baseImage) return null;
    return pickedColor ? applyColorKey(baseImage, pickedColor, tolerance) : baseImage;
  }, [baseImage, pickedColor, tolerance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    canvas.getContext("2d")?.putImageData(preview, 0, 0);
  }, [preview]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!baseImage || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(baseImage.width - 1, Math.floor(((e.clientX - rect.left) / rect.width) * baseImage.width));
    const y = Math.min(baseImage.height - 1, Math.floor(((e.clientY - rect.top) / rect.height) * baseImage.height));
    const idx = (y * baseImage.width + x) * 4;
    setPickedColor([baseImage.data[idx], baseImage.data[idx + 1], baseImage.data[idx + 2]]);
  }

  async function handleDone(useTransparent: boolean) {
    const dataToUse = useTransparent ? preview : baseImage;
    if (!dataToUse) return;
    setFinishing(true);
    try {
      onDone(await imageDataToPngFile(dataToUse));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to process image.");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <Card
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Remove background</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Click the background color to make it transparent, then adjust the slider for how much of that
            color gets removed. Skip this if the logo already looks right.
          </p>
        </div>

        {loadError && <p className="text-sm text-critical">{loadError}</p>}

        <div className="flex justify-center rounded-lg p-2" style={CHECKERBOARD_STYLE}>
          {baseImage ? (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="max-h-[50vh] max-w-full cursor-crosshair"
            />
          ) : (
            !loadError && <p className="p-8 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Tolerance{pickedColor ? ` (${tolerance}%)` : ""}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            disabled={!pickedColor}
          />
        </label>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={finishing}>
              Cancel
            </Button>
            {pickedColor && (
              <Button variant="ghost" onClick={() => setPickedColor(null)} disabled={finishing}>
                Reset
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleDone(false)} disabled={finishing || !baseImage}>
              Skip
            </Button>
            <Button onClick={() => handleDone(true)} disabled={finishing || !baseImage || !pickedColor}>
              {finishing ? "Processing…" : "Use this"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
