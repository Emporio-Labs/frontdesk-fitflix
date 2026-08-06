'use client'

import React, { useEffect, useRef, useState } from 'react'
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
	IconCheck,
	IconInfoCircle,
	IconLoader2,
	IconMaximize,
	IconMinus,
	IconVideo,
	IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { fetchZegoToken } from '@/lib/zego-token'
import {
	nutritionistBookingService,
	type NutritionistBooking,
} from '@/lib/services/nutritionist-booking.service'
import { apiClient } from '@/lib/api-client'

interface NutritionistCallModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	booking: NutritionistBooking | null
	onComplete?: () => void
}

export function NutritionistCallModal({
	open,
	onOpenChange,
	booking,
	onComplete,
}: NutritionistCallModalProps) {
	const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null)
	const zegoRef = useRef<any>(null)

	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isMinimized, setIsMinimized] = useState(false)
	const [staffDisplay, setStaffDisplay] = useState<string>('FitFlix Nutritionist')

	const roomID = booking?.zegoRoomId || (booking?._id ? `nutri_session_${booking._id}` : null)
	const memberName = booking?.userId?.username || 'Member'

	useEffect(() => {
		if (!open) {
			setIsMinimized(false)
			return
		}

		if (!roomID || !containerElement) return

		let mounted = true

		const initVideoCall = async () => {
			try {
				setLoading(true)
				setError(null)

				const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt')

				const userRaw = localStorage.getItem('hh_user')
				let staffId = 'staff_' + Date.now()
				let staffName = 'FitFlix Nutritionist'

				if (userRaw) {
					try {
						const parsed = JSON.parse(userRaw)
						staffId = parsed._id || parsed.id || staffId
						const rawName = parsed.name || parsed.username || parsed.fullName || ''
						if (rawName && !rawName.includes('@')) {
							staffName = rawName
						} else if (rawName.includes('@')) {
							const parts = rawName.split('@')[0]
							const clean = parts.charAt(0).toUpperCase() + parts.slice(1)
							staffName = `${clean} (Nutritionist)`
						}
					} catch {
						/* use defaults */
					}
				}
				setStaffDisplay(staffName)

				const appID = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID || 857373493)

				if (!appID) {
					throw new Error('ZEGOCLOUD AppID missing.')
				}

				const cleanRoomID = String(roomID || 'fitflix_video_room').replace(/[^a-zA-Z0-9_-]/g, '_')
				const cleanStaffId = String(staffId || 'staff_host').replace(/[^a-zA-Z0-9_-]/g, '_')
				const cleanStaffName = staffName.replace(/[^\w\s-]/gi, '') || 'FitFlix Host'

				// Server-minted token — see lib/zego-token.ts for why the client must
				// never generate this itself.
				const token = await fetchZegoToken(cleanStaffId)

				const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
					appID,
					token,
					cleanRoomID,
					cleanStaffId,
					cleanStaffName,
				)

				if (!mounted) return

				const zp = ZegoUIKitPrebuilt.create(kitToken)
				zegoRef.current = zp

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
						if (mounted) setLoading(false)
					},
					onLeaveRoom: () => {
						// Session ended locally
					},
				})

				if (mounted) setLoading(false)
			} catch (err: any) {
				console.error('Video Call init error:', err)
				if (mounted) {
					setError(err?.message || 'Failed to connect to video consultation suite.')
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
			if (zegoRef.current) {
				try {
					zegoRef.current.destroy()
				} catch {
					/* ignore */
				}
				zegoRef.current = null
			}
		}
	}, [open, roomID, containerElement])

	const handleLeaveCall = () => {
		setIsMinimized(false)
		if (zegoRef.current) {
			try {
				zegoRef.current.destroy()
			} catch {
				/* ignore */
			}
			zegoRef.current = null
		}
		onOpenChange(false)
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

					{error && (
						<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950 text-white p-4 text-center space-y-3">
							<p className="text-red-400 font-medium">{error}</p>
							<Button
								size="sm"
								variant="outline"
								className="text-white border-gray-700 hover:bg-gray-800"
								onClick={() => window.location.reload()}
							>
								Retry Connection
							</Button>
						</div>
					)}

					<div ref={setContainerElement} className="h-full w-full min-h-[480px]" />
				</div>
			</DialogContent>
		</Dialog>
	)
}
