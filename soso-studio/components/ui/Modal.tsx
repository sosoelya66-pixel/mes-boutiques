"use client";

import { useEffect } from "react";

export function Modal({
  onClose,
  children,
  wide = false,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className={`rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#d4b483]/15 bg-[#141317]/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-2xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalTitle({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <h2 className="text-lg font-semibold">{children}</h2>
      <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-white" aria-label="Fermer">
        ×
      </button>
    </div>
  );
}
