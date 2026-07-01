export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:h-14">
      <div className="flex w-full items-center gap-3 px-3 sm:gap-3 sm:px-4 lg:px-6">
        <h1 className="truncate text-xl font-semibold sm:text-3xl">Fitflix</h1>
        <div className="ml-auto flex items-center gap-2" />
      </div>
    </header>
  )
}
