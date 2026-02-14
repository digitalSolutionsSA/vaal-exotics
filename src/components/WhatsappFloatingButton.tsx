import React from "react";
import { MessageCircle } from "lucide-react";

type WhatsAppFloatingButtonProps = {
  phoneNumber: string;
  message?: string;
};

export default function WhatsAppFloatingButton({
  phoneNumber,
  message = "Hi! I'm interested in your products. Can you help me please?",
}: WhatsAppFloatingButtonProps) {
  const waUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <>
      <style>{`
        @keyframes vaal-wiggle {
          0%, 92%, 100% { transform: translate3d(0,0,0) rotate(0deg); }
          93% { transform: translate3d(-1px,0,0) rotate(-2deg); }
          94% { transform: translate3d(2px,0,0) rotate(2deg); }
          95% { transform: translate3d(-2px,0,0) rotate(-2deg); }
          96% { transform: translate3d(2px,0,0) rotate(2deg); }
          97% { transform: translate3d(-1px,0,0) rotate(-1deg); }
          98% { transform: translate3d(1px,0,0) rotate(1deg); }
          99% { transform: translate3d(0,0,0) rotate(0deg); }
        }

        @keyframes vaal-pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.0), 0 0 30px rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0.08), 0 0 50px rgba(220, 38, 38, 0.7); }
        }
      `}</style>

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 group"
      >
        <div
          className="
            relative
            h-14 w-14 sm:h-16 sm:w-16
            rounded-full
            bg-red-600
            grid place-items-center
            border border-white/20
            shadow-lg
            transition-transform duration-200
            hover:scale-105 active:scale-95
          "
          style={{
            animation: "vaal-wiggle 6s infinite, vaal-pulseGlow 2.2s infinite",
          }}
        >
          {/* outer glow halo */}
          <div className="absolute inset-0 rounded-full blur-xl opacity-40 bg-red-600" />

          <MessageCircle className="relative h-7 w-7 sm:h-8 sm:w-8 text-white" />

          {/* hover label */}
          <div
            className="
              pointer-events-none
              absolute right-full mr-3
              hidden sm:block
              rounded-full
              bg-black/70
              px-3 py-1
              text-xs text-white
              opacity-0 translate-x-2
              transition-all duration-200
              group-hover:opacity-100 group-hover:translate-x-0
              border border-white/10
              backdrop-blur
              whitespace-nowrap
            "
          >
            WhatsApp us
          </div>
        </div>
      </a>
    </>
  );
}
