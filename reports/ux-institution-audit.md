# JutJut Practicals: Institution UX and Product Audit

**Perspective:** education institution administrator, course coordinator, or work-integrated-learning (WIL) officer  
**Scope:** current live preview and the implemented Practicals client, tRPC router, data access, and schema. **No application files were changed.**

## Executive conclusion

JutJut Practicals has a credible institutional control model: course pathways govern what is discoverable, an institution approves both opportunities and named students, and final completion requires a supervisor confirmation. This is a strong foundation for institutional confidence because it prevents an opportunity from becoming an automatic academic promise. The user interface also expresses that rule consistently to students and hosts. [1] [2]

The current bottleneck is not the workflow concept but the coordinator operating experience. Institution staff are routed to a student-first hub, then asked to make consequential decisions from abbreviated information with one-click, boilerplate decisions. There is no role-specific landing route, decision workbench, concern queue, capacity control, or practicals performance view. This makes the product viable for a small, low-volume pilot but weak for accountable cohort operations. The highest-value, scope-safe work is to expose the evidence and decision context already captured by the model, collect a coordinator’s actual rationale before committing a decision, and make operational exceptions visible.

## What is working

**Institutional authority is structurally preserved.** An institution must be approved, a staff member must be active, opportunities must have an approved and student-visible pathway review, and the institution—not the host—creates the individual arrangement. Final institutional completion is blocked until the supervisor confirms. These are meaningful guardrails, with tests for the principal gates. [2] [3]

**The operating model is understandable across parties.** The same sequence appears in the landing page and in the student journey: course requirement, approved opportunity, individual institutional approval, commencement, evidence, supervisor confirmation, then institutional completion. The student welcome dialog explicitly says that an approved opportunity is not yet a confirmed placement. [1] [6]

**Core scope data supports a sound review.** A host submission captures business need, work description, deliverables, delivery mode, hours, supervision, accessibility information, payment details, and a safety acknowledgement. Pathways can hold learning outcomes, eligibility, hours, required deliverables, delivery modes, and dates. [2] [5]

**Basic responsive and accessible patterns are present.** The hub uses responsive grids and column-to-row changes, scrollable dialogs on constrained heights, persistent text status labels in addition to colour, labelled fields, keyboard-native controls, clear focus-ring classes, a skip link, and a quiet mode that turns off transitions and animations. [1] [6]

## Priority findings

### 1. The institutional workspace is difficult to discover and starts in the wrong context — **High**

All authenticated users see **Practicals** in the global navigation, but the hub always opens on **My Practicals** and requires an institution user to find and select the third role tab. The role-resolution hook does not check the existing institution membership and cannot route that user to Practicals; it only recognises admin, school-domain, and employer states. The unauthenticated live CTA opens the generic **Student View** sign-in screen, which reinforces the student-first framing. [1] [4] [6]

**Recommendation:** when the existing `institution.auth.status` identifies an approved institution member, default the hub to **Institution Hub** and set it as the role-aware post-login destination. Rename the tab to **Institution workspace** and retain the other two views as clearly labelled cross-party views. This only changes routing and labels around the existing workspace.

**Expected impact:** fewer orientation steps for coordinators and faster first action. Track the proportion of institution sessions that reach an actionable queue and median time from sign-in to first review.

### 2. Review decisions lack the information and deliberate capture required for academic confidence — **Critical**

The opportunity queue shows a title, pathway, business, type, supervisor name, and truncated business need. It does not render the submitted work description, deliverables, scope exclusions, tools, hours, location, delivery dates, payment, accessibility information, safety acknowledgement, or previously recorded review conditions. Yet **Request detail**, **Decline**, and **Approve & open** immediately submit fixed boilerplate notes. The `conditions` field exists in the review API and schema but is never entered in this interface. [1] [2] [5]

The student-matching card likewise shows a truncated statement and offers immediate waitlist, decline, or approve actions with fixed notes; the supported `shortlisted` status is not available in the UI. [1] [2]

**Recommendation:** add an expand/details panel to each existing card and replace each direct decision button with a compact decision dialog. Pre-fill a sensible message, require an editable rationale for decline/request-details/approval, expose conditions, and provide a final confirmation for approval. Add the already-supported **Shortlist** action. Do not add a new workflow: use the current data and mutations.

**Expected impact:** more defensible decisions, fewer inappropriate placements reaching students, and better host remediation. Measure request-for-information rate, approval reversal/cancellation rate, decision time by state, and the percentage of decisions containing a coordinator-authored rationale.

### 3. Governance roles are recorded but not enforced or explained — **High**

Institution members have `admin`, `coordinator`, and `wil_officer` roles, but the institution middleware only checks that a membership is active and that the institution is approved. It does not inspect the member role before allowing pathway publication, all review outcomes, or final completion. The interface does not show who is logged in, who made prior decisions, or the responsibility of each role. [2] [5]

**Recommendation:** define and enforce a small permission matrix against the roles already in the schema, and show the current role plus reviewer/approver name and timestamp on existing cards. At minimum, separate configuration and member administration from course decisions if that reflects the institution’s current policy; preserve the present behaviour until an explicit policy is selected.

**Expected impact:** clearer accountability and lower risk of unintended academic decisions. Track decision attribution completeness and the number of decisions made outside the designated role after policy configuration.

### 4. Cohort and capacity coordination are nominal rather than operational — **High**

The model supports `cohort_brief` and records `maxParticipants`, but the review and application logic does not check capacity, allocate students or teams, or present open places. Approving one application changes the opportunity to `matching`, but does not use `maxParticipants`; a coordinator cannot see applicant volume, remaining capacity, timetable dates, or an at-risk cohort list. In the UI, cohort briefs are only another type label. [1] [2] [5]

