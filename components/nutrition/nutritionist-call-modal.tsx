'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	IconClock,
	IconInfoCircle,
	IconLoader2,
	IconMaximize,
	IconMinus,
	IconVideo,
	IconX,
} from '@tabler/icons-react'
import type { NutritionistBooking } from '@/lib/services/nutritionist-booking.service'
import { liveSessionService } from '@/lib/services/live-session.service'

interface NutritionistCallModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	booking: NutritionistBooking | null
	onComplete?: () => void
}

interface ErrorDetails {
	message: string
	code?: string
	startsAt?: string
	endsAt?: string
}

// Codes the join window can recover from on its own (host hasn't started yet,
// or the slot hasn't opened) vs. terminal ones (booking cancelled, slot
// already ended) where retrying is pointless.
const RETRYABLE_CODES = new Set(['NOT_OPEN_YET', 'HOST_NOT_STARTED'])

function formatDayLabel(d: Date, now: Date = new Date()): string {
	const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
	const diffDays = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000)
	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Tomorrow'
	return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatClock(d: Date): string {
	return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function describeDenial(details: ErrorDetails): string {
	const startsAt = details.startsAt ? new Date(details.startsAt) : null
	const endsAt = details.endsAt ? new Date(details.endsAt) : null
	const fmt = (d: Date) => d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })

	switch (details.code) {
		case 'NOT_OPEN_YET':
			return startsAt ? `This consultation opens at ${fmt(startsAt)}.` : 'This consultation has not opened yet.'
		case 'ENDED':
			return endsAt ? `This consultation ended at ${fmt(endsAt)}.` : 'This consultation has ended.'
		case 'HOST_NOT_STARTED':
			return 'Waiting for the nutritionist to start the consultation.'
		default:
			return details.message
	}
}

