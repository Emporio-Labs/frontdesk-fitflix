'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  IconAlertTriangle,
  IconClock,
  IconFlame,
  IconInfoCircle,
  IconPlus,
  IconRefresh,
  IconRotateClockwise2,
  IconTrash,
  IconUserCheck,
  IconVolume,
} from '@tabler/icons-react'
import {
  alertRuleService,
  type AlertRule,
  type AlertSeverity,
  type AlertSound,
  type EscalationStep,
} from '@/lib/services/alert-rule.service'
import { playSound, type SoundType } from '@/lib/audio-chime'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

const AVAILABLE_ROLES = [
  { value: 'frontdesk', label: 'Front Desk' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'admin', label: 'Club Owner / Admin' },
  { value: 'trainer', label: 'Instructor / Trainer' },
]

const SOUND_OPTIONS: Array<{ value: AlertSound; label: string; desc: string }> = [
  { value: 'chime', label: 'Two-Tone Chime', desc: 'Gentle notification' },
  { value: 'siren', label: 'Oscillating Siren', desc: 'Urgent alarm tone' },
  { value: 'pulse', label: 'Triple Pulse', desc: 'Sharp staccato beeps' },
  { value: 'bell', label: 'Resonant Bell', desc: 'Single attention ding' },
]

export function AlertRulesSettingsCard() {
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<string>('trainer_missing')

  const {
    data: rules = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.alertRules.all(),
    queryFn: () => alertRuleService.getAllRules(),
  })

  const currentRule = rules.find((r) => r.alertType === selectedType) ?? rules[0]

  // Local draft state for the selected rule
  const [draftSeverity, setDraftSeverity] = useState<AlertSeverity | null>(null)
  const [draftRole, setDraftRole] = useState<string | null>(null)
  const [draftSound, setDraftSound] = useState<AlertSound | null>(null)
  const [draftLadder, setDraftLadder] = useState<EscalationStep[] | null>(null)

  // Sync draft when selected rule changes
  const activeSeverity = draftSeverity ?? currentRule?.severity ?? 'warning'
  const activeRole = draftRole ?? currentRule?.firstResponderRole ?? 'frontdesk'
  const activeSound = draftSound ?? currentRule?.sound ?? 'chime'
  const activeLadder = draftLadder ?? currentRule?.escalationLadder ?? []

  const handleSelectRule = (type: string) => {
    setSelectedType(type)
    setDraftSeverity(null)
    setDraftRole(null)
    setDraftSound(null)
    setDraftLadder(null)
  }

  // Escalation step handlers
  const handleAddLadderStep = () => {
    const nextMinutes =
      activeLadder.length > 0
        ? activeLadder[activeLadder.length - 1].afterMinutes + 5
        : 5
    setDraftLadder([
      ...activeLadder,
      { role: 'branch_manager', afterMinutes: nextMinutes },
    ])
  }

  const handleUpdateLadderStep = (
    index: number,
    field: 'role' | 'afterMinutes',
    value: any
  ) => {
    const copy = [...activeLadder]
    copy[index] = { ...copy[index], [field]: value }
    setDraftLadder(copy)
  }

  const handleDeleteLadderStep = (index: number) => {
    const copy = activeLadder.filter((_, idx) => idx !== index)
    setDraftLadder(copy)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!currentRule) throw new Error('No rule selected')
      return alertRuleService.updateRule(currentRule.alertType, {
        severity: activeSeverity,
        firstResponderRole: activeRole,
        sound: activeSound,
        escalationLadder: activeLadder,
      })
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertRules.all() })
      toast.success(`Alert rule for "${updated.title}" saved successfully`)
      setDraftSeverity(null)
      setDraftRole(null)
      setDraftSound(null)
      setDraftLadder(null)
    },
    onError: (err: any) => {
      toast.error('Failed to save alert rule', {
        description: err.response?.data?.error || err.message,
      })
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => alertRuleService.resetRules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertRules.all() })
      toast.success('All alert rules reset to sensible defaults')
      setDraftSeverity(null)
      setDraftRole(null)
      setDraftSound(null)
      setDraftLadder(null)
    },
  })

  return (
    <Card className="shadow-none border">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg font-bold">
              Operational Alert Rules & Escalation Matrix (FX-36)
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
              Admin Config
            </Badge>
          </div>
          <CardDescription className="text-xs mt-1">
            Configure urgency severity, first responders, ladder climbing speed, and chime sounds per alert type.
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <IconRotateClockwise2 className="h-3.5 w-3.5" />
          <span>Reset to Defaults</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Step 1: Alert Type Selector Chips */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {rules.map((rule) => {
            const isSelected = rule.alertType === selectedType
            return (
              <button
                key={rule.alertType}
                type="button"
                onClick={() => handleSelectRule(rule.alertType)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border/70 hover:bg-muted text-muted-foreground'
                }`}
              >
                <span>{rule.title}</span>
                <Badge
                  variant={
                    rule.severity === 'critical'
                      ? 'destructive'
                      : rule.severity === 'warning'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="text-[9px] px-1 py-0 uppercase"
                >
                  {rule.severity}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Step 2: Configuration Editor for Selected Rule */}
        {currentRule && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border">
              <div>
                <h4 className="font-bold text-sm text-foreground">{currentRule.title}</h4>
                <p className="text-xs text-muted-foreground">{currentRule.description}</p>
              </div>

              {/* Audit attribution (FX-36.4) */}
              {currentRule.updatedBy ? (
                <div className="text-[11px] text-muted-foreground text-right">
                  <span>Last updated by: </span>
                  <strong className="text-foreground">
                    {currentRule.updatedBy.name} ({currentRule.updatedBy.role})
                  </strong>
                  <br />
                  <span>
                    {new Date(currentRule.updatedBy.updatedAt).toLocaleDateString()} at{' '}
                    {new Date(currentRule.updatedBy.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Using Sensible Default
                </Badge>
              )}
            </div>

            {/* Matrix Form Controls */}
            <div className="grid gap-5 md:grid-cols-3">
              {/* Severity */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <IconFlame className="h-3.5 w-3.5 text-rose-500" />
                  Urgency Severity
                </label>
                <Select
                  value={activeSeverity}
                  onValueChange={(val) => setDraftSeverity(val as AlertSeverity)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical (Immediate red alarm)</SelectItem>
                    <SelectItem value="warning">Warning (Amber priority)</SelectItem>
                    <SelectItem value="info">Info (Standard notice)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Determines badge visual prominence and chime priority.
                </p>
              </div>

              {/* First Responder */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <IconUserCheck className="h-3.5 w-3.5 text-blue-500" />
                  First Responder Role
                </label>
                <Select
                  value={activeRole}
                  onValueChange={(val) => setDraftRole(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Who receives the initial alert and hear the noise first.
                </p>
              </div>

              {/* Audio Sound */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <IconVolume className="h-3.5 w-3.5 text-emerald-500" />
                    Chime Sound
                  </span>
                  <button
                    type="button"
                    onClick={() => playSound(activeSound as SoundType)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    ▶ Test Sound
                  </button>
                </label>
                <Select
                  value={activeSound}
                  onValueChange={(val) => {
                    const s = val as AlertSound
                    setDraftSound(s)
                    playSound(s as SoundType)
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label} ({s.desc})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Plays in browser until acknowledged by a named staff member.
                </p>
              </div>
            </div>

            {/* Escalation Ladder Builder (FX-36.1) */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <IconClock className="h-4 w-4 text-amber-500" />
                    Escalation Ladder (Chain of Command)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    If unacknowledged, alert climbs automatically to higher roles after specified minutes.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLadderStep}
                  className="h-7 text-xs gap-1"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  <span>Add Escalation Step</span>
                </Button>
              </div>

              {activeLadder.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                  No escalation steps configured. Alert will remain assigned only to the first responder.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeLadder.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-card"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                        {idx + 1}
                      </span>

                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Escalate to</span>
                        <Select
                          value={step.role}
                          onValueChange={(val) =>
                            handleUpdateLadderStep(idx, 'role', val)
                          }
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <span className="text-xs text-muted-foreground">if unacknowledged after</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            max={1440}
                            value={step.afterMinutes}
                            onChange={(e) =>
                              handleUpdateLadderStep(
                                idx,
                                'afterMinutes',
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="w-20 h-8 text-xs text-center"
                          />
                          <span className="text-xs text-muted-foreground">mins</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLadderStep(idx)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="default"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="gap-1 text-xs"
              >
                <span>Save Changes to Rule</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
