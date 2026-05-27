# Guía completa de infraestructura — Gastando

Este documento resume toda la configuración de infraestructura, seguridad y deploy del proyecto Gastando. Sirve como referencia para el desarrollador y como contexto para cualquier IA que trabaje en proyectos similares.

---

## Stack tecnológico

| Tecnología | Rol | Notas |
|------------|-----|-------|
| Next.js 15 (App Router) | Frontend + Backend | Server Components, API Routes |
| Supabase | Base de datos + Auth | Postgres, RLS, Auth, Storage |
| Vercel | Deploy + DNS | CI/CD automático desde GitHub |
| Resend | Emails transaccionales | SMTP para verificación y reset |
| Tailwind CSS | Estilos | Dark fintech design system |
| shadcn/ui | Componentes base | Radix UI + Tailwind |
| @dnd-kit | Drag and drop | Reordenamiento de cuentas |
| Sonner | Toasts | Notificaciones en UI |
| web-push | Push notifications | Notificaciones PWA |

---

## 1. Supabase

### Qué es
Supabase es el backend-as-a-service que usamos. Provee:
- **Base de datos** PostgreSQL
- **Autenticación** (email/password, OAuth)
- **RLS** (Row Level Security) — cada usuario solo ve sus propios datos
- **Storage** para archivos

### Configuración de Auth

#### Site URL
Debe apuntar al dominio de producción:
```
https://tudominio.com.ar
```
Se configura en: **Supabase Dashboard → Authentication → URL Configuration → Site URL**

#### Redirect URLs
Agregar la URL de callback:
```
https://tudominio.com.ar/auth/callback
```

#### Confirm sign up
Activar en: **Supabase Dashboard → Settings → Authentication → Confirm sign up**
Esto obliga a los usuarios a verificar su email antes de entrar.

#### Password mínimo
Configurar en: **Supabase Dashboard → Authentication → Providers → Email → Minimum password length**
Recomendado: **8 caracteres**

### RLS (Row Level Security)
**CRÍTICO** — Todas las tablas deben tener RLS habilitado.

Patrón estándar para cada tabla:
```sql
-- Habilitar RLS
alter table nombre_tabla enable row level security;

-- Política: cada usuario solo accede a sus propios datos
create policy "Users manage own data" on nombre_tabla
  for all using (auth.uid() = user_id);
```

**Ojo con categorías default:** Si una tabla tiene filas compartidas (ej: categorías predeterminadas con `user_id = null`), la política necesita contemplarlo:
```sql
create policy "Users manage own categories" on categories
  for all using (auth.uid() = user_id OR is_default = true);
```

### Clientes Supabase en Next.js
Usar siempre `@supabase/ssr`, no `@supabase/supabase-js` directamente.

**Server Component / API Route:**
```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
  )
}
```

**Client Component:**
```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## 2. Next.js Middleware

### Qué es
El middleware de Next.js corre ANTES de que cada request llegue a una página. Lo usamos para proteger todas las rutas autenticadas globalmente.

### IMPORTANTE
El archivo **debe llamarse `middleware.ts`** en la raíz del proyecto. Si se llama diferente (ej: `proxy.ts`), Next.js lo ignora completamente.

### Estructura recomendada
```
/middleware.ts        ← Entry point que Next.js detecta
/proxy.ts            ← Lógica real (opcional, para separar)
```

```ts
// middleware.ts
export { proxy as middleware, config } from './proxy'
```

```ts
// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (c) => { c.forEach(({ name, value }) => request.cookies.set(name, value)); supabaseResponse = NextResponse.next({ request }); c.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options)) } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  if (user && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return supabaseResponse
}

export const config = {
  // Excluir archivos estáticos, SW y manifest del middleware
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 3. Vercel

### Qué es
Plataforma de deploy. Cada push a `main` en GitHub dispara un deploy automático.

### Variables de entorno
Configurar en: **Vercel Dashboard → Project → Settings → Environment Variables**

Variables necesarias:
```
NEXT_PUBLIC_SUPABASE_URL       # URL del proyecto Supabase (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Anon key de Supabase (pública)
VAPID_PRIVATE_KEY               # Clave privada para push notifications (secreta)
CRON_SECRET                     # Token para proteger el endpoint del cron (secreto)
```

**Nunca commitear `.env.local` al repo.** El `.gitignore` debe incluir `.env*`.

### Dominio personalizado
1. Agregar dominio en **Vercel → Project → Settings → Domains**
2. Cambiar nameservers en el registrador a:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
3. Vercel maneja DNS y SSL automáticamente.

### Registros DNS adicionales (para Resend)
Si los nameservers apuntan a Vercel, los registros DNS de Resend se cargan en **Vercel → Domains → [dominio] → DNS Records**.

---

## 4. Resend (SMTP)

### Qué es
Servicio de envío de emails transaccionales. Lo usamos para que los emails de verificación y reset de contraseña lleguen desde `noreply@tudominio.com.ar` en lugar del servidor genérico de Supabase (que va a spam).

### Configuración paso a paso

#### 1. Crear cuenta en resend.com

#### 2. Agregar dominio
- Domains → Add Domain → ingresar dominio → región US East
- Elegir Manual setup

#### 3. Registros DNS a agregar
| Tipo | Nombre | Valor |
|------|--------|-------|
| TXT | `resend._domainkey` | `p=MIGfMA0G...` (clave DKIM de Resend) |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` · Priority 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

#### 4. Crear API Key
- API Keys → Create API Key
- Permisos: Sending access
- Dominio: el dominio verificado
- Guardar la key (empieza con `re_`)

#### 5. Configurar en Supabase
**Settings → Authentication → SMTP Settings:**
```
Host:           smtp.resend.com
Port:           465
Username:       resend
Password:       re_xxxx... (la API key)
Sender name:    Gastando
Sender email:   noreply@tudominio.com.ar
```

### Por qué es necesario
Sin SMTP propio, Supabase usa su servidor genérico que tiene rate limits y cuyos emails caen en spam. Con Resend los emails llegan a la bandeja de entrada con tu dominio como remitente.

---

## 5. Seguridad

### Headers HTTP
Agregar en `next.config.js` para proteger contra clickjacking, MIME sniffing, etc.:
```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options',       value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }]
}
```

### Protección de endpoints de cron
Usar `crypto.timingSafeEqual` para comparar secrets (evita timing attacks):
```ts
import { timingSafeEqual } from 'crypto'

