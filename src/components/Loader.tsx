import { useEffect, useRef, useState } from "react";

type Props = {
  images: string[];
  onDone: () => void;
};

export default function Loader({ images, onDone }: Props) {
  const [progress, setProgress] = useState(0);
  const targetProgress = useRef(0);
  const doneTriggered = useRef(false);

  useEffect(() => {
    let loaded = 0;
    let animationFrame: number;

    const total = Math.max(images.length, 1);

    const loadImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();

        img.onload = () => resolve();
        img.onerror = () => resolve(); // don't get stuck forever
        img.src = src;

        // handle cached images properly
        if (img.complete) {
          resolve();
        }
      });

    const animateProgress = () => {
      setProgress((prev) => {
        const target = targetProgress.current;

        if (prev >= 100 && !doneTriggered.current) {
          doneTriggered.current = true;
          setTimeout(onDone, 250);
          return 100;
        }

        // Smooth easing toward target
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) return target;

        return prev + diff * 0.12;
      });

      animationFrame = requestAnimationFrame(animateProgress);
    };

    animationFrame = requestAnimationFrame(animateProgress);

    Promise.all(
      images.map((src) =>
        loadImage(src).then(() => {
          loaded++;
          targetProgress.current = Math.round((loaded / total) * 100);
        })
      )
    ).then(() => {
      targetProgress.current = 100;
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [images, onDone]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="text-2xl font-bold tracking-widest">VAAL EXOTICS</div>

        <div className="mt-4 h-1 w-56 overflow-hidden rounded bg-white/20">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="mt-2 text-sm opacity-70">
          Loading {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}