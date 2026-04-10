'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import { useUsers } from '@/hooks/use-users'
import {
  CreditTransactionSource,
  useTopUpUserCredits,
  useUserCreditBalance,
  useUserCreditHistory,
} from '@/hooks/use-credits'

type HistorySourceFilter = 'all' | CreditTransactionSource

function formatDate(value: string) {
  if (!value) return '-'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

function formatAmount(amount: number) {
  if (amount > 0) return `+${amount}`
  return `${amount}`
}

export default function CreditsPage() {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [historyLimit, setHistoryLimit] = useState(50)
  const [historySource, setHistorySource] = useState<HistorySourceFilter>('all')
  const [topUpAmount, setTopUpAmount] = useState(1)
  const [topUpMembershipId, setTopUpMembershipId] = useState('')
  const [topUpReason, setTopUpReason] = useState('')

  const { data: users = [] } = useUsers()

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId),
    [users, selectedUserId]
  )

  const sourceType = historySource === 'all' ? undefined : historySource

  const {
    data: balance,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
    refetch: refetchBalance,
  } = useUserCreditBalance(selectedUserId, Boolean(selectedUserId))

  const {
    data: history,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useUserCreditHistory({
    userId: selectedUserId,
    limit: historyLimit,
    sourceType,
    enabled: Boolean(selectedUserId),
  })

  const topUpCredits = useTopUpUserCredits()

  const memberships = balance?.memberships || []
  const transactions = history?.transactions || []

  const handleRefresh = async () => {
    if (!selectedUserId) {
      toast.error('Select a user first')
      return
    }

    await Promise.all([refetchBalance(), refetchHistory()])
  }

  const handleTopUp = async () => {
    if (!selectedUserId) {
      toast.error('Select a user before topping up credits')
      return
    }

    if (!Number.isFinite(topUpAmount) || topUpAmount <= 0) {
      toast.error('Top-up amount must be greater than 0')
      return
    }

    await topUpCredits.mutateAsync({
      userId: selectedUserId,
      payload: {
        membershipId: topUpMembershipId || undefined,
        amount: topUpAmount,
        reason: topUpReason.trim() || undefined,
      },
    })

    setTopUpAmount(1)
    setTopUpReason('')
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Credits</h2>
          <p className="text-muted-foreground">Inspect balances, review ledger history, and perform admin top-ups</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={!selectedUserId || isBalanceFetching || isHistoryFetching}>
          <IconRefresh className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target User</CardTitle>
          <CardDescription>Select a user to load credit balance and transaction history</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">User</label>
            <Select
              value={selectedUserId || '__none__'}
              onValueChange={(value) => {
                const nextUserId = value === '__none__' ? '' : value
                setSelectedUserId(nextUserId)
                setTopUpMembershipId('')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select a user</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.username} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">History Limit</label>
            <Input
              type="number"
              min={1}
              max={200}
              value={historyLimit}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10)
                if (Number.isNaN(parsed)) {
                  setHistoryLimit(50)
                  return
                }
                setHistoryLimit(Math.min(200, Math.max(1, parsed)))
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Source Type</label>
            <Select
              value={historySource}
              onValueChange={(value) => setHistorySource(value as HistorySourceFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Booking">Booking</SelectItem>
                <SelectItem value="Appointment">Appointment</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>{selectedUser.username} ({selectedUser.email})</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Included</p>
              <p className="mt-1 text-2xl font-semibold">
                {isBalanceLoading ? '...' : balance?.totalIncluded ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Remaining</p>
              <p className="mt-1 text-2xl font-semibold">
                {isBalanceLoading ? '...' : balance?.totalRemaining ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Membership Buckets</p>
              <p className="mt-1 text-2xl font-semibold">{memberships.length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membership Credit Buckets</CardTitle>
          <CardDescription>Choose a membership for manual top-up, or leave auto-selection enabled</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedUserId ? (
            <div className="py-8 text-center text-muted-foreground">Select a user to view membership balances</div>
          ) : isBalanceLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : memberships.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No active memberships available for this user</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Included</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Top-Up Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell>{membership.planName}</TableCell>
                      <TableCell>{membership.creditsIncluded}</TableCell>
                      <TableCell>{membership.creditsRemaining}</TableCell>
                      <TableCell>{formatDate(membership.endDate)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={topUpMembershipId === membership.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTopUpMembershipId(membership.id)}
                        >
                          {topUpMembershipId === membership.id ? 'Selected' : 'Use'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Top-Up</CardTitle>
          <CardDescription>Add credits to selected membership or let backend auto-pick earliest eligible bucket</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              min={1}
              value={topUpAmount}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10)
                if (Number.isNaN(parsed)) {
                  setTopUpAmount(1)
                  return
                }
                setTopUpAmount(Math.max(1, parsed))
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Membership Target</label>
            <Select
              value={topUpMembershipId || '__auto__'}
              onValueChange={(value) => setTopUpMembershipId(value === '__auto__' ? '' : value)}
              disabled={!selectedUserId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">Auto (earliest eligible)</SelectItem>
                {memberships.map((membership) => (
                  <SelectItem key={membership.id} value={membership.id}>
                    {membership.planName} ({membership.creditsRemaining} remaining)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Reason</label>
            <Input
              placeholder="Manual goodwill top-up"
              value={topUpReason}
              onChange={(e) => setTopUpReason(e.target.value)}
              disabled={!selectedUserId}
            />
          </div>

          <div className="md:col-span-4">
            <Button onClick={handleTopUp} disabled={!selectedUserId || topUpCredits.isPending}>
              {topUpCredits.isPending ? 'Applying top-up...' : 'Top Up Credits'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit History</CardTitle>
          <CardDescription>
            {selectedUserId
              ? isHistoryLoading
                ? 'Loading transactions...'
                : `${history?.count ?? 0} transactions`
              : 'Select a user to view transactions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedUserId ? (
            <div className="py-8 text-center text-muted-foreground">Select a user to see credit transactions</div>
          ) : isHistoryLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No transactions found for the selected filters</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'Consume' ? 'secondary' : 'default'}>{tx.type}</Badge>
                      </TableCell>
                      <TableCell>{tx.sourceType}</TableCell>
                      <TableCell className={tx.amount < 0 ? 'text-red-600' : 'text-green-700'}>
                        {formatAmount(tx.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{tx.membershipId || '-'}</TableCell>
                      <TableCell className="max-w-sm truncate">{tx.reason || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.actorRole}:{tx.actorId || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
