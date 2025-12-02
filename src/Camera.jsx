import React, { useRef, useState, useEffect } from 'react';

/**
 * React component: Hybrid camera solution.
 * - In-app preview with ID card overlay and torch support.
 * - Fallback to native system camera for maximum clarity.
 */
export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Initialize preview on mount
  useEffect(() => {
    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: { ideal: 'continuous' }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          // Check for torch capability
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();
          if (capabilities.torch) {
            setHasTorch(true);
          }

          // Apply continuous focus if available
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          }
        }
      } catch (err) {
        console.error('Error starting camera:', err);
        setError('Could not start camera. Please ensure permissions are granted.');
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Toggle Torch
  async function toggleTorch() {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];

    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }]
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.error('Error toggling torch:', err);
    }
  }

  // Capture photo using ImageCapture (high res) or Canvas fallback
  async function capturePhoto() {
    const stream = streamRef.current;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const imageCapture = new window.ImageCapture(track);

    try {
      const blob = await imageCapture.takePhoto();
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.warn('ImageCapture failed, falling back to canvas:', err);

      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPhotoUrl(dataUrl);
    }
  }

  // Handle native file input
  function handleNativeCapture(e) {
    const file = e.target.files[0];
    if (file) {
      setPhotoUrl(URL.createObjectURL(file));
    }
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {error && (
        <div className="absolute top-10 left-0 w-full text-center text-red-500 bg-white p-2 z-50">
          {error}
        </div>
      )}

      {/* Video Preview */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        playsInline
        muted
      />

      {/* ID Card Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="w-[85%] aspect-[1.586] border-2 border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br"></div>
          <p className="absolute -top-8 w-full text-center text-white text-sm font-medium shadow-black drop-shadow-md">
            Align ID Card Here
          </p>
        </div>
      </div>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
        {hasTorch && (
          <button
            onClick={toggleTorch}
            className={`p-3 rounded-full backdrop-blur-md transition-colors ${torchOn ? 'bg-yellow-400/80 text-black' : 'bg-white/20 text-white'}`}
          >
            {torchOn ? '🔦 On' : '⚡ Off'}
          </button>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-8 pb-12 z-20 flex flex-col items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center w-full gap-8">
          {/* Native Camera Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-white/80 active:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              📷
            </div>
            <span className="text-xs">System Cam</span>
          </button>

          {/* Shutter Button */}
          <button
            onClick={capturePhoto}
            className="w-20 h-20 bg-white rounded-full border-4 border-white/50 shadow-lg active:scale-95 transition-transform"
            aria-label="Take Photo"
          />

          {/* Spacer to balance layout */}
          <div className="w-10"></div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleNativeCapture}
        className="hidden"
      />

      {/* Photo Preview Modal */}
      {photoUrl && (
        <div className="absolute top-0 left-0 w-full h-full bg-black z-50 flex flex-col items-center justify-center p-4">
          <img
            src={photoUrl}
            alt="Captured"
            className="max-w-full max-h-[80%] object-contain rounded-lg shadow-2xl border border-gray-800"
          />
          <div className="flex gap-4 mt-8 w-full max-w-xs">
            <button
              onClick={() => setPhotoUrl(null)}
              className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-xl font-medium active:bg-gray-700 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={() => { /* Handle confirm/upload here */ }}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium active:bg-blue-500 transition-colors shadow-lg shadow-blue-900/30"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
