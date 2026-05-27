import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, ArrowLeftRight, PieChart, CreditCard,
  TrendingUp, BarChart2, Users, Download, ChevronRight,
  Sparkles, UserPlus, Wallet, LineChart,
  ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react'

const STEPS = [
  {
    num: '01',
    icon: UserPlus,
    color: '#7C4DFF',
    title: 'Creá tu cuenta',
    desc: 'En 30 segundos, solo tu email. Sin tarjeta de crédito ni compromisos.',
  },
  {
    num: '02',
    icon: Wallet,
    color: '#00CB96',
    title: 'Cargá tus movimientos',
    desc: 'Ingresos, gastos, tarjetas y cuentas bancarias en un solo lugar.',
  },
  {
    num: '03',
    icon: LineChart,
    color: '#3BB2F6',
    title: 'Entendé tu plata',
    desc: 'Estadísticas, distribución por categorías y simulador de ahorro.',
  },
]

const FEATURES = [
  { icon: LayoutDashboard, color: '#7C4DFF', title: 'Dashboard',      desc: 'Saldo total, ingresos y gastos del mes de un vistazo.' },
  { icon: ArrowLeftRight,  color: '#3BB2F6', title: 'Transacciones',  desc: 'Registrá ingresos, gastos y transferencias entre cuentas.' },
  { icon: PieChart,        color: '#00CB96', title: 'Distribución',   desc: 'Organizá tu dinero por categorías y controlá gastos fijos.' },
  { icon: CreditCard,      color: '#FF4D6D', title: 'Tarjetas',       desc: 'Seguí el vencimiento y el monto de cada tarjeta de crédito.' },
  { icon: TrendingUp,      color: '#FFB800', title: 'Inversiones',    desc: 'Portafolio con gráfico de dona y seguimiento de rendimiento.' },
  { icon: BarChart2,       color: '#A78BFA', title: 'Estadísticas',   desc: 'Tendencia de 6 meses, top categorías y gasto por encargado.' },
  { icon: Users,           color: '#34D399', title: 'Encargados',     desc: 'Asignás quién pagó cada gasto para dividir gastos del hogar.' },
  { icon: Download,        color: '#60A5FA', title: 'Exportar CSV',   desc: 'Descargá tus transacciones filtradas, listas para Excel.' },
]

