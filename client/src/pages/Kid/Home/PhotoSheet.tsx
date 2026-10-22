import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import './home.css';

export interface PhotoDraft {
  name: string;
  dataUrl: string;
}

/**
 * 拍照弹层（W2）
 *
 * 用原生文件输入 + `capture="environment"` 走系统相机：
 * 平台里没有独立的相机 SDK，这样在 webview 与浏览器都能用。
 * 图片只在前端压成 dataUrl 随打卡提交，服务端存 jsonb（`task_checkins.media`）。
 */
export const PhotoSheet: React.FC<{
  taskName: string;
  required: boolean;
  onCancel: () => void;
  onSubmit: (photos: PhotoDraft[]) => Promise<void>;
}> = ({ taskName, required, onCancel, onSubmit }) => {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const albumRef = useRef<HTMLInputElement | null>(null);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | null | undefined) => {
    if (!file) return;
    if (photos.length >= 3) {
      setError('最多 3 张');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError('这张图太大了，换一张');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('READ_FAILED'));
      reader.readAsDataURL(file);
    });
    setPhotos((prev) => [...prev, { name: file.name || 'photo', dataUrl }]);
    setError(null);
  };

  const submit = async () => {
    if (required && photos.length === 0) {
      setError('这件事要拍一张才能算完成');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(photos);
    } catch {
      setError('没提交上，再试一次');
      setBusy(false);
    }
  };

  return (
    <div className="kh-sheet" role="dialog" aria-modal="true" aria-label="拍照">
      <div className="kh-sheet__mask" onClick={onCancel} />
      <div className="kh-sheet__panel">
        <div className="kh-sheet__grab" />
        <div className="kh-sheet__head">
          <h2 className="kh-sheet__title">{taskName}</h2>
          <button type="button" className="kh-sheet__close" aria-label="关闭" onClick={onCancel}>
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>
        <p className="kh-sheet__hint">
          {required ? '这件事要拍一张照片' : '可以拍一张，也可以不拍'}
        </p>

        <div className="kh-sheet__photos">
          {photos.map((p, i) => (
            <div key={`${p.name}${i}`} className="kh-sheet__photo">
              <img src={p.dataUrl} alt={`照片 ${i + 1}`} />
              <button
                type="button"
                className="kh-sheet__del"
                aria-label="删除这张"
                onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          ))}
          {photos.length < 3 ? (
            <button
              type="button"
              className="kh-sheet__add"
              aria-label="添加照片"
              onClick={() => albumRef.current?.click()}
            >
              <ImageIcon size={20} strokeWidth={2} />
            </button>
          ) : null}
        </div>

        <div className="kh-sheet__btns">
          <button type="button" className="kh-sheet__btn" onClick={() => cameraRef.current?.click()}>
            <Camera size={16} strokeWidth={2.2} aria-hidden /> 拍照
          </button>
          <button type="button" className="kh-sheet__btn" onClick={() => albumRef.current?.click()}>
            <ImageIcon size={16} strokeWidth={2.2} aria-hidden /> 相册
          </button>
        </div>

        {error ? <p className="kh-sheet__error">{error}</p> : null}

        <button type="button" className="kh-sheet__submit" disabled={busy} onClick={() => void submit()}>
          {busy ? '正在交…' : required ? '拍好了，交上去' : '交上去'}
        </button>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
};

export default PhotoSheet;
