# Platziflix

Plataforma de cursos online estilo Netflix, construida como proyecto del [Curso de Claude Code de Platzi](https://platzi.com/cursos/claude-code/) con el profesor **Eduardo Alvarez**.

## ¿Qué es Platziflix?

Platziflix es una aplicación multi-plataforma que permite explorar un catálogo de cursos, ver su contenido (lecciones y clases), reproducir videos y calificar los cursos. Está diseñada para demostrar cómo Claude Code puede ayudar a construir software real en múltiples plataformas simultáneamente.

## Plataformas

| Plataforma | Tecnología | Puerto/Acceso |
|------------|------------|---------------|
| Backend API | FastAPI + PostgreSQL | http://localhost:8000 |
| Frontend Web | Next.js 15 | http://localhost:3000 |
| Android | Kotlin + Jetpack Compose | Android Studio |
| iOS | Swift + SwiftUI | Xcode |

## Funcionalidades

- Catálogo de cursos con grid estilo Netflix
- Detalle de curso: profesores, lecciones y clases
- Reproductor de video integrado
- Sistema de calificaciones (1-5 estrellas)
- Navegación SEO-friendly por slug
- Apps móviles nativas para Android e iOS

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para el backend
- [Node.js 20+](https://nodejs.org/) + [Yarn](https://yarnpkg.com/) — para el frontend
- Android Studio — para la app Android (opcional)
- Xcode — para la app iOS (opcional, solo macOS)

## Inicio rápido

### 1. Backend

```bash
cd Backend
make start      # Levanta PostgreSQL + API en Docker
make migrate    # Aplica migraciones de base de datos
make seed       # Carga datos de prueba
```

La API estará disponible en http://localhost:8000
Documentación interactiva: http://localhost:8000/docs

### 2. Frontend

```bash
cd Frontend
yarn install
yarn dev
```

La web estará disponible en http://localhost:3000

## Estructura del proyecto

```
platziflix/
├── Backend/        # API REST con FastAPI + PostgreSQL
├── Frontend/       # Aplicación web con Next.js 15
├── Mobile/
│   ├── PlatziFlixAndroid/   # App Android (Kotlin)
│   └── PlatziFlixiOS/       # App iOS (Swift)
└── spec/           # Documentos de diseño e implementación
```

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/courses` | Lista todos los cursos con estadísticas de rating |
| GET | `/courses/{slug}` | Detalle de un curso por slug |
| GET | `/classes/{class_id}` | Detalle de clase con URL de video |
| POST | `/courses/{id}/ratings` | Crear o actualizar calificación |
| GET | `/courses/{id}/ratings/stats` | Estadísticas de calificaciones |
| DELETE | `/courses/{id}/ratings/{user_id}` | Eliminar calificación |

## Comandos útiles (Backend)

```bash
make start              # Iniciar todos los servicios
make stop               # Detener servicios
make logs               # Ver logs en tiempo real
make seed-fresh         # Resetear y recargar datos de prueba
make create-migration   # Crear nueva migración de base de datos
```

## Comandos útiles (Frontend)

```bash
yarn dev        # Servidor de desarrollo
yarn build      # Build de producción
yarn test       # Ejecutar tests
yarn lint       # Verificar código
```

## Modelo de datos

```
Course ──< Lesson ──< Class
  │
  ├──< CourseRating   (calificaciones por usuario)
  │
  └──>< Teacher       (relación muchos a muchos)
```

## Profesor

**Eduardo Alvarez** — Curso de Claude Code en Platzi
