"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

/** Draws the selected crop region onto a canvas at the image's native resolution and reads it back out as a
 * PNG blob -- react-image-crop only tracks the selection rectangle, it doesn't produce pixels itself. */
function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scaleX));
  canvas.height = Math.max(1, Math.round(crop.height * scaleY));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not supported in this browser."));

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop image."))), "image/png");
  });
}

export default function LogoCropModal({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
}) {
  const [imageUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop({ unit: "%", width: 90, height: 90, x: 5, y: 5 }, width, height));
  }

  async function handleApply() {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      setError("Drag to select the area you want to keep.");
      return;
    }
    setError(null);
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      onCropped(new File([blob], "logo.png", { type: "image/png" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to crop image.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <Card
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-slate-50">Crop logo</h2>
          <p className="mt-1 text-xs text-slate-400">Drag the handles to select the area you want to keep.</p>
        </div>

        <div className="flex justify-center rounded-lg bg-black/20 p-2">
          <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={setCompletedCrop}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={imageUrl} alt="" onLoad={onImageLoad} className="max-h-[60vh]" />
          </ReactCrop>
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying}>
            {applying ? "Applying…" : "Apply crop"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
