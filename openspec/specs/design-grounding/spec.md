# design-grounding Specification

## Purpose
Keeps stages Q and D grounded in how the feature works for the user and how the
external service expects to be integrated, and keeps their artifacts short
enough for a human to review properly.

## Requirements
### Requirement: Designer writes a Reference flow before decisions for common flows and external integrations
The designer agent MUST, when a change implements a commonly built product flow
(checkout / online payment, sign-up / login / password reset, email verification,
invitations, file upload, notifications, data export) or integrates an external
service, write a `### Reference flow` subsection inside `## Context` before any
decision, holding: the vendor's recommended integration pattern read from its own
documentation with the doc URL cited; the screen-by-screen user journey including
cancel, failure, pending settlement, tab closed, callback late or missing, and
retry; and any deviation from the common pattern with its reason. When neither
applies it MUST say so in one line in `## Context`. The designer agent MUST carry
the `WebFetch` and `WebSearch` tools, and `openspec-templates/design.template.md`
MUST carry the subsection.

#### Scenario: payment integration design
- **WHEN** the designer writes `design.md` for a change adding hosted online payment
- **THEN** `## Context` contains `### Reference flow` citing the provider's integration docs and covering the return page, the pending state, the webhook as source of truth and verify-on-return, before `## Decisions`.

#### Scenario: internal-only change
- **WHEN** the change has no user-facing flow and no external service
- **THEN** `## Context` states in one line why the Reference flow is skipped.

### Requirement: design.md is capped at 250 lines and 8 numbered decisions
The designer agent MUST keep `design.md` to at most 250 lines and at most 8
numbered decisions, MUST list choices that only follow an existing codebase
convention or the vendor's recommended pattern as one-line bullets under
`### Conventions followed` instead of numbering them, and MUST propose splitting
the change under "Open questions for the human" when more than 8 real decisions
remain. The design template MUST carry the cap and the `### Conventions followed`
subsection.

#### Scenario: over-long design
- **WHEN** a draft design has 15 numbered decisions, 7 of which restate existing conventions
- **THEN** those 7 become `### Conventions followed` bullets and the remaining decisions stay at or under 8.

### Requirement: Questioner caps question count and asks about the user journey
The questioner agent MUST generate 10–25 questions with a hard cap of 30, and
MUST add a `## User journey & external services` section when the change has a
user-facing flow or integrates an external service, asking at least: the vendor's
recommended integration pattern, what the user sees on each unhappy path, and how
the flow is tested against the real service rather than only a stub.

#### Scenario: payment change questions
- **WHEN** the questioner writes `questions.md` for an online-payment change
- **THEN** it holds at most 30 questions and includes a `## User journey & external services` section covering the provider's pattern, unhappy paths and real-provider testing.
