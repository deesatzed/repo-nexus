# Branching Strategy

**Model:** Trunk-based development (solo developer)

**Rules:**
- All work on main branch
- Commit frequently with descriptive messages
- Use conventional commit format: type(scope): message
- Types: feat, fix, refactor, test, docs, chore

**Commit Message Template:**
```
<type>(<scope>): <subject>

<body>

Fixes: <UX-NNN>, <A11Y-NNN>
WCAG: <criterion> (Level A/AA)
ICE: <score>

Testing:
- <test type>: <result>

ESLint a11y violations: <before> → <after>
```

**Examples:**

```
fix(a11y): add aria-labels to form inputs

All form inputs now have programmatic labels via htmlFor/id
association. Search input uses sr-only label.

Fixes: UX-003, UX-004, A11Y-002
WCAG: 1.3.1 Info and Relationships (Level A)

Testing:
- Screen reader: All inputs announce correctly ✓
- Keyboard nav: Tab order correct ✓

ESLint a11y violations: 18 → 12
```

**Pre-commit checks:**
- npm run lint (after Phase 1)
- npm test (after Phase 3)
- ./scripts/check-drift.sh (drift prevention)
