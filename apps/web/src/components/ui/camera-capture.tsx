'use client';

import {Camera, SwitchCamera} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {InlineLoader} from '@/components/ui/heritage-loader';
import {Button} from '@/components/ui/button';
import {ScrollDialog} from '@/components/ui/scroll-dialog';

type Facing = 'user' | 'environment';

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
    <ScrollDialog
      title="Chụp ảnh trực tiếp"
      subtitle="Đặt khuôn mặt vào giữa khung rồi bấm chụp."
      onClose={onCancel}
      busy={capturing}
      size="lg"
      stacked
      closeLabel="Đóng camera"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
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
      }
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-900">
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
              <InlineLoader className="size-4" />
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
    </ScrollDialog>
  );
}
