import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Attendance app — single-file, three-screen flow driven by a `step` variable:
//   'staff' -> pick who you are   (GET  /api/staff.php)
//   'pin'   -> enter your 4-digit PIN (POST /api/login.php)
//   'clock' -> clock in / clock out   (POST /api/clock-in.php | clock-out.php)
// Mobile-first, Tailwind v4 utility classes. No router — just `step`.
// ---------------------------------------------------------------------------

// Small fetch helper: POST JSON and return { res, data } where data is parsed
// defensively (login.php is still being written and may return an empty body).
async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null // non-JSON / empty body — caller decides what to do
  }
  return { res, data }
}

// Wrap navigator.geolocation in a promise so we can await it.
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ code: 'UNSUPPORTED' })
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  })
}

// ---------------------------------------------------------------------------
// Screen 1: staff picker
// ---------------------------------------------------------------------------
function StaffPicker({ onSelect }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function loadStaff() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/staff.php')
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setUsers(Array.isArray(data.active_users) ? data.active_users : [])
    } catch {
      setError("Couldn't load the staff list. Check the connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mb-1 text-2xl font-bold">Who's clocking in?</h1>
      <p className="mb-6 text-base text-slate-500">Tap your name to continue.</p>

      {loading && (
        <p className="mt-8 text-center text-lg text-slate-500">Loading staff…</p>
      )}

      {error && (
        <div className="mt-4">
          <p className="mb-4 rounded-xl bg-red-50 p-4 text-base text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={loadStaff}
            className="w-full rounded-2xl bg-slate-800 py-4 text-lg font-semibold text-white active:bg-slate-900"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="mt-8 text-center text-lg text-slate-500">
          No active staff found.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelect(u)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-6 text-left text-xl font-semibold shadow-sm active:bg-slate-100"
          >
            {u.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen 2: PIN entry
// ---------------------------------------------------------------------------
const PIN_LENGTH = 4

function PinEntry({ user, onBack, onSuccess }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function press(digit) {
    if (submitting) return
    setError(null)
    setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + digit))
  }
  function del() {
    if (submitting) return
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }
  function clear() {
    if (submitting) return
    setError(null)
    setPin('')
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      // Contract: POST {user_id, pin} -> 200 {name, has_open_session}
      //           401 wrong PIN, 404 no such user.
      const { res, data } = await postJson('/api/login.php', {
        user_id: user.id,
        pin,
      })

      if (res.ok) {
        // Validate the shape defensively — login.php is still in progress and
        // may return 200 with an empty/incomplete body during development.
        if (data && typeof data.name === 'string' && typeof data.has_open_session === 'boolean') {
          onSuccess({ name: data.name, hasOpenSession: data.has_open_session })
          return
        }
        setError('Login response was missing expected fields (name / has_open_session).')
      } else if (res.status === 401) {
        setError('Incorrect PIN. Please try again.')
      } else if (res.status === 404) {
        setError('User not found.')
      } else {
        setError((data && data.error) || `Login failed (HTTP ${res.status}).`)
      }
    } catch {
      setError("Couldn't reach the server. Check the connection and try again.")
    } finally {
      setSubmitting(false)
      setPin('')
    }
  }

  // Auto-submit once the PIN is complete.
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !submitting) {
      submit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 self-start text-base font-medium text-slate-500 active:text-slate-700"
      >
        ← Not you? Change
      </button>

      <h1 className="mb-1 text-2xl font-bold">Hi, {user.name}</h1>
      <p className="mb-6 text-base text-slate-500">Enter your 4-digit PIN.</p>

      {/* PIN dots */}
      <div className="mb-6 flex justify-center gap-4" aria-label="PIN entry progress">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={
              'h-4 w-4 rounded-full ' +
              (i < pin.length ? 'bg-slate-800' : 'bg-slate-300')
            }
          />
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-center text-base text-red-700">
          {error}
        </p>
      )}
      {submitting && (
        <p className="mb-4 text-center text-base text-slate-500">Checking…</p>
      )}

      {/* Numeric keypad */}
      <div className="mt-auto grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            disabled={submitting}
            className="rounded-2xl bg-white py-6 text-2xl font-semibold shadow-sm active:bg-slate-100 disabled:opacity-50"
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          disabled={submitting}
          className="rounded-2xl bg-slate-100 py-6 text-lg font-semibold text-slate-600 active:bg-slate-200 disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => press('0')}
          disabled={submitting}
          className="rounded-2xl bg-white py-6 text-2xl font-semibold shadow-sm active:bg-slate-100 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={del}
          disabled={submitting}
          aria-label="Delete last digit"
          className="rounded-2xl bg-slate-100 py-6 text-2xl font-semibold text-slate-600 active:bg-slate-200 disabled:opacity-50"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen 3: clock in / out
// ---------------------------------------------------------------------------
function ClockScreen({ user, initialOpenSession, onStartOver }) {
  const [hasOpenSession, setHasOpenSession] = useState(initialOpenSession)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }

  function describeGeoError(err) {
    if (!err) return 'Could not get your location.'
    if (err.code === 'UNSUPPORTED') {
      return 'This device/browser does not support location.'
    }
    // Standard GeolocationPositionError codes: 1=denied, 2=unavailable, 3=timeout
    if (err.code === 1) {
      // Insecure origins (plain http on a LAN IP) are the usual real-world cause.
      const secureNote = !window.isSecureContext
        ? ' Note: location only works over HTTPS or on localhost — this page is not a secure context.'
        : ''
      return 'Location permission denied. You must allow location access to clock in.' + secureNote
    }
    if (err.code === 2) return 'Your location is currently unavailable. Please try again.'
    if (err.code === 3) return 'Timed out getting your location. Please try again.'
    return 'Could not get your location.'
  }

  async function handleClock() {
    setBusy(true)
    setMessage(null)
    try {
      if (hasOpenSession) {
        // Clock OUT — clock-out.php only needs user_id (no coordinates by contract).
        const { res, data } = await postJson('/api/clock-out.php', {
          user_id: user.id,
        })
        if (res.ok && data && data.success) {
          setHasOpenSession(false)
          setMessage({ type: 'success', text: `Clocked out at ${data.clocked_out_at}.` })
        } else {
          setMessage({ type: 'error', text: (data && data.error) || `Clock-out failed (HTTP ${res.status}).` })
        }
      } else {
        // Clock IN — needs coordinates, verified server-side against the salon.
        if (!window.isSecureContext) {
          setMessage({
            type: 'error',
            text: 'Location needs HTTPS or localhost. Open this app on localhost or over HTTPS to clock in.',
          })
          return
        }
        let pos
        try {
          pos = await getCurrentPosition()
        } catch (geoErr) {
          setMessage({ type: 'error', text: describeGeoError(geoErr) })
          return
        }
        const { res, data } = await postJson('/api/clock-in.php', {
          user_id: user.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        if (res.ok && data && data.success) {
          setHasOpenSession(true)
          setMessage({ type: 'success', text: `Clocked in at ${data.clocked_in_at}.` })
        } else {
          setMessage({ type: 'error', text: (data && data.error) || `Clock-in failed (HTTP ${res.status}).` })
        }
      }
    } catch {
      setMessage({ type: 'error', text: "Couldn't reach the server. Check the connection and try again." })
    } finally {
      setBusy(false)
    }
  }

  const label = hasOpenSession ? 'Clock Out' : 'Clock In'
  const btnColor = hasOpenSession
    ? 'bg-rose-600 active:bg-rose-700'
    : 'bg-emerald-600 active:bg-emerald-700'

  return (
    <div className="flex flex-1 flex-col">
      <button
        type="button"
        onClick={onStartOver}
        className="mb-4 self-start text-base font-medium text-slate-500 active:text-slate-700"
      >
        ← Start over
      </button>

      <h1 className="mb-1 text-2xl font-bold">{user.name}</h1>
      <p className="mb-8 text-base text-slate-500">
        {hasOpenSession ? 'You are currently clocked in.' : 'You are clocked out.'}
      </p>

      <div className="flex flex-1 flex-col justify-center">
        <button
          type="button"
          onClick={handleClock}
          disabled={busy}
          className={
            'w-full rounded-3xl py-12 text-3xl font-bold text-white shadow-lg disabled:opacity-60 ' +
            btnColor
          }
        >
          {busy ? 'Working…' : label}
        </button>

        {message && (
          <p
            className={
              'mt-6 rounded-xl p-4 text-center text-lg ' +
              (message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-700')
            }
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root: owns `step` + the shared selection/session state
// ---------------------------------------------------------------------------
function App() {
  const [step, setStep] = useState('staff') // 'staff' | 'pin' | 'clock'
  const [selectedUser, setSelectedUser] = useState(null) // { id, name } from staff.php
  const [session, setSession] = useState(null) // { name, hasOpenSession } from login.php

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        {step === 'staff' && (
          <StaffPicker
            onSelect={(user) => {
              setSelectedUser(user)
              setStep('pin')
            }}
          />
        )}

        {step === 'pin' && selectedUser && (
          <PinEntry
            user={selectedUser}
            onBack={() => setStep('staff')}
            onSuccess={({ name, hasOpenSession }) => {
              // Prefer the name confirmed by login.php; fall back to the picked one.
              setSession({ name: name || selectedUser.name, hasOpenSession })
              setStep('clock')
            }}
          />
        )}

        {step === 'clock' && selectedUser && session && (
          <ClockScreen
            user={{ id: selectedUser.id, name: session.name }}
            initialOpenSession={session.hasOpenSession}
            onStartOver={() => {
              setSelectedUser(null)
              setSession(null)
              setStep('staff')
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App
