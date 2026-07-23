"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Models CDN URL (official face-api.js models)
const MODEL_URL =
  "https://justadudewhohacks.github.io/face-api.js/models";

// Oval constants (must match drawFaceGuide)
const OVAL_RATIO_X = 0.18;
const OVAL_RATIO_Y = 0.28;
const OVAL_OFFSET_Y = -10;

// Check if face center is roughly inside the oval guide area
// Uses a buffer zone (1.3x) so the face doesn't need to be perfectly centered
const OVAL_BUFFER = 1.3;
function isFaceInOval(
  faceX: number,
  faceY: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2 + OVAL_OFFSET_Y;
  const rx = canvasWidth * OVAL_RATIO_X * OVAL_BUFFER;
  const ry = canvasHeight * OVAL_RATIO_Y * OVAL_BUFFER;
  if (rx <= 0 || ry <= 0) return false;
  // Ellipse equation with buffer: ((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1
  return (
    Math.pow((faceX - cx) / rx, 2) + Math.pow((faceY - cy) / ry, 2) <= 1
  );
}

function drawFaceGuide(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  highlight: "none" | "finding" | "in-position" = "none",
  countdown: number | null = null
) {
  // Guard against zero/small canvas dimensions
  if (width < 20 || height < 20) return;

  const centerX = width / 2;
  const centerY = height / 2 + OVAL_OFFSET_Y;
  const rx = Math.max(1, width * OVAL_RATIO_X);
  const ry = Math.max(1, height * OVAL_RATIO_Y);

  // Clear canvas first
  ctx.clearRect(0, 0, width, height);

  // Choose colors based on state
  const isInPosition = highlight === "in-position";
  const isFinding = highlight === "finding";
  const strokeColor = isInPosition
    ? "rgba(16, 185, 129, 0.7)"
    : isFinding
    ? "rgba(59, 130, 246, 0.5)"
    : "rgba(255, 255, 255, 0.4)";
  const innerStrokeColor = isInPosition
    ? "rgba(16, 185, 129, 0.2)"
    : "rgba(255, 255, 255, 0.1)";

  // Face oval guide
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = isInPosition ? 3 : 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Subtle inner glow
  const innerRx = Math.max(1, rx - 4);
  const innerRy = Math.max(1, ry - 4);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, innerRx, innerRy, 0, 0, Math.PI * 2);
  ctx.strokeStyle = innerStrokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eye dots guide
  const eyeY = centerY - ry * 0.22;
  const ex = rx * 0.3;
  ctx.beginPath();
  ctx.arc(centerX - ex, eyeY, 3, 0, Math.PI * 2);
  ctx.arc(centerX + ex, eyeY, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fill();

  // Countdown display — center of oval
  if (countdown !== null && countdown > 0) {
    const pulseSize = 60 + (3 - countdown) * 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(countdown), centerX, centerY);
  }

  // Text label
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  let label = "Posisikan wajah di sini";
  if (isFinding) label = "Mendeteksi wajah...";
  if (isInPosition && countdown === null) label = "Wajah terdeteksi!";
  if (countdown !== null && countdown > 0) label = "Mengambil data...";

  ctx.fillText(label, centerX, height - 20);
}

interface FaceCameraProps {
  onFaceDetected: (descriptor: number[]) => void;
  onDetectionUpdate?: (result: {
    detected: boolean;
    confidence: number;
  }) => void;
  onPositionUpdate?: (result: {
    inOval: boolean;
    countdown: number | null;
  }) => void;
  onError?: (error: string) => void;
  active?: boolean;
  children?: React.ReactNode;
}

