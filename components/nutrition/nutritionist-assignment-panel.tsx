'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  IconSearch,
  IconUserCheck,
  IconAlertTriangle,
  IconChecks,
  IconHistory,
  IconCertificate,
  IconCheck,
  IconEdit,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { useUsers } from '@/hooks/use-users'
import {
  useNutritionists,
  useNutritionistAssignmentLogs,
  useAssignNutritionist,
  useUpdateNutritionist,
} from '@/hooks/use-nutritionists'
import type { Nutritionist } from '@/lib/services/nutritionist.service'
import { SkeletonTable } from '@/components/skeleton-loader'
import { EmptyState } from '@/components/empty-state'

const CATEGORIES = [
  'Weight Management',
  'Sports Nutrition',
  'Clinical Nutrition',
  'Pediatric Nutrition',
  'Geriatric Nutrition',
  'General Wellness',
]

export function NutritionistAssignmentPanel() {
  const { data: nutritionists = [], isLoading: isLoadingNutritionists } = useNutritionists()
  const { data: logs = [], isLoading: isLoadingLogs } = useNutritionistAssignmentLogs()
  const { data: users = [], isLoading: isLoadingUsers } = useUsers()

  const assignMutation = useAssignNutritionist()
  const updateNutritionistMutation = useUpdateNutritionist()

  // Member search & assignment state
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedNutritionistId, setSelectedNutritionistId] = useState('')

  // Certifications dialog state
  const [editingNutritionist, setEditingNutritionist] = useState<Nutritionist | null>(null)
  const [certInput, setCertInput] = useState('')

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return []
    return users
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone ?? '').includes(q)
      )
      .slice(0, 5) // Limit to 5 results for dropdown
  }, [users, memberSearch])

  // Handle category toggle
  const handleCategoryToggle = async (nutritionist: Nutritionist, category: string, checked: boolean) => {
    const currentSpecialties = nutritionist.specialties || []
    let newSpecialties = [...currentSpecialties]

    if (checked) {
      newSpecialties.push(category)
    } else {
      newSpecialties = newSpecialties.filter((c) => c !== category)
    }

    // Check certification warning
    const certs = nutritionist.certifications || []
    const isCertified = certs.includes(category)

    if (checked && !isCertified) {
      if (!confirm(`Warning: ${nutritionist.name} is not certified for "${category}". Do you want to proceed with assigning this category?`)) {
        return
      }
    }

    try {
      await assignMutation.mutateAsync({
        type: 'category',
        nutritionistId: nutritionist._id || nutritionist.id,
        categories: newSpecialties,
      })
    } catch (e) {
      // Error handled by hook
    }
  }

  // Handle member assignment
  const handleMemberAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberId) {
      toast.error('Please select a member')
      return
    }
    if (!selectedNutritionistId) {
      toast.error('Please select a nutritionist')
      return
    }

    try {
      await assignMutation.mutateAsync({
        type: 'member',
        nutritionistId: selectedNutritionistId,
        memberId: selectedMemberId,
      })
      // Clear form
      setMemberSearch('')
      setSelectedMemberId('')
      setSelectedNutritionistId('')
      toast.success('Primary nutritionist allocated successfully')
    } catch (e) {
      // Error handled by hook
    }
  }

  // Handle cert save
  const handleSaveCertifications = async () => {
    if (!editingNutritionist) return
    const certsArray = certInput
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    try {
      await updateNutritionistMutation.mutateAsync({
        id: editingNutritionist._id || editingNutritionist.id,
        payload: { certifications: certsArray },
      })
      setEditingNutritionist(null)
    } catch (e) {
      // Error handled by hook
    }
  }

  const isLoading = isLoadingNutritionists || isLoadingLogs || isLoadingUsers

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonTable />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Category Mapping Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <IconChecks className="h-5 w-5 text-primary" /> Service Category Assignment
          </CardTitle>
          <CardDescription>
            Manage nutritionists' specialties/booking eligibility and certifications. Warnings are displayed if they lack certification for enabled categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {nutritionists.length === 0 ? (
            <EmptyState
              icon={<IconChecks className="h-10 w-10" />}
              title="No nutritionists found"
              description="Create a nutritionist first to configure service category mappings."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {nutritionists.map((nut) => {
                const nutId = nut._id || nut.id
                return (
                  <Card key={nutId} className="border bg-card shadow-sm hover:shadow-md transition">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-bold">{nut.name}</CardTitle>
                          <Badge variant={nut.status === 'ACTIVE' ? 'default' : 'secondary'} className="mt-1">
                            {nut.status}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingNutritionist(nut)
                            setCertInput((nut.certifications || []).join(', '))
                          }}
                        >
                          <IconEdit className="h-4 w-4 mr-1" /> Certifications
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Certifications Display */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-0.5">
                          <IconCertificate className="h-3.5 w-3.5" /> Certifications:
                        </span>
                        {nut.certifications && nut.certifications.length > 0 ? (
                          nut.certifications.map((c, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border-blue-200">
                              {c}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">None added</span>
                        )}
                      </div>

                      {/* Specialties Toggle Grid */}
                      <div className="space-y-2 pt-2 border-t">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Allowed Booking Categories
                        </span>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {CATEGORIES.map((cat) => {
                            const isChecked = (nut.specialties || []).includes(cat)
                            const isCertified = (nut.certifications || []).includes(cat)
                            const isSaving = assignMutation.isPending && assignMutation.variables?.nutritionistId === nutId
                            
                            return (
                              <div
                                key={cat}
                                className="flex items-center space-x-2 rounded-md p-1.5 hover:bg-accent/40 transition"
                              >
                                <Checkbox
                                  id={`cat-${nutId}-${cat}`}
                                  checked={isChecked}
                                  disabled={isSaving}
                                  onCheckedChange={(checked) =>
                                    handleCategoryToggle(nut, cat, checked === true)
                                  }
                                />
                                <label
                                  htmlFor={`cat-${nutId}-${cat}`}
                                  className="text-xs font-medium leading-none cursor-pointer flex flex-wrap items-center gap-1"
                                >
                                  {cat}
                                  {isChecked && !isCertified && (
                                    <span className="text-amber-500 flex items-center" title="Not certified">
                                      <IconAlertTriangle className="h-3 w-3 inline" />
                                    </span>
                                  )}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Allocation and History */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Member Allocation Form */}
        <Card className="md:col-span-1 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <IconUserCheck className="h-5 w-5 text-primary" /> Primary Advisor Allocation
            </CardTitle>
            <CardDescription>
              Assign a dedicated nutritionist to a member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMemberAssignment} className="space-y-4">
              {/* Member Search */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-muted-foreground">Search Member</label>
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Type name, email, or phone..."
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value)
                      setSelectedMemberId('')
                    }}
                    className="pl-9"
                  />
                </div>
                {/* Search Dropdown Results */}
                {filteredUsers.length > 0 && !selectedMemberId && (
                  <div className="absolute z-10 w-full bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 divide-y">
                    {filteredUsers.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-xs hover:bg-accent transition flex justify-between"
                        onClick={() => {
                          setSelectedMemberId(u._id)
                          setMemberSearch(u.username || u.email || '')
                        }}
                      >
                        <span className="font-bold">{u.username}</span>
                        <span className="text-muted-foreground">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Member Indicator */}
              {selectedMemberId && (
                <div className="bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-200 flex items-center justify-between">
                  <span>Selected Member ID: {selectedMemberId}</span>
                  <IconCheck className="h-4 w-4 text-green-600" />
                </div>
              )}

              {/* Nutritionist Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Select Nutritionist</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={selectedNutritionistId}
                  onChange={(e) => setSelectedNutritionistId(e.target.value)}
                >
                  <option value="">-- Choose Nutritionist --</option>
                  {nutritionists.map((nut) => (
                    <option key={nut._id || nut.id} value={nut._id || nut.id}>
                      {nut.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={assignMutation.isPending || !selectedMemberId || !selectedNutritionistId}
              >
                {assignMutation.isPending ? 'Saving Allocation…' : 'Allocate Advisor'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assignment Logs */}
        <Card className="md:col-span-2 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <IconHistory className="h-5 w-5 text-primary" /> Assignment logs
            </CardTitle>
            <CardDescription>
              A historical log of category mappings and member advisor changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <EmptyState
                icon={<IconHistory className="h-8 w-8" />}
                title="No assignment logs"
                description="Activity logs will appear here as assignments are made."
              />
            ) : (
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0">
                    <TableRow>
                      <TableHead className="w-[120px]">Time</TableHead>
                      <TableHead className="w-[150px]">Nutritionist</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, idx) => (
                      <TableRow key={log._id || idx}>
                        <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="font-semibold text-xs">
                          {log.nutritionistName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={log.type === 'member' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'}>
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={log.details}>
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certifications Dialog */}
      <Dialog open={!!editingNutritionist} onOpenChange={(open) => !open && setEditingNutritionist(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Certifications</DialogTitle>
            <DialogDescription>
              Update certifications for <strong>{editingNutritionist?.name}</strong>. Provide a comma-separated list of certifications.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              placeholder="e.g. Weight Management, Sports Nutrition, Clinical Nutrition"
            />
            <p className="text-[10px] text-muted-foreground">
              Certifications matching specialties prevent warnings when assigning categories.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNutritionist(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCertifications}
              disabled={updateNutritionistMutation.isPending}
            >
              {updateNutritionistMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
