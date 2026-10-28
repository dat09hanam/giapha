'use client';

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  editorDomToRichText,
  imageFigureHtml,
  RICH_TEXT_COLORS,
  richTextIsEmpty,
  richTextToEditorHtml,
  normalizeLink,
  type RichTextImageSrc,
} from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { RichTextDocument, RichTextImage } from '@/types/rich-text';

const RESET_COLOR = '#010203';

const BLOCK_CHOICES = [
  { value: 'p', label: 'Đoạn văn' },
  { value: 'h2', label: 'Tiêu đề lớn' },
  { value: 'h3', label: 'Tiêu đề nhỏ' },
] as const;

type BlockValue = (typeof BLOCK_CHOICES)[number]['value'] | 'blockquote';

type Active = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  link: boolean;
  block: BlockValue;
};

const IDLE: Active = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  link: false,
  block: 'p',
};

function run(command: string, value?: string): void {
  document.execCommand(command, false, value);
}

function ToolButton({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  spin = false,
  onRun,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  spin?: boolean;
  onRun: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onRun}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg transition disabled:cursor-wait disabled:opacity-60',
        active ? 'bg-brand-100 text-brand-800' : 'text-stone-600 hover:bg-stone-100',
      )}
    >
      <Icon className={cn('size-4', spin && 'animate-spin')} aria-hidden="true" />
    </button>
  );
}

/** The editor's direct child that holds `node`, i.e. the paragraph, list or picture it sits in. */
function topLevelBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let current = node;
  while (current && current.parentNode !== editor) current = current.parentNode;
  return current instanceof HTMLElement ? current : null;
}

/** The link the node sits in, if any, without leaving the editor. */
function linkAround(editor: HTMLElement, node: Node | null): HTMLAnchorElement | null {
  const element = node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  const link = element?.closest('a');
  return link && editor.contains(link) ? link : null;
}

function isEmptyParagraph(element: HTMLElement): boolean {
  return element.tagName === 'P' && !element.textContent?.trim() && !element.querySelector('img');
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden="true" />;
}

