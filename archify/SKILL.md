---
name: archify
description: "Create validated architecture, workflow, sequence, data-flow, lifecycle/state, ERD, class, tree, timeline, and waterfall diagrams as explorable standalone HTML with dark/light themes, motion and image/SVG/WebM export. Accept requirements or Mermaid; inspect repository evidence for code-backed diagrams. Use when visualizing systems, API calls, pipelines, schemas, histories, timings, or everyday steps, parts, relationships and states. Also turn an answer into a one-page explainer, with the conclusion first, structured panels, native diagrams and charts, when the user asks for a page, an explainer or an answer to share (做成一页, 用页面讲), or proactively when the user's rules opt in with an [archify explainer: ...] line. Not for dashboards."
license: MIT
metadata:
  version: "3.2"
  author: tt-a1i
---

# Archify

Create checked standalone HTML as a native diagram or a one-page explainer that answers a question.

Run commands from your working directory. Unless the user names another location, give each new artifact request its own folder `.archify/<type>-<slug>-<YYYYMMDD-HHMMSS>/` there (local time, chosen once): keep the candidate and `<slug>.html` in it and reuse it for repairs. Native diagrams use `candidate.json` with `meta.output` relative to the working directory; explainers may use `candidate.archify.md` and a portable output filename. A later request gets a new folder. Replace `bin/archify.mjs` in every command with the installed package's absolute path, or its path relative to your working directory; CLI input and output paths resolve from that directory.

For a native diagram of a real codebase, read [Repository authoring](references/repository-authoring.md) while tracing the requested behavior. A supplied candidate can go straight to verification.

## Choose the artifact

- When the user asks to draw or visualize a system, flow, schema or history, use a native diagram and the Type router.
- Use `explainer` when the user asks for the answer as a page: a page, one page, an explainer, something to share (“做成一页”, “用页面讲”, “answer with a page”). Without such a request, answer in text or draw the requested diagram. A page made on request ends its reply with the one-line mode offer under Output.
- A rules line in context changes this. `[archify explainer: proactive]`: also make a page, unasked, for an explanation, comparison, trade-off, decision, diagnosis, review or plan that needs a table, steps or several sections. `[archify explainer: always-on]`: every reply that reaches a conclusion also gets a page sized to the answer, delivered without opening it, its link closing the reply. `[archify explainer: on-demand]`: only when asked, and never offer a mode.
- In every mode a page needs a conclusion with some structure behind it: chat, one-line answers, raw command output and text-only requests get none.
- For `explainer`, read [Explainer authoring](references/explainer-authoring.md) for its conclusion, reasons, scope, board layout and optional native diagrams. Verify the draft with `finalize explainer`. A panel patch is available for local content revisions.

## Existing candidate handoff

