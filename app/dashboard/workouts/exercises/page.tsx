'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconChevronLeft, IconSearch, IconFlame } from '@tabler/icons-react'
import { useExercises } from '@/hooks/use-exercises'
import { MUSCLE_GROUPS, DIFFICULTIES, MuscleGroup, Difficulty } from '@/types/workout'
import type { Exercise } from '@/types/workout'

export default function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<string>('All')
  const [difficulty, setDifficulty] = useState<string>('All')
  const [page, setPage] = useState(1)
  const limit = 12

  // 1. Fetch exercises with filters
  const { data: listResponse, isLoading, isError, refetch } = useExercises({
    search: search.trim() || undefined,
    muscleGroup: muscleGroup !== 'All' ? (muscleGroup as MuscleGroup) : undefined,
    difficulty: difficulty !== 'All' ? (difficulty as Difficulty) : undefined,
    page,
    limit,
  })

  const exercises = listResponse?.exercises ?? []
  const pagination = listResponse?.pagination

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1) // Reset to first page on search
  }

  const handleMuscleGroupChange = (val: string) => {
    setMuscleGroup(val)
    setPage(1) // Reset to first page
  }

  const handleDifficultyChange = (val: string) => {
    setDifficulty(val)
    setPage(1) // Reset to first page
  }

  const getDifficultyColor = (diff?: Difficulty) => {
    switch (diff) {
      case 'Beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-transparent'
      case 'Intermediate':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-transparent'
      case 'Advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-transparent'
      default:
        return ''
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 px-2">
              <Link href="/dashboard/workouts">
                <IconChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Workouts / Exercises</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Exercise Library</h2>
          <p className="text-muted-foreground text-sm">
            Lookup and browse all exercises available in the system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search Directory</CardTitle>
          <CardDescription>Browse by name, muscle group, or difficulty level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exercises by name..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>

            <div className="w-[180px]">
              <Select value={muscleGroup} onValueChange={handleMuscleGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Muscles</SelectItem>
                  {MUSCLE_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select value={difficulty} onValueChange={handleDifficultyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Levels</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isError && (
            <div className="text-center py-8 text-red-500">
              Failed to load exercise directory.
              <button className="underline ml-1" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-lg" />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border rounded-lg">
              No exercises found matching the filters.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {exercises.map((ex: Exercise) => (
                  <Card key={ex._id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {ex.muscleGroup}
                          </Badge>
                          <Badge className={`text-[10px] uppercase font-semibold ${getDifficultyColor(ex.difficulty)}`}>
                            {ex.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-base font-bold line-clamp-1 mt-1.5">
                        {ex.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Equipment: {ex.equipment || 'Bodyweight'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground line-clamp-3 min-h-[48px]">
                        {ex.instructions || 'No instructions provided.'}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                        <IconFlame className="w-4 h-4 text-orange-500 shrink-0" />
                        <span>{ex.caloriesPerSet ? `${ex.caloriesPerSet} kcal / set` : '—'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