const secret   = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
const expected = process.env.CRON_SECRET ?? ''
const safe = expected.length > 0 &&
  secret.length === expected.length &&
  timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
if (!safe) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### Checklist de seguridad completo
- [ ] RLS habilitado en todas las tablas
- [ ] Middleware activo (`middleware.ts` en raíz)
- [ ] Variables secretas solo en Vercel (nunca en el repo)
- [ ] Headers HTTP configurados en next.config.js
- [ ] SMTP propio configurado (no el genérico de Supabase)
- [ ] Confirmación de email activada
- [ ] Password mínimo 8 caracteres
- [ ] API keys rotadas periódicamente
- [ ] `ignoreBuildErrors: false` en TypeScript (no ocultar errores)

---

## 6. PWA (Progressive Web App)

### Qué es
Permite que los usuarios instalen la app en su teléfono desde el navegador, sin pasar por la App Store.

### Archivos necesarios
```
public/
  sw.js              ← Service Worker
  icon-192.png
  icon-512.png
app/
  manifest.ts        ← Next.js special file (sirve /manifest.webmanifest con Content-Type correcto)
components/layout/
  install-banner.tsx ← Banner de instalación (captura beforeinstallprompt)
  sw-register.tsx    ← Registro del SW (solo para usuarios autenticados)
```

### Dónde registrar el SW
**CRÍTICO** — El Service Worker debe registrarse solo dentro del layout autenticado (`app/(app)/layout.tsx`), NO en el root layout. Si se registra en el root layout, el middleware redirige `/sw.js` antes de que el SW pueda registrarse.

### Excluir sw.js del middleware
```ts
matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
```

### iOS
iOS Safari no dispara `beforeinstallprompt`. Hay que detectar iOS y mostrar instrucciones manuales:
```ts
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
// Mostrar: "Compartir → Agregar a pantalla de inicio"
```

---

## 7. Design System

### Colores principales
```
Violeta:  #7C4DFF  (primary, acciones, CTA)
Verde:    #00CB96  (ingresos, positivo)
Rojo:     #FF4D6D  (gastos, negativo, peligro)
Azul:     #3BB2F6  (transferencias, info)
Amarillo: #FFB800  (advertencias, inversiones)
```

### Fondo de la app
```
bg-[#0A0A0F]  (landing)
bg-background  (app, usa CSS var del tema)
```

### Patrones comunes
- Cards con `bg-card border border-border rounded-2xl`
- Gradiente de botón CTA: `linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)`
- Glow de botón: `box-shadow: 0 8px 32px #7C4DFF50`
- Texto secundario: `text-muted-foreground`
- Chips de color: `background: color + '20'`, `border: color + '60'`

---

## 8. Errores comunes y soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| Middleware no funciona | Archivo no se llama `middleware.ts` | Renombrar y exportar como `middleware` |
| RLS UPDATE silencioso | Política no cubre `user_id = null` | Agregar `OR is_default = true` |
| SW redirigido al login | Middleware intercepta `/sw.js` | Excluirlo del matcher |
| Clases Tailwind no aplican | Clase en variable JS (no literal) | Siempre escribir clases como strings literales en JSX |
| Push notifications no llegan | VAPID_PRIVATE_KEY no cargada en Vercel | Verificar env vars y redesplegar |
| Emails van a spam | SMTP genérico de Supabase | Configurar Resend con dominio propio |
| `count` de Supabase es null | Falta `{ count: 'exact' }` | Usar `data.length === 0` o pasar la opción |

---

## 9. Variables de entorno — referencia completa

```bash
# Supabase (públicas — pueden estar en el repo como NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Push Notifications (privadas — solo en Vercel)
VAPID_PRIVATE_KEY=xxxxx

# Cron Jobs (privadas — solo en Vercel)
CRON_SECRET=un-string-largo-y-aleatorio
```

---

## 10. Flujo de deploy

1. Hacer cambios en local
2. `git add` + `git commit` + `git push`
3. Vercel detecta el push y deploya automáticamente
4. El deploy tarda ~1-2 minutos
5. La URL de producción es el dominio configurado

Para verificar el estado del deploy: **Vercel Dashboard → Deployments**