A frozen candidate can be verified in one `finalize` invocation. Keep its bytes unchanged while the command runs. A passing receipt covers the automated gates for those bytes. See [Delivery](#delivery) for visual review.

## Native diagram authoring

Start from the question the reader needs answered, its scope, and the supplied facts. Choose the type and level of detail that preserve the requested responsibilities, relationships, conditions and evidence. The [Type router](#type-router), examples and [Authoring defaults](references/authoring-defaults.md) are optional aids. The mode schema and shared schema define the accepted fields and values. An example supplies no facts about the user's system.

For a repository-backed diagram, ground claims in inspected source at the pinned revision. For a supplied description, retain its uncertainties. The [authoring contract](references/authoring-contract.md) explains how each renderer represents topology and where it needs an alternative. When a single view cannot faithfully show the requested facts, use complementary views, notes or a table that identify the connections between them. Name any remaining gap.

Use `showcase` for presentation-quality checks or `standard` for a dense view such as a complete physical schema. Set `meta.quality_profile` and select the matching command-line quality. A physical-schema ERD includes every requested column, SQL type, source comment, key role and foreign-key target. See [ERD](references/authoring-contract.md#erd) for table and domain layout.

A single command verifies and delivers the candidate:

```bash
node bin/archify.mjs finalize <type> <candidate.json> <output.html> --quality showcase --json
```

For a repository-backed candidate, add `--repo-root <repo-root>`. A passing native receipt covers `validate`, `deliver`, strict `check` and `browser-check`. A non-zero exit is never success. [Repair the failed gate](references/delivery-contract.md#failed-finalize-and-candidate-repair) from the reported subject and evidence. Verify the revised candidate. Use a fresh evidence directory for changed bytes when earlier browser evidence already exists.

## Update awareness

`finalize` and standalone `deliver` include `update` in their receipts. Do not run a separate check for the same delivery. If `update.noticeRequired` is true, read `references/update-awareness.md` and keep one compact update notice in your final response to the user, even after a quality gate fails. For a task with several diagrams, mention the update once in the final response. Snooze or ignore a reminder only when the user explicitly asks; never install or update on your own initiative.

## Type router

| Type | Use for | Schema | Example |
|---|---|---|---|
| `architecture` | Components, services, cloud/security boundaries, infrastructure; what something everyday is made of | `schemas/architecture.schema.json` | System descriptions, services, libraries, and CLI repos: `examples/web-app.architecture.json`; deployment repos: `examples/production-deployment.architecture.json` |
| `workflow` | Processes, approval gates, tool calls, runbooks, CI/CD; plans and step-by-step life processes | `schemas/workflow.schema.json` | `examples/agent-tool-call.workflow.json` |
| `sequence` | API call chains, request lifecycles, async traces, returns; back-and-forth between people | `schemas/sequence.schema.json` | `examples/cache-miss-request.sequence.json` |
| `dataflow` | Pipelines, ETL/ELT, lineage, governance, consumers; where money or documents go | `schemas/dataflow.schema.json` | `examples/product-analytics.dataflow.json` |
| `lifecycle` | State/status transitions, retries, waiting and terminal states; where an application or order stands | `schemas/lifecycle.schema.json` | `examples/deployment-release.lifecycle.json` |
| `erd` | Tables/entities, attributes, primary/foreign/unique keys, cardinality between them | `schemas/erd.schema.json` | `examples/orders.erd.json` |
| `tree` | Single-parent containment: repository/module trees, capability or feature breakdowns, org-style decomposition | `schemas/tree.schema.json` | `examples/payment-platform.tree.json` |
| `class` | Classes, interfaces, selected members, and dependency/association/inheritance/realization/composition between types | `schemas/class.schema.json` | `examples/payments.class.json` |
| `timeline` | When things happened: incident reviews, release histories, timestamped events on a proportional clock with source lanes | `schemas/timeline.schema.json` | `examples/payment-incident.timeline.json` |
| `waterfall` | Where the time went: span durations, overlap, and nesting of one request or agent run on a common time axis | `schemas/waterfall.schema.json` | `examples/checkout-request.waterfall.json` |

If a recipe would help choose a native type, try `node bin/archify.mjs guide "<scenario>" --json`. Use the user’s original question and evidence to decide which suggested elements belong.

For an everyday subject, keep the same diagram modes and semantic types, then name them for the reader: use everyday `icon` values and `meta.legend` labels as in [Node icons](references/authoring-contract.md#node-icons). Ask for missing personal facts instead of inventing dates, amounts, or rules.

## Mermaid input

Read Mermaid for topology and meaning, then author fresh Archify JSON; do not mechanically render Mermaid styling.

- `flowchart` / `graph` → `workflow`, or `architecture` for a component map.
- `sequenceDiagram` → `sequence`; participants become semantic participants and arrows become messages.
- `stateDiagram` → `lifecycle`; states and transitions retain meaning, not Mermaid style.
- `erDiagram` → `erd`; entity and relationship names, keys, and cardinality retain meaning, not Mermaid style.
- `classDiagram` → `class`; type kinds, selected members, and relationship kinds retain meaning, not Mermaid style.

## Delivery

`finalize` stops at the first non-passing gate. Its compact stdout and `<output-stem>.finalize-summary.json` are ordinary evidence. A passing run creates no screenshots and reports `visualReview: "not-requested"`.

Layout recommendations on a passing artifact are advisory. If an Architecture crossing obscures the relationship, [Architecture layout repair](references/architecture-layout-repair.md) describes available placement and routing options. If fixed Sequence columns leave unused space, see [Sequence width review](references/delivery-contract.md#sequence-width-review). Preserve user-fixed geometry, all meaningful labels and source evidence. [Review evidence paths](references/delivery-contract.md#a-new-candidate-at-an-existing-output-path) explains how to compare different candidates safely.

Perceptual review is optional for ordinary generation, including a newly positioned Architecture. Use [Optional capture evidence](references/delivery-contract.md#optional-capture-evidence), with `--out-dir <folder>/visual-check`, when the user requests visual review, during development audits, or for a concrete route/browser concern. `visualReviewRecommendation` is advisory. Inspect captures before claiming visual quality; qualify any check claim as automated when perceptual review has not occurred.

Read [Delivery contract](references/delivery-contract.md) for failed gates, standalone commands, provenance/recovery, repeated delivery, exports, or opening. Native diagram recovery follows `deliver` → strict provenance `check` → `browser-check`; captures require strict provenance. Explainer delivery uses validate, deliver and check as described in its authoring guide.

For workflow viewport overflow, [Workflow viewport repair](references/authoring-contract.md#workflow-viewport-repair) explains the lane measurements.

When reporting verification details, distinguish artifact checks, browser evidence, captures, and actual perceptual review. For an explicitly requested immediate preview or active desktop loop, see [Optional opening](references/delivery-contract.md#optional-opening).

## Optional viewer capabilities

Live motion is enabled by default for every rendered diagram; omit `meta.animation`. The Viewer’s Live/Still button controls playback.

Read `references/viewer-runtime.md` only when the user explicitly asks for Share Cards, Route/Reach cards, motion, deep links, presentation, search/focus, or another Viewer Runtime feature.

## Setup and fallback

No install is required inside the skill package. For setup diagnosis, verify with:

```bash
node bin/archify.mjs doctor
node bin/archify.mjs demo <output-directory>
```

For native diagrams, when shell access is unavailable, hand-place architecture SVG into `assets/template.html`, use CSS semantic classes rather than inline colors, and follow the visual review contract in `references/delivery-contract.md`. Explainers require their renderer and real delivery gates; if those are unavailable, report the limitation and give a text answer when useful, without claiming HTML delivery.

## Output

Reply in the user's language, as briefly as the result allows; the diagram carries the content, so a single diagram usually needs one line.

- Lead with a clickable Markdown link to the HTML: a descriptive title, not the file name, and its absolute path, wrapped in `<...>` when it contains spaces.
- When the user wants to understand a system or codebase rather than draw a described subject, give the takeaway the reader needs. Skip sentences that only restate what the diagram obviously shows.
- State anything that changes how the diagram should be read: the abstraction level or deliberately omitted parts when a reader might expect them, illustrative rather than measured values, missing source evidence, or an unresolved limitation affecting the request.
- For several diagrams, report completion once with a link to an existing overview or compact per-diagram links, not a directory path.

Do not recap commands, repair rounds, hashes, quality profiles, or check lists; they stay in the receipts. If asked whether the diagram was verified, answer in one line, such as “Automated checks passed; not visually reviewed.” Give receipt links and details only for reproducibility or troubleshooting. Disclose requested visual review that could not run, and claim visual inspection only when performed. Keep the required update notice under Update awareness.

Example: `Created [Checkout request timing](/abs/path/checkout-timing.html). Durations are illustrative, not measured.`

For an explainer, give the conclusion and the page link. Mention gates only when one failed or writing warnings remain; do not paste the draft.

After an explainer made on request, when no `[archify explainer: ...]` line is in context, end the reply with one optional line offering the proactive mode, once per conversation, for example: “需要的话，以后遇到解释、对比、排查这类问题，我可以主动做成这样的页面，要开启吗？” If the user accepts, add `[archify explainer: proactive] Make an Archify explainer page, unasked, for explanations, comparisons, decisions, diagnoses, reviews and plans that need a table, steps or several sections.` to the global rules file of the current agent (such as `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` or `~/.config/devin/AGENTS.md`) and name the file; deleting the line turns it off. If the user declines, offer to add `[archify explainer: on-demand]` so the question does not return.
