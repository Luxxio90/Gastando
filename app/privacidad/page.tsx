import Link from 'next/link'
import { ArrowLeft, Wallet } from 'lucide-react'

export const metadata = { title: 'Política de Privacidad – Gastando' }

export default function PrivacidadPage() {
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
          <h1 className="text-2xl font-bold text-foreground mb-1">Política de Privacidad</h1>
          <p className="text-sm text-muted-foreground">Última actualización: mayo de 2026</p>
        </div>

        <Section title="1. Qué información recopilamos">
          <p>Gastando recopila únicamente la información que vos mismo ingresás en la aplicación:</p>
          <ul>
            <li>Dirección de correo electrónico (para autenticación)</li>
            <li>Datos financieros que registrás: transacciones, cuentas, presupuestos e inversiones</li>
            <li>Nombre o alias que decidás configurar</li>
          </ul>
          <p>No recopilamos datos de ubicación, contactos, ni accedemos a otros datos de tu dispositivo.</p>
        </Section>

        <Section title="2. Cómo usamos tu información">
          <p>La información que ingresás se usa exclusivamente para:</p>
          <ul>
            <li>Mostrarte tus propios datos dentro de la aplicación</li>
            <li>Enviarte notificaciones sobre vencimientos que vos configuraste</li>
            <li>Mantener tu sesión activa de forma segura</li>
          </ul>
          <p>No usamos tus datos para publicidad, perfilamiento ni fines comerciales.</p>
        </Section>

        <Section title="3. Almacenamiento y seguridad">
          <p>
            Tus datos se almacenan en servidores seguros provistos por{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#7C4DFF' }}>Supabase</a>.
            Cada usuario solo puede ver y modificar sus propios datos (políticas de seguridad a nivel fila).
            Las contraseñas nunca se almacenan en texto plano.
          </p>
        </Section>

        <Section title="4. Compartir información con terceros">
          <p>
            No vendemos, alquilamos ni compartimos tu información personal con terceros.
            Los únicos proveedores que procesan datos son los necesarios para operar la app
            (infraestructura de base de datos y hosting), todos bajo estándares de seguridad reconocidos.
          </p>
        </Section>

        <Section title="5. Tus derechos">
          <p>Tenés derecho a:</p>
          <ul>
            <li>Acceder a todos tus datos desde la aplicación</li>
            <li>Eliminar tu cuenta y todos tus datos en cualquier momento desde Ajustes</li>
            <li>Solicitar la exportación de tus datos contactándonos por email</li>
          </ul>
        </Section>

        <Section title="6. Cookies y almacenamiento local">
          <p>
            Gastando utiliza almacenamiento local del navegador (localStorage) únicamente para
            guardar preferencias de interfaz como el orden de tus cuentas o si elegiste ocultar los saldos.
            No usamos cookies de rastreo.
          </p>
        </Section>

        <Section title="7. Cambios a esta política">
          <p>
            Podemos actualizar esta política ocasionalmente. Te notificaremos dentro de la app
            si los cambios son significativos. El uso continuo de Gastando implica la aceptación
            de la versión vigente.
          </p>
        </Section>

        <Section title="8. Contacto">
          <p>
            Para cualquier consulta sobre privacidad podés escribirnos a{' '}
            <a href="mailto:lucio.d.arriola@gmail.com" className="underline" style={{ color: '#7C4DFF' }}>
              lucio.d.arriola@gmail.com
            </a>
          </p>
        </Section>

        <div className="border-t border-border pt-6 flex gap-4 text-sm text-muted-foreground">
          <Link href="/terminos" className="hover:text-foreground transition-colors" style={{ color: '#7C4DFF' }}>
            Términos de Uso
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
