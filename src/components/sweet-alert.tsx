"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// ===== Types =====
interface AlertOptions {
  title: string;
  message?: string;
  type?: "success" | "error" | "warning" | "info" | "confirm";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
  autoClose?: number;
}

interface SweetAlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

// ===== Context =====
const SweetAlertContext = createContext<SweetAlertContextType>({
  showAlert: () => {},
  hideAlert: () => {},
});

export function useSweetAlert() {
  return useContext(SweetAlertContext);
}

// ===== Provider =====
export function SweetAlertProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AlertOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const [processing, setProcessing] = useState(false);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setConfig(null);
      setProcessing(false);
    }, 300);
  }, []);

  const showAlert = useCallback(
    (options: AlertOptions) => {
      setConfig(options);
      setVisible(true);
      if (options.autoClose && options.autoClose > 0) {
        setTimeout(() => {
          setVisible(false);
          setTimeout(() => {
            setConfig(null);
            setProcessing(false);
          }, 300);
        }, options.autoClose);
      }
    },
    []
  );

  const handleConfirm = async () => {
    if (config?.onConfirm) {
      setProcessing(true);
      try {
        await config.onConfirm();
      } finally {
        setProcessing(false);
      }
    }
    hideAlert();
  };

  const handleCancel = () => {
    config?.onCancel?.();
    hideAlert();
  };

  const type = config?.type || "info";
  const isConfirm = type === "confirm";
  const showCancelBtn = config?.showCancel !== undefined ? config.showCancel : isConfirm;

  const iconConfig: Record<string, { bg: string; icon: ReactNode; btn: string }> = {
    success: {
      bg: "bg-emerald-100",
      icon: (
        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
      btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    error: {
      bg: "bg-red-100",
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      btn: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      bg: "bg-amber-100",
      icon: (
        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    info: {
      bg: "bg-blue-100",
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    confirm: {
      bg: "bg-red-100",
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      btn: "bg-red-600 hover:bg-red-700 text-white",
    },
  };

  const icon = iconConfig[type] || iconConfig.info;

  return (
    <SweetAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      {/* SweetAlert Overlay — always rendered, visibility controlled by state */}
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
          config && visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            config && visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={showCancelBtn ? handleCancel : undefined}
        />

        {/* Card */}
        {config && (
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center transform transition-all duration-300 ${
              visible ? "scale-100 translate-y-0" : "scale-90 translate-y-4"
            }`}
          >
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div
                className={`w-20 h-20 ${icon.bg} rounded-full flex items-center justify-center`}
                style={{
                  animation: visible ? "bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none",
                }}
              >
                {icon.icon}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{config.title}</h3>

            {/* Message */}
            {config.message && (
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">{config.message}</p>
            )}
            {!config.message && <div className="mb-4" />}

            {/* Buttons */}
            <div className={`flex gap-3 ${showCancelBtn ? "" : "justify-center"}`}>
              {showCancelBtn && (
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                >
                  {config.cancelText || "Batal"}
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={processing}
                className={`flex-1 px-4 py-2.5 ${icon.btn} rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  config.confirmText || (isConfirm ? "Ya, Hapus" : "OK")
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Animation Keyframes */}
      <style jsx global>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </SweetAlertContext.Provider>
  );
}
