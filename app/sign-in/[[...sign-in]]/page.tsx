import { SignIn } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0c0e] p-6">
      <div className="clerk-auth-card w-full max-w-[460px] p-1">
        <Suspense fallback={<div className="p-10 text-center text-sm text-zinc-400">Loading sign in…</div>}>
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              variables: {
                colorPrimary: '#9be600',
                colorBackground: '#15171c',
                borderRadius: '14px',
              },
              elements: {
                card: 'bg-transparent shadow-none',
                headerTitle: 'text-white',
                headerSubtitle: 'text-zinc-400',
                formButtonPrimary: 'text-[#11130d] font-semibold',
                formFieldInput: 'border-[#343740] focus:border-[#9be600]',
                footerActionLink: 'text-[#9be600] hover:text-[#b7ff28]',
              },
            }}
          />
        </Suspense>
      </div>
    </main>
  )
}
