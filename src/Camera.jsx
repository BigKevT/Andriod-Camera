import React, { useRef, useState, useEffect } from 'react';

/**
 * React component: Optimal camera selection strategy.
 * Uses high-resolution constraints with exact facingMode to guide Chrome
 * to select the main rear camera, then applies delayed focus optimization.
 */
export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState(null);

  // Initialize preview on mount
  useEffect(() => {
    async function startCamera() {
      try {
        // Optimal constraints to guide Chrome to select main camera
        const optimalConstraints = {
          video: {
            // 1. Force rear camera with exact constraint
            facingMode: { exact: 'environment' },

            // 2. Request very high resolution (ideal) to guide selection to main camera
            // Even if device can't reach it, Chrome will pick the camera closest to this value
            width: { ideal: 4096 },  // 4K width
            height: { ideal: 2160 }, // 4K height

            // 3. Request stable frame rate
            frameRate: { ideal: 30 },

            // 4. Attempt continuous focus in initial request
            advanced: [
              { focusMode: 'continuous' }
            ]
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(optimalConstraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          console.log('✅ Successfully obtained stream. Applying focus optimization...');

          // Delayed focus optimization (double insurance)
          // Since load time is not critical, we use this time to ensure focus is activated
          setTimeout(async () => {
            const track = stream.getVideoTracks()[0];
            try {
              // Re-apply focus constraints to ensure focus mode is activated
              await track.applyConstraints({
                advanced: [
                  { focusMode: 'continuous' },
                  { focusDistance: 0.15 } // Attempt to lock near distance
                ]
              });
              console.log('✅ Focus optimization applied');
            } catch (e) {
              console.warn('⚠️ Focus optimization failed (expected on some devices):', e);
              // Ignore failure, but we tried our best
            }
          }, 500); // 500ms short delay
        }
      } catch (err) {
        console.error('❌ Cannot obtain camera matching constraints:', err);
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

  // Capture photo using ImageCapture or Canvas fallback
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

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-8 pb-12 z-20 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white/80 text-sm">Optimized for main camera clarity</p>

        {/* Shutter Button */}
        <button
          onClick={capturePhoto}
          className="w-20 h-20 bg-white rounded-full border-4 border-white/50 shadow-lg active:scale-95 transition-transform"
          aria-label="Take Photo"
        />
      </div>

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