**Recommendation:** in the current lists, display capacity, submitted/approved application counts, and pathway dates. Before approving a match, warn when capacity is reached and prevent approval beyond it. For `cohort_brief`, group applications by opportunity and label the unit of capacity exactly as currently supplied (students or teams). This is a bounded use of existing fields, not a new scheduling system.

**Expected impact:** fewer over-allocation errors and less spreadsheet reconciliation. Measure capacity exceptions, applications per open place, placement fill rate, and time to fill each pathway.

### 5. Exceptions and completion are not managed as institution-owned work queues — **Critical**

Students can raise safety, wellbeing, conduct, and scope-change concerns; the schema includes assignment, resolution, and timestamps. However, the institution router exposes no query or mutation for concerns, and the institution screen contains no concern queue. A submitted concern only gives the student a toast that it has been recorded. [1] [2] [5]

Completion approval also exposes only a status, student, host, and pathway. Clicking **Confirm completion** sends an automatically generated outcome summary rather than allowing the coordinator to inspect the student reflection, supervisor feedback, milestone evidence, or record an outcome in the interface. [1] [2]

**Recommendation:** add a compact **Exceptions** card to the existing dashboard for open concerns with assignee, age, status, and a link to the record; then expose the existing assignment/resolution fields through institution-scoped endpoints. Expand the completion card to show the already-recorded evidence and use a confirmation dialog with an editable outcome summary. Add no automated risk decisioning.

**Expected impact:** fewer unowned student safety issues and more credible academic completion records. Track open-concern age, time to assignment/resolution, completion approval cycle time, and the percentage of completions with evidence reviewed and a non-template outcome summary.

### 6. Loading, failure, and pending states can misrepresent operational status — **Medium**

The institution hub has a skeleton while institutional status loads, but once authorised, pathways, review queues, applications, proposals, and arrangements default to empty arrays without individual loading or error states. A slow or failed queue can therefore read as “No opportunities awaiting review” or “No student applications are awaiting review.” Mutation errors appear only as transient toast messages. The approval-pending screen explains the block but supplies neither next action nor expected review status. [1]

**Recommendation:** add per-section loading, retry, and “could not load” states before rendering empty states. Keep server error text concise and actionable. In the registration-pending state, show the submitted institution/domain, a status timestamp if available, and a support/contact route; do not promise a review time that the system does not store.

**Expected impact:** fewer missed reviews caused by false-empty views and less support uncertainty. Measure queue-load failures, retry success, and support contacts during pending registration.

### 7. Institutional value cannot yet be demonstrated quantitatively — **Medium**

The institution dashboard’s four numbers are current counts of active pathways and pending review/completion items. There is no practicals analytics endpoint or institution-facing reporting view, even though the records include timestamps that can support basic cycle and completion measures. The public site appropriately labels its case studies as illustrative rather than live data, so it does not compensate with evidence of institutional return. [1] [2] [6]

**Recommendation:** begin with a read-only, pathway-level summary derived from existing timestamps and statuses: volume by workflow state, median time to opportunity review, median time from application to match, commencement rate, completion rate, unresolved concern count/age, and capacity utilisation once capacity checks are added. Define a baseline before describing savings or outcomes externally.

**Expected impact:** institutions can evaluate reduced coordination time and placement throughput rather than relying on anecdote. The minimum ROI scorecard is: coordinator minutes per completed placement, review turnaround, fill rate, completion rate, and concern-resolution time.

## Additional usability, terminology, and accessibility observations

The product uses **pathway**, **opportunity**, **match**, **arrangement**, and **completion** in generally logical sequence, but the word **approval** is reused for platform registration, opportunity suitability, student match, and course completion. Add concise state captions to the existing status badges—such as “Approved opportunity: students may apply” and “Approved match: awaiting commencement”—to reduce ambiguity without renaming the domain model. [1]

The current desktop-to-mobile layout degrades reasonably through stacked actions and responsive grids. However, the institutional role switcher is implemented as three ordinary buttons rather than an announced tablist, and several visible `Label` components are not programmatically associated with their native selects or inputs through matching `htmlFor`/`id` values. Correct these semantics, add `aria-selected` and arrow-key tab behaviour to the switcher, and ensure every field has a programmatic name. This is a small accessibility hardening task that also improves assistive-technology efficiency. [1]

## Recommended implementation order

**First (pilot safety and decision confidence):** add decision dialogs with full submitted detail, editable rationale/conditions, confirmation prompts, and evidence-based completion approval; then expose and triage concerns. **Second (coordinator efficiency):** default authorised staff to their workspace, make each queue’s loading/error state truthful, and surface attribution. **Third (operational proof):** enforce capacity, add cohort summaries, and publish the internal ROI scorecard.

## References

[1]: file:///home/ubuntu/stepone-prototype/client/src/pages/PracticalsHub.tsx "Practicals Hub interface implementation"
[2]: file:///home/ubuntu/stepone-prototype/server/routers/practicals.ts "Practicals tRPC authorization and workflow router"
[3]: file:///home/ubuntu/stepone-prototype/server/practicals.test.ts "Practicals permission and approval-gate tests"
[4]: file:///home/ubuntu/stepone-prototype/client/src/hooks/useUserRole.ts "Role detection and post-login routing"
[5]: file:///home/ubuntu/stepone-prototype/drizzle/schema.ts "Institutions, practicals, reviews, arrangements, and concern data schema"
[6]: https://3000-ibfdd3hzjp45sbbpkty00-5d2c4808.sg2.manus.computer "Current JutJut preview and Practicals entry experience"
[7]: file:///home/ubuntu/stepone-prototype/client/src/index.css "Global responsive, motion, colour, and focus styling"
