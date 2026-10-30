'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { IconReceiptTax, IconLoader2, IconCheck } from '@tabler/icons-react'
import {
  useBillingSettings,
  useUpdateBillingSettings,
} from '@/hooks/use-billing-settings'

export function BillingSettingsCard() {
  const { data: settings, isLoading, isError } = useBillingSettings()
  const updateSettings = useUpdateBillingSettings()

  const [taxRatePercent, setTaxRatePercent] = useState<number>(5)
  const [gstin, setGstin] = useState<string>('')
  const [currency, setCurrency] = useState<string>('INR')
  const [sacCode, setSacCode] = useState<string>('999723')
  const [syncLocations, setSyncLocations] = useState<boolean>(true)

  useEffect(() => {
    if (settings) {
      setTaxRatePercent(typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 5)
      setGstin(settings.gstin ?? '')
      setCurrency(settings.currency ?? 'INR')
      setSacCode(settings.sacCode ?? '999723')
    }
  }, [settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings.mutateAsync({
      taxRatePercent: Number(taxRatePercent),
      gstin: gstin.trim(),
      currency: currency.trim() || 'INR',
      sacCode: sacCode.trim() || '999723',
      syncLocations,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconReceiptTax className="w-5 h-5 text-primary" />
          <div>
            <CardTitle>Billing & Tax Settings</CardTitle>
            <CardDescription>
              Configure the default GST percentage applied automatically to all membership sales and invoices
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tax-rate-percent" className="text-sm font-medium">
                Default GST Rate (%)
              </Label>
              <div className="relative mt-1">
                <Input
                  id="tax-rate-percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                  className="pr-8"
                  required
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Set once, and this value is used to calculate GST on every invoice across all branches.
              </p>
            </div>

            <div>
              <Label htmlFor="gstin" className="text-sm font-medium">
                Company GSTIN (Optional)
              </Label>
              <Input
                id="gstin"
                type="text"
                placeholder="e.g. 36AABCU9603R1ZM"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="mt-1 uppercase"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Printed on member tax invoices and receipts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sac-code" className="text-sm font-medium">
                SAC / HSN Code
              </Label>
              <Input
                id="sac-code"
                type="text"
                placeholder="999723"
                value={sacCode}
                onChange={(e) => setSacCode(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Service Accounting Code for fitness & health club services.
              </p>
            </div>

            <div>
              <Label htmlFor="currency" className="text-sm font-medium">
                Billing Currency
              </Label>
              <Input
                id="currency"
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="sync-locations"
              type="checkbox"
              checked={syncLocations}
              onChange={(e) => setSyncLocations(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="sync-locations" className="text-sm font-normal text-muted-foreground">
              Also apply this GST rate across all existing branches
            </Label>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Billing Settings'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
