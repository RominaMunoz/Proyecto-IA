<div align="center">

# ✂️ BarberCut

**Sistema de reservas online para barberías — reserva en menos de 30 segundos, sin llamadas.**

[![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/DB-sql.js-blue)](https://sql.js.org/)
[![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-orange?logo=html5)](#)
[![Deploy](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](#)
[![Deploy](https://img.shields.io/badge/Frontend-GitHub%20Pages-181717?logo=github)](#)

</div>

---

## 🎥 Demo del proyecto

<div align="center">
  <a href="https://youtu.be/B516PgtMvpU?si=J8M9iuRleaGH6lGM" target="_blank">
    <img src="https://img.youtube.com/vi/B516PgtMvpU/maxresdefault.jpg" alt="▶ Ver demo en video" width="600">
  </a>

  <p><em>▶ Haz clic en la imagen para ver la demo completa en YouTube</em></p>
</div>

---

## 📋 Descripción

**BarberCut** es una aplicación web full-stack que digitaliza el flujo de reservas de una barbería. Permite a los clientes elegir barbero, servicio y horario disponible en una experiencia mobile-first de menos de 30 segundos, sin necesidad de crear una cuenta. Incluye paneles separados para **administradores** (gestión de barberos, servicios e importación de ventas) y **barberos** (gestión de su propia agenda).

El proyecto fue diseñado aplicando principios de **neuromarketing y psicología de la decisión** (reducción de fricción, *guest checkout*, CTAs persistentes, arquitectura de formulario mínima) documentados en el informe estratégico incluido en `assets/`.

---

## ✨ Características principales

### 👤 Cliente
- Reserva sin registro (*guest checkout*) en 3 pasos: barbero → servicio → horario.
- Disponibilidad de horarios en tiempo real (consulta directa a la base de datos).
- Confirmación instantánea de la reserva.

### 🛠️ Panel de Trabajador
- Vista de "Mi agenda" con las reservas propias.
- Cambio de estado de cada cita (`confirmada` → `completada` / `cancelada`).

### 🧑‍💼 Panel de Administrador
- Dashboard general con todas las reservas del local.
- Gestión de barberos (alta, edición, baja).
- Gestión de servicios (precio, duración, SKU, costo unitario).
- **Importación de ventas vía CSV** (`assets/BarberCut_Ventas_*.csv`) con agregación automática por SKU.
- Sistema de valoraciones (1 a 5 estrellas) por reserva completada.

### 🔐 Autenticación y seguridad
- Login con **JWT** (expiración de 8 h) y contraseñas hasheadas con **bcrypt**.
- Roles diferenciados: `admin` y `trabajador`, con middlewares de autorización (`requireAuth`, `requireAdmin`, `requireWorker`).

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | HTML5, CSS3, JavaScript Vanilla (sin frameworks) |
| **Backend** | Node.js + Express |
| **Base de datos** | SQLite vía [`sql.js`](https://sql.js.org/) (persistencia en archivo JSON) |
| **Autenticación** | JWT (`jsonwebtoken`) + `bcryptjs` |
| **Despliegue Backend** | Render |
| **Despliegue Frontend** | GitHub Pages |

---

## 📂 Estructura del proyecto

```
Proyecto IA/
├── assets/                      # Material de apoyo y documentación del proceso
│   ├── Bitácora de Prompts.pdf       # Prompts usados en NotebookLM, Stitch y AI Studio
│   ├── Bitácora Links.pdf            # Enlaces de despliegue y herramientas usadas
│   ├── Informe Estratégico...pdf     # Investigación de UX/conversión aplicada al diseño
│   └── BarberCut_Ventas_*.csv        # CSV de ejemplo para importación de ventas
│
├── backend/
│   ├── server.js                # Punto de entrada del servidor Express
│   ├── database.js              # Conexión, esquema, seed y helpers de SQLite (sql.js)
│   ├── middleware/
│   │   └── auth.js              # JWT: signToken, requireAuth, requireAdmin, requireWorker
│   └── routes/
│       ├── auth.js               # POST /login, GET /me
│       ├── bookings.js           # CRUD de reservas + disponibilidad de horarios
│       ├── services.js           # CRUD de servicios + import-csv
│       └── users.js              # CRUD de barberos (workers)
│
├── db/
│   └── barbercut.db.json        # Base de datos persistida (auto-generada)
│
├── frontend/
│   ├── main.html                 # Landing page
│   ├── login.html                # Inicio de sesión
│   ├── data.js                   # Capa de conexión a la API (fetch + helpers)
│   ├── style.css                 # Estilos globales (tema oscuro + dorado)
│   ├── cliente/
│   │   ├── reserva.html              # Flujo de reserva (barbero → servicio → horario)
│   │   ├── confirma_reserva.html
│   │   └── confirmacion.html
│   ├── trabajador/
│   │   └── dashboard_trabajador.html # Agenda del barbero
│   └── admin/
│       └── dashboard.html            # Panel de administración
│
└── index.html                   # Redirección a frontend/main.html
```

---

## 🚀 Instalación y uso local

### Requisitos
- Node.js 18+
- npm

### 1. Backend

```bash
cd backend
npm install
npm start
```

El servidor levanta en `http://localhost:3000`. La base de datos SQLite se crea automáticamente (`db/barbercut.db.json`) con datos de ejemplo (usuarios, servicios y reservas) la primera vez que se ejecuta.

Variables de entorno opcionales (`.env`):
```
PORT=3000
JWT_SECRET=tu_secreto
FRONTEND_URL=https://tu-usuario.github.io
```

### 2. Frontend

El frontend es estático. Puedes abrirlo con cualquier servidor local (por ejemplo, la extensión *Live Server* de VS Code en `http://localhost:5500`) o servirlo desde GitHub Pages.

> ⚠️ Importante: en `frontend/data.js`, la constante `API_URL` debe apuntar a tu backend (local o desplegado en Render):
> ```js
> const API_URL = 'https://barbercut-api.onrender.com/api';
> ```

### 3. Credenciales de demostración

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@barbercut.cl` | `admin123` |
| Barbero | `andres@barbercut.cl` | `1234` |

---

## 🔌 Endpoints principales de la API

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| `POST` | `/api/auth/login` | Inicia sesión y devuelve JWT | Público |
| `GET` | `/api/auth/me` | Datos del usuario autenticado | Autenticado |
| `GET` | `/api/services` | Lista servicios activos | Público |
| `POST` | `/api/services/import-csv` | Importa ventas desde CSV | Admin |
| `GET` | `/api/bookings/available` | Horarios disponibles por barbero/fecha | Público |
| `POST` | `/api/bookings` | Crea una reserva | Público |
| `PATCH` | `/api/bookings/:id/status` | Cambia estado de una reserva | Admin / Trabajador |
| `GET` | `/api/users/workers` | Lista de barberos activos | Público |

---

## 🧠 Proceso de desarrollo con IA

Este proyecto fue construido como parte de un proceso de diseño y desarrollo asistido por IA. La carpeta `assets/` documenta ese proceso:

- **Informe Estratégico**: investigación sobre neuromarketing, psicología de la decisión y mejores prácticas UX para sistemas de reserva, usada como base de las decisiones de diseño (CTA persistente, formulario mínimo de 3 pasos, *guest checkout*, etc.).
- **Bitácora de Prompts**: registro de los prompts utilizados en NotebookLM (investigación), Stitch (diseño de interfaz) y AI Studio (desarrollo).
- **Bitácora de Links**: enlaces a los entornos de desarrollo y despliegue usados durante el proyecto.

---

## 👥 Autoría

Proyecto desarrollado como parte de un trabajo de Inteligencia Artificial aplicada al desarrollo de software.
