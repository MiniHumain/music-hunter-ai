# Music Hunter AI - Architecture

## Objectif

Music Hunter AI est une plateforme destinée aux compositeurs, producteurs et créateurs musicaux.

L'application aide à :

- trouver des entreprises ayant potentiellement besoin de musique ;
- organiser les prospects dans un CRM ;
- analyser les entreprises avec l'IA ;
- générer des messages personnalisés ;
- suivre les campagnes de prospection.

---

## Architecture

Le projet est composé de deux parties.

### Backend

Technologies :

- FastAPI
- SQLAlchemy
- SQLite (développement)
- PostgreSQL (production)

Responsabilités :

- API REST
- authentification
- gestion des prospects
- import/export
- IA
- collecte des données

---

### Frontend

Technologies :

- React
- TypeScript
- Vite
- Tailwind CSS

Responsabilités :

- tableau de bord
- CRM
- formulaires
- statistiques

---

## Structure

music-hunter-ai/

backend/

frontend/

docs/

scripts/

---

## Versions

v0.1

- architecture
- CRUD prospects
- SQLite

v0.2

- Dashboard

v0.3

- IA

v1.0

- Application complète
