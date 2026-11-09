import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SsoCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0c0e] p-6 text-sm text-zinc-400">
      <Suspense fallback={<span>Completing sign in…</span>}>
        <AuthenticateWithRedirectCallback />
      </Suspense>
    </main>
  )
}
