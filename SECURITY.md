# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in TCodeAI, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email the maintainers at the address listed in the repository profile, or
2. Use [GitHub's private vulnerability reporting](https://github.com/aiadiguru2025/tcodeai/security/advisories/new)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix & Disclosure**: We aim to release a fix within 30 days of confirmation

### Security Measures in Place

This project implements the following security controls:

- **Input Validation**: All API inputs validated with [Zod](https://zod.dev/) schemas
- **SQL Injection Prevention**: Parameterized queries via Prisma ORM; raw SQL uses validated inputs
- **XSS Protection**: User text sanitization on all user-facing inputs
- **Content Security Policy**: Strict CSP headers via `next.config.js`
- **HTTP Security Headers**: HSTS, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy
- **LLM Prompt Injection Hardening**: Query sanitization before LLM calls
- **Error Handling**: Sensitive error details are never exposed to clients
- **Rate Limiting**: Configured at the infrastructure level (Vercel)
- **Dependency Auditing**: Regular `npm audit` checks

### Scope

The following are **in scope**:

- Application code in `src/`
- API routes in `src/app/api/`
- Database queries and ORM usage
- Authentication/authorization logic
- Client-side data handling

The following are **out of scope**:

- Third-party services (Vercel, Supabase, OpenAI)
- Denial-of-service attacks
- Social engineering

Thank you for helping keep TCodeAI secure.
