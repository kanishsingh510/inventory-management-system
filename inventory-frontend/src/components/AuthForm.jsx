import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import StatusMessage from './StatusMessage';

export default function AuthForm({
  title,
  subtitle,
  submitLabel,
  fields,
  values,
  statusMessage,
  statusType = 'info',
  error,
  isSubmitting,
  onChange,
  onSubmit,
  children,
  footerLabel,
  footerLinkLabel,
  footerTo
}) {
  const [visiblePasswords, setVisiblePasswords] = useState({});

  function togglePasswordVisibility(fieldName) {
    setVisiblePasswords((current) => ({
      ...current,
      [fieldName]: !current[fieldName]
    }));
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_28%),linear-gradient(180deg,#020617_0%,#08111f_38%,#0a1020_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:80px_80px]" />
      <div className="pointer-events-none absolute left-[8%] top-28 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] top-20 h-96 w-96 rounded-full bg-indigo-500/12 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid flex-1 items-center gap-10 py-24 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Secure Workspace Access
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Manage inventory with one account that unlocks your whole dashboard
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Authenticate with Firebase, protect your dashboard routes, and keep your inventory
              operations ready for a larger MERN and Shopify workflow.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ['Route Protection', 'Only logged-in users can access inventory tools.'],
                ['Reusable Auth', 'Shared service and context built for scaling.'],
                ['Shopify Ready', 'Keeps auth isolated so store flows can plug in cleanly.']
              ].map(([heading, text]) => (
                <div
                  key={heading}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                >
                  <p className="text-sm font-semibold text-white">{heading}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.55)] backdrop-blur-2xl">
            <div className="glass-panel rounded-[1.75rem] p-6 sm:p-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                  Account Access
                </p>
                <h2 className="mt-4 text-3xl font-bold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">{subtitle}</p>
              </div>

              {statusMessage ? (
                <div className="mt-6">
                  <StatusMessage type={statusType}>{statusMessage}</StatusMessage>
                </div>
              ) : null}

              {error ? <div className="mt-6"><StatusMessage type="error">{error}</StatusMessage></div> : null}

              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                {fields.map((field) => {
                  const isPasswordField = field.type === 'password';
                  const isVisible = Boolean(visiblePasswords[field.name]);

                  return (
                    <label key={field.name} className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-200">
                        {field.label}
                      </span>
                      <div className="relative">
                        <input
                          name={field.name}
                          type={isPasswordField && isVisible ? 'text' : field.type}
                          value={values[field.name] ?? ''}
                          onChange={onChange}
                          autoComplete={field.autoComplete}
                          placeholder={field.placeholder}
                          className={`w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-300/20 ${
                            isPasswordField ? 'pr-12' : ''
                          }`}
                          required={field.required !== false}
                        />
                        {isPasswordField ? (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(field.name)}
                            className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-slate-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                            aria-label={isVisible ? 'Hide password' : 'Show password'}
                            aria-pressed={isVisible}
                          >
                            {isVisible ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                                aria-hidden="true"
                              >
                                <path d="M3 3l18 18" />
                                <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
                                <path d="M9.88 5.09A9.77 9.77 0 0 1 12 4.91c5 0 9.27 3 10 7.09a10.66 10.66 0 0 1-4.24 5.94" />
                                <path d="M6.61 6.61A10.7 10.7 0 0 0 2 12c.73 4.09 5 7.09 10 7.09a9.8 9.8 0 0 0 4.11-.88" />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-5 w-5"
                                aria-hidden="true"
                              >
                                <path d="M2 12s3.64-7 10-7 10 7 10 7-3.64 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        ) : null}
                      </div>
                    </label>
                  );
                })}

                {children}

                <Button type="submit" loading={isSubmitting} className="w-full py-3">
                  {submitLabel}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-400">
                {footerLabel}{' '}
                <Link to={footerTo} className="font-semibold text-cyan-200 transition hover:text-white">
                  {footerLinkLabel}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
