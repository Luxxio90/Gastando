import Link from 'next/link'
import { ArrowLeft, Wallet } from 'lucide-react'

export const metadata = { title: 'Términos de Uso – Gastando' }

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}>
            <Wallet className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-foreground">Gastando</span>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Términos de Uso</h1>
          <p className="text-sm text-muted-foreground">Última actualización: mayo de 2026</p>
        </div>

        <Section title="1. Aceptación de los términos">
          <p>
            Al registrarte y usar Gastando, aceptás estos Términos de Uso.
            Si no estás de acuerdo, no uses la aplicación.
          </p>
        </Section>

        <Section title="2. Descripción del servicio">
          <p>
            Gastando es una aplicación de gestión de finanzas personales que te permite
            registrar ingresos, gastos, transferencias, presupuestos e inversiones.
            La app está diseñada para uso personal y no comercial.
          </p>
        </Section>

        <Section title="3. Cuenta de usuario">
          <ul>
            <li>Sos responsable de mantener la confidencialidad de tu contraseña</li>
            <li>Sos responsable de toda la actividad que ocurra en tu cuenta</li>
            <li>Debés notificarnos inmediatamente si sospechás acceso no autorizado</li>
            <li>Solo podés tener una cuenta por persona</li>
          </ul>
        </Section>

        <Section title="4. Uso aceptable">
          <p>Acordás no usar Gastando para:</p>
          <ul>
            <li>Actividades ilegales o fraudulentas</li>
            <li>Cargar información falsa o engañosa</li>
            <li>Intentar acceder a datos de otros usuarios</li>
            <li>Sobrecargar o interferir con la infraestructura del servicio</li>
          </ul>
        </Section>

        <Section title="5. Propiedad de los datos">
          <p>
            Todos los datos financieros que cargás en Gastando son tuyos.
            Al usar el servicio, nos otorgás una licencia limitada para procesar
            esos datos con el único fin de brindarte el servicio.
          </p>
        </Section>

        <Section title="6. Disponibilidad del servicio">
          <p>
            Hacemos nuestro mejor esfuerzo para mantener Gastando disponible, pero no garantizamos
            disponibilidad ininterrumpida. Podemos interrumpir el servicio temporalmente por
            mantenimiento o causas fuera de nuestro control.
          </p>
        </Section>

        <Section title="7. Sin asesoramiento financiero">
          <p>
            Gastando es una herramienta de registro y visualización. La información que muestra
            no constituye asesoramiento financiero, de inversión ni de ningún otro tipo.
            Las decisiones financieras son de tu exclusiva responsabilidad.
          </p>
        </Section>

        <Section title="8. Limitación de responsabilidad">
          <p>
            En la máxima medida permitida por la ley, Gastando no será responsable por pérdidas
            de datos, decisiones financieras tomadas en base a la app, ni daños indirectos
            derivados del uso o imposibilidad de uso del servicio.
          </p>
        </Section>

        <Section title="9. Modificaciones">
          <p>
            Podemos modificar estos términos en cualquier momento. Te notificaremos dentro de la app.
            El uso continuo después de los cambios implica la aceptación de los nuevos términos.
          </p>
        </Section>

        <Section title="10. Contacto">
          <p>
            Para consultas sobre estos términos escribinos a{' '}
            <a href="mailto:lucio.d.arriola@gmail.com" className="underline" style={{ color: '#7C4DFF' }}>
              lucio.d.arriola@gmail.com
            </a>
          </p>
        </Section>

        <div className="border-t border-border pt-6 flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacidad" className="hover:text-foreground transition-colors" style={{ color: '#7C4DFF' }}>
            Política de Privacidad
          </Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  )
}
