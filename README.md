# 🌈 Prisma — Sistema de Catálogo Inteligente

Sistema completo de catálogo web con carrito, pedidos por WhatsApp y panel de
administración privado. Backend real en Node/Express + base de datos SQLite
(un solo archivo, sin necesidad de instalar un servidor de base de datos aparte).

---

## ¿Qué incluye?

- **Sitio del cliente**: inicio con banner de promociones, destacados,
  novedades, catálogo con búsqueda/filtros/orden, ficha de producto con zoom,
  carrito y envío de pedido por WhatsApp con mensaje automático.
- **Panel admin** (usuario y contraseña): Productos (con subida de imágenes
  que se optimizan solas), Promociones, Inventario, Compras, Ventas,
  Finanzas, Clientes, Estadísticas y Configuración.
- **Base de datos real**: cada producto, pedido, compra y ajuste de stock
  se guarda de forma permanente en `prisma.db`. Nada se pierde al reiniciar
  el servidor.

---

## 1. Requisitos

- [Node.js](https://nodejs.org) versión **22.13 o superior** instalado en tu computadora
  (usa el SQLite que ya viene incorporado en Node, así que cualquier versión
  reciente de Node sirve — no hace falta instalar nada más).

Para comprobar qué versión tienes, abre una terminal y escribe:

```bash
node -v
```

Si te muestra `v22.13.0` o más nuevo (por ejemplo `v24.x`), estás listo.

**Nota:** al arrancar vas a ver un mensaje amarillo que dice
`ExperimentalWarning: SQLite is an experimental feature...`. Es normal y no
afecta el funcionamiento — Node.js todavía marca su módulo SQLite como
"experimental" aunque ya está en fase de release candidate y funciona de
forma estable. Se puede ignorar.

---

## 2. Instalación (primera vez)

Abre una terminal dentro de esta carpeta y ejecuta:

```bash
npm install
```

Esto descarga las librerías necesarias (Express, SQLite, autenticación, etc.).
Tarda uno o dos minutos.

Luego, copia el archivo de configuración de ejemplo:

**Mac / Linux:**
```bash
cp .env.example .env
```

**Windows (PowerShell o CMD):**
```powershell
copy .env.example .env
```

Abre el archivo `.env` con cualquier editor de texto y revisa/edita estos valores:

```
PORT=3000
JWT_SECRET=cambia-esto-por-un-secreto-largo-y-aleatorio-12345
ADMIN_USER=admin
ADMIN_PASSWORD=prisma2026
WHATSAPP_NUMBER=593963146192
```

**Importante:** cambia `JWT_SECRET` por cualquier texto largo y aleatorio antes
de publicar el sitio en internet, y cambia `ADMIN_PASSWORD` por una contraseña
segura tuya.

---

## 3. Ejecutar el sistema

```bash
npm start
```

Vas a ver un mensaje como:

```
🌱 Primera vez que se ejecuta: sembrando datos iniciales...
🌈 Prisma corriendo en http://localhost:3000
```

Abre tu navegador en **http://localhost:3000** y ya está: el catálogo, el
carrito y el panel admin (icono 🔒 arriba a la derecha) funcionan de verdad,
con datos que se guardan permanentemente en el archivo `prisma.db` que se
crea automáticamente la primera vez.

Para entrar al panel admin usa el usuario y contraseña que configuraste en `.env`
(por defecto `admin` / `prisma2026`).

### Modo desarrollo (reinicia solo al guardar cambios)

```bash
npm run dev
```

---

## 4. Reemplazar los productos de ejemplo por los tuyos

Los 8 productos que ves al arrancar son solo ejemplos genéricos (lentes,
bolsos, joyería...) para que veas el sistema funcionando. Entra al panel
admin → **Productos** → **Editar** o **Eliminar**, y cargá los tuyos reales
con sus fotos, precios y stock.

Al subir una foto desde el formulario de producto, el sistema automáticamente:
recorta a formato cuadrado centrado en el punto de interés, aumenta la
nitidez, ajusta brillo/color, y la comprime a WebP para que cargue rápido.
Todo esto ocurre en tu propio servidor (con la librería **Sharp**), sin
necesidad de crear cuentas externas.

---

## 5. Publicar el sitio en internet (para que sea una página real)

Ahora mismo el sistema corre en tu computadora (`localhost`). Para que
cualquier persona pueda entrar desde su celular necesitas subirlo a un
hosting. Como es un solo proyecto Node/Express (sirve tanto la API como el
sitio web), cualquiera de estas opciones funciona con el código tal cual está:

### Opción recomendada para empezar: Railway o Render
1. Crea una cuenta gratuita en [Railway](https://railway.app) o [Render](https://render.com).
2. Conecta tu repositorio de GitHub (sube esta carpeta a un repo nuevo) o
   arrastra el proyecto si la plataforma lo permite.
3. Configura las variables de entorno (`JWT_SECRET`, `ADMIN_USER`,
   `ADMIN_PASSWORD`, `WHATSAPP_NUMBER`) en el panel de la plataforma — igual
   que el `.env` local.
4. Comando de inicio: `npm start`.
5. La plataforma te da una URL pública (ej. `prisma.up.railway.app`). Podés
   conectarle tu propio dominio después desde el mismo panel.

**Importante sobre la base de datos en estos hosts:** algunos planes
gratuitos de Railway/Render no guardan archivos de forma permanente entre
reinicios (almacenamiento efímero). Si tu plan no incluye un volumen/disco
persistente, la base SQLite se puede borrar cuando el servidor duerme o se
reinicia. Revisa la documentación de "persistent volume" / "disk" de la
plataforma que elijas, o migra a una base de datos administrada (ver abajo).

### Opción con base de datos en la nube: Supabase o PostgreSQL administrado
Si prefieres no depender de un archivo local, se puede migrar de SQLite a
**Supabase (PostgreSQL)** sin cambiar la arquitectura general del proyecto:
Supabase te da una base de datos Postgres administrada con backups
automáticos y un panel visual. Los cambios necesarios serían:
1. Crear un proyecto en [supabase.com](https://supabase.com) (gratis para
   empezar).
2. Reemplazar `better-sqlite3` por el cliente de Postgres (`pg`) o por el
   SDK de Supabase (`@supabase/supabase-js`).
3. Adaptar las consultas de `db/database.js` y las rutas (`routes/*.js`) del
   dialecto SQLite al de PostgreSQL (son muy similares; la mayoría de
   consultas `SELECT`/`INSERT`/`UPDATE` cambian muy poco).
4. Las imágenes también se pueden mover de almacenamiento local a Supabase
   Storage o Cloudinary para que no dependan del disco del servidor.

Si más adelante quieres que arme esa migración a Supabase, te la puedo dejar
lista — el resto del sistema (rutas, frontend, lógica de negocio) no cambia.

### Servidor propio / VPS (DigitalOcean, Hetzner, etc.)
También funciona igual: `git clone` del proyecto, `npm install`, `npm start`
(idealmente detrás de un gestor de procesos como `pm2` para que se reinicie
solo si el servidor se reinicia), y un proxy con Nginx + certificado SSL
gratuito de Let's Encrypt para tu dominio.

---

## 6. Estructura del proyecto

```
prisma-backend/
├── server.js              # Punto de entrada: arma la API y sirve el sitio
├── package.json
├── .env.example            # Plantilla de configuración
├── db/
│   ├── database.js         # Crea las tablas de SQLite
│   └── seed.js              # Datos iniciales de ejemplo
├── middleware/
│   └── auth.js              # Verifica el token del admin
├── routes/
│   ├── auth.js               # Login del admin
│   ├── products.js           # CRUD de productos
│   ├── categories.js         # Categorías
│   ├── promotions.js         # Promociones / banners
│   ├── purchases.js          # Registro de compras a proveedores
│   ├── orders.js              # Pedidos (checkout + gestión)
│   ├── inventory.js          # Historial de movimientos de stock
│   ├── config.js              # Configuración del negocio
│   ├── upload.js               # Subida y optimización de imágenes
│   └── stats.js                # Finanzas y estadísticas
└── public/
    ├── index.html            # Todo el sitio (cliente + admin)
    ├── app.js                 # Lógica del frontend (llama a la API)
    ├── logo.png
    └── uploads/                # Imágenes de productos subidas
```

---

## 7. Próximas mejoras posibles

- Formulario de checkout que pida nombre, teléfono y dirección antes de
  enviar por WhatsApp (para poblar automáticamente la sección Clientes).
  y organizar mejor tu WhatsApp.
- Notificación automática al admin cuando llega un pedido.
- Reportes en PDF/Excel de ventas y finanzas.
- Convertir el sitio en PWA instalable en el celular.
- Migración de SQLite a Supabase/PostgreSQL para producción a mayor escala.

---

¿Dudas al ejecutarlo? Los errores más comunes son: no tener Node.js
instalado, no haber corrido `npm install`, o no haber copiado `.env.example`
a `.env`. Revisa esos tres primero.
