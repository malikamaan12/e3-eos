# Architecture Decision Record (ADR): 01 Runtime Baseline

**Status**: Standardized / Accepted  
**Applies To**: EOS v1.0 Core Platform (Web, API, Worker, Shared Packages)  
**Effective Date**: September 2026  
**Review Cycle**: Semi-Annual (Next Review: Q1 2027)

---

## 1. Executive Summary

E3 Enterprise Event Operating System (EOS) standardizes its production, staging, and container execution baseline on **Node.js 22 LTS (Active LTS / Codename "Jod")**.

This decision provides enterprise stability, high-throughput asynchronous I/O, native ECMAScript Modules (ESM) resolution, modern V8 optimizations, and strict security compliance for all Cloud Run microservices deployed to Google Cloud Doha (`me-central1`).

---

## 2. Upstream Lifecycle & Support Schedule

| Milestone | Date / Version | Status | Operational Impact |
| :--- | :--- | :--- | :--- |
| **Initial Release** | April 2024 (`v22.0.0`) | Historical | Initial feature freeze |
| **Active LTS** | October 2024 (`v22.x`) | Current Baseline | Primary target for EOS v1.0 |
| **Maintenance LTS** | October 2025 | Scheduled | Security fixes and critical patches only |
| **Upstream End-of-Life (EOL)** | **April 30, 2027** | Final Cutoff | Upstream Node.js team ceases all support |
| **EOS Upgrade Target** | **Node.js 24 LTS** | Roadmap Item | Production upgrade window: Q4 2026 – Q1 2027 |

---

## 3. Toolchain & Environment Specifications

1. **Package Management**:
   - `pnpm >= 9.15.x` utilizing workspace monorepo linking (`pnpm-workspace.yaml`).
   - Strict peer dependency resolution and frozen lockfile verification (`pnpm install --frozen-lockfile`).

2. **Module Resolution**:
   - Native ESM (`"type": "module"`) across all monorepo packages.
   - TypeScript 5.4+ compiler configured with `"moduleResolution": "NodeNext"` and `"target": "ES2022"`.

3. **Container Baseline (Cloud Run)**:
   - Base Images: `node:22-alpine` (API / Worker) and `caddy:alpine` / multi-stage `node:22-alpine` (Web).
   - Minimal attack surface: Non-root execution (`USER node`), zero extraneous compilers in runtime images.
   - Resource Quotas: 1 vCPU, 512MiB memory per instance with horizontal auto-scaling (0–10 instances).

4. **Database & Runtime Drivers**:
   - Native TLS connection pooling via `pg` (`pool`) to Google Cloud SQL PostgreSQL 16.
   - Cryptographic hashing using native Node.js `node:crypto` (`sha256`, `scrypt`, `randomUUID`).

---

## 4. Roadmap Upgrade Strategy (Node 22 LTS → Node 24 LTS)

To ensure zero operational disruption prior to the April 2027 EOL cutoff:

1. **Q3 2026**: Continuous testing of development builds against Node 24 Current.
2. **Q4 2026**: Node 24 enters Active LTS; staging deployment canary validation on Cloud Run (`me-central1`).
3. **Q1 2027**: Formal EOS production upgrade to Node 24 LTS, 3 months ahead of Node 22 EOL.

---

## 5. Enforcement & Compliance

- **`package.json` Engine Guard**:
  ```json
  "engines": {
    "node": ">=22.0.0 <23.0.0",
    "pnpm": ">=9.0.0"
  }
  ```
- **CI / CD Validation**: Cloud Build pipeline validates engine constraints on every commit before container image tagging.
