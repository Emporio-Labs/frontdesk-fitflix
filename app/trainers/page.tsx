'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicTrainers } from '@/hooks/use-trainers'
import { IconSearch, IconArrowRight, IconQuote, IconRun } from '@tabler/icons-react'

// Beautiful gradients to use as abstract backgrounds when trainers don't have images
const GRADIENTS = [
  'from-orange-500 to-rose-600',
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-fuchsia-700',
  'from-emerald-500 to-teal-600',
]

export default function PublicTrainersDirectory() {
  const { data: trainers = [], isLoading, isError } = usePublicTrainers()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpeciality, setSelectedSpeciality] = useState('All')

  // Derive unique specialities from all active trainers
  const allSpecialities = ['All', ...Array.from(new Set(trainers.flatMap(t => t.specialities)))]

  // Filter trainers based on search and speciality
  const filteredTrainers = trainers.filter(trainer => {
    const matchesSearch = trainer.trainerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSpeciality = selectedSpeciality === 'All' || trainer.specialities.includes(selectedSpeciality)
    
    return matchesSearch && matchesSpeciality
  })

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/80 border-b border-neutral-800/60 px-6 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/fitflix_logo.png"
              alt="Fitflix Logo"
              width={32}
              height={32}
              className="rounded object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">
              FITFLIX
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/trainers" className="text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Our Trainers
            </Link>
            <Link href="/login" className="text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition-colors">
              Access Dashboard
            </Link>
          </nav>
          <div>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-semibold shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-[1.02]">
                Join Fitflix
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden border-b border-neutral-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider">
            Fitflix Elite Coaching
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-none">
            Meet the Masters of{' '}
            <span className="bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 bg-clip-text text-transparent">
              Transformation
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Our elite fitness specialists, wellness mentors, and therapy experts are here to guide your personalized health journey.
          </p>
        </div>
      </section>

      {/* Main Directory Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 space-y-8">
        {/* Controls Layout */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-neutral-900/40 p-4 rounded-xl border border-neutral-800/80 backdrop-blur-sm">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search trainers by name or speciality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-neutral-950 border-neutral-800 text-neutral-200 placeholder-neutral-500 focus-visible:ring-orange-500 focus-visible:border-orange-500 w-full"
            />
          </div>

          {/* Filter Specialities */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end overflow-x-auto no-scrollbar py-1">
            {allSpecialities.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpeciality(spec)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 border ${
                  selectedSpeciality === spec
                    ? 'bg-orange-500 text-neutral-950 border-orange-500 font-extrabold shadow-md shadow-orange-500/10'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error / Grid rendering */}
        {isError && (
          <div className="text-center py-16 bg-neutral-900/20 border border-neutral-800/50 rounded-2xl">
            <p className="text-red-500 font-semibold mb-2">Unable to load trainer catalog.</p>
            <p className="text-neutral-500 text-sm">Please refresh the page or try again later.</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-neutral-900 border-neutral-800 overflow-hidden h-[420px] flex flex-col animate-pulse">
                <div className="h-56 bg-neutral-800/50 w-full" />
                <div className="p-6 flex-1 space-y-4">
                  <div className="h-6 bg-neutral-850 w-3/4 rounded" />
                  <div className="h-4 bg-neutral-850 w-1/2 rounded" />
                  <div className="h-16 bg-neutral-850 w-full rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {filteredTrainers.length === 0 ? (
              <div className="text-center py-20 bg-neutral-900/10 border border-neutral-850 rounded-2xl space-y-4">
                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-600">
                  <IconRun className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-neutral-300">No trainers matched your filters</h3>
                <p className="text-neutral-500 text-sm max-w-sm mx-auto">
                  Try adjusting your search criteria or selecting a different specialty category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredTrainers.map((trainer, index) => {
                  const gradient = GRADIENTS[index % GRADIENTS.length]
                  
                  return (
                    <Card
                      key={trainer._id}
                      className="group bg-neutral-900/30 hover:bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700/80 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 shadow-xl hover:shadow-2xl hover:shadow-orange-500/5"
                    >
                      {/* Image Frame */}
                      <div className="relative h-56 w-full bg-neutral-950 overflow-hidden border-b border-neutral-800/50">
                        {trainer.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={trainer.imageUrl}
                            alt={trainer.trainerName}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center opacity-85 relative`}>
                            <div className="absolute inset-0 bg-neutral-950/40" />
                            <span className="text-5xl font-black text-white tracking-widest relative z-10 uppercase drop-shadow-md">
                              {trainer.trainerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                        
                        {/* Overlay Specialities badges */}
                        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
                          {trainer.specialities.slice(0, 3).map((s) => (
                            <Badge
                              key={s}
                              className="bg-neutral-950/90 text-orange-400 hover:bg-neutral-950 border border-neutral-800 text-[10px] py-0.5 px-2 rounded-md font-bold uppercase tracking-wider"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Content Card Body */}
                      <CardContent className="p-6 flex-1 flex flex-col space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors duration-300">
                            {trainer.trainerName}
                          </h3>
                        </div>

                        {/* Tagline / Key Sentence quote box */}
                        {trainer.keySentence ? (
                          <div className="relative pl-7 py-1 text-neutral-300 italic text-sm font-medium border-l border-neutral-850">
                            <IconQuote className="absolute left-1 top-0.5 w-4 h-4 text-orange-500/60 rotate-180" />
                            "{trainer.keySentence}"
                          </div>
                        ) : (
                          <div className="h-[2px]" />
                        )}

                        <p className="text-neutral-400 text-xs leading-relaxed line-clamp-3">
                          {trainer.description || 'Professional coach dedicated to fitness, health progress, and performance improvements.'}
                        </p>
                      </CardContent>

                      <CardFooter className="p-6 pt-0 border-t border-neutral-900 bg-neutral-900/10">
                        <Link href={`/trainers/${trainer._id}`} className="w-full">
                          <Button
                            variant="ghost"
                            className="w-full bg-neutral-950/50 hover:bg-orange-500 hover:text-neutral-950 border border-neutral-850 hover:border-orange-500 text-neutral-300 text-xs font-bold py-5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300"
                          >
                            Explore Profile <IconArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
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
