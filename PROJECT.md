# Fastory-Rework - Project Documentation

## 1. Project Overview
Fastory-Rework is a modern web application designed for POS (Point of Sale) and Inventory Management. It allows users to create stores, manage inventory (products, categories, locations), process orders (cash/promptpay), and handle store memberships. 

## 2. Technology Stack
The project is built with a separated Frontend and Backend architecture:

### Frontend
- **Framework**: Next.js (App Router), React 19
- **Styling**: Tailwind CSS v4, Radix UI primitives, shadcn/ui components
- **State Management**: Redux Toolkit (RTK Query for API calls)
- **Tooling**: Biome (Linter & Formatter), Vitest
- **Key Libraries**: `lucide-react`, `zod`, `recharts`, `react-day-picker`

### Backend
- **Runtime & Framework**: Bun + ElysiaJS
- **Database ORM**: Prisma (with `@prisma/adapter-pg`)
- **Database**: PostgreSQL
- **Key Integrations**: Google GenAI (AI Chat), PromptPay QR generation, Google Translate API

## 3. Database Architecture (Key Entities)
- **`users`**: Manages user accounts, roles, profiles, and OAuth links (Google).
- **`stores`**: Represents a business entity. A user can own multiple stores or be a member.
- **`store_members`**: Handles Role-Based Access Control (RBAC) and memberships within a store.
- **`products` & `categories` & `locations`**: Core inventory management. Tracks SKU, pricing, and stock on hand.
- **`product_stock_movements`**: Ledger for tracking inventory changes (deltas) and reasons.
- **`orders` & `order_items`**: Manages transactions, supporting multiple statuses (completed, voided, pending) and payment methods.
- **`ai_chat_messages`**: Stores conversation history for AI assistant features within a store context.

## 4. Key Workflows & Business Logic

### Authentication Flow
- **Standard Login**: Email and password using JWTs (Access and Refresh tokens stored in cookies).
- **Google OAuth Login**:
  - If a user logs in with Google and an account already exists, they are logged in normally.
  - **Important Rule**: If a user logs in with Google but *does not* have an account, the system **will not** auto-create one. Instead, they are redirected to the registration page with pre-filled details.
  - During registration (even via Google OAuth), users must verify their details and **set a password**. This ensures all accounts have a password for sensitive actions (like account deletion).

### Account Deletion Safeguards
- The system enforces a strict data integrity policy when a user wants to delete their account:
  - **Store Ownership Rule**: A user cannot delete their account if they currently own active stores. They must delete or transfer ownership of all their stores first.
- **UI Flow for Deletion**:
  - The deletion process is initiated from a Drawer (e.g., Profile Settings).
  - To prevent `z-index` or pointer-event layout conflicts between Radix UI Drawers and Dialogs, the drawer is explicitly **closed first** before rendering the `ConfirmDeleteDialog`.
  - The deletion requires a two-step confirmation, including entering the user's password.

## 5. UI/UX Design Principles
- **Modals & Dialogs**: Uses standardized paddings and structures (via `ConfirmDeleteDialog`) to keep a consistent UI experience across the platform. Layering conflicts (Drawers vs. Dialogs) are handled logically by sequentially closing and opening components rather than brute-forcing `z-index` values.
