'use client';

import { LoaderCircle, ToggleRight } from 'lucide-react';
import { useState } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { FAMILY_FEATURE_CHOICES } from '@/lib/family-nav';
import { updatePlatformFeatures } from '@/lib/platform-features-api';
import { cn } from '@/lib/utils';
import type { FamilyFeature, FamilyFeatures } from '@/types/family-tree';

/** The platform admin's switches for every family's sections; each one saves as it is flipped. */
export function PlatformFeaturesForm({ initial }: { initial: FamilyFeatures }) {
  const showToast = useToast();
  const [features, setFeatures] = useState<FamilyFeatures>(initial);
  const [saving, setSaving] = useState<FamilyFeature | null>(null);

  async function toggle(feature: FamilyFeature, label: string): Promise<void> {
    const on = !features[feature];
    setSaving(feature);
    setFeatures((current) => ({ ...current, [feature]: on }));
    try {
      setFeatures(await updatePlatformFeatures({ [feature]: on }));
      showToast({
        kind: 'success',
        message: `Đã ${on ? 'bật' : 'tắt'} ${label.toLocaleLowerCase('vi')} cho toàn hệ thống.`,
      });
    } catch (error: unknown) {
      setFeatures((current) => ({ ...current, [feature]: !on }));
      showToast({ kind: 'error', message: getApiErrorMessage(error, `${on ? 'bật' : 'tắt'} chức năng`) });
    } finally {
      setSaving(null);
    }
  }

  return (
    <SectionCard
      icon={<ToggleRight aria-hidden="true" />}
      title="Chức năng"
      description="Bật hoặc tắt từng chức năng cho tất cả dòng họ. Chức năng đã tắt được ẩn khỏi menu và không dùng được; dữ liệu đã có vẫn được giữ nguyên."
    >
      <ul className="divide-y divide-emerald-950/10">
        {FAMILY_FEATURE_CHOICES.map((choice) => {
          const on = features[choice.feature];
          const id = `feature-${choice.feature}`;
          return (
            <li key={choice.feature} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <label htmlFor={id} className="font-medium text-emerald-950">
                  {choice.label}
                </label>
                <p className="mt-0.5 text-sm leading-6 text-stone-600">{choice.description}</p>
              </div>
              {saving === choice.feature ? (
                <LoaderCircle className="size-4 shrink-0 animate-spin text-stone-400" aria-hidden="true" />
              ) : null}
              <button
                id={id}
                type="button"
                role="switch"
                aria-checked={on}
                disabled={saving !== null}
                onClick={() => void toggle(choice.feature, choice.label)}
                className={cn(
                  'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 disabled:opacity-60',
                  on ? 'bg-emerald-700' : 'bg-stone-300',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-block size-5 rounded-full bg-white shadow transition-transform',
                    on ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
