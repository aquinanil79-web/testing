import { UserProfile } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function UserPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0e11] p-6">
      <Suspense fallback={<div className="text-sm text-zinc-400">Loading account settings…</div>}>
        <UserProfile routing="path" path="/user" />
      </Suspense>
    </main>
  )
}
