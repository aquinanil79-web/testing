import { SignIn } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0e11] p-6">
      <Suspense fallback={<div className="text-sm text-zinc-400">Loading sign in…</div>}>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      </Suspense>
    </main>
  )
}
