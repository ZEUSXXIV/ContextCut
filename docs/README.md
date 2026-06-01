# Omni MCP Gateway Documentation Portal

Welcome to the official documentation portal for **Omni MCP Gateway**, a multi-tenant SaaS platform that dynamically translates public or secure OpenAPI/Swagger REST specifications into hosted, authenticated Model Context Protocol (MCP) servers.

This folder contains the complete, highly detailed specifications of the platform's architecture, security controls, and operational runbooks.

---

## 📚 Documentation Index

### 1. [Architecture & Design Spec](architecture.md)
Explore the system's modular layers, multi-tenant database models, runtime workflows, and dynamic Server-Sent Events (SSE) session streaming flows.

### 2. [System Setup & Installation Guide](setup-guide.md)
Step-by-step instructions to configure environment configurations, install dependencies, run automated Jest tests, boot developer servers, and test the platform using the built-in Sandbox mode.

### 3. [API & MCP Reference Handbook](api-reference.md)
Comprehensive directory of all backend REST endpoints (Tenant Registration, Gateway CRUD, Real-Time Analytics) and the standardized JSON-RPC 2.0 over SSE protocol mapping structure.

### 4. [Token-Saver Pruning Engine Specification](token-saver.md)
Deep dive into the recursive middleware layer designed to optimize raw, bloated API responses. Learn about array capping, nesting depth limits, metadata sanitization, and context preservation.

### 5. [Security Baseline & Cryptographic Standards](security.md)
Detailed specification of our security safeguards: AES-256-GCM symmetric credential vaulting, timing-safe scrypt credential matching, XSS-resistant cookie session boundaries, and mutating execution guards.

---

## 🛠️ Gateway Architecture Directory

```
rest-to-mcp/
├── backend/                  # Express, TypeScript, and MongoDB Core Engine
│   ├── src/
│   │   ├── middleware/       # API Key and Cookie session security layers
│   │   ├── models/           # Mongoose schemas (User, ConnectedAPI, Session, etc.)
│   │   ├── routes/           # Auth, analytics, and dynamic MCP proxy endpoints
│   │   └── utils/            # AES-256-GCM, Token-Saver recursive algorithms, OpenAPI parser
│   └── src/routes/*.test.ts  # Jest integration and adversarial test files
│
├── frontend/                 # Next.js App Router & Tailwind CSS Dashboard
│   └── src/
│       ├── app/              # App Router routes (/login, /register, /verify, /dashboard, /dashboard/connect)
│       │   ├── globals.css   # Visual tokens, ambient animations, and custom scrollbars
│       │   ├── layout.tsx    # Root layout and theme/providers setup
│       │   └── page.tsx      # Main redirection entrypoint
│       ├── components/       # Premium glassmorphic reusable components (ConnectWizard, LiveRequestTracker, TraceparentModal, GlassCard)
│       ├── context/          # State providers (DashboardContext.tsx)
│       ├── hooks/            # Custom hooks (useTabs.ts for tab-workspace management)
│       └── middleware.ts     # Edge routing guards redirecting unauthenticated users
│
├── dummy-swagger-backend/    # Self-contained Express mock API for integration validation
│
└── docs/                     # Platform markdown documentation portal
```
