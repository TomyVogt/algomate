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

## Planned Enhancements

- Linguistic ice breakers
- Conversation topic suggestions
- Firebase authentication (for better security)
- Admin/mod special sign-up flow
