'use client';

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
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
  RICH_TEXT_COLORS,
  richTextIsEmpty,
  richTextToEditorHtml,
} from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { RichTextDocument } from '@/types/rich-text';

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
  block: BlockValue;
};

const IDLE: Active = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  block: 'p',
};

function run(command: string, value?: string): void {
  document.execCommand(command, false, value);
}

function ToolButton({
  icon: Icon,
  label,
  active = false,
  onRun,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onRun: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onRun}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg transition',
        active ? 'bg-brand-100 text-brand-800' : 'text-stone-600 hover:bg-stone-100',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
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
}: {
  id?: string;
  initial: RichTextDocument;
  onChange: (document: RichTextDocument) => void;
  placeholder?: string;
  labelledBy?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(() => richTextIsEmpty(initial));
  const [active, setActive] = useState<Active>(IDLE);
  const [colorsOpen, setColorsOpen] = useState(false);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = richTextToEditorHtml(initial);
  }, []);

  useEffect(() => {
    const onSelection = (): void => {
      const editor = editorRef.current;
      const anchor = document.getSelection()?.anchorNode;
      if (!editor || !anchor || !editor.contains(anchor)) return;
      const block = String(document.queryCommandValue('formatBlock')).toLowerCase();
      setActive({
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
          onPaste={(event) => {
            event.preventDefault();
            run('insertText', event.clipboardData.getData('text/plain'));
            emit();
          }}
          className={cn(
            'min-h-52 max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 text-base leading-7 text-stone-800 outline-none sm:text-sm sm:leading-6',
            '[&>*+*]:mt-2 [&_p]:min-h-[1lh]',
            '[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-brand-800',
            '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-brand-900',
            '[&_blockquote]:border-l-4 [&_blockquote]:border-brand-300 [&_blockquote]:bg-brand-50/60 [&_blockquote]:py-1 [&_blockquote]:pl-3 [&_blockquote]:italic',
            '[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
          )}
        />
      </div>
    </div>
  );
}
