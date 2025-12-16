---
layout: home

hero:
  name: WhatsApp Flow Builder
  text: Visual Automation Platform
  tagline: Create powerful WhatsApp conversation flows with a drag-and-drop editor
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Node Reference
      link: /nodes/overview

features:
  - icon: 🎨
    title: Visual Flow Editor
    details: Drag-and-drop interface to design conversation flows without writing code
  - icon: 📱
    title: WhatsApp Business API
    details: Full integration with WhatsApp Cloud API for messages, media, buttons, and lists
  - icon: 🔄
    title: Smart Logic
    details: Conditions, loops, variables, and API calls for complex automation
  - icon: 🏢
    title: Multi-Tenant
    details: Organizations, users, and role-based access control built-in
  - icon: ⚡
    title: Real-time Testing
    details: Test your flows instantly with the built-in simulator
  - icon: 🚀
    title: Cloudflare Powered
    details: Serverless backend on Cloudflare Pages with Supabase database
---

## Quick Overview

WhatsApp Flow Builder is a visual automation platform that lets you create conversational flows for WhatsApp Business. Instead of writing complex code, you design flows by connecting nodes in a visual editor.

### What Can You Build?

- **Customer Support Bots** - Answer FAQs, route to agents
- **Booking Systems** - Schedule appointments, send confirmations
- **Lead Collection** - Gather customer information step by step
- **Loyalty Programs** - Stamp cards, rewards, streak tracking
- **Notifications** - Order updates, reminders, alerts
- **Surveys & Feedback** - Collect responses with buttons and lists

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Cloudflare     │────▶│    Supabase     │
│  (Flow Editor)  │     │  Pages Functions│     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  WhatsApp       │
                        │  Cloud API      │
                        └─────────────────┘
```
