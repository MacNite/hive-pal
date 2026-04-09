import { useState, useRef, useCallback, useEffect } from 'react';
import jsQR from 'jsqr';

export interface UseQrScannerReturn {
  isScanning: boolean;
  error: string | null;
  isSupported: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
}

export function useQrScanner(
  onScan: (data: string) => boolean | void,
): UseQrScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);

  // Keep callback ref up to date without triggering re-renders
  onScanRef.current = onScan;

  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  const stopScanning = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      rafIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      // Callback returns true to accept the scan and stop, false/void to keep scanning
      const accepted = onScanRef.current(code.data);
      if (accepted) return;
    }
    rafIdRef.current = requestAnimationFrame(scanFrame);
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setError(null);

      if (!isSupported) {
        setError('Camera access is not available in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      rafIdRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError(
            'Camera access was denied. Please allow camera access to scan QR codes.',
          );
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to start camera.');
      }
    }
  }, [isSupported, scanFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isScanning,
    error,
    isSupported,
    videoRef,
    canvasRef,
    startScanning,
    stopScanning,
  };
}
