# Análisis Técnico: Sistema de Ratings — Platziflix

**Versión**: 2.0
**Fecha**: 2026-03-15
**Alcance**: Backend + Frontend + Mobile

---

## Estado Actual del Sistema

### Backend ✅ Implementado

La base es sólida: 6 endpoints documentados, validación en 3 capas (Pydantic + service + DB CHECK), soft delete correcto.

**Bug corregido en esta sesión**: el `UNIQUE(course_id, user_id, deleted_at)` original no prevenía duplicados activos porque en PostgreSQL `NULL != NULL`. Reemplazado por un PARTIAL INDEX en la migración `c3f1a2b4d5e6`:

```sql
CREATE UNIQUE INDEX uq_active_course_user_rating
ON course_ratings (course_id, user_id)
WHERE deleted_at IS NULL;
```

**Endpoints disponibles:**

| Método | Endpoint | Descripción | Respuesta |
|--------|----------|-------------|-----------|
| POST | `/courses/{id}/ratings` | Crear o actualizar | 201 |
| GET | `/courses/{id}/ratings` | Listar ratings activos | 200 |
| GET | `/courses/{id}/ratings/stats` | Promedio, total, distribución | 200 |
| GET | `/courses/{id}/ratings/user/{user_id}` | Rating del usuario | 200 / 204 |
| PUT | `/courses/{id}/ratings/{user_id}` | Actualizar | 200 |
| DELETE | `/courses/{id}/ratings/{user_id}` | Soft delete | 204 |

**Validación multicapa:**
- Pydantic: `rating: int = Field(..., ge=1, le=5)`
- Service: `if not 1 <= rating <= 5: raise ValueError`
- DB: `CHECK (rating >= 1 AND rating <= 5)`

### Frontend ⚠️ Parcialmente completo

| Archivo | Estado | Detalle |
|---------|--------|---------|
| `StarRating.tsx` | ✅ Correcto | Modo readonly + interactivo (`onRate`, hover, `'use client'`) |
| `StarRating.module.scss` | ✅ Correcto | Clase `.interactive` con `cursor: pointer` y `scale(1.2)` |
| `Course.tsx` | ✅ Correcto | Muestra `StarRating` readonly en cards del home |
| `CourseDetail.tsx` | ⚠️ Parcial | Muestra promedio en detalle, pero bug pre-existente: usa `course.title`/`course.teacher` que no existen en el tipo |
| `CourseRatingSection.tsx` | ⚠️ Funcional con deuda | Permite calificar pero no carga el rating previo del usuario |
| `ratingsApi.ts` | ❌ Bug crítico | Línea 143: URL `/ratings/${userId}` en lugar de `/ratings/user/${userId}` |
| `types/rating.ts` | ⚠️ Incompleto | `RatingStats` no incluye `rating_distribution` aunque el endpoint lo devuelve |

### Mobile — No implementado

- **Android** (`CourseDTO.kt`): Gson descarta silenciosamente `average_rating` y `total_ratings` (campos no declarados)
- **iOS** (`CourseDTO.swift`): `Codable` descarta los mismos campos por la misma razón

Los datos ya llegan del API; solo faltan los DTOs y los componentes visuales.

---

## Bugs Críticos Identificados

### 1. URL incorrecta en `ratingsApi.getUserRating`

**Archivo**: `Frontend/src/services/ratingsApi.ts:143`

```ts
// ❌ Incorrecto
const url = `${API_BASE_URL}/courses/${courseId}/ratings/${userId}`;

// ✅ Correcto
const url = `${API_BASE_URL}/courses/${courseId}/ratings/user/${userId}`;
```

**Impacto**: `CourseRatingSection` nunca puede saber si el usuario ya calificó. El estado inicial siempre muestra 0 estrellas aunque el usuario tenga una calificación activa.

---

### 2. Semántica HTTP incorrecta en endpoint de rating por usuario

**Archivo**: `Backend/app/main.py`

El endpoint `GET /courses/{id}/ratings/user/{user_id}` devuelve `HTTP 204` cuando el usuario no ha calificado. HTTP 204 es "éxito sin cuerpo", no "recurso no encontrado". `handleApiResponse` en el cliente lanza excepción por `Invalid response format` porque 204 no tiene `Content-Type: application/json`.

**Fix**: Cambiar a `HTTP 404` con cuerpo `{"detail": "Rating not found"}` cuando el usuario no ha calificado. Actualizar `ratingsApi.getUserRating()` para manejar 404 → `null`.

---

### 3. `rating_distribution` con claves string vs. int

**Archivo**: `Backend/app/schemas/rating.py`

```python
# ❌ Incorrecto — JSON siempre serializa claves de objetos como strings
rating_distribution: Dict[int, int]

# ✅ Correcto
rating_distribution: Dict[str, int]
```

**Impacto**: Clientes que accedan con clave entera (`distribution[1]`) obtienen `undefined`/`null`.

---

## Deuda Técnica Identificada

### N+1 Queries en `GET /courses`

**Archivo**: `Backend/app/services/course_service.py` (método `get_all_courses`)

Por cada curso en el listado se ejecutan 2 queries SQL adicionales para calcular `average_rating` y `total_ratings`. Con N cursos = 2N+1 queries totales por request.

**Fix**: Reemplazar el loop por una query batch con `GROUP BY`:

```python
rating_stats = (
    db.query(
        CourseRating.course_id,
        func.coalesce(func.avg(CourseRating.rating), 0.0).label('avg_rating'),
        func.count(CourseRating.id).label('total')
    )
    .filter(CourseRating.deleted_at.is_(None))
    .group_by(CourseRating.course_id)
    .all()
)
stats_map = {row.course_id: row for row in rating_stats}
```

