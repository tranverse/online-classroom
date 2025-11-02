import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  size = "md",
}) => {
  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-xl",
    xl: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Nền mờ đẹp, kiểu kính mờ */}
      <div
        className="absolute inset-0 bg-gray-100/30 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Hộp modal */}
      <div
        className={`relative bg-white w-full ${sizeClasses[size]} rounded-2xl shadow-2xl border border-gray-200/60`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
