"use client"

import { redirect } from 'next/navigation'

export default function NutritionistRedirect() {
  redirect('/admin/nutrition')
}
