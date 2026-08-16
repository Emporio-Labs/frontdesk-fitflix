'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  APP_COMPONENTS,
  ContentComponentDefinition,
  ContentFieldDefinition,
} from '@/lib/content-registry'
import type { ContentOverride } from '@/lib/services/content.service'
import {
  IconCheck,
  IconClock,
  IconFlame,
  IconInfoCircle,
  IconMessageCircle,
  IconPlayerPlay,
  IconSparkles,
} from '@tabler/icons-react'

interface MobileCopyPreviewProps {
  overrides?: ContentOverride[]
  selectedComponentId?: string
  activeFieldKey?: string
  draftKey?: string
  draftValue?: string
  onSelectField?: (fieldKey: string, componentId: string) => void
}

export function MobileCopyPreview({
  overrides = [],
  selectedComponentId,
  activeFieldKey,
  draftKey,
  draftValue,
  onSelectField,
}: MobileCopyPreviewProps) {
  // Helper to resolve the text for any key: draftValue -> active override -> default value
  const resolve = (field: ContentFieldDefinition): { text: string; isOverridden: boolean; isDraft: boolean } => {
    if (draftKey === field.key && draftValue !== undefined) {
      return { text: draftValue, isOverridden: true, isDraft: true }
    }
    const matched = overrides.find((o) => o.key === field.key && o.isActive)
    if (matched) {
      return { text: matched.value, isOverridden: true, isDraft: false }
    }
    return { text: field.defaultValue, isOverridden: false, isDraft: false }
  }

  const isFieldFocused = (key: string) =>
    activeFieldKey === key || draftKey === key

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full h-full select-none">
      {/* Phone Case Frame */}
      <div className="relative w-[320px] max-w-full bg-[#121316] rounded-[44px] p-3 shadow-2xl border-4 border-[#26282e] ring-1 ring-white/10">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 mr-2" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
        </div>

        {/* Screen Container */}
        <div className="bg-[#0b0c0e] text-zinc-100 rounded-[34px] overflow-hidden h-[620px] flex flex-col relative border border-white/5 font-sans">
          {/* Status Bar */}
          <div className="h-10 pt-2 px-6 flex items-center justify-between text-[11px] text-zinc-400 z-20 shrink-0 font-medium">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">5G</span>
              <div className="w-5 h-2.5 border border-zinc-500 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-zinc-300 rounded-[1px]" />
              </div>
            </div>
          </div>

          {/* App Top Bar */}
          <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/5 bg-[#0b0c0e]/90 backdrop-blur shrink-0 z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#b8e925] flex items-center justify-center font-black text-black text-xs">
                F
              </div>
              <span className="text-xs font-bold tracking-wider text-white">FITFLIX</span>
            </div>
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-zinc-700 text-zinc-400">
              Visitor
            </Badge>
          </div>

          {/* Scrollable Mobile Feed */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {/* 1. VISITOR HERO SECTION */}
            <div
              id="visitor-hero"
              className={`rounded-2xl p-4 transition-all duration-200 border ${
                selectedComponentId === 'visitor-hero'
                  ? 'bg-zinc-900/90 border-[#b8e925]/50 ring-1 ring-[#b8e925]/30'
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#b8e925]">
                  Visitor Hero
                </span>
                <span className="text-[9px] text-zinc-500">Tap to edit</span>
              </div>

              {/* Greeting */}
              {(() => {
                const f = APP_COMPONENTS[0].fields[0]
                const res = resolve(f)
                const focused = isFieldFocused(f.key)
                return (
                  <div
                    onClick={() => onSelectField?.(f.key, 'visitor-hero')}
                    className={`cursor-pointer rounded p-1 transition-all relative ${
                      focused
                        ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10'
                        : 'hover:bg-white/5'
                    }`}
                    title={f.label}
                  >
                    <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                      {res.text.replace('$name', 'Alex')}
                    </h2>
                    {res.isOverridden && (
                      <span className="absolute -top-1.5 -right-1 px-1 py-0.2 bg-[#b8e925] text-black text-[8px] font-bold rounded">
                        Live
                      </span>
                    )}
                  </div>
                )
              })()}

              {/* Positioning Statement */}
              {(() => {
                const f = APP_COMPONENTS[0].fields[1]
                const res = resolve(f)
                const focused = isFieldFocused(f.key)
                return (
                  <div
                    onClick={() => onSelectField?.(f.key, 'visitor-hero')}
                    className={`cursor-pointer rounded p-1 mt-1 transition-all relative ${
                      focused
                        ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10'
                        : 'hover:bg-white/5'
                    }`}
                    title={f.label}
                  >
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {res.text}
                    </p>
                  </div>
                )
              })()}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3.5">
                {(() => {
                  const f = APP_COMPONENTS[0].fields[2]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectField?.(f.key, 'visitor-hero')}
                      className={`cursor-pointer w-full py-2 px-2.5 rounded-xl bg-[#b8e925] text-black font-bold text-[11px] flex items-center justify-center transition-all truncate ${
                        focused
                          ? 'ring-2 ring-white scale-105 shadow-lg'
                          : 'hover:opacity-90'
                      }`}
                      title={f.label}
                    >
                      {res.text}
                    </button>
                  )
                })()}

                {(() => {
                  const f = APP_COMPONENTS[0].fields[3]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectField?.(f.key, 'visitor-hero')}
                      className={`cursor-pointer w-full py-2 px-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 text-white font-medium text-[11px] flex items-center justify-center transition-all truncate ${
                        focused
                          ? 'ring-2 ring-[#b8e925] scale-105'
                          : 'hover:bg-zinc-700'
                      }`}
                      title={f.label}
                    >
                      {res.text}
                    </button>
                  )
                })()}
              </div>

              {/* WhatsApp message tooltip note */}
              {(() => {
                const f = APP_COMPONENTS[0].fields[4]
                const res = resolve(f)
                const focused = isFieldFocused(f.key)
                return (
                  <div
                    onClick={() => onSelectField?.(f.key, 'visitor-hero')}
                    className={`cursor-pointer mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[9.5px] text-zinc-500 hover:text-zinc-300 transition-colors ${
                      focused ? 'text-[#b8e925] font-semibold' : ''
                    }`}
                  >
                    <IconMessageCircle className="w-3 h-3 text-[#25D366] shrink-0" />
                    <span className="truncate">
                      Msg: &ldquo;{res.text}&rdquo;
                    </span>
                  </div>
                )
              })()}
            </div>

            {/* 2. MILLIONS TO MEDITATE (LIVE STREAM CARD) */}
            <div
              id="visitor-mtm"
              className={`rounded-2xl p-3.5 transition-all duration-200 border ${
                selectedComponentId === 'visitor-mtm'
                  ? 'bg-zinc-900/90 border-[#b8e925]/50 ring-1 ring-[#b8e925]/30'
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8.5px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />
                    LIVE
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-300">
                    Millions to Meditate
                  </span>
                </div>
                <IconPlayerPlay className="w-3.5 h-3.5 text-zinc-400" />
              </div>

              {/* MTM Live & Free Copy */}
              <div className="space-y-1">
                {(() => {
                  const f = APP_COMPONENTS[1].fields[0]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <div
                      onClick={() => onSelectField?.(f.key, 'visitor-mtm')}
                      className={`cursor-pointer rounded px-1 py-0.5 text-[10.5px] text-zinc-300 transition-all ${
                        focused
                          ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="font-medium text-white">{res.text}</span>
                    </div>
                  )
                })()}

                {(() => {
                  const f = APP_COMPONENTS[1].fields[1]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <div
                      onClick={() => onSelectField?.(f.key, 'visitor-mtm')}
                      className={`cursor-pointer rounded px-1 py-0.5 text-[9.5px] text-zinc-400 transition-all ${
                        focused
                          ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <span>Scheduled: &ldquo;{res.text}&rdquo;</span>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 3. EVENTS RAIL */}
            <div
              id="visitor-events"
              className={`rounded-2xl p-3.5 transition-all duration-200 border ${
                selectedComponentId === 'visitor-events'
                  ? 'bg-zinc-900/90 border-[#b8e925]/50 ring-1 ring-[#b8e925]/30'
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  {(() => {
                    const f = APP_COMPONENTS[2].fields[0]
                    const res = resolve(f)
                    const focused = isFieldFocused(f.key)
                    return (
                      <div
                        onClick={() => onSelectField?.(f.key, 'visitor-events')}
                        className={`cursor-pointer rounded px-1 py-0.5 text-xs font-bold text-white transition-all ${
                          focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                        }`}
                      >
                        {res.text}
                      </div>
                    )
                  })()}
                  {(() => {
                    const f = APP_COMPONENTS[2].fields[1]
                    const res = resolve(f)
                    const focused = isFieldFocused(f.key)
                    return (
                      <div
                        onClick={() => onSelectField?.(f.key, 'visitor-events')}
                        className={`cursor-pointer rounded px-1 text-[10px] text-zinc-400 transition-all ${
                          focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                        }`}
                      >
                        {res.text}
                      </div>
                    )
                  })()}
                </div>

                {(() => {
                  const f = APP_COMPONENTS[2].fields[2]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectField?.(f.key, 'visitor-events')}
                      className={`cursor-pointer text-[10px] font-semibold text-[#b8e925] px-1.5 py-0.5 rounded transition-all ${
                        focused ? 'ring-2 ring-white bg-[#b8e925]/20' : ''
                      }`}
                    >
                      {res.text} &rarr;
                    </button>
                  )
                })()}
              </div>

              {/* Sample Event Mockup Card */}
              <div className="mt-2.5 flex gap-2 overflow-x-hidden">
                <div className="w-full bg-zinc-800/70 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10.5px] font-semibold text-white">Breathwork Workshop</p>
                    <p className="text-[9px] text-zinc-400">Sat 22 Aug · Coach Daniel</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 font-mono">
                    22 AUG
                  </span>
                </div>
              </div>
            </div>

            {/* 4. GROUP CLASSES RAIL */}
            <div
              id="visitor-classes"
              className={`rounded-2xl p-3.5 transition-all duration-200 border ${
                selectedComponentId === 'visitor-classes'
                  ? 'bg-zinc-900/90 border-[#b8e925]/50 ring-1 ring-[#b8e925]/30'
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  {(() => {
                    const f = APP_COMPONENTS[3].fields[0]
                    const res = resolve(f)
                    const focused = isFieldFocused(f.key)
                    return (
                      <div
                        onClick={() => onSelectField?.(f.key, 'visitor-classes')}
                        className={`cursor-pointer rounded px-1 py-0.5 text-xs font-bold text-white transition-all ${
                          focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                        }`}
                      >
                        {res.text}
                      </div>
                    )
                  })()}
                  {(() => {
                    const f = APP_COMPONENTS[3].fields[1]
                    const res = resolve(f)
                    const focused = isFieldFocused(f.key)
                    return (
                      <div
                        onClick={() => onSelectField?.(f.key, 'visitor-classes')}
                        className={`cursor-pointer rounded px-1 text-[10px] text-zinc-400 transition-all ${
                          focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                        }`}
                      >
                        {res.text}
                      </div>
                    )
                  })()}
                </div>

                {(() => {
                  const f = APP_COMPONENTS[3].fields[2]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectField?.(f.key, 'visitor-classes')}
                      className={`cursor-pointer text-[10px] font-semibold text-[#b8e925] px-1.5 py-0.5 rounded transition-all ${
                        focused ? 'ring-2 ring-white bg-[#b8e925]/20' : ''
                      }`}
                    >
                      {res.text} &rarr;
                    </button>
                  )
                })()}
              </div>

              {/* Sample Class Mockup Card */}
              <div className="mt-2.5 bg-zinc-800/70 border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#b8e925]/20 flex items-center justify-center text-[#b8e925]">
                  <IconFlame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10.5px] font-semibold text-white">HIIT & Conditioning</p>
                  <p className="text-[9px] text-zinc-400">Today 6:00 PM · Studio A</p>
                </div>
              </div>
            </div>

            {/* 5. CONDENSED PLANS SHOWCASE */}
            <div
              id="visitor-plans"
              className={`rounded-2xl p-3.5 transition-all duration-200 border ${
                selectedComponentId === 'visitor-plans'
                  ? 'bg-zinc-900/90 border-[#b8e925]/50 ring-1 ring-[#b8e925]/30'
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="mb-2">
                {(() => {
                  const f = APP_COMPONENTS[4].fields[0]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <div
                      onClick={() => onSelectField?.(f.key, 'visitor-plans')}
                      className={`cursor-pointer rounded px-1 text-xs font-bold text-white transition-all ${
                        focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                      }`}
                    >
                      {res.text}
                    </div>
                  )
                })()}
                {(() => {
                  const f = APP_COMPONENTS[4].fields[1]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <div
                      onClick={() => onSelectField?.(f.key, 'visitor-plans')}
                      className={`cursor-pointer rounded px-1 text-[10px] text-zinc-400 transition-all ${
                        focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                      }`}
                    >
                      {res.text}
                    </div>
                  )
                })()}
              </div>

              {/* Sample Plan Rows */}
              <div className="bg-zinc-950/60 rounded-xl p-2 border border-white/5 divide-y divide-white/5">
                <div className="py-1.5 px-2 flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-zinc-200">Signature Club Plan</span>
                  <span className="font-mono text-zinc-300 font-bold">₹7,499</span>
                </div>
                <div className="py-1.5 px-2 flex justify-between items-center text-[10px]">
                  <span className="font-semibold text-zinc-200">Infinite Longevity</span>
                  <span className="font-mono text-[#b8e925] font-bold">₹14,999</span>
                </div>
              </div>

              {/* CTA Button */}
              {(() => {
                const f = APP_COMPONENTS[4].fields[2]
                const res = resolve(f)
                const focused = isFieldFocused(f.key)
                return (
                  <button
                    type="button"
                    onClick={() => onSelectField?.(f.key, 'visitor-plans')}
                    className={`cursor-pointer w-full mt-2.5 py-2 px-3 rounded-xl bg-[#b8e925] text-black font-bold text-[11px] flex items-center justify-center transition-all ${
                      focused ? 'ring-2 ring-white scale-105 shadow-md' : 'hover:opacity-90'
                    }`}
                  >
                    {res.text}
                  </button>
                )
              })()}
            </div>

            {/* 6. CLOSING CTA CARD */}
            <div
              id="visitor-closing"
              className={`rounded-2xl p-4 transition-all duration-200 border ${
                selectedComponentId === 'visitor-closing'
                  ? 'bg-zinc-900/90 border-[#b8e925]/50 ring-1 ring-[#b8e925]/30'
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
              }`}
            >
              {(() => {
                const f = APP_COMPONENTS[5].fields[0]
                const res = resolve(f)
                const focused = isFieldFocused(f.key)
                return (
                  <div
                    onClick={() => onSelectField?.(f.key, 'visitor-closing')}
                    className={`cursor-pointer rounded p-1 text-xs font-bold text-white transition-all ${
                      focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                    }`}
                  >
                    {res.text}
                  </div>
                )
              })()}

              {(() => {
                const f = APP_COMPONENTS[5].fields[1]
                const res = resolve(f)
                const focused = isFieldFocused(f.key)
                return (
                  <div
                    onClick={() => onSelectField?.(f.key, 'visitor-closing')}
                    className={`cursor-pointer rounded p-1 text-[10px] text-zinc-400 leading-relaxed transition-all ${
                      focused ? 'ring-2 ring-[#b8e925] bg-[#b8e925]/10' : ''
                    }`}
                  >
                    {res.text}
                  </div>
                )
              })()}

              {/* Action Buttons */}
              <div className="space-y-2 mt-3">
                {(() => {
                  const f = APP_COMPONENTS[5].fields[2]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectField?.(f.key, 'visitor-closing')}
                      className={`cursor-pointer w-full py-2 px-3 rounded-xl bg-[#b8e925] text-black font-bold text-[11px] flex items-center justify-center transition-all ${
                        focused ? 'ring-2 ring-white scale-105' : 'hover:opacity-90'
                      }`}
                    >
                      {res.text}
                    </button>
                  )
                })()}

                {(() => {
                  const f = APP_COMPONENTS[5].fields[3]
                  const res = resolve(f)
                  const focused = isFieldFocused(f.key)
                  return (
                    <button
                      type="button"
                      onClick={() => onSelectField?.(f.key, 'visitor-closing')}
                      className={`cursor-pointer w-full py-2 px-3 rounded-xl border border-zinc-700 text-white font-medium text-[11px] flex items-center justify-center transition-all ${
                        focused ? 'ring-2 ring-[#b8e925]' : 'hover:bg-zinc-800'
                      }`}
                    >
                      {res.text}
                    </button>
                  )
                })()}
              </div>

              {/* WhatsApp tour message */}
              {(() => {
                const f = APP_COMPONENTS[5].fields[4]
                const res = resolve(f)
                const focused = isFieldFocused(f.key)
                return (
                  <div
                    onClick={() => onSelectField?.(f.key, 'visitor-closing')}
                    className={`cursor-pointer mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[9.5px] text-zinc-500 hover:text-zinc-300 transition-colors ${
                      focused ? 'text-[#b8e925] font-semibold' : ''
                    }`}
                  >
                    <IconMessageCircle className="w-3 h-3 text-[#25D366] shrink-0" />
                    <span className="truncate">
                      Msg: &ldquo;{res.text}&rdquo;
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Bottom Home Indicator */}
          <div className="h-4 flex items-center justify-center shrink-0">
            <div className="w-24 h-1 bg-zinc-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
