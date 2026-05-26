import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, ArrowLeftRight, PieChart, CreditCard,
  TrendingUp, BarChart2, Users, Download, ChevronRight, Sparkles,
} from 'lucide-react'

const FEATURES = [
  {
    icon: LayoutDashboard,
    color: '#7C4DFF',
    title: 'Dashboard',
    desc: 'Saldo total, ingresos y gastos del mes de un vistazo.',
  },
  {
    icon: ArrowLeftRight,
    color: '#3BB2F6',
    title: 'Transacciones',
    desc: 'Registrá ingresos, gastos y transferencias entre cuentas.',
  },
  {
    icon: PieChart,
    color: '#00CB96',
    title: 'Distribución',
    desc: 'Organizá tu dinero por categorías y controlá gastos fijos.',
  },
  {
    icon: CreditCard,
    color: '#FF4D6D',
    title: 'Tarjetas',
    desc: 'Seguí el vencimiento y el monto de cada tarjeta de crédito.',
  },
  {
    icon: TrendingUp,
    color: '#FFB800',
    title: 'Inversiones',
    desc: 'Portafolio con gráfico de dona y seguimiento de rendimiento.',
  },
  {
    icon: BarChart2,
    color: '#A78BFA',
    title: 'Estadísticas',
    desc: 'Tendencia de 6 meses, top categorías y gasto por encargado.',
  },
  {
    icon: Users,
    color: '#34D399',
    title: 'Encargados',
    desc: 'Asignás quién pagó cada gasto para dividir gastos del hogar.',
  },
  {
    icon: Download,
    color: '#60A5FA',
    title: 'Exportar CSV',
    desc: 'Descargá tus transacciones filtradas, listas para Excel.',
  },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'linear-gradient(to bottom, #0A0A0F 60%, transparent)' }}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Gastando</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login"
            className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/auth/register"
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}>
            Registrarse
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-36 pb-28 overflow-hidden">
        {/* Glow bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, #7C4DFF 0%, transparent 70%)' }} />
          <div className="absolute top-2/3 left-1/3 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #00CB96 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/60 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00CB96]" />
            App gratuita · Sin publicidad
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none mb-5">
            Tus finanzas,{' '}
            <span style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #00CB96 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              bajo control
            </span>
          </h1>

          <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-lg mx-auto">
            Registrá ingresos, gastos y tarjetas. Visualizá estadísticas, simulá ahorros y tomá mejores decisiones financieras.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)',
                boxShadow: '0 8px 32px #7C4DFF50',
              }}>
              Empezar gratis
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/auth/login"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80 transition-all">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Todo lo que necesitás</h2>
          <p className="text-white/40 text-sm">En una sola app, sin suscripciones.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title}
              className="rounded-2xl border border-white/[0.07] p-4 flex flex-col gap-3 transition-all hover:border-white/15"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)' }}>
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '18' }}>
                <Icon className="h-4.5 w-4.5" style={{ color, width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{title}</p>
                <p className="text-[12px] text-white/40 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-6 pb-24 text-center">
        <div className="max-w-md mx-auto rounded-3xl p-8 border border-white/[0.07]"
          style={{ background: 'linear-gradient(135deg, rgba(124,77,255,0.12) 0%, rgba(0,203,150,0.06) 100%)' }}>
          <h3 className="text-xl font-bold mb-2">Empezá hoy, es gratis</h3>
          <p className="text-white/40 text-sm mb-6">Sin tarjeta de crédito. Sin trucos.</p>
          <Link href="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', boxShadow: '0 4px 20px #7C4DFF40' }}>
            Crear cuenta gratis
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8 text-center text-white/30 text-xs">
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
