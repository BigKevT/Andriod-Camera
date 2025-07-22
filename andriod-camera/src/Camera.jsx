import React, { useRef, useState, useEffect } from 'react';
import { findMacroCameraDeviceId } from './findMacroCameraDeviceId';

// Utility to detect platform
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = () => /Android/.test(navigator.userAgent);

/**
 * React component: starts camera preview immediately on mount,
 * picks macro camera on Android, and captures photo on button press.
 */
export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  // Initialize preview on mount
  useEffect(() => {
    async function startPreview() {
      const constraints = { facingMode: 'environment' };
      if (isAndroid()) {
        const deviceId = await findMacroCameraDeviceId();
        if (deviceId) constraints.deviceId = { exact: deviceId };
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
        streamRef.current = stream;
        const videoEl = videoRef.current;
        videoEl.srcObject = stream;
        await videoEl.play();
      } catch (err) {
        console.error('Error starting preview:', err);
      }
    }
    startPreview();

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Capture photo using ImageCapture autofocus
  async function capturePhoto() {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    
    // Continuous focus on Android
    if (isAndroid()) {
      const caps = track.getCapabilities();
      if (caps.focusMode?.includes('continuous')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      }
    }

    const imageCapture = new window.ImageCapture(track);
    let photoCaps = {};
    try { photoCaps = await imageCapture.getPhotoCapabilities(); } catch {}

    // Trigger single-shot autofocus if available
    if (photoCaps.focusMode?.includes('single-shot')) {
      await imageCapture.setOptions({ focusMode: 'single-shot' }).catch(() => {});
    }

    // Take photo
    let blob;
    try {
      blob = await imageCapture.takePhoto();
    } catch {
      const frame = await imageCapture.grabFrame();
      const canvas = document.createElement('canvas');
      canvas.width = frame.displayWidth;
      canvas.height = frame.displayHeight;
      canvas.getContext('2d').drawImage(frame, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      blob = await (await fetch(dataUrl)).blob();
    }

    setPhotoUrl(URL.createObjectURL(blob));
  }

  return (
    <div className="relative w-screen h-screen">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <button onClick={capturePhoto} className="px-6 py-3">
          📸 Capture
        </button>
      </div>
      {photoUrl && (
        <img
          src={photoUrl}
          alt="Captured"
          className="absolute top-0 left-0 w-full h-full object-contain bg-black"
        />
      )}
    </div>
  );
}
