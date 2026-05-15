'use client'

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="relative w-[280px] bg-black rounded-[36px] p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />

        {/* Screen */}
        <div className="bg-zinc-950 rounded-[28px] overflow-hidden h-[560px] flex flex-col">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-zinc-600 rounded-full" />
      </div>
    </div>
  )
}
