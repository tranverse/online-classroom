import React, { createContext, useContext, useState } from "react";

const ToastContext = createContext(null as any);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<"success" | "error">("success");

  const show = (msg: string, t: "success" | "error" = "success") => {
    setMessage(msg);
    setType(t);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded shadow ${
            type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export default ToastProvider;
