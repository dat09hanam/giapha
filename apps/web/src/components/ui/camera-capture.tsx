'use client';

import { Camera, LoaderCircle, SwitchCamera, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

type Facing = 'user' | 'environment';

/** What went wrong opening the camera, in words the visitor can act on. */
function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Trình duyệt chưa được cấp quyền dùng camera. Hãy cho phép camera trên thanh địa chỉ rồi thử lại.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Không tìm thấy camera trên thiết bị này.';
  }
  if (name === 'NotReadableError') {
    return 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
  }
  return 'Không mở được camera. Hãy thử lại hoặc chọn ảnh có sẵn.';
}

/**
 * Takes a photo with the device camera. The live preview is mirrored for the
 * front camera like a mirror, but the photo itself is not. The photo is handed
 * back as a JPEG file, ready for the same checks and cropping as an upload.
 */
export function CameraCapture({
  onCancel,
  onCaptured,
}: {
  onCancel: () => void;
  onCaptured: (photo: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<Facing>('user');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onCancel]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setReady(false);
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext
          ? 'Trình duyệt này không hỗ trợ chụp ảnh trực tiếp.'
          : 'Chỉ chụp ảnh được khi trang mở bằng HTTPS.',
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      })
      .then(async (opened) => {
        if (cancelled) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        const video = videoRef.current;
        if (video) {
          video.srcObject = opened;
          await video.play().catch(() => undefined);
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setCanSwitch(devices.filter((device) => device.kind === 'videoinput').length > 1);
          setReady(true);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(cameraErrorMessage(reason));
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facing]);

  function capture(): void {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    setCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) {
          setError('Không chụp được ảnh. Hãy thử lại.');
          return;
        }
        onCaptured(new File([blob], `chup-anh-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-brand-950/55 backdrop-blur-[2px]"
        aria-label="Đóng camera"
        tabIndex={-1}
        onClick={onCancel}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-capture-title"
        className="ui-dialog heritage-panel relative w-full max-w-lg rounded-2xl p-5 shadow-2xl sm:p-6"
      >
        <button
          type="button"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
          onClick={onCancel}
          aria-label="Đóng"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
          Ảnh đại diện
        </p>
        <h2 id="camera-capture-title" className="mt-2 pr-10 text-xl font-semibold text-brand-950">
          Chụp ảnh trực tiếp
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Đặt khuôn mặt vào giữa khung rồi bấm chụp.
        </p>

        <div className="relative mt-5 aspect-square overflow-hidden rounded-2xl bg-stone-900">
          <video
            ref={videoRef}
            className={
              'size-full object-cover transition-opacity ' +
              (ready ? 'opacity-100' : 'opacity-0') +
              (facing === 'user' ? ' -scale-x-100' : '')
            }
            playsInline
            muted
            aria-label="Hình ảnh từ camera"
          />
          {!ready && !error ? (
            <div className="absolute inset-0 grid place-items-center text-sm text-stone-300">
              <span className="flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Đang mở camera…
              </span>
            </div>
          ) : null}
          {error ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm leading-6 text-stone-100">
              {error}
            </div>
          ) : null}
          {ready ? (
            <div
              className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-dashed border-white/60"
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {canSwitch ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setFacing((current) => (current === 'user' ? 'environment' : 'user'))}
              disabled={capturing}
            >
              <SwitchCamera className="size-4" aria-hidden="true" />
              Đổi camera
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="button" onClick={capture} disabled={!ready || capturing}>
              <Camera className="size-4" aria-hidden="true" />
              Chụp ảnh
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
