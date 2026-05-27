'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NutritionMemberProfilePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/nutrition')
  }, [router])
  
  return null
}