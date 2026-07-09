'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePublicTrainer } from '@/hooks/use-trainers'
import { IconChevronLeft, IconQuote, IconCheck, IconRun } from '@tabler/icons-react'

// Beautiful gradients to use as abstract backgrounds when trainers don't have images
const GRADIENTS = [
  'from-orange-500 to-rose-600',
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-fuchsia-700',
  'from-emerald-500 to-teal-600',
]

export default function PublicTrainerDetail({ params }: { params: any }) {
  // Gracefully handle Next.js 14 vs 15 async params resolution
  const resolvedParams = params instanceof Promise ? React.use(params) : params
  const id = resolvedParams?.id

  const { data: trainer, isLoading, isError } = usePublicTrainer(id)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 space-y-8 animate-pulse">
          <div className="h-8 w-24 bg-neutral-900 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-1 h-[400px] bg-neutral-900 rounded-2xl" />
            <div className="md:col-span-2 space-y-6">
              <div className="h-12 w-2/3 bg-neutral-900 rounded" />
              <div className="h-6 w-1/3 bg-neutral-900 rounded" />
              <div className="h-24 w-full bg-neutral-900 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !trainer) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans justify-center items-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto text-red-500">
            <IconRun className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Trainer Not Found</h2>
          <p className="text-neutral-500 text-sm">
            The trainer profile you are looking for might have been deactivated by the administrator or does not exist.
          </p>
          <div className="pt-4">
            <Link href="/trainers">
              <Button className="bg-orange-500 hover:bg-orange-600 text-neutral-950 font-bold">
                Back to Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Pick a stable gradient index based on trainer ID
  const charSum = trainer._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const gradient = GRADIENTS[charSum % GRADIENTS.length]

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/80 border-b border-neutral-800/60 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/fitflix_logo.png"
              alt="Fitflix Logo"
              width={32}
              height={32}
              className="rounded object-contain"
            />
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">
              FITFLIX
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/trainers" className="text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition-colors">
              Our Trainers
            </Link>
            <Link href="/login" className="text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition-colors">
              Access Dashboard
            </Link>
          </nav>
          <div>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-semibold shadow-lg shadow-orange-500/20">
                Join Fitflix
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Profile Page */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 space-y-8">
        {/* Back Link */}
        <div>
          <Link href="/trainers" className="inline-flex items-center text-sm font-semibold text-neutral-400 hover:text-orange-400 transition-colors gap-1 group">
            <IconChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Directory
          </Link>
        </div>

        {/* Profile Card Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
          {/* Left Column: Trainer Photo */}
          <div className="md:col-span-1 flex flex-col items-center space-y-6">
            <div className="relative w-full aspect-square md:aspect-[3/4] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950">
              {trainer.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trainer.imageUrl}
                  alt={trainer.trainerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center opacity-90 relative`}>
                  <div className="absolute inset-0 bg-neutral-950/40" />
                  <span className="text-7xl font-black text-white uppercase tracking-widest drop-shadow-md">
                    {trainer.trainerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-60" />
            </div>

            {/* Quick credentials card */}
            <Card className="w-full bg-neutral-900/40 border-neutral-800/80 backdrop-blur-xs">
              <CardContent className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">Coach Stats</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center justify-between text-neutral-400">
                    <span>Active Coaching</span>
                    <span className="text-white font-semibold">1-on-1 & Groups</span>
                  </li>
                  <li className="flex items-center justify-between text-neutral-400">
                    <span>Locations</span>
                    <span className="text-white font-semibold">Fitflix Club & Hybrid</span>
                  </li>
                  <li className="flex items-center justify-between text-neutral-400">
                    <span>Format</span>
                    <span className="text-white font-semibold">In-person & Digital</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Profile Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Header info */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 py-1 px-3 text-xs font-semibold rounded-md">
                  Certified Instructor
                </Badge>
                {trainer.specialities.map(spec => (
                  <Badge key={spec} variant="secondary" className="text-xs py-1 px-2.5 bg-neutral-900 border-neutral-800 text-neutral-300">
                    {spec}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{trainer.trainerName}</h1>
              <p className="text-neutral-400 text-lg">Specialist Coach at Fitflix Club</p>
            </div>

            {/* Quote Block / Key tag sentence */}
            {trainer.keySentence && (
              <div className="relative p-6 md:p-8 bg-neutral-900/20 border border-l-4 border-l-orange-500 border-neutral-800/80 rounded-r-2xl shadow-md">
                <IconQuote className="absolute left-6 top-6 w-8 h-8 text-orange-500/20 rotate-180" />
                <p className="text-lg md:text-xl text-neutral-200 font-medium italic relative z-10 pl-6 leading-relaxed">
                  "{trainer.keySentence}"
                </p>
              </div>
            )}

            {/* Bio / Description */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white border-b border-neutral-900 pb-2">About The Coach</h3>
              <p className="text-neutral-300 leading-relaxed whitespace-pre-line text-sm md:text-base">
                {trainer.description || 'Dedicated elite specialist fitness coach focusing on customized exercise protocols, nutritional plans, and health tracking.'}
              </p>
            </div>

            {/* Core Values / Benefits checklist */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white border-b border-neutral-900 pb-2">Training Philosophy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  '100% Customized Training Routines',
                  'Regular Performance Progression Reviews',
                  'Injury Prevention & Form Correction',
                  'Holistic Health & Mindset Mentoring'
                ].map((ph, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-neutral-300 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                      <IconCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>{ph}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Call to Action */}
            <div className="bg-gradient-to-r from-orange-500/10 via-rose-500/5 to-transparent border border-orange-500/20 p-8 rounded-2xl space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Start Your Transformation Today</h3>
                <p className="text-neutral-400 text-sm">
                  Ready to train with {trainer.trainerName.split(' ')[0]}? Book a consultation, setup a trial session, or customize your gym slots.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-bold py-6 px-8 rounded-xl shadow-lg shadow-orange-500/15 hover:scale-[1.02] transition-transform duration-200">
                    Book Trial Session
                  </Button>
                </Link>
                <Link href="/trainers">
                  <Button variant="outline" className="w-full sm:w-auto border-neutral-800 text-neutral-300 hover:bg-neutral-900 py-6 px-8 rounded-xl font-semibold">
                    Compare Other Coaches
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-900 py-12 px-6 text-neutral-500 text-xs mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/fitflix_logo.png"
              alt="Fitflix Logo"
              width={24}
              height={24}
              className="opacity-40"
            />
            <span className="font-extrabold tracking-wider text-neutral-400">FITFLIX © 2026</span>
          </div>
          <div className="flex gap-8 text-neutral-400">
            <Link href="/trainers" className="hover:text-orange-400 transition-colors">Find a Coach</Link>
            <Link href="/login" className="hover:text-orange-400 transition-colors">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
