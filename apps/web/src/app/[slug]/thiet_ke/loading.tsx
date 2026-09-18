export default function FamilyDesignerLoading() {
  return (
    <main
      className="min-h-[calc(100vh-4rem)] animate-pulse bg-[#f4efe4]"
      aria-label="Đang tải trang thiết kế gia phả"
      aria-busy="true"
    >
      <div className="h-16 bg-emerald-950/90" />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-[68vh] bg-white/40 lg:h-[calc(100vh-8rem)]" />
        <div className="border-l bg-[#fffdf8] p-5">
          <div className="h-6 w-44 rounded bg-stone-200" />
          <div className="mx-auto mt-8 size-24 rounded-full bg-stone-200" />
          <div className="mt-8 h-11 rounded-xl bg-stone-200" />
          <div className="mt-4 h-11 rounded-xl bg-stone-200" />
          <div className="mt-4 h-28 rounded-xl bg-stone-200" />
        </div>
      </div>
      <span className="sr-only">Đang tải trang thiết kế gia phả…</span>
    </main>
  );
}
