export default function FamilyAdminLoading() {
  return (
    <main
      className="mx-auto grid w-full max-w-7xl animate-pulse gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      aria-label="Đang tải khu vực quản trị dòng họ"
      aria-busy="true"
    >
      <div>
        <div className="h-5 w-36 rounded-full bg-emerald-900/10" />
        <div className="mt-3 h-10 w-72 max-w-full rounded-xl bg-emerald-900/10" />
        <div className="mt-3 h-5 w-md max-w-full rounded-lg bg-stone-300/60" />
      </div>
      <div className="h-13 w-full rounded-2xl border bg-white/70 sm:w-96" />
      <div className="h-136 rounded-2xl border bg-white/70" />
      <span className="sr-only">Đang tải thông tin dòng họ…</span>
    </main>
  );
}
