---
name: Estado del sistema de ratings Platziflix
description: Qué está implementado, qué gaps existen y decisiones arquitecturales del sistema de ratings de cursos
type: project
---

El sistema de ratings (1-5 estrellas) está parcialmente implementado a marzo 2026.

**Backend — completo:** 6 endpoints REST en `main.py`, modelo `CourseRating` con soft delete, validación en 3 capas (Pydantic + service + DB CHECK constraint), bug del UNIQUE constraint ya corregido a PARTIAL INDEX en migración `c3f1a2b4d5e6`.

**Frontend — parcialmente completo:** `StarRating.tsx` con modos readonly e interactivo, `CourseRatingSection.tsx` para interacción del usuario, `ratingsApi.ts` con todos los métodos. Limitación crítica: `PLACEHOLDER_USER_ID = 1` hardcodeado porque no hay autenticación. El tipo `CourseDetail` en `types/index.ts` no tiene `teacher` ni `title` que usa `CourseDetail.tsx` — bug pre-existente fuera del scope de ratings.

**Mobile — no implementado:** Android (`CourseDTO.kt`, `Course.kt`) y iOS (`CourseDTO.swift`, `Course.swift`) no tienen campos de rating. `ApiService.kt` y `CourseAPIEndpoints.swift` no tienen endpoints de ratings.

**Gap principal:** Sin sistema de autenticación, `user_id` es un placeholder fijo, lo que hace el sistema no production-ready. El análisis técnico completo está en `spec/RATINGS_ARCHITECTURE_ANALYSIS.md`.

**Why:** El sistema fue construido iterativamente, priorizando el backend primero, luego frontend básico. Auth fue descartada del scope inicial.

**How to apply:** Al proponer trabajo nuevo en ratings, siempre considerar el impacto del `PLACEHOLDER_USER_ID` y la deuda de autenticación pendiente.
