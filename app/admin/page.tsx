import { redirect } from 'next/navigation'

// /admin has no index view — send visitors to the first admin section
// so bookmarks and direct navigation don't hit a 404.
export default function AdminIndexPage() {
  redirect('/admin/users')
}
