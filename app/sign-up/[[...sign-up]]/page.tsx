import { SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0e11] p-6">
      <Suspense fallback={<div className="text-sm text-zinc-400">Loading sign up…</div>}>
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
      </Suspense>
    </main>
  )
}
