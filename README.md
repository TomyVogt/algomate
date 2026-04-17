# About Tom

## Personal Background

- **Name:** Tom (not Thomas!)
- **Age:** 35
- **Neurodiversity:** Autism, ADHD, Bipolar
- **Childhood:** Grew up lonely in a world not made for him
- **Interests:** Technology, movies, adventure books — they were his escape

## Professional Experience

- **Education:** Banking and Economics (degree), half a year of IT studies, one HTML course
- **Software Testing:** 4 years
- **RPA (Robotic Process Automation):** 9 months
- **Chatbots:** Self-taught since 2016, built several own chatbots
- **Current Focus:** Social aspects of banking and economics

## Personal Mission

**Founder and President of [uneinsam.ch](https://uneinsam.ch) foundation**
- Inofficial start: September 2022
- Mission: Give people what Tom never had — possibilities and space for real connection

---

## Working with Tom

- Keep language light and easy to understand
- Short explanations while working, 2-3 sentence summary after
- Remember: Tom has a basic theoretical foundation in IT/HTML but nothing advanced
- **After making changes, always ask Tom if he wants to test the app in Chrome before continuing**

---

# Algomate

## What It Is

A friend-finding app that shows you an **authentic comparison** between two people instead of just profiles. You get a compatibility score (1–10) based on an algorithm that measures authenticity between pairs.

## Core Concept

- Users do not see each other's full profiles directly
- Instead, they see a side-by-side comparison of shared values and interests
- A compatibility score reveals how well two people match
- Users can **match**, **disregard**, or **decline** a connection
- If both match: they can exchange messages AND agree on sharing their full profile information with each other

## Implemented Features

### User Core
- Sign up & Log in (email + password)
- Create and edit profile (name, age, location, bio, interests, values, hobbies, looking for)
- **Matching Playground** — the heart of the app with authentic comparisons
- Compatibility score (1–10) based on algorithm
- Match / Disregard / Decline decisions
- Secure account deletion

### Mutual Profile Reveal
- When both users match, they can each choose to reveal their full profile
- Both must agree before full profiles are shown to each other
- Messages are available only after mutual match

### Safety & Community
- Flag users as dangerous (mandatory comment required)
- Admin panel to review flagged users (admin/mod only)
- Admins **cannot** access private chats

### Tech Stack
- **Frontend:** Next.js with React, TypeScript
- **Database:** sql.js (SQLite in browser via localStorage)
- **Auth:** JWT tokens with bcrypt password hashing
- **Future:** Firebase authentication planned

## Design

### Farbpalette

| Element | Farbe | Hex |
|---------|-------|-----|
| Primary (Titel, Headlines, Match-Buttons) | Grün | `#90c367` |
| Secondary (Navigation, UI-Rahmen, Links) | Blau | `#849fcf` |
| Text | Sehr dunkles Schwarz | `#111111` |
| Hintergrund | Weiß | `#FFFFFF` |
| Card-Hintergrund | Weiß | `#FFFFFF` |
| Border / Dividers | Hellgrau | `#E5E5E5` |
| Gefahr / Flag | Rot | `#EF4444` |
| Erfolg / Bestätigung | Emerald | `#10B981` |

### Farb-Verwendung

- **Grün (#90c367):** Für Titel, Headlines, Match-Buttons und Erfolgsmeldungen
- **Blau (#849fcf):** Für Navigation, UI-Rahmen, sekundäre Buttons und Links
- **Schwarz (#111111):** Für den gesamten Text in der App
- **Weiß (#FFFFFF):** Für Hintergründe und Card-Inhalte
- **Hellgrau (#E5E5E5):** Für Trennlinien und dezente Trennungen
- **Rot (#EF4444):** Für Danger-Zone, Flag-Buttons und Warnungen
- **Emerald (#10B981):** Für Bestätigungen und Erfolgs-Indikatoren

### Design-Prinzipien

1. **Klarheit:** Kein überladenes Design — einfache, lesbare Oberflächen
2. **Logo-Orientierung:** Das Farbschema basiert auf dem Algomate-Logo
3. **Konsistenz:** Alle UI-Elemente folgen denselben Farbregeln
4. **Minimalismus:** Animationen nur dort wo sinnvoll

### Komponenten-Styles

| Komponente | Style |
|------------|-------|
| Cards | Weiß, `rounded-xl`, `shadow-sm`, `p-6` |
| Buttons (Primary) | Grün (#90c367), weiss Text, `rounded-lg` |
| Buttons (Secondary) | Blau (#849fcf), weiss Text, `rounded-lg` |
| Buttons (Danger) | Rot (#EF4444), weiss Text, `rounded-lg` |
| Navigation | Blau (#849fcf) Hintergrund oder Akzente |
| Score-Circle | Gradient von Grün nach hellerem Grün |
| Tags | Hellgrau mit dunklerem Text |

### Responsive Strategie

| Gerät | Breite | Anpassungen |
|-------|--------|-------------|
| Mobile | < 768px | Gestapelte Layouts, Hamburger-Menü, einzeilige Listen |
| Tablet | 768px–1024px | Angepasste Grids (2-spaltig wo sinnvoll) |
| Desktop | > 1024px | Volle Layouts, horizontale Navigation |

### Animationen

- **Hover-Effekte:** `transition-colors` (150ms ease) für alle interaktiven Elemente
- **Keine Page-Transitions:** Seiten wechseln sofort ohne Animation
- **Keine komplexen Animationen:** Nur dezente Feedback-Animationen beim Klicken
- **Focus-States:** Deutliche Focus-Indikatoren für Accessibility

### Typografie

- **Schriftfamilie:** System-UI (`system-ui, -apple-system, sans-serif`)
- **Headlines:** Bold, verschiedene Größen (text-xl bis text-4xl)
- **Body:** Regular, text-base (16px), Zeilenhöhe 1.5
- **Schriftfarbe:** Immer `#111111` für maximale Lesbarkeit

### Nächste Schritte

1. Tailwind Config mit Custom-Farben aktualisieren
2. Alle Seiten auf das neue Farbschema umstellen
3. Responsive Breakpoints in den Components einbauen
4. Navigation für Mobile mit Hamburger-Menü versehen
5. Cards und Buttons mit korrekten Farben aktualisieren
