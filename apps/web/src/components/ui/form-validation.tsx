'use client';

import { useEffect } from 'react';

type ValidatedElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const FIELD_ERROR_ATTRIBUTE = 'data-field-error';

function isValidated(target: EventTarget | null): target is ValidatedElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function vietnameseMessage(field: ValidatedElement): string | null {
  const { validity } = field;
  const type = field instanceof HTMLInputElement ? field.type : '';

  if (validity.valueMissing) {
    if (field instanceof HTMLSelectElement) return 'Vui lòng chọn một mục trong danh sách.';
    if (type === 'checkbox') return 'Vui lòng đánh dấu vào ô này để tiếp tục.';
    if (type === 'radio') return 'Vui lòng chọn một lựa chọn.';
    if (type === 'file') return 'Vui lòng chọn tệp.';
    return 'Vui lòng điền vào ô này.';
  }
  if (validity.typeMismatch) {
    if (type === 'email') return 'Email không hợp lệ. Vui lòng nhập theo dạng ten@vidu.com.';
    if (type === 'url') return 'Vui lòng nhập một đường dẫn hợp lệ, ví dụ https://vidu.com.';
    return 'Giá trị không đúng định dạng.';
  }
  if (validity.tooShort && !(field instanceof HTMLSelectElement)) {
    return `Vui lòng nhập tối thiểu ${field.minLength} ký tự (hiện có ${field.value.length} ký tự).`;
  }
  if (validity.tooLong && !(field instanceof HTMLSelectElement)) {
    return `Vui lòng nhập tối đa ${field.maxLength} ký tự (hiện có ${field.value.length} ký tự).`;
  }
  if (validity.patternMismatch) {
    return field.title || 'Giá trị chưa đúng định dạng yêu cầu.';
  }
  if (validity.badInput) {
    return type === 'number' ? 'Vui lòng nhập một số hợp lệ.' : 'Giá trị không hợp lệ.';
  }
  if (validity.rangeUnderflow && field instanceof HTMLInputElement) {
    return `Giá trị phải lớn hơn hoặc bằng ${field.min}.`;
  }
  if (validity.rangeOverflow && field instanceof HTMLInputElement) {
    return `Giá trị phải nhỏ hơn hoặc bằng ${field.max}.`;
  }
  if (validity.stepMismatch) return 'Giá trị không hợp lệ.';
  if (validity.customError) return field.validationMessage;
  return null;
}

const addedSlots = new WeakMap<ValidatedElement, HTMLElement>();

function errorSlot(field: ValidatedElement): HTMLElement {
  const own = field
    .closest('[data-field]')
    ?.querySelector<HTMLElement>(`[${FIELD_ERROR_ATTRIBUTE}]`);
  if (own) return own;
  const added = addedSlots.get(field);
  if (added?.isConnected) return added;

  const slot = document.createElement('span');
  slot.setAttribute(FIELD_ERROR_ATTRIBUTE, '');
  slot.setAttribute('aria-live', 'polite');
  const label = field.closest('label');
  if (label) label.append(slot);
  else field.insertAdjacentElement('afterend', slot);
  addedSlots.set(field, slot);
  return slot;
}

const flagged = new WeakSet<ValidatedElement>();

function showError(field: ValidatedElement, message: string): void {
  flagged.add(field);
  field.setAttribute('aria-invalid', 'true');
  errorSlot(field).textContent = message;
}

function clearError(field: ValidatedElement): void {
  if (!flagged.has(field)) return;
  flagged.delete(field);
  field.removeAttribute('aria-invalid');
  const added = addedSlots.get(field);
  if (added) {
    added.remove();
    addedSlots.delete(field);
    return;
  }
  const own = field
    .closest('[data-field]')
    ?.querySelector<HTMLElement>(`[${FIELD_ERROR_ATTRIBUTE}]`);
  if (own) own.textContent = '';
}

export function reportFieldError(field: ValidatedElement, message: string): void {
  field.setCustomValidity(message);
  field.reportValidity();
}

export function FormValidation() {
  useEffect(() => {
    let focusTaken = false;

    function onInvalid(event: Event): void {
      const field = event.target;
      if (!isValidated(field)) return;
      event.preventDefault();
      showError(field, vietnameseMessage(field) ?? field.validationMessage);
      if (!focusTaken) {
        focusTaken = true;
        field.focus();
        window.setTimeout(() => {
          focusTaken = false;
        });
      }
    }

    function onEdit(event: Event): void {
      const field = event.target;
      if (!isValidated(field)) return;
      field.setCustomValidity('');
      if (!flagged.has(field)) return;
      const message = vietnameseMessage(field);
      if (message) showError(field, message);
      else clearError(field);
    }

    function onReset(event: Event): void {
      if (!(event.target instanceof HTMLFormElement)) return;
      for (const element of Array.from(event.target.elements)) {
        if (isValidated(element)) clearError(element);
      }
    }

    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('input', onEdit, true);
    document.addEventListener('change', onEdit, true);
    document.addEventListener('reset', onReset, true);
    return () => {
      document.removeEventListener('invalid', onInvalid, true);
      document.removeEventListener('input', onEdit, true);
      document.removeEventListener('change', onEdit, true);
      document.removeEventListener('reset', onReset, true);
    };
  }, []);

  return null;
}
