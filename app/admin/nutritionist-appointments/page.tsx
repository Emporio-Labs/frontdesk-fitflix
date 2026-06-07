import { redirect } from 'next/navigation'

export default function NutritionistAppointmentsRedirect() {
  redirect('/admin/nutrition?tab=appointments')
}
