import { useEffect, useState } from "react";

type Props = {
  images: string[];
  onDone: () => void;
};

export default function Loader({ images, onDone }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let loaded = 0;

    const loadImage = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => resolve(); // don't hang forever
      });

    Promise.all(
      images.map((src) =>
        loadImage(src).then(() => {
          loaded++;
          const pct = Math.round((loaded / Math.max(images.length, 1)) * 100);
          setProgress(pct);
        })
      )
    ).then(() => {
      // tiny pause so it doesn't flash on fast connections
      setTimeout(onDone, 250);
    });
  }, [images, onDone]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="text-2xl font-bold tracking-widest">VAAL EXOTICS</div>

        <div className="mt-4 h-1 w-56 bg-white/20 overflow-hidden rounded">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-2 text-sm opacity-70">Loading {progress}%</div>
      </div>
    </div>
  );
}