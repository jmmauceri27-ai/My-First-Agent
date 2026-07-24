const RIDGES = [
  {
    height: "30vh",
    color: "rgba(160, 200, 255, 0.35)",
    clipPath:
      "polygon(0% 55%, 10% 35%, 22% 50%, 33% 20%, 45% 42%, 58% 15%, 70% 38%, 83% 22%, 92% 45%, 100% 30%, 100% 100%, 0% 100%)",
  },
  {
    height: "40vh",
    color: "rgba(110, 165, 250, 0.45)",
    clipPath:
      "polygon(0% 60%, 12% 30%, 25% 48%, 38% 18%, 50% 40%, 63% 12%, 75% 35%, 88% 20%, 100% 42%, 100% 100%, 0% 100%)",
  },
  {
    height: "52vh",
    color: "rgba(65, 125, 240, 0.55)",
    clipPath:
      "polygon(0% 50%, 15% 25%, 28% 45%, 40% 10%, 55% 35%, 68% 8%, 80% 30%, 92% 15%, 100% 38%, 100% 100%, 0% 100%)",
  },
  {
    height: "66vh",
    color: "rgba(4, 10, 26, 0.88)",
    clipPath:
      "polygon(0% 45%, 10% 20%, 24% 40%, 36% 5%, 50% 28%, 64% 0%, 78% 25%, 90% 8%, 100% 32%, 100% 100%, 0% 100%)",
  },
];

export default function BackgroundArt() {
  return (
    <div aria-hidden className="bg-art pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {RIDGES.map((ridge, i) => (
        <div
          key={i}
          className="absolute inset-x-0 bottom-0 blur-[1px]"
          style={{ height: ridge.height, backgroundColor: ridge.color, clipPath: ridge.clipPath }}
        />
      ))}
    </div>
  );
}
