import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await currentUser()
  const email = user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress
  const createdAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'

  return (
    <main className="min-h-screen bg-[#0d0e11] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-400">Velora workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Account dashboard</h1>
            <p className="mt-2 text-sm text-zinc-400">Manage your identity and review workspace activity.</p>
          </div>
          <Link href="/" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-lime-400 hover:text-lime-300">Back to chat</Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[['Account status', user ? 'Verified session' : 'Signed out'], ['Primary email', email || 'Not set'], ['Member since', createdAt], ['Provider', user?.externalAccounts[0]?.provider || 'Email']].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-800 bg-[#14161c] p-5">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-3 truncate text-sm font-medium text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link href="/user" className="rounded-2xl border border-zinc-800 bg-[#14161c] p-6 transition hover:border-lime-500/50">
            <h2 className="font-medium">Profile and security</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Update profile details, connected accounts, passwords, MFA, sessions, and account data with Clerk.</p>
          </Link>
          <div className="rounded-2xl border border-zinc-800 bg-[#14161c] p-6">
            <h2 className="font-medium">Usage tracking</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Chat history and per-session request totals are currently kept in this browser. Add a database integration when cross-device history is required.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
