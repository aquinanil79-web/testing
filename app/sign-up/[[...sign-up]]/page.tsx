import { SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0c0e] p-6">
      <div className="clerk-auth-card w-full max-w-[460px] p-1">
        <div className="flex justify-center pb-2">
          <img src="/images/velora-mark.png" alt="Velora AI" className="size-12 rounded-2xl object-cover" />
        </div>
        <Suspense fallback={<div className="p-10 text-center text-sm text-zinc-400">Loading sign up…</div>}>
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
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
                socialButtonsBlockButton: 'border-[#343740] bg-transparent text-zinc-200 hover:bg-zinc-800/70',
                footerActionLink: 'text-[#9be600] hover:text-[#b7ff28]',
              },
            }}
          />
        </Suspense>
      </div>
    </main>
  )
}
