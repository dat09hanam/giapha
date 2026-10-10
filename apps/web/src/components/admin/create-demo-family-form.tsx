'use client';

import { Plus, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { SectionCard } from '@/components/admin/admin-layout';
import { PlanSelect } from '@/components/admin/plan-select';
import { Field } from '@/components/auth/form-fields';
import { Button } from '@/components/ui/button';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { createDemoFamily } from '@/lib/family-api';
import { foldVietnamese } from '@/lib/person-search';
import type { PricingPlan } from '@/types/pricing';

function demoSlug(name: string): string {
  const base = foldVietnamese(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 95)
    .replace(/-+$/, '');
  return `${base || 'dong-ho'}-mau`;
}

export function CreateDemoFamilyForm({ plans }: { plans: readonly PricingPlan[] }) {
  const router = useRouter();
  const showToast = useToast();
  const [name, setName] = useState('');
  const [deathAnniversary, setDeathAnniversary] = useState('');
  const [planId, setPlanId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slug = demoSlug(name);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = await createDemoFamily({ name, slug, deathAnniversary, planId });
      showToast({ kind: 'success', message: `Đã tạo gia phả mẫu ${body.family.name}.` });
      router.refresh();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'tạo gia phả mẫu') });
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      icon={<Sparkles aria-hidden="true" />}
      title="Tạo gia phả mẫu"
      description="Gia phả khách chưa đăng nhập xem thử từ trang chủ, tại /gia-pha-mau. Chỉ có một gia phả mẫu."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <form className="grid content-start gap-5" onSubmit={handleSubmit}>
          <Field
            id="demo-family-name"
            name="name"
            label="Tên dòng họ"
            placeholder="Họ Nguyễn"
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Field
            id="demo-family-slug"
            name="slug"
            label="Đường dẫn"
            value={slug}
            readOnly
            className="bg-gold-50/70 text-stone-600"
          />
          <DeathAnniversaryPicker
            id="demo-death-anniversary"
            value={deathAnniversary}
            onChange={setDeathAnniversary}
            required
          />
          <PlanSelect id="demo-family-plan" plans={plans} value={planId} onChange={setPlanId} />
          <Button
            type="submit"
            size="lg"
            className="mt-1 sm:justify-self-start"
            disabled={submitting || plans.length === 0}
          >
            {submitting ? (
              <InlineLoader className="size-4" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {submitting ? 'Đang tạo…' : 'Tạo gia phả mẫu'}
          </Button>
        </form>

        <div className="grid content-start gap-3 rounded-2xl border border-dashed border-brand-900/20 bg-stone-50/60 p-5 text-sm leading-6 text-stone-600">
          <p className="font-medium text-brand-950">Về gia phả mẫu</p>
          <p>
            Không cấp tài khoản Trưởng họ hay Thành viên. Sau khi tạo, bạn nhập cây gia phả, thông
            tin và trang trí phả đồ ngay trong tab này.
          </p>
          <p>
            Khách xem được cây gia phả nhưng không thấy số điện thoại và ảnh đại diện. Chỉ nhập dữ
            liệu mẫu, không dùng thông tin người thật.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
