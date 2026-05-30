# Agency Agreement — Protective Clauses (DRAFT)

> **Not legal advice.** This is a plain-language starting point to hand to an IP
> lawyer (ideally Israeli, familiar with SaaS + AI). It captures the protections
> discussed for the Visual Lab ↔ agency relationship. A lawyer must adapt it to
> Israeli law, your final commercial terms, and the specific deal.

## Purpose

When Visual Lab is sold to an **agency** (e.g. a PR/creative firm reselling or
operating the tool across its own roster of ~200 end-clients), these clauses
reduce the risk that the customer reverse-engineers, clones, or rebuilds the
product, and clarify ownership and confidentiality. The real moat is execution +
data lock-in + speed — these clauses are the contractual *backstop*, not the
whole strategy.

---

## 1. Definitions (sketch)

- **"Platform"** — the Visual Lab software, APIs, UI, models integration, and all
  underlying prompt-construction logic and methodology.
- **"Confidential Information"** — non-public information disclosed by Visual Lab,
  including the prompt-engineering methodology, system prompts, brand-consistency
  techniques, architecture, pricing, and roadmap.
- **"Customer"** — the agency.
- **"End-Client"** — the agency's own client served *through* the Platform.
- **"Generated Output"** — images and text produced by the Platform.

## 2. Confidentiality

Customer shall keep all Confidential Information strictly confidential, use it
solely to operate the Platform under this agreement, and not disclose it to any
third party (including End-Clients) except as strictly necessary to use the
service. Survives termination for [3–5] years. The prompt-construction
methodology is expressly designated a **trade secret**.

## 3. No reverse engineering

Customer shall not, and shall not permit any third party to: decompile,
disassemble, reverse-engineer, or otherwise attempt to derive the source code,
underlying prompts, methodology, model configuration, or trade secrets of the
Platform; or probe/scrape the service to reconstruct its internal logic
(including systematic prompt extraction or output harvesting to train a
competing model).

## 4. No competing product / non-circumvention

During the term and for [12] months after, Customer shall not, directly or
indirectly, design, build, fund, or commercially launch a product that
substantially replicates the Platform's core functionality (brand-consistent
AI image generation) using knowledge, access, or Confidential Information gained
under this agreement. (Scope/duration must be tuned by counsel for
enforceability under Israeli law — overly broad non-competes are often
unenforceable.)

## 5. License grant & restrictions

Visual Lab grants Customer a non-exclusive, non-transferable, revocable license
to access and use the Platform for the term, solely to provide services to
End-Clients. No right is granted to sublicense, resell as a standalone product,
or white-label except as expressly agreed in a separate white-label addendum.

## 6. Ownership

- **IP in the Platform** (software, methodology, prompts, models integration)
  remains exclusively Visual Lab's. Nothing transfers ownership.
- **Customer inputs** (brand references, descriptions, briefs): Customer retains
  ownership and grants Visual Lab a license to process/store them to provide the
  service.
- **Generated Output**: Customer/End-Client receives a broad, perpetual license
  to use the Output for commercial purposes. (Note the separate, real issue that
  purely AI-generated output may not be copyrightable — do **not** promise
  exclusive copyright ownership of raw outputs.)

## 7. Customer representations & indemnity (flows *to* Visual Lab)

Customer represents that it (and its End-Clients) hold all necessary rights in
uploaded reference material and any depicted persons (likeness/consent), and
will not use the Platform to infringe third-party IP, generate protected
characters/marks, or violate the Acceptable Use Policy. Customer indemnifies
Visual Lab against claims arising from Customer/End-Client inputs and use.

## 8. Acceptable Use Policy (incorporated by reference)

Prohibits: generating infringing content (copyrighted characters, third-party
logos/marks), non-consensual likenesses, and unlawful/abusive content; bulk
scraping; and any attempt to reconstruct the Platform's internals.

## 9. Audit & enforcement

Material breach of §§2–4 entitles Visual Lab to immediate suspension/termination
and injunctive relief (acknowledging that breach of trade-secret/IP terms causes
irreparable harm for which damages alone are inadequate).

## 10. Data & exit

On termination, Customer may export End-Client data within [30] days; Visual Lab
retains no obligation to provide the methodology or any derived models. (Data
portability for the *customer's own* content is good faith; the **Platform's**
know-how stays with Visual Lab.)

---

## What actually protects you (reminder beyond the contract)

1. **Server-side secret sauce** — keep prompt construction (`brand-prompt.ts`,
   `gemini.ts`) server-only; never expose system prompts in API responses or demos.
2. **Data flywheel** — references + ratings + per-brand history create switching
   cost. Ship this fast.
3. **NDA before deep demos**; show outcomes, not internals.
4. **Trademark** the "Visual Lab" name.
5. **Speed** — out-execute any side-project clone.

## Open questions for counsel

- Enforceable scope/duration of the non-compete (§4) under Israeli law.
- Whether to require a separate signed **NDA** pre-sales vs. relying on the MSA.
- White-label addendum terms (if agencies resell under their own brand).
- Interaction with the upstream model provider's (Google/Gemini) commercial
  terms and any indemnity they provide for outputs.
