import type { Node } from '@xyflow/react';

import { familyLinkPath } from '@/components/tree/family-link-edge';
import type { DesignerMember } from '@/components/tree/designer-model';
import type { FamilyEdge, FamilyLinkData } from '@/lib/tree-layout';
import { imagePagesPdf } from '@/lib/pdf-document';

type ExportNode = Node<{
  member: DesignerMember;
  avatarSrc: string | null;
  spouseLabel: string | null;
}>;

/** A single image page preserves Vietnamese text without embedding a font in the PDF. */
export function imagePdf(jpeg: Uint8Array, width: number, height: number): Blob {
  const pageWidth = width >= height ? 842 : 595;
  return imagePagesPdf([
    { jpeg, width, height, pageWidth, pageHeight: (pageWidth * height) / width },
  ]);
}

async function loadAvatar(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(null), 5000);
    image.crossOrigin = 'use-credentials';
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    image.src = src;
  });
}

/** Export all nodes, including those outside the current zoom/pan viewport. */
export async function downloadDesignerPdf(
  nodes: readonly ExportNode[],
  edges: readonly FamilyEdge[],
  familyName: string,
  familySlug: string,
  scope = 'Bản thiết kế hiện tại',
): Promise<void> {
  if (!nodes.length) throw new Error('Cây chưa có thành viên để xuất.');
  await document.fonts.ready;
  const sizes = nodes.map((node) => ({
    node,
    width: node.measured?.width ?? 214,
    height: node.measured?.height ?? 210,
  }));
  const left = Math.min(...nodes.map((node) => node.position.x)) - 48;
  const top = Math.min(...nodes.map((node) => node.position.y)) - 130;
  const width = Math.ceil(
    Math.max(...sizes.map(({ node, width }) => node.position.x + width)) - left + 48,
  );
  const height = Math.ceil(
    Math.max(...sizes.map(({ node, height }) => node.position.y + height)) - top + 48,
  );
  // Bound both the canvas dimensions and memory for very large trees.
  const scale = Math.min(2, 12000 / width, 12000 / height, Math.sqrt(24000000 / (width * height)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể tạo ảnh cây gia phả.');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(0, 0, width, height);
  ctx.translate(-left, -top);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#543619';
  ctx.font = 'bold 28px serif';
  ctx.fillText(`Gia phả ${familyName}`, left + width / 2, top + 48, width - 48);
  ctx.font = '16px sans-serif';
  const date = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  ctx.fillText(
    `${scope} · ${nodes.length} thành viên · Ngày xuất: ${date}`,
    left + width / 2,
    top + 78,
    width - 48,
  );
  const byId = new Map(sizes.map((item) => [item.node.id, item]));
  ctx.strokeStyle = '#9a6b2f';
  ctx.lineWidth = 1.8;
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target || edge.type !== 'familyLink' || !edge.data) continue;
    const sourceSide = edge.sourceHandle === 'spouse-source';
    const targetSide = edge.targetHandle === 'spouse-target';
    ctx.stroke(
      new Path2D(
        familyLinkPath({
          sourceX: source.node.position.x + source.width * (sourceSide ? 1 : 0.5),
          sourceY: source.node.position.y + source.height * (sourceSide ? 0.5 : 1),
          targetX: target.node.position.x + target.width * (targetSide ? 0 : 0.5),
          targetY:
            target.node.position.y +
            target.height * (targetSide ? 0.5 : edge.targetHandle === 'bracket-target' ? 1 : 0),
          sourceHandleId: edge.sourceHandle,
          data: edge.data as FamilyLinkData,
        }),
      ),
    );
  }
  const avatars = await Promise.all(
    nodes.map((node) => (node.data.avatarSrc ? loadAvatar(node.data.avatarSrc) : null)),
  );
  sizes.forEach(({ node, width: cardWidth, height: cardHeight }, index) => {
    const { member, spouseLabel } = node.data;
    const { x, y } = node.position;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d8bd8f';
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, 10);
    ctx.fill();
    ctx.stroke();
    const center = x + cardWidth / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, y + 48, 32, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = member.gender === 'FEMALE' ? '#fce1e6' : '#e0efff';
    ctx.fillRect(center - 32, y + 16, 64, 64);
    const avatar = avatars[index];
    if (avatar) {
      const side = Math.min(avatar.naturalWidth, avatar.naturalHeight);
      ctx.drawImage(
        avatar,
        (avatar.naturalWidth - side) / 2,
        (avatar.naturalHeight - side) / 2,
        side,
        side,
        center - 32,
        y + 16,
        64,
        64,
      );
    } else {
      ctx.fillStyle = '#725232';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(member.name.trim().charAt(0).toLocaleUpperCase('vi'), center, y + 57);
    }
    ctx.restore();
    ctx.fillStyle = '#8b5c2d';
    ctx.font = '12px sans-serif';
    if (spouseLabel) ctx.fillText(spouseLabel, center, y + 99, cardWidth - 20);
    ctx.fillText(member.honorific, center, y + 116, cardWidth - 20);
    ctx.fillStyle = '#362015';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(member.name, center, y + 140, cardWidth - 24);
    ctx.fillStyle = '#78716c';
    ctx.font = '12px sans-serif';
    const years =
      member.birthDate || member.deathDate
        ? `${member.birthDate.slice(0, 4) || '?'}${!member.isAlive ? ` – ${member.deathDate.slice(0, 4) || '?'}` : ''}`
        : 'Chưa cập nhật năm sinh';
    ctx.fillText(years, center, y + 162, cardWidth - 20);
  });
  const jpeg = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Không thể tạo file PDF.'))),
      'image/jpeg',
      0.95,
    ),
  );
  const pdf = imagePdf(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height);
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gia-pha-${familySlug.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
