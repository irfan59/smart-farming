import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Eye, EyeOff, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import Logo from '../components/ui/Logo';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const FEATURES = [
  { icon: ShieldCheck, title: 'Approve with control', text: 'Vet every farmer before they get access.' },
  { icon: TrendingUp, title: 'True-profit insight', text: 'CACP-based cash & real profit per crop and acre.' },
  { icon: Sprout, title: 'Built for the field', text: 'Records that smallholder farmers actually use.' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-harvest-500/20 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo invert />
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-white"
            >
              Grow every farm with clarity.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mt-4 max-w-md text-brand-100"
            >
              The admin cockpit for approving farmers, managing subscriptions, and watching real
              profit take root.
            </motion.p>
            <div className="mt-10 space-y-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white ring-1 ring-white/20">
                    <f.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{f.title}</div>
                    <div className="text-sm text-brand-100/90">{f.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="text-xs text-brand-100/70">© Smart Farming · v1</div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your admin dashboard.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="you@farm.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-[30px] grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:text-slate-600"
              >
                <span className="sr-only">{show ? 'Hide password' : 'Show password'}</span>
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" size="lg" loading={busy} className="w-full">
              {busy ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
