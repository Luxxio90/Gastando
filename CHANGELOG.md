# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

---

## [0.1.0] - 2026-05-16

### Agregado

#### Infraestructura y configuración base
- Proyecto Next.js 15 con App Router, TypeScript y Tailwind CSS
- Integración de shadcn/ui con los siguientes componentes: `button`, `card`, `input`, `label`, `select`, `dialog`, `dropdown-menu`, `table`, `badge`, `progress`, `tabs`, `avatar`, `sonner`, `separator`
- Cliente de Supabase para el navegador (`lib/supabase/client.ts`)
- Cliente de Supabase para el servidor con soporte de cookies (`lib/supabase/server.ts`)
- Proxy de autenticación (`proxy.ts`) con redirección automática según el estado de sesión del usuario
- Tipos TypeScript globales (`types/index.ts`) que definen las entidades principales de la aplicación: `Account`, `Category`, `Transaction`, `Budget` e `Investment`

#### Base de datos
- Schema SQL completo de Supabase (`supabase-schema.sql`) con las tablas: `accounts`, `categories`, `transactions`, `budgets` e `investments`
- Row Level Security (RLS) habilitado en todas las tablas para aislar los datos por usuario
- 15 categorías por defecto precargadas: 11 de gastos (Alimentación, Transporte, Entretenimiento, Salud, Educación, Ropa, Servicios, Hogar, Viajes, Restaurantes, Otros) y 4 de ingresos (Salario, Freelance, Inversiones, Otros ingresos)

#### Autenticación
- Pantalla de inicio de sesión (`/auth/login`) con formulario de email y contraseña
- Pantalla de registro de usuario (`/auth/register`)
- Callback OAuth para manejo del flujo de autenticación de Supabase (`/auth/callback`)
- Configuración de Supabase Auth: proveedor de email habilitado, auto-confirmación de cuentas activada, registros abiertos al público

#### Layout y navegación
- Layout principal de la aplicación con sidebar oscuro y navegación lateral entre secciones (`components/layout/sidebar.tsx`)

#### Dashboard (`/dashboard`)
- Tarjetas de resumen con saldo total, ingresos del mes, gastos del mes e inversiones activas
- Gráfica de torta por categoría de gastos integrada con la librería `recharts`
- Lista de transacciones recientes con tipo, categoría, cuenta y monto

#### Transacciones (`/transactions`)
- Listado completo de transacciones con filtro por tipo (ingresos / gastos / transferencias)
- Formulario modal para registrar nuevas transacciones (tipo, categoría, cuenta, monto, descripción, fecha)
- Funcionalidad para eliminar transacciones existentes

#### Cuentas (`/accounts`)
- Vista en tarjetas de todas las cuentas del usuario con balance actual, tipo de cuenta y color personalizado
- Formulario modal para crear nuevas cuentas (nombre, tipo, balance inicial, color)
- Funcionalidad para eliminar cuentas

#### Presupuestos (`/budgets`)
- Tarjetas por categoría con barra de progreso que indica el porcentaje del presupuesto utilizado
- Alertas visuales cuando se supera o se está cerca del límite del presupuesto
- Formulario modal para definir presupuestos por categoría y período

#### Inversiones (`/investments`)
- Tarjetas de activos con rendimiento actual (ganancia o pérdida) en valor absoluto y porcentual
- Gráfica de ganancia/pérdida por activo con `recharts`
- Formulario modal para registrar nuevos activos de inversión (nombre, tipo, monto invertido, valor actual)

---

[0.1.0]: https://github.com/usuario/gastando/releases/tag/v0.1.0
