import { PageLoader } from '@/components/ui/heritage-loader';

/** Every route without a loading screen of its own. */
export default function RootLoading() {
  return <PageLoader label="Đang tải" className="min-h-[70vh]" />;
}
