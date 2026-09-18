export default function FamilyAdminLoading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl animate-pulse px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      aria-label="Đang tải khu vực quản trị dòng họ"
      aria-busy="true"
    >
      <div className="rounded-3xl border bg-white/70 p-6 sm:p-8">
        <div className="h-5 w-36 rounded-full bg-emerald-900/10" />
        <div className="mt-5 h-10 w-64 max-w-full rounded-xl bg-emerald-900/10" />
        <div className="mt-3 h-5 w-96 max-w-full rounded-lg bg-stone-300/60" />
      </div>
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
        <div className="h-[38rem] rounded-2xl border bg-white/70" />
        <div className="grid gap-5">
          <div className="h-48 rounded-2xl border bg-white/70" />
          <div className="h-48 rounded-2xl border bg-white/70" />
        </div>
      </div>
      <span className="sr-only">Đang tải thông tin dòng họ…</span>
    </main>
  );
}
