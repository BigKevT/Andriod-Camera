/**
 * Finds the video input device ID of the camera that can focus closest (macro) by
 * inspecting each device's photo capabilities via ImageCapture.
 * Falls back to the first back-facing camera if no macro-capable device is found.
 */
export async function findMacroCameraDeviceId() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    let bestDeviceId = null;
    let bestMinFocus = 0;
  
    for (const device of videoInputs) {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: device.deviceId }, width: 160, height: 120 }
        });
        const track = stream.getVideoTracks()[0];
        const caps = await new window.ImageCapture(track).getPhotoCapabilities();
  
        if (typeof caps.minFocusDistance === 'number' && caps.minFocusDistance > bestMinFocus) {
          bestMinFocus = caps.minFocusDistance;
          bestDeviceId = device.deviceId;
        }
  
        track.stop();
      } catch (e) {
        console.warn('Cannot query device', device.deviceId, e);
      } finally {
        if (stream) stream.getTracks().forEach(t => t.stop());
      }
    }
  
    return bestDeviceId || videoInputs[0]?.deviceId || null;
  }