'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction, registerAction, type ActionState } from '../actions'

const initialState: ActionState = { ok: false, message: '' }

export function AuthScreen({ setup }: { setup: boolean }) {
  const router = useRouter()
  const action = setup ? registerAction : loginAction
  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [router, state.ok])

  return (
    <main className="min-h-screen bg-[#f5f7fa] lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#111d32] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 size-96 rounded-full border-[54px] border-[#ed8b2d]/10" />
        <div className="absolute -bottom-52 left-10 size-[34rem] rounded-full border-[80px] border-white/[.035]" />
        <div className="relative flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="text-xl font-bold tracking-tight">Sagar Tyres</p>
            <p className="text-xs text-slate-400">Retail intelligence system</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.24em] text-[#f0a45c]">
            Built for better business
          </p>
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">
            Every tyre. Every rupee. Always accounted for.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Real-time inventory, FIFO profit tracking, customer history, and daily insights in one
            simple workspace.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-8 border-t border-white/10 pt-8 text-sm text-slate-300">
          <p>
            <strong className="mb-1 block text-xl text-white">FIFO</strong>Accurate costing
          </p>
          <p>
            <strong className="mb-1 block text-xl text-white">Live</strong>Stock control
          </p>
          <p>
            <strong className="mb-1 block text-xl text-white">Secure</strong>Owner access
          </p>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <LogoMark />
            <p className="text-xl font-bold text-[#111d32]">Sagar Tyres</p>
          </div>
          <p className="text-sm font-semibold text-[#d96f0f]">
            {setup ? 'FIRST-TIME SETUP' : 'OWNER PORTAL'}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#111d32]">
            {setup ? 'Create your owner account' : 'Welcome back'}
          </h2>
          <p className="mt-3 text-slate-500">
            {setup
              ? 'This will be the secure account used to run your shop.'
              : 'Sign in to manage today’s business.'}
          </p>
          <form action={formAction} className="mt-9 space-y-5">
            {setup && (
              <Field
                label="Full name"
                name="name"
                placeholder="Sagar Tyres owner"
                autoComplete="name"
              />
            )}
            <Field
              label="Email address"
              name="email"
              type="email"
              placeholder="owner@sagartyres.in"
              autoComplete="email"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder={setup ? 'Minimum 8 characters' : 'Enter your password'}
              autoComplete={setup ? 'new-password' : 'current-password'}
            />
            {state.message && (
              <p
                className={`rounded-xl px-4 py-3 text-sm ${state.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
              >
                {state.message}
              </p>
            )}
            <button
              disabled={pending}
              className="w-full rounded-xl bg-[#ed8b2d] px-5 py-3.5 font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-[#db771b] disabled:opacity-60"
            >
              {pending ? 'Please wait…' : setup ? 'Create account & continue' : 'Sign in securely'}
            </button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Your financial and customer records are private and only available after sign-in.
          </p>
        </div>
      </section>
    </main>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        {...inputProps}
        required
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#111d32] outline-none transition placeholder:text-slate-300 focus:border-[#ed8b2d] focus:ring-4 focus:ring-orange-100"
      />
    </label>
  )
}

function LogoMark() {
  return (
    <div className="grid size-11 place-items-center rounded-xl bg-[#ed8b2d] shadow-lg shadow-orange-950/20">
      <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-white" strokeWidth="2.2">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 5v4m7 3h-4m-3 7v-4m-7-3h4" />
      </svg>
    </div>
  )
}