Reducción: 2N+1 queries → 2 queries totales (una para cursos, una para ratings agregados).

---

### `CourseRatingSection` no carga el rating previo

**Archivo**: `Frontend/src/components/CourseDetail/CourseRatingSection.tsx`

Falta un `useEffect` que llame a `getUserRating` al montar. El usuario siempre ve 0 estrellas aunque ya haya calificado.

```tsx
useEffect(() => {
  ratingsApi.getUserRating(courseId, PLACEHOLDER_USER_ID)
    .then(existing => {
      if (existing) setUserRating(existing.rating);
    });
}, [courseId]);
```

---

### Sin FK a tabla Users

`user_id` en `CourseRating` es un `Integer` sin `ForeignKey`. Se pueden crear ratings para usuarios inexistentes. No hay cascade posible. El `PLACEHOLDER_USER_ID = 1` hardcodeado en el frontend hace que todos los usuarios compartan la misma calificación.

---

## Plan de Implementación

### Fase 1 — Bugs Críticos (inmediato)

1. **Fix URL** `ratingsApi.getUserRating` → `/ratings/user/${userId}`
2. **Fix HTTP 204 → 404** en `main.py` endpoint de rating por usuario
3. **Fix tipo** `Dict[int, int]` → `Dict[str, int]` en `schemas/rating.py`
4. **Agregar `rating_distribution`** a `RatingStats` en `types/rating.ts`
5. **Fix campos** `course.title` → `course.name` en `CourseDetail.tsx`

### Fase 2 — UX Completa (siguiente sprint)

6. **Cargar rating previo** en `CourseRatingSection`: `useEffect` + `getUserRating` al montar
7. **Actualizar promedio** tras calificación exitosa (callback o re-fetch del curso padre)
8. **Optimistic updates**: actualizar estado local antes de confirmar con el servidor

### Fase 3 — Performance

9. **Resolver N+1** en `get_all_courses()` con query batch (ver sección de deuda técnica)
10. **Paginación** en `GET /courses/{id}/ratings` (params `limit` y `offset`)

### Fase 4 — Mobile Android

11. Actualizar `CourseDTO.kt`: agregar `averageRating: Double?` y `totalRatings: Int?`
12. Actualizar `Course.kt` (domain model) y `CourseMapper.kt`
13. Crear `StarRatingView.kt` como `@Composable` con `Icons.Filled.Star` / `Icons.Outlined.Star`
14. Integrar `StarRatingView` en `CourseCard.kt`
15. (Con auth) Crear `RatingRepository.kt` y `RatingViewModel.kt` para escritura

### Fase 5 — Mobile iOS

16. Actualizar `CourseDTO.swift`: agregar `averageRating: Double?`, `totalRatings: Int?` con `CodingKeys`
17. Actualizar `Course.swift` (domain) y `CourseMapper.swift`
18. Crear `StarRatingView.swift` en `Presentation/Views/`
19. Integrar en `CourseCardView.swift`
20. (Con auth) Crear `RemoteRatingRepository.swift` siguiendo el patrón de `RemoteCourseRepository`

### Fase 6 — Autenticación (prerequisito para producción)

21. Definir estrategia de auth (JWT recomendado)
22. Crear tabla `users` y migración con FK `course_ratings.user_id → users.id`
23. Middleware de autenticación en FastAPI que inyecte el `user_id`
24. Validar en endpoints de ratings que el `user_id` del token coincida con el del path
25. Eliminar `PLACEHOLDER_USER_ID` del frontend — obtener el ID del contexto de sesión
26. Interim: usar UUID en `localStorage`/`SharedPreferences`/`UserDefaults` como ID temporal entre plataformas

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `user_id=1` compartido en dev | Todos los devs sobreescriben la calificación del mismo usuario | UUID aleatorio en `localStorage` hasta tener auth |
| N+1 queries con catálogo creciente | 201 queries con 100 cursos; bottleneck en connection pool | Resolver antes de carga de producción (Fase 3) |
| Bug URL `getUserRating` | Estado inicial siempre 0 estrellas | Fix inmediato (Fase 1) |
| Inconsistencia `user_id` entre plataformas | Ratings duplicados del "mismo usuario" en DB | UUID compartido o auth real (Fase 6) |
| Pérdida de ratings al implementar auth | Ratings con `user_id=1` quedan huérfanos | Script de migración como parte de Fase 6 |

---

## Arquitectura Objetivo (CourseDetail)

```
CourseDetailPage (app/courses/[slug]/page.tsx) — Server Component
  └── CourseDetailComponent                    — Server Component
        ├── StarRating rating={avg} readonly   — dato estático del servidor
        └── CourseRatingSection courseId={id}  — Client Component
              ├── useEffect → getUserRating al mount
              ├── StarRating rating={userRating} onRate={handleRate}
              └── on success: invalidar promedio del padre
```

---

## Separación de Repositorios en Mobile (cuando se implemente escritura)

```
Domain/Repositories/
  CourseRepositoryProtocol    — getCourses, getCourseBySlug  (existente)
  RatingRepositoryProtocol    — getRatings, createRating, updateRating, deleteRating  (nuevo)

Data/Repositories/
  RemoteCourseRepository      — existente
  RemoteRatingRepository      — nuevo, mismo patrón
```

---

## Migraciones Aplicadas

| Revisión | Descripción |
|----------|-------------|
| `d18a08253457` | Schema inicial: courses, teachers, lessons, course_teachers |
| `0e3a8766f785` | Tabla `course_ratings` con CHECK constraint (rating 1-5) |
| `c3f1a2b4d5e6` | Fix UNIQUE constraint → PARTIAL INDEX `WHERE deleted_at IS NULL` |
