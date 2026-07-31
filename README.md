# VisionMate AI

Build a fully functional AI-powered web application called VisionMate AI – Your Eyes, Powered by AI for visually impaired users. This must be a complete working application, not a UI mockup, not a landing page, and not a prototype with placeholder buttons. Every feature must work end-to-end with proper frontend, backend, database integration, error handling, loading states, and persistent data storage.

Use React, TypeScript, Tailwind CSS, Supabase, responsive design, and modern accessibility-first UI principles.

Core Goal

VisionMate AI helps visually impaired users understand images, read documents, interact through voice, and access emergency support.

Authentication

Create a fully functional authentication system:

Sign Up

Login

Logout

Forgot Password

User Profile

Session Persistence

Protected Routes

Store user data in Supabase.

Dashboard

Create a modern dashboard showing:

Welcome section

Quick Actions

Recent Image Analyses

Recent Documents

Voice Assistant Access

Emergency Contacts

Usage Statistics

All dashboard data must come from the database.

Feature 1: AI Scene Narrator (Main Feature)

Users can upload images.

After upload:

Analyze image using AI vision model.

Generate a detailed scene description.

Detect objects.

Detect people.

Explain surroundings.

Read visible text from the image.

Identify potential obstacles or hazards.

Generate a simplified explanation suitable for visually impaired users.

Display:

Uploaded image preview

AI-generated description

Analysis timestamp

Save analysis button

Store all analyses in Supabase.

Users must be able to:

View previous analyses

Search analyses

Delete analyses

No placeholder responses. AI analysis must be generated dynamically.

Feature 2: Smart Document Reader

Allow upload of:

PDF files

Images containing text

After upload:

Extract text using OCR

Display extracted text

Generate summary

Generate key points

Read content aloud using text-to-speech

Users can:

Save document history

Reopen previous documents

Search documents

Store data in database.

Feature 3: Voice AI Assistant

Create a fully working voice assistant.

Features:

Microphone button

Speech-to-text

AI response generation

Text-to-speech output

Conversation history

Save chat history

Support:

English

Hindi

Users should be able to ask:

Describe my image

Summarize my document

Explain uploaded content

General questions

Voice interaction must be functional.

Feature 4: Emergency SOS

Create an emergency section.

Users can:

Add emergency contacts

Edit contacts

Delete contacts

Emergency button should:

Show emergency contact information

Simulate emergency alert workflow

Log emergency event in database

Store emergency contacts persistently.

Accessibility Features

Implement:

Dark mode

Light mode

High contrast mode

Adjustable font size

Keyboard navigation

Screen-reader-friendly components

Large accessible buttons

All accessibility controls must function.

Database Requirements

Create proper Supabase tables for:

Users

Image Analyses

Documents

Voice Conversations

Emergency Contacts

Settings

Implement full CRUD operations.

UI Requirements

Design must look professional and hackathon-winning.

Include:

Modern glassmorphism cards

Smooth animations

Loading indicators

Empty states

Success notifications

Error handling

Responsive design

Mobile support

Clean dashboard layout

Functional Requirements

Every button must work.

No placeholder pages.

No dummy content.

No fake data.

All forms must save data correctly.

All uploads must work.

All AI responses must be generated dynamically.

All database operations must function.

All navigation routes must work.

Deliverables

Generate all pages, components, database schema, Supabase integration, authentication flow, storage configuration, API integrations, dashboard functionality, accessibility settings, and working business logic necessary for a complete deployable application.

The final result should be a fully functional MVP that can be demonstrated live in a classroom competition without broken buttons, placeholder sections, or incomplete workflows.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://visionmateai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8a70cf86-a9c5-4211-8cf7-1defbcbcfe07).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