export default function FaceCamera({
  onFaceDetected,
  onDetectionUpdate,
  onPositionUpdate,
  onError,
  active = true,
  children,
}: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const descriptorRef = useRef<number[] | null>(null);

  const [status, setStatus] = useState<
    "loading-models" | "loading-camera" | "ready" | "error"
  >("loading-models");
  const [statusMessage, setStatusMessage] = useState(
    "Memuat model face recognition..."
  );
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [highlight, setHighlight] = useState<"none" | "finding" | "in-position">("none");
  const [countdown, setCountdown] = useState<number | null>(null);

  // Draw initial guide when camera is ready
  useEffect(() => {
    if (status !== "ready") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Set canvas to video dimensions
    if (videoRef.current) {
      const dims = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };
      if (dims.width > 0 && dims.height > 0) {
        canvas.width = dims.width;
        canvas.height = dims.height;
      }
    }

    drawFaceGuide(ctx, canvas.width, canvas.height, "none");
  }, [status]);

  // Load face-api models
  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        const faceapi = await import("face-api.js");

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        if (!cancelled) {
          setModelsLoaded(true);
          setStatusMessage("Mengakses kamera...");
          setStatus("loading-camera");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setStatusMessage("Gagal memuat model face recognition");
          onError?.("Gagal memuat model face recognition");
        }
      }
    }

    loadModels();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  // Start camera
  useEffect(() => {
    if (!modelsLoaded) return;
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setCameraActive(true);
        setStatus("ready");
        setStatusMessage("Kamera siap");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          const msg =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Izin kamera ditolak. Izinkan akses kamera di browser."
              : "Gagal mengakses kamera";
          setStatusMessage(msg);
          onError?.(msg);
        }
      }
    }

    startCamera();
    return () => {
      cancelled = true;
    };
  }, [modelsLoaded, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Start countdown
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) return; // already counting

    countdownRef.current = 3;
    setCountdown(3);
    onPositionUpdate?.({ inOval: true, countdown: 3 });

    countdownTimerRef.current = window.setInterval(() => {
      countdownRef.current = (countdownRef.current ?? 3) - 1;

      if (countdownRef.current <= 0) {
        // Countdown finished — capture descriptor
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        countdownRef.current = null;
        setCountdown(null);

        // Fire the face detected callback with stored descriptor
        if (descriptorRef.current) {
          onFaceDetected(descriptorRef.current);
          descriptorRef.current = null;
        }
        onPositionUpdate?.({ inOval: true, countdown: null });
      } else {
        setCountdown(countdownRef.current);
        onPositionUpdate?.({
          inOval: true,
          countdown: countdownRef.current,
        });
      }
    }, 1000);
  }, [onFaceDetected, onPositionUpdate]);

  // Reset countdown
  const resetCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    countdownRef.current = null;
    setCountdown(null);
    descriptorRef.current = null;
  }, []);

  // Detect face periodically
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || detecting) return;

    const faceapi = await import("face-api.js");

    setDetecting(true);
    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!canvas || !ctx) return;

      const dims = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      // Match canvas dimensions to video
      faceapi.matchDimensions(canvas, dims);

      if (detection) {
        const resized = faceapi.resizeResults(detection, dims);

        // Get face center position (in resized coordinates)
        const faceCenterX = resized.detection.box.x + resized.detection.box.width / 2;
        const faceCenterY = resized.detection.box.y + resized.detection.box.height / 2;

        // Check if face is inside the oval
        const inOval = isFaceInOval(
          faceCenterX,
          faceCenterY,
          canvas.width,
          canvas.height
        );

        // Check face size is roughly reasonable (reject only extreme cases)
        const faceW = resized.detection.box.width;
        const faceH = resized.detection.box.height;
        const minArea = (canvas.width * canvas.height) * 0.01;  // at least 1% of frame
        const maxArea = (canvas.width * canvas.height) * 0.6;   // at most 60% of frame
        const faceArea = faceW * faceH;
        const faceSizeOk = faceArea > minArea && faceArea < maxArea;

        const positionCorrect = inOval && faceSizeOk;

        if (positionCorrect) {
          // Face is in correct position
          setHighlight("in-position");

          // Store descriptor for later use
          descriptorRef.current = Array.from(detection.descriptor);

          // Report detection state
          onDetectionUpdate?.({
            detected: true,
            confidence: detection.detection.score,
          });

          // Start countdown if not already started
          if (!countdownTimerRef.current) {
            startCountdown();
          }
        } else {
          // Face detected but not in correct position
          if (countdownTimerRef.current) {
            resetCountdown();
          }
          setHighlight("finding");
          descriptorRef.current = null;

          onDetectionUpdate?.({
            detected: true,
            confidence: detection.detection.score,
          });
          onPositionUpdate?.({ inOval: false, countdown: null });
        }

        // Draw detection box + landmarks
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        try {
          faceapi.draw.drawFaceLandmarks(canvas, resized);
        } catch {
          // optional
        }

        // Draw mini guide overlay
        drawFaceGuide(ctx, canvas.width, canvas.height, positionCorrect ? "in-position" : "finding", countdownRef.current);

        // Draw crosshair at oval center
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + OVAL_OFFSET_Y;
        const crossColor = positionCorrect
          ? "rgba(16, 185, 129, 0.3)"
          : "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.moveTo(centerX, centerY - 10);
        ctx.lineTo(centerX, centerY + 10);
        ctx.strokeStyle = crossColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // No face detected
        if (countdownTimerRef.current) {
          resetCountdown();
        }
        setHighlight("none");
        descriptorRef.current = null;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawFaceGuide(ctx, canvas.width, canvas.height, "none");

        onDetectionUpdate?.({ detected: false, confidence: 0 });
        onPositionUpdate?.({ inOval: false, countdown: null });
      }
    } catch {
      // Clear canvas and draw guide on error
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          drawFaceGuide(ctx, canvasRef.current.width, canvasRef.current.height, "none");
        }
      }
      onDetectionUpdate?.({ detected: false, confidence: 0 });
      onPositionUpdate?.({ inOval: false, countdown: null });
    } finally {
      setDetecting(false);
    }
  }, [
    onFaceDetected,
    onDetectionUpdate,
    onPositionUpdate,
    startCountdown,
    resetCountdown,
  ]);

  // Auto-detect when ready
  useEffect(() => {
    if (status !== "ready" || !active) return;

    // Draw initial guide once
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      drawFaceGuide(ctx, canvas.width, canvas.height, "none");
    }

    // Start detection loop (every 500ms for smoother response)
    intervalRef.current = window.setInterval(() => {
      detectFace();
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [status, active, detectFace]);

  return (
    <div className="relative">
      {/* Video */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[4/3]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${
            cameraActive ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Canvas overlay for face box */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Countdown ring animation */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full border-4 border-emerald-500 animate-ping"
              style={{
                width: 70 + (3 - countdown) * 12,
                height: 70 + (3 - countdown) * 12,
                opacity: 0.3 + countdown * 0.15,
              }}
            />
          </div>
        )}

        {/* Loading / Error overlay */}
        {status !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white">
            {status === "loading-models" || status === "loading-camera" ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-3" />
                <p className="text-sm text-gray-300">{statusMessage}</p>
              </>
            ) : (
              <>
                <svg
                  className="w-12 h-12 text-red-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-sm text-red-300 text-center px-4">
                  {statusMessage}
                </p>
              </>
            )}
          </div>
        )}

        {/* Camera active indicator */}
        {cameraActive && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-white/80 font-medium">
              Kamera aktif
            </span>
          </div>
        )}
      </div>

      {/* Children (action buttons, etc.) */}
      {children}
    </div>
  );
}

// Fungsi static untuk ambil foto dari video (untuk mode register)
export async function captureFrame(
  video: HTMLVideoElement
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal membuat canvas");
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.8);
}
