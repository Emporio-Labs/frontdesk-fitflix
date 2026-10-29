'use client'

import { useState } from 'react'
import {
  IconPlus,
  IconTicket,
  IconTrash,
  IconCheck,
  IconSparkles,
  IconCoins,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TicketTier } from '@/lib/services/event.service'

interface TierManagerProps {
  tiers: TicketTier[]
  onChange: (tiers: TicketTier[]) => void
}

const TIER_PRESETS = [
  {
    tierId: 'super_early_bird',
    name: 'Super Early Bird Pass',
    badgeLabel: 'SUPER EARLY BIRD',
    badgeColor: '#10b981',
    type: 'paid' as const,
    price: 299,
    totalQuantity: 50,
    perks: ['Official Event Jersey', 'Priority Entrance Gate', 'Fitflix Shaker Bottle'],
  },
  {
    tierId: 'early_bird',
    name: 'Early Bird Pass',
    badgeLabel: 'EARLY BIRD',
    badgeColor: '#3b82f6',
    type: 'paid' as const,
    price: 499,
    totalQuantity: 100,
    perks: ['Official Event T-Shirt', 'Energy Snack & Drink'],
  },
  {
    tierId: 'free_rsvp',
    name: 'Free Community RSVP Pass',
    badgeLabel: 'FREE RSVP',
    badgeColor: '#8b5cf6',
    type: 'free' as const,
    price: 0,
    totalQuantity: 150,
    perks: ['General Admission', 'Community Workout Zone Access'],
  },
  {
    tierId: 'vip_all_access',
    name: 'All Access VIP Pass',
    badgeLabel: 'ALL ACCESS PASS',
    badgeColor: '#f59e0b',
    type: 'paid' as const,
    price: 999,
    totalQuantity: 25,
    perks: [
      'VIP Front-Row Zone',
      'Full Swag & Apparel Kit',
      'Post-Workout Specialty Coffee & Meal',
      '1:1 Nutritionist Voucher',
    ],
  },
]

export function TierManager({ tiers, onChange }: TierManagerProps) {
  const [open, setOpen] = useState(false)
  const [tierName, setTierName] = useState('')
  const [badgeLabel, setBadgeLabel] = useState('ALL ACCESS PASS')
  const [badgeColor, setBadgeColor] = useState('#10b981')
  const [tierType, setTierType] = useState<'free' | 'rsvp' | 'paid'>('paid')
  const [price, setPrice] = useState('499')
  const [quantity, setQuantity] = useState('50')
  const [perksText, setPerksText] = useState('')

  const handleApplyPreset = (preset: typeof TIER_PRESETS[0]) => {
    setTierName(preset.name)
    setBadgeLabel(preset.badgeLabel)
    setBadgeColor(preset.badgeColor)
    setTierType(preset.type)
    setPrice(String(preset.price))
    setQuantity(String(preset.totalQuantity))
    setPerksText(preset.perks.join(', '))
  }

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tierName.trim()) return

    const tierId = tierName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const newTier: TicketTier = {
      tierId: `${tierId}_${Date.now()}`,
      name: tierName.trim(),
      badgeLabel: badgeLabel.trim() || 'PASS',
      badgeColor,
      type: tierType,
      price: tierType === 'free' || tierType === 'rsvp' ? 0 : parseFloat(price) || 0,
      totalQuantity: parseInt(quantity, 10) || 50,
      soldQuantity: 0,
      perks: perksText
        ? perksText
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
        : [],
    }

    onChange([...tiers, newTier])
    setOpen(false)
    // Reset form
    setTierName('')
    setPerksText('')
  }

  const handleRemoveTier = (index: number) => {
    const updated = [...tiers]
    updated.splice(index, 1)
    onChange(updated)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <IconTicket className="h-5 w-5 text-emerald-500" />
            Pass & Ticket Tiers ({tiers.length})
          </CardTitle>
          <CardDescription>
            Configure Super Early Bird, Early Bird, Free RSVP, and VIP passes with custom allotments and perks.
          </CardDescription>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <IconPlus className="h-4 w-4" />
              Add Ticket Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IconSparkles className="h-5 w-5 text-amber-500" />
                Add Ticket Tier
              </DialogTitle>
              <DialogDescription>
                Choose a 1-click preset or customize your pass tier.
              </DialogDescription>
            </DialogHeader>

            {/* Presets Strip */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick Presets:</Label>
              <div className="grid grid-cols-2 gap-2">
                {TIER_PRESETS.map((p) => (
                  <Button
                    key={p.tierId}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset(p)}
                    className="justify-start text-xs h-auto py-1.5 px-2.5 truncate"
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-1.5 shrink-0"
                      style={{ backgroundColor: p.badgeColor }}
                    />
                    <span className="truncate">{p.badgeLabel}</span>
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddTier} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="tName">Tier Name *</Label>
                <Input
                  id="tName"
                  placeholder="e.g. Super Early Bird Pass"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bLabel">Pass Badge Pill Text</Label>
                  <Input
                    id="bLabel"
                    placeholder="SUPER EARLY BIRD"
                    value={badgeLabel}
                    onChange={(e) => setBadgeLabel(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bColor">Badge Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="bColor"
                      type="color"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="h-9 w-12 rounded cursor-pointer border bg-transparent p-1"
                    />
                    <span
                      className="text-xs font-mono px-2 py-1 rounded border"
                      style={{ color: badgeColor, borderColor: badgeColor }}
                    >
                      {badgeLabel || 'PREVIEW'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="tType">Type</Label>
                  <Select value={tierType} onValueChange={(v: any) => setTierType(v)}>
                    <SelectTrigger id="tType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid (₹)</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="rsvp">RSVP Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tPrice">Price (₹)</Label>
                  <Input
                    id="tPrice"
                    type="number"
                    min="0"
                    disabled={tierType === 'free' || tierType === 'rsvp'}
                    value={tierType === 'free' || tierType === 'rsvp' ? '0' : price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tQty">Seats Cap *</Label>
                  <Input
                    id="tQty"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tPerks">Perks / Inclusions (comma-separated)</Label>
                <Input
                  id="tPerks"
                  placeholder="Official Jersey, Goodie Kit, Post-workout meal"
                  value={perksText}
                  onChange={(e) => setPerksText(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Pass Tier</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {tiers.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
            No pass tiers configured yet. Click &quot;Add Ticket Tier&quot; to configure Super Early Bird, Early Bird, or Free RSVP passes.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tiers.map((t, idx) => (
              <div
                key={t.tierId || idx}
                className="border rounded-xl p-4 bg-muted/20 relative space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-base">{t.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: t.badgeColor || '#10b981' }}
                        >
                          {t.badgeLabel || 'PASS'}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {t.type} tier
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTier(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Remove tier"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <IconCoins className="h-4 w-4 text-amber-500" />
                      <span>{t.price === 0 ? 'FREE' : `₹${t.price}`}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Allotment: <span className="font-semibold text-foreground">{t.totalQuantity} seats</span>
                    </div>
                  </div>

                  {t.perks && t.perks.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Includes:</span>
                      <ul className="text-xs space-y-0.5 text-muted-foreground">
                        {t.perks.map((p, pIdx) => (
                          <li key={pIdx} className="flex items-center gap-1.5">
                            <IconCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