const TRANSACTIONS = [
  { emoji: '🛒', label: 'Supermercado',  sub: 'Hoy',     amount: '-$12.500', income: false },
  { emoji: '⛽', label: 'Nafta',         sub: 'Ayer',    amount: '-$8.200',  income: false },
  { emoji: '💰', label: 'Sueldo',        sub: '1 may',   amount: '+$180.000',income: true  },
  { emoji: '🍕', label: 'Delivery',      sub: '28 abr',  amount: '-$6.800',  income: false },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-14px) rotate(-2deg); }
        }
        .phone-float { animation: float 5s ease-in-out infinite; }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'linear-gradient(to bottom, #0A0A0Fff 70%, #0A0A0F00)' }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Gastando</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login"
            className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden sm:block">
            Iniciar sesión
          </Link>
          <Link href="/auth/register"
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center px-6 pt-20 pb-16 overflow-hidden">
        {/* Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-0 w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(ellipse, #7C4DFF 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #00CB96 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/60 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00CB96]" />
              Gratis · Sin publicidad · Hecho en Argentina
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-4">
              ¿Sabés en qué se fue{' '}
              <span style={{
                background: 'linear-gradient(135deg, #7C4DFF 0%, #00CB96 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                tu sueldo
              </span>
              {' '}este mes?
            </h1>

            <p className="text-base sm:text-lg text-white/50 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Gastando te ayuda a rastrear cada peso, entender tus hábitos y tomar decisiones financieras más inteligentes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link href="/auth/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-white transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)',
                  boxShadow: '0 8px 32px #7C4DFF50',
                }}>
                Empezar gratis
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all">
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <div className="phone-float"
              style={{ filter: 'drop-shadow(0 32px 64px #7C4DFF30)' }}>
              {/* Phone shell */}
              <div style={{
                width: 240,
                background: '#12121A',
                borderRadius: 36,
                border: '1.5px solid rgba(255,255,255,0.10)',
                padding: '10px 8px',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}>
                {/* Notch */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <div style={{ width: 60, height: 5, background: '#2A2A35', borderRadius: 10 }} />
                </div>

                {/* Screen */}
                <div style={{ background: '#0D0D14', borderRadius: 28, overflow: 'hidden', padding: '14px 12px' }}>

                  {/* Header */}
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 1 }}>Buen día 👋</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Mayo 2026</p>
                  </div>

                  {/* Balance card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #7C4DFF20 0%, #9C6DFF10 100%)',
                    border: '1px solid rgba(124,77,255,0.25)',
                    borderRadius: 14,
                    padding: '10px 12px',
                    marginBottom: 8,
                  }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>Saldo total</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>$452.300</p>
                  </div>

                  {/* Income / Expense row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                    <div style={{
                      background: 'rgba(0,203,150,0.08)',
                      border: '1px solid rgba(0,203,150,0.2)',
                      borderRadius: 12,
                      padding: '8px 10px',
                    }}>
                      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Ingresos</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#00CB96' }}>+$180.000</p>
                    </div>
                    <div style={{
                      background: 'rgba(255,77,109,0.08)',
                      border: '1px solid rgba(255,77,109,0.2)',
                      borderRadius: 12,
                      padding: '8px 10px',
                    }}>
                      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Gastos</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#FF4D6D' }}>-$95.400</p>
                    </div>
                  </div>

                  {/* Transactions */}
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    Últimas transacciones
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {TRANSACTIONS.map(t => (
                      <div key={t.label} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '6px 8px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12 }}>{t.emoji}</span>
                          <div>
                            <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{t.label}</p>
                            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{t.sub}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: t.income ? '#00CB96' : '#FF4D6D' }}>
                          {t.amount}
                        </p>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Cómo funciona ───────────────────────────────── */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">¿Cómo funciona?</h2>
          <p className="text-white/40 text-sm">Tres pasos y ya estás controlando tu dinero.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map(({ num, icon: Icon, color, title, desc }) => (
            <div key={num} className="relative flex flex-col items-center sm:items-start text-center sm:text-left p-6 rounded-2xl border border-white/[0.07]"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color + '18' }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <span className="text-3xl font-black"
                  style={{ color: color + '30', lineHeight: 1 }}>
                  {num}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Todo lo que necesitás</h2>
          <p className="text-white/40 text-sm">En una sola app, sin suscripciones.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title}
              className="rounded-2xl border border-white/[0.07] p-4 flex flex-col gap-3 transition-all hover:border-white/15"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)' }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '18' }}>
                <Icon style={{ color, width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{title}</p>
                <p className="text-[12px] text-white/40 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────── */}
      <section className="px-6 pb-24 text-center">
        <div className="max-w-lg mx-auto rounded-3xl p-10 border border-white/[0.07] relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,77,255,0.12) 0%, rgba(0,203,150,0.06) 100%)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,77,255,0.15) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black mb-3">
              Empezá hoy, es gratis
            </h3>
            <p className="text-white/40 text-sm mb-8">Sin tarjeta de crédito. Sin trucos. Para siempre gratis.</p>
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)',
                boxShadow: '0 8px 32px #7C4DFF50',
              }}>
              Crear cuenta gratis
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-8 text-center text-white/25 text-xs">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Link href="/privacidad" className="hover:text-white/60 transition-colors">Privacidad</Link>
          <span>·</span>
          <Link href="/terminos" className="hover:text-white/60 transition-colors">Términos</Link>
          <span>·</span>
          <Link href="/auth/login" className="hover:text-white/60 transition-colors">Iniciar sesión</Link>
        </div>
        <p>© {new Date().getFullYear()} Gastando · Hecho en Argentina</p>
      </footer>

    </div>
  )
}