export function NutritionistCallModal({
	open,
	onOpenChange,
	booking,
	onComplete,
}: NutritionistCallModalProps) {
	const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)
	const zegoRef = useRef<any>(null)
	const joinedKeyRef = useRef<string | null>(null)

	const [loading, setLoading] = useState(true)
	const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null)
	const [isMinimized, setIsMinimized] = useState(false)
	const [staffDisplay, setStaffDisplay] = useState<string>('FitFlix Nutritionist')
	const [retryTick, setRetryTick] = useState(0)

	const memberName = booking?.userId?.username || 'Member'
	const bookingId = booking?._id ?? null

	const destroyZego = useCallback(() => {
		if (zegoRef.current) {
			try {
				zegoRef.current.destroy()
			} catch {
				/* ignore cleanup errors */
			}
			zegoRef.current = null
		}
		joinedKeyRef.current = null
	}, [])

	// Unmount-only teardown. Minimizing swaps which container div is mounted
	// (see JSX below), which would otherwise re-run the init effect and tear
	// down + re-mint a fresh session on every toggle.
	useEffect(() => {
		return () => destroyZego()
	}, [destroyZego])

	useEffect(() => {
		if (!open) {
			setIsMinimized(false)
			return
		}

		if (!bookingId || !containerElement) {
			if (open && !bookingId) {
				setErrorDetails({ message: 'This call has no linked booking, so it cannot be started.' })
				setLoading(false)
			}
			return
		}

		const key = `${bookingId}`
		if (zegoRef.current && joinedKeyRef.current === key) {
			return
		}

		let mounted = true

		const initVideoCall = async () => {
			try {
				setLoading(true)
				setErrorDetails(null)
				destroyZego()

				const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

				// Room-bound, role-scoped, time-windowed token minted by the
				// backend — it re-checks the booking and the join window on
				// every call, so there is nothing to cache here.
				const access = await liveSessionService.getToken(bookingId)
				if (!mounted) return

				setStaffDisplay(access.userName)

				const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
					access.appID,
					access.token,
					access.roomId,
					access.userId,
					access.userName,
				)

				const zp = ZegoUIKitPrebuilt.create(kitToken)
				zegoRef.current = zp
				joinedKeyRef.current = key

				zp.joinRoom({
					container: containerElement!,
					scenario: {
						mode: ZegoUIKitPrebuilt.GroupCall,
					},
					showPreJoinView: false,
					turnOnMicrophoneWhenJoining: false,
					turnOnCameraWhenJoining: false,
					showMyCameraToggleButton: true,
					showMyMicrophoneToggleButton: true,
					showAudioVideoSettingsButton: true,
					showScreenSharingButton: true,
					showUserList: true,
					onJoinRoom: () => {
						if (!mounted) return
						setLoading(false)
						// Host-presence heartbeat — only reported once actually in
						// the room, not before, so a member's "waiting for host"
						// gate can't open before the host has really joined.
						if (access.role === 'host') {
							liveSessionService
								.reportHostPresence(bookingId)
								.catch((err) => console.error('Host presence report error:', err))
						}
					},
					onLeaveRoom: () => {
						// Session ended locally
					},
				})

				if (mounted) setLoading(false)
			} catch (err: any) {
				console.error('Video Call init error:', err)
				if (mounted) {
					const resData = err?.response?.data
					setErrorDetails({
						message: resData?.message || err?.message || 'Failed to connect to video consultation suite.',
						code: resData?.code,
						startsAt: resData?.startsAt,
						endsAt: resData?.endsAt,
					})
					setLoading(false)
				}
			}
		}

		// Small delay to ensure Dialog DOM element is rendered
		const timer = setTimeout(() => {
			initVideoCall()
		}, 100)

		return () => {
			mounted = false
			clearTimeout(timer)
		}
	}, [open, bookingId, containerElement, retryTick, destroyZego])

	const handleLeaveCall = () => {
		setIsMinimized(false)
		destroyZego()
		onOpenChange(false)
	}

	const handleRetry = () => {
		setRetryTick((t) => t + 1)
	}

	if (!open) return null

	// Floating Minimized Widget
	if (isMinimized) {
		return (
			<div className="fixed bottom-5 right-5 z-50 w-[380px] h-[250px] rounded-xl border border-gray-800 bg-gray-950 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
				<div className="px-3 py-2 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="relative flex h-2.5 w-2.5">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
						</span>
						<span className="text-xs font-semibold text-white truncate max-w-[170px]">
							{memberName}
						</span>
					</div>

					<div className="flex items-center gap-1">
						<Button
							size="sm"
							variant="outline"
							className="h-7 text-xs border-gray-700 hover:bg-gray-800 text-gray-200 px-2"
							onClick={() => setIsMinimized(false)}
						>
							<IconMaximize className="w-3.5 h-3.5 mr-1" /> Expand
						</Button>
						<Button
							size="sm"
							variant="destructive"
							className="h-7 text-xs bg-red-600/80 hover:bg-red-600 text-white px-2"
							onClick={handleLeaveCall}
						>
							<IconX className="w-3.5 h-3.5 mr-1" /> Leave
						</Button>
					</div>
				</div>

				<div className="flex-1 relative bg-black">
					<div ref={setContainerElement} className="h-full w-full" />
				</div>
			</div>
		)
	}

	// Full Modal Dialog
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col bg-gray-950 border-gray-800 [&>button:last-child]:hidden [&>button.absolute]:hidden">
				<DialogHeader className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex flex-row items-center justify-between space-y-0">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 text-blue-400">
							<IconVideo className="w-4 h-4" />
						</div>
						<div>
							<DialogTitle className="text-white text-base font-semibold flex items-center gap-2">
								{(booking as any)?.user?.username || (booking as any)?.className || 'Live Video Session'}
								<Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/40 text-xs">
									LIVE
								</Badge>
							</DialogTitle>
							<DialogDescription className="text-xs text-gray-400">
								Member: <span className="font-medium text-gray-200">{memberName}</span>
							</DialogDescription>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							className="bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700 hover:text-white text-xs font-medium"
							onClick={() => setIsMinimized(true)}
						>
							<IconMinus className="w-3.5 h-3.5 mr-1 text-gray-300" /> Minimize
						</Button>

						<Button
							size="sm"
							variant="outline"
							className="bg-red-950/60 border-red-800/80 text-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 text-xs font-medium transition-colors"
							onClick={handleLeaveCall}
						>
							<IconX className="w-3.5 h-3.5 mr-1 text-red-300" /> Leave Call
						</Button>
					</div>
				</DialogHeader>

				<div className="px-4 py-2 bg-blue-950/60 border-b border-blue-900/60 flex items-center justify-between text-xs text-blue-200">
					<span className="flex items-center gap-1.5">
						<IconInfoCircle className="w-4 h-4 text-blue-400 shrink-0" />
						Auto-joining as <strong className="text-white font-semibold">{staffDisplay}</strong>. Verify camera/mic and click <strong className="text-blue-400 font-semibold">&quot;Join&quot;</strong> to start consultation with {memberName}.
					</span>
				</div>

				<div className="flex-1 relative bg-black min-h-[480px]">
					{loading && (
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950 text-white space-y-3">
							<IconLoader2 className="h-8 w-8 animate-spin text-blue-500" />
							<p className="text-sm font-medium">Launching FitFlix Consultation Suite...</p>
						</div>
					)}

					{errorDetails && errorDetails.code === 'NOT_OPEN_YET' && (
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center">
							<div className="flex flex-col items-center gap-4 max-w-sm">
								<div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-400">
									<IconClock className="w-6 h-6" />
								</div>
								<div className="space-y-2">
									<p className="text-white font-semibold">This consultation has not opened yet</p>
									{errorDetails.startsAt && (
										<div className="pt-1">
											<p className="text-xs text-gray-400">Your consultation is scheduled for</p>
											<p className="text-base font-medium text-gray-100 mt-0.5">
												{formatDayLabel(new Date(errorDetails.startsAt))}, {formatClock(new Date(errorDetails.startsAt))}
												{errorDetails.endsAt ? ` – ${formatClock(new Date(errorDetails.endsAt))}` : ''}
											</p>
										</div>
									)}
									<p className="text-xs text-gray-500 pt-1">
										You can join when your scheduled consultation window opens.
									</p>
								</div>
								<div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-700 bg-gray-800/60 text-gray-400 text-sm font-medium cursor-not-allowed select-none">
									<IconLoader2 className="w-4 h-4 animate-spin" />
									Waiting for scheduled time
								</div>
							</div>
						</div>
					)}

					{errorDetails && errorDetails.code !== 'NOT_OPEN_YET' && (
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950 text-white p-4 text-center space-y-3">
							<p className="text-red-400 font-medium">{describeDenial(errorDetails)}</p>
							{RETRYABLE_CODES.has(errorDetails.code ?? '') && (
								<Button
									size="sm"
									variant="outline"
									className="bg-gray-900 text-gray-100 border-gray-700 hover:bg-gray-800 hover:text-white"
									onClick={handleRetry}
								>
									Retry Connection
								</Button>
							)}
						</div>
					)}

					<div ref={setContainerElement} className="h-full w-full min-h-[480px]" />
				</div>
			</DialogContent>
		</Dialog>
	)
}
