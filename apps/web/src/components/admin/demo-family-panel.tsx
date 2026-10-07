import Link from 'next/link';
import { Eye, Palette, Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/admin/admin-layout';
import { CreateDemoFamilyForm } from '@/components/admin/create-demo-family-form';
import { FamilyPosterForm } from '@/components/admin/family-poster-form';
import { FamilyProfileForm } from '@/components/admin/family-profile-form';
import { Button } from '@/components/ui/button';
import type { PosterDecoration } from '@/lib/poster-decorations';
import type { FamilyDetails } from '@/types/family-tree';

/**
 * Gia phả mẫu, edited by the platform admin in place of a clan head: its tree in the designer,
 * and its details and phả đồ right here. While there is none, the tab offers to create it.
 */
export function DemoFamilyPanel({
  family,
  decorations,
}: {
  family: FamilyDetails | null;
  decorations: PosterDecoration[];
}) {
  if (!family) return <CreateDemoFamilyForm />;

  const familyPath = `/${encodeURIComponent(family.slug)}`;
  return (
    <div className="grid gap-6">
      <SectionCard
        icon={<Sparkles aria-hidden="true" />}
        title={family.name}
        description={
          <>
            Gia phả mẫu tại /{family.slug}. Khách chưa đăng nhập xem cây gia phả tại /gia-pha-mau,
            không có số điện thoại và ảnh đại diện. Chỉ nhập dữ liệu mẫu.
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/gia-pha-mau" target="_blank">
                <Eye className="size-4" aria-hidden="true" />
                Xem như khách
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${familyPath}/thiet_ke`}>
                <Palette className="size-4" aria-hidden="true" />
                Thiết kế cây gia phả
              </Link>
            </Button>
          </div>
        }
      >
        <p className="px-4 py-5 text-sm leading-6 text-stone-600 sm:px-7">
          Thêm người, đời và quan hệ trong trang thiết kế. Thông tin dòng họ, lời giới thiệu và
          trang trí phả đồ sửa ngay bên dưới.
        </p>
      </SectionCard>
      <FamilyProfileForm family={family} />
      <FamilyPosterForm family={family} decorations={decorations} />
    </div>
  );
}
