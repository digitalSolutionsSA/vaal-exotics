import { useEffect, useRef, useState } from "react";

type Props = {
  images: string[];
  onDone: () => void;
};

export default function Loader({ images, onDone }: Props) {
  const [progress, setProgress] = useState(0);

  const visualProgress = useRef(0);
  const realProgress = useRef(0);
  const doneTriggered = useRef(false);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    doneTriggered.current = false;
    visualProgress.current = 0;
    realProgress.current = 0;
    setProgress(0);

    let loaded = 0;
    const uniqueImages = Array.from(new Set(images.filter(Boolean)));

    const updateRealProgress = () => {
      realProgress.current = Math.round(
        (loaded / Math.max(uniqueImages.length, 1)) * 100
      );
    };

    const loadImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();

        const finish = () => resolve();

        img.onload = finish;
        img.onerror = finish;
        img.decoding = "async";
        img.loading = "eager";
        img.src = src;

        if (img.complete) {
          resolve();
        }
      });

    const animate = () => {
      const target = realProgress.current;
      let next = visualProgress.current;

      if (target >= 100) {
        next += (100 - next) * 0.22 + 0.8;
      } else {
        const catchUp = (target - next) * 0.18;
        const maxAllowedAhead = 12;
        const allowedTarget = Math.min(target + maxAllowedAhead, 92);

        const idleStep =
          next < allowedTarget
            ? Math.max(0.15, (allowedTarget - next) * 0.015)
            : 0;

        next += Math.max(catchUp, idleStep);
      }

      if (next > 100) next = 100;
      if (next < 0) next = 0;

      visualProgress.current = next;

      if (mountedRef.current) {
        setProgress(next);
      }

      if (next >= 99.8 && target >= 100 && !doneTriggered.current) {
        doneTriggered.current = true;
        visualProgress.current = 100;

        if (mountedRef.current) {
          setProgress(100);
        }

        setTimeout(() => {
          if (mountedRef.current) onDone();
        }, 120);

        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    Promise.all(
      uniqueImages.map((src) =>
        loadImage(src).then(() => {
          loaded += 1;
          updateRealProgress();
        })
      )
    ).then(() => {
      realProgress.current = 100;
    });

    return () => {
      mountedRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [images, onDone]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="text-2xl font-bold tracking-widest">VAAL EXOTICS</div>

        <div className="mt-4 h-1 w-56 overflow-hidden rounded bg-white/20">
          <div
            className="h-full bg-white transition-[width] duration-75 ease-out"
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