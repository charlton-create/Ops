// CS Support Policy — canonical reference document.
// Seeded as a kb_documents row with category "CS Policy".

export const CS_POLICY_CONTENT = `# CS Support Policy

## 1. Purpose & Scope

This policy governs all customer support interactions for the CAT-I.AI platform. It establishes protocols for issue classification, response standards, escalation procedures, and resolution tracking to ensure every customer receives consistent, timely, and high-quality support.

**Scope:** All CAT-I.AI modules (CAT-I Base, CAT-MES, CAT-QT, CAT-SCAN, CAT-ALOG) and all customer segments.

---

## 2. Support Tier Definitions

### L1 · Training & Knowledge — SLA: 4 hours
Covers: How-to questions, feature navigation, report interpretation, user setup, training gaps, documentation requests.

### L2 · Isolated Technical — SLA: 24 hours
Covers: Module bugs, login/access failures, data entry errors, export problems, single-customer integration failures.

### L3 · Critical / Multi-Customer — SLA: 2 hours
Covers: System outages, multi-tenant failures, data corruption, security incidents, compliance risk events, API failures.

---

## 3. L1 AI Auto-Response Protocol

The L1 AI Quick Answer system provides instant, 24/7 responses to training and knowledge questions.

- **AI Scope:** Limited strictly to CAT-I.AI features, workflows, and navigation.
- **AI-to-Human Handoff:** If the AI cannot resolve within 2 exchanges, it recommends submitting an L2 ticket.
- **CS Agent Review:** All AI-resolved tickets are spot-checked weekly.

---

## 4. L2 Isolated Issue Protocol

1. Acknowledge within 2 hours.
2. Reproduce in staging within 4 hours.
3. Root cause diagnosed and logged.
4. Resolve or escalate to L3.
5. Customer notified with fix documentation.
6. Close after confirmation or 48-hour window.

---

## 5. L3 Critical Issue Protocol

1. Automated alert to Dev Team within 5 minutes.
2. Incident Commander assigned.
3. All affected customers notified within 30 minutes.
4. Status updates every 30 minutes.
5. Parallel workstreams: comms, engineering, QA.
6. Full incident summary within 24 hours.
7. Post-mortem within 5 business days.

---

## 6. Ticket Lifecycle

\`OPEN → IN-PROGRESS → ESCALATED → RESOLVED → CLOSED\`

Each status has defined entry/exit criteria and auto-notifications configured in Admin Settings → Ticketing.

---

## 7. Escalation Policy

- **L1 → L2:** Software malfunction, AI cannot resolve after 2 exchanges.
- **L2 → L3:** Multi-customer impact, data integrity risk, emergency deployment.

Escalation reminder emails are configured in **Admin Settings → Ticketing → Escalation Reminders** with time-based triggers per level.

---

## 8. Metrics & KPIs

| Tier | SLA Target | Compliance Goal |
|------|------------|-----------------|
| L1   | 4 hours    | ≥95%            |
| L2   | 24 hours   | ≥90%            |
| L3   | 2 hours    | ≥98%            |
| CSAT | n/a        | ≥4.2 / 5.0      |

**AI Auto-Resolution Target:** >70% of L1 tickets resolved without agent intervention.
`;