export function RichTextEditor({
  id,
  initial,
  onChange,
  placeholder,
  labelledBy,
  imageSrc,
  onUploadImage,
  allowLinks = false,
  compact = false,
}: {
  id?: string;
  initial: RichTextDocument;
  onChange: (document: RichTextDocument) => void;
  placeholder?: string;
  labelledBy?: string;
  /** Where stored pictures load from. Pictures can be added only with `onUploadImage` too. */
  imageSrc?: RichTextImageSrc;
  /** Uploads a chosen picture; when given, the toolbar offers "Chèn ảnh". */
  onUploadImage?: (file: File) => Promise<RichTextImage>;
  /** Offers "Gắn liên kết" for selected words. */
  allowLinks?: boolean;
  /** A short box (about four lines) that grows while typing, for brief introductions. */
  compact?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [empty, setEmpty] = useState(() => richTextIsEmpty(initial));
  const [active, setActive] = useState<Active>(IDLE);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const linkRange = useRef<Range | null>(null);
  const [linkEditor, setLinkEditor] = useState<{ value: string; existing: boolean } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const canInsertImages = Boolean(imageSrc && onUploadImage);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = richTextToEditorHtml(initial, imageSrc);
  }, []);

  useEffect(() => {
    const onSelection = (): void => {
      const editor = editorRef.current;
      const anchor = document.getSelection()?.anchorNode;
      if (!editor || !anchor || !editor.contains(anchor)) return;
      const block = String(document.queryCommandValue('formatBlock')).toLowerCase();
      setActive({
        link: Boolean(linkAround(editor, anchor)),
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        block: block === 'h2' || block === 'h3' || block === 'blockquote' ? block : 'p',
      });
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  function emit(): void {
    const editor = editorRef.current;
    if (!editor) return;
    const next = editorDomToRichText(editor);
    setEmpty(richTextIsEmpty(next) && !editor.querySelector('li'));
    onChange(next);
  }

  function format(command: string, value?: string): void {
    editorRef.current?.focus();
    run('styleWithCSS', 'true');
    run(command, value);
    emit();
  }

  function setBlock(value: BlockValue): void {
    format('formatBlock', active.block === value && value === 'blockquote' ? 'p' : value);
  }

  function pickImage(): void {
    const editor = editorRef.current;
    const selection = document.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    savedRange.current = editor && range && editor.contains(range.startContainer) ? range : null;
    setNotice(null);
    fileRef.current?.click();
  }

  /** Puts the picture after the block holding the caret, or in place of an empty paragraph. */
  function insertImage(image: RichTextImage): void {
    const editor = editorRef.current;
    if (!editor || !imageSrc) return;
    const template = document.createElement('template');
    template.innerHTML = imageFigureHtml(image, imageSrc);
    const figure = template.content.firstElementChild;
    if (!figure) return;

    const anchor = topLevelBlock(editor, savedRange.current?.startContainer ?? null);
    if (anchor && isEmptyParagraph(anchor)) anchor.replaceWith(figure);
    else if (anchor) anchor.after(figure);
    else editor.append(figure);

    let next = figure.nextElementSibling;
    if (!(next instanceof HTMLElement) || next.tagName !== 'P') {
      next = document.createElement('p');
      next.innerHTML = '<br>';
      figure.after(next);
    }
    const caret = document.createRange();
    caret.setStart(next, 0);
    caret.collapse(true);
    editor.focus();
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(caret);
    emit();
  }

  async function uploadImage(file: File | undefined): Promise<void> {
    if (!file || !onUploadImage) return;
    setUploading(true);
    try {
      insertImage(await onUploadImage(file));
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : 'Không tải được ảnh này lên.');
    } finally {
      setUploading(false);
    }
  }

  /** Opens the link box for the selected words, or for the whole link the caret sits in. */
  function openLink(): void {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    let range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setNotice('Bôi đen từ hoặc cụm từ cần gắn liên kết trước.');
      return;
    }
    const existing = linkAround(editor, range.commonAncestorContainer);
    if (range.collapsed && existing) {
      range = document.createRange();
      range.selectNodeContents(existing);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (range.collapsed || !range.toString().trim()) {
      setNotice('Bôi đen từ hoặc cụm từ cần gắn liên kết trước.');
      return;
    }
    setNotice(null);
    setColorsOpen(false);
    setLinkError(null);
    linkRange.current = range.cloneRange();
    setLinkEditor({ value: existing?.getAttribute('href') ?? '', existing: Boolean(existing) });
  }

  function restoreLinkRange(): boolean {
    const editor = editorRef.current;
    const range = linkRange.current;
    if (!editor || !range) return false;
    editor.focus();
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return true;
  }

  function applyLink(): void {
    const link = normalizeLink(linkEditor?.value);
    if (!link) {
      setLinkError('Địa chỉ chưa đúng. Ví dụ: https://giapha.vn hoặc /thu-vien/cach-xung-ho');
      return;
    }
    if (!restoreLinkRange()) return;
    run('createLink', link);
    setLinkEditor(null);
    emit();
  }

  function removeLink(): void {
    if (!restoreLinkRange()) return;
    run('unlink');
    setLinkEditor(null);
    emit();
  }

  function setColor(color: string | null): void {
    setColorsOpen(false);
    format('foreColor', color ?? RESET_COLOR);
    if (color) return;
    editorRef.current
      ?.querySelectorAll<HTMLElement>('[style*="color"], font[color]')
      .forEach((element) => {
        const value = element.style.color || element.getAttribute('color') || '';
        if (!/rgb\(1, 2, 3\)|#010203/i.test(value)) return;
        element.style.removeProperty('color');
        element.removeAttribute('color');
        if (!element.getAttribute('style')) element.removeAttribute('style');
      });
    emit();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/15">
      <div
        role="toolbar"
        aria-label="Định dạng văn bản"
        className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper/60 px-1.5 py-1"
      >
        <select
          aria-label="Kiểu đoạn"
          value={active.block === 'blockquote' ? 'p' : active.block}
          onChange={(event) => setBlock(event.target.value as BlockValue)}
          className="h-8 rounded-lg border border-line bg-white px-2 text-sm text-stone-700 outline-none focus:border-brand-400"
        >
          {BLOCK_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        <Divider />
        <ToolButton
          icon={Bold}
          label="In đậm (Ctrl+B)"
          active={active.bold}
          onRun={() => format('bold')}
        />
        <ToolButton
          icon={Italic}
          label="In nghiêng (Ctrl+I)"
          active={active.italic}
          onRun={() => format('italic')}
        />
        <ToolButton
          icon={Underline}
          label="Gạch chân (Ctrl+U)"
          active={active.underline}
          onRun={() => format('underline')}
        />
        <ToolButton
          icon={Strikethrough}
          label="Gạch ngang"
          active={active.strikeThrough}
          onRun={() => format('strikeThrough')}
        />
        <div className="relative">
          <ToolButton
            icon={Palette}
            label="Màu chữ"
            active={colorsOpen}
            onRun={() => setColorsOpen((open) => !open)}
          />
          {colorsOpen ? (
            <div className="ui-dialog absolute left-0 top-full z-20 mt-1 grid w-max grid-cols-4 gap-1.5 rounded-xl border border-line bg-white p-2 shadow-xl">
              {RICH_TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  aria-label={`Màu ${color.label}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setColor(color.value)}
                  className="size-7 rounded-full ring-1 ring-black/10 transition hover:scale-110"
                  style={{ background: color.value }}
                />
              ))}
              <button
                type="button"
                title="Màu mặc định"
                aria-label="Màu mặc định"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setColor(null)}
                className="grid size-7 place-items-center rounded-full bg-white text-xs font-semibold text-stone-700 ring-1 ring-stone-300 hover:scale-110"
              >
                A
              </button>
            </div>
          ) : null}
        </div>
        {allowLinks ? (
          <ToolButton
            icon={Link2}
            label="Gắn liên kết cho chữ đã bôi đen"
            active={active.link || linkEditor !== null}
            onRun={openLink}
          />
        ) : null}
        <Divider />
        <ToolButton
          icon={List}
          label="Danh sách dấu chấm"
          onRun={() => format('insertUnorderedList')}
        />
        <ToolButton
          icon={ListOrdered}
          label="Danh sách đánh số"
          onRun={() => format('insertOrderedList')}
        />
        <ToolButton
          icon={Quote}
          label="Trích dẫn"
          active={active.block === 'blockquote'}
          onRun={() => setBlock('blockquote')}
        />
        {canInsertImages ? (
          <>
            <Divider />
            <ToolButton
              icon={uploading ? LoaderCircle : ImagePlus}
              label={uploading ? 'Đang tải ảnh lên…' : 'Chèn ảnh'}
              disabled={uploading}
              spin={uploading}
              onRun={pickImage}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void uploadImage(file);
              }}
            />
          </>
        ) : null}
        <Divider />
        <ToolButton icon={AlignLeft} label="Căn trái" onRun={() => format('justifyLeft')} />
        <ToolButton icon={AlignCenter} label="Căn giữa" onRun={() => format('justifyCenter')} />
        <ToolButton icon={AlignRight} label="Căn phải" onRun={() => format('justifyRight')} />
        <ToolButton
          icon={AlignJustify}
          label="Căn đều hai bên"
          onRun={() => format('justifyFull')}
        />
        <Divider />
        <ToolButton
          icon={RemoveFormatting}
          label="Xóa định dạng"
          onRun={() => format('removeFormat')}
        />
        <ToolButton icon={Undo2} label="Hoàn tác (Ctrl+Z)" onRun={() => format('undo')} />
        <ToolButton icon={Redo2} label="Làm lại (Ctrl+Y)" onRun={() => format('redo')} />
      </div>

      {notice ? (
        <p role="alert" className="border-b border-line bg-red-50 px-3 py-1.5 text-sm text-red-700">
          {notice}
        </p>
      ) : null}

      {linkEditor ? (
        <div className="grid gap-2 border-b border-line bg-gold-50/70 px-3 py-2.5">
          <label
            htmlFor={`${id ?? 'rich-text'}-link`}
            className="text-sm font-medium text-stone-700"
          >
            Liên kết cho “{linkRange.current?.toString().trim()}”
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`${id ?? 'rich-text'}-link`}
              autoFocus
              type="text"
              inputMode="url"
              value={linkEditor.value}
              placeholder="https://… hoặc /thu-vien/…"
              onChange={(event) => {
                const value = event.currentTarget.value;
                setLinkError(null);
                setLinkEditor((current) => (current ? { ...current, value } : current));
              }}
              onKeyDown={(event) => {
                // Inside the article form, Enter would submit the whole article.
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyLink();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  setLinkEditor(null);
                }
              }}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-base outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
            />
            <button
              type="button"
              onClick={applyLink}
              className="h-9 rounded-lg bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Gắn link
            </button>
            {linkEditor.existing ? (
              <button
                type="button"
                onClick={removeLink}
                className="h-9 rounded-lg border border-line bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Bỏ link
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setLinkEditor(null)}
              className="h-9 rounded-lg px-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              Hủy
            </button>
          </div>
          {linkError ? <p className="text-sm text-red-700">{linkError}</p> : null}
        </div>
      ) : null}

      <div className="relative">
        {empty && placeholder ? (
          <p className="pointer-events-none absolute left-3 top-3 text-base text-stone-400 sm:text-sm">
            {placeholder}
          </p>
        ) : null}
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelledBy}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => run('defaultParagraphSeparator', 'p')}
          onInput={emit}
          onBlur={() => setColorsOpen(false)}
          onClick={(event) => {
            const remove = (event.target as HTMLElement).closest('[data-remove-image]');
            if (!remove) return;
            event.preventDefault();
            remove.closest('figure')?.remove();
            emit();
          }}
          onKeyDown={(event) => {
            // A caption is a single line; Enter would split the picture block.
            if (event.key === 'Enter' && (event.target as HTMLElement).closest('figcaption')) {
              event.preventDefault();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            run('insertText', event.clipboardData.getData('text/plain'));
            emit();
          }}
          className={cn(
            compact ? 'min-h-28 max-h-72' : 'min-h-52 max-h-[32rem]',
            'overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 text-base leading-7 text-stone-800 outline-none sm:text-sm sm:leading-6',
            '[&>*+*]:mt-2 [&_p]:min-h-[1lh]',
            '[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-brand-800',
            '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-brand-900',
            '[&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:bg-brand-50/60 [&_blockquote]:py-1 [&_blockquote]:pl-3 [&_blockquote]:italic',
            '[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
            '[&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_a]:decoration-brand-300 [&_a]:underline-offset-4',
            '[&_figure]:relative [&_figure]:mx-auto [&_figure]:my-3 [&_figure]:grid [&_figure]:w-fit [&_figure]:max-w-full [&_figure]:justify-items-center [&_figure]:gap-1.5',
            '[&_figure_img]:max-h-80 [&_figure_img]:w-auto [&_figure_img]:max-w-full [&_figure_img]:rounded-xl [&_figure_img]:border [&_figure_img]:border-line [&_figure_img]:object-contain',
            '[&_figcaption]:min-w-40 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:italic [&_figcaption]:text-stone-500 [&_figcaption]:outline-none',
            '[&_figcaption:empty]:before:text-stone-400 [&_figcaption:empty]:before:content-[attr(data-placeholder)]',
            '[&_[data-remove-image]]:absolute [&_[data-remove-image]]:right-2 [&_[data-remove-image]]:top-2 [&_[data-remove-image]]:grid [&_[data-remove-image]]:size-7 [&_[data-remove-image]]:place-items-center [&_[data-remove-image]]:rounded-full [&_[data-remove-image]]:bg-black/55 [&_[data-remove-image]]:text-lg [&_[data-remove-image]]:leading-none [&_[data-remove-image]]:text-white',
          )}
        />
      </div>
    </div>
  );
}
