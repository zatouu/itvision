# Ligey AI Vision — Intelligent Service Orchestration Platform (Senegal)

## Context

Ligey is not only a marketplace connecting consumers and service providers.

The long-term vision is to build an AI-powered operational layer for manual services in Africa, starting with Senegal:

* plumbing,
* electricity,
* air conditioning,
* security,
* carpentry,
* painting,
* cleaning,
* appliance repair,
* etc.

The platform must progressively evolve into:

* an intelligent intake assistant,
* a request normalization engine,
* a provider copilot,
* a training and upskilling platform,
* a contextual marketplace for materials and tools,
* and eventually a financial/service infrastructure for informal workers.

The core challenge in Senegal is not only finding providers.
The real problem is:

* poorly structured requests,
* oral communication dominance (voice/Wolof/French),
* low technical formalization,
* inconsistent diagnostics,
* trust issues,
* difficulty estimating price/materials,
* and many providers learning through practice without strong theoretical foundations.

The AI must therefore:

* structure chaos,
* guide both consumers and providers,
* improve service quality,
* reduce failed missions,
* standardize workflows,
* and gradually create a local operational knowledge graph of manual jobs.

---

# High-Level Product Vision

Transform Ligey from:

Consumer ↔ Provider marketplace

into:

AI ↔ Consumer ↔ Provider ↔ Marketplace ↔ Learning ↔ Material Suppliers

The AI becomes the operational brain of the ecosystem.

---

# Core AI Modules

## 1. AI Intake & Request Normalization Engine

### Objective

Convert unstructured user inputs into structured service requests.

The AI must accept:

* text,
* voice notes,
* images,
* videos,
* mixed multilingual inputs (French/Wolof).

The AI should:

* detect the service category,
* infer subcategory/problem type,
* ask dynamic follow-up questions,
* evaluate urgency,
* estimate probable causes,
* identify required tools/materials,
* and generate a normalized mission brief for providers.

### Example Flow

User:
“My AC no longer cools.”

AI asks:

* brand/model?
* strange noise?
* leakage?
* when did it start?
* split or standing unit?
* photo/video available?
* error code?

Then generate structured JSON:

```json
{
  "category": "climatisation",
  "subCategory": "absence_refroidissement",
  "urgency": "medium",
  "possibleIssues": [
    "low refrigerant gas",
    "dirty filter",
    "compressor issue"
  ],
  "requiredTools": [
    "multimeter",
    "manifold gauge"
  ],
  "estimatedDuration": "1-2h"
}
```

The provider receives:

* a clear,
* enriched,
* contextualized request.

---

# 2. AI Voice Layer (Critical for Senegal)

The platform must heavily support voice-based interactions.

Many users:

* are more comfortable speaking,
* use Wolof/French mixtures,
* cannot describe technical problems in writing.

Pipeline:

Voice Note
→ Speech-to-Text
→ Language Detection
→ Intent Extraction
→ AI Clarification Questions
→ Structured Mission

Recommended stack:

* OpenAI Whisper,
* Deepgram,
* or local models later.

The system must:

* support Wolof/French mixing,
* handle noisy environments,
* simplify provider understanding.

---

# 3. AI Diagnostic Copilot for Providers

### Objective

Help providers diagnose and execute missions more effectively.

The provider receives:

* AI-generated mission summaries,
* probable causes,
* troubleshooting checklists,
* safety reminders,
* material recommendations,
* estimated duration,
* estimated pricing ranges.

Examples:

* electrical overload detection,
* unsafe installations,
* AC gas leakage indicators,
* plumbing pressure issues,
* inverter compatibility issues.

This transforms Ligey into:

* a real operational assistant,
* not just a listing platform.

---

# 4. AI Learning & Upskilling Engine (“Ligey Academy”)

### Objective

Gradually strengthen practical workers with theoretical and procedural knowledge.

Many workers in Senegal learn through practice.
The platform should:

* reinforce theoretical understanding,
* provide contextual learning,
* teach through real missions,
* progressively certify skills.

The learning must NOT feel academic.

Instead:

* contextual,
* mission-driven,
* practical,
* short-form.

Example:
After completing a plumbing mission, the AI says:

“You worked on a PVC pressure leak. Would you like to understand why certain joints fail after 6 months?”

Then generate:

* mini-lessons,
* diagrams,
* videos,
* quizzes,
* troubleshooting guides,
* safety procedures.

Possible outputs:

* skill levels,
* badges,
* internal certifications,
* provider progression scores.

Potential future module:
“Ligey Academy”.

---

# 5. AI-Powered Material & Tool Marketplace

### Objective

Monetize contextual recommendations.

Based on diagnostics, the AI already knows:

* probable parts,
* required tools,
* consumables,
* replacement components.

The system should recommend:

* materials,
* spare parts,
* consumables,
* protective gear,
* toolkits,
* bundles.

Examples:
AC repair:

* refrigerant gas,
* capacitor,
* filters,
* manifold kit,
* gloves.

Possible flows:

* “Buy now”
* “Reserve at nearby supplier”
* “Delivered before mission”
* “Suggested bundle”

This creates:
services + commerce + logistics integration.

---

# 6. Intelligent Provider Matching

Current matching:

* geographic only.

Future matching:

* competency-based.

The AI should score providers based on:

* similar completed missions,
* success history,
* ratings,
* response quality,
* theoretical progression,
* specialty experience,
* mission complexity handling.

Example:
An inverter AC issue should prioritize providers experienced with inverter systems.

---

# 7. Local Senegal Knowledge Graph

This is the long-term moat.

The platform should continuously build a localized operational dataset including:

* common failures,
* local electrical instability patterns,
* Senelec-related issues,
* climate/environmental effects,
* local materials,
* local terminology,
* Wolof expressions,
* district-specific pricing,
* equipment popularity,
* provider behaviors,
* mission success patterns.

The system should use:

* vector databases,
* embeddings,
* historical missions,
* images,
* reviews,
* provider diagnostics,
* structured metadata.

Over time:
the AI becomes increasingly specialized for African field operations.

---

# Technical Architecture

## AI Orchestrator Layer

Create a dedicated AI microservice:

```text
/api/ai/*
```

Suggested endpoints:

```text
POST /ai/intake
POST /ai/extract-request
POST /ai/diagnose
POST /ai/recommend-materials
POST /ai/generate-learning
POST /ai/provider-score
POST /ai/generate-checklist
POST /ai/estimate-price
```

Architecture:

Mobile Apps
→ Backend API
→ AI Orchestrator
→ LLM + Rules Engine + Vector DB

Important:
Do NOT rely on raw LLM outputs only.

Use:

* rules,
* validations,
* business constraints,
* category workflows,
* confidence scoring.

Example:
If AC age < 1 year:

* suggest warranty possibility,
* adjust repair recommendations.

---

# Recommended AI Stack

## LLM

* OpenAI GPT models initially,
* later optional local/domain fine-tuned models.

## Speech-to-Text

* Whisper,
* Deepgram.

## Embeddings / Retrieval

* pgvector,
* Pinecone,
* Weaviate,
* Qdrant.

## Vision

* image analysis for:

  * electrical panels,
  * leaks,
  * AC units,
  * damage detection.

## Workflow / Orchestration

* LangGraph,
* Temporal,
* custom orchestration layer.

---

# Long-Term Strategic Advantage

The moat is NOT the app itself.

The moat is:

* localized operational data,
* structured field diagnostics,
* multilingual African service workflows,
* provider reputation graph,
* mission outcomes,
* practical knowledge formalization,
* AI-enhanced workforce development.

Ligey should progressively become:

* a trust layer,
* an operational layer,
* a learning layer,
* and eventually a financial + commerce infrastructure for manual workers in Africa.

---

# Suggested AI Roadmap

## Phase 1 — AI Intake

* voice/text/image structured requests,
* dynamic AI questioning,
* provider summaries.

## Phase 2 — AI Diagnostics

* probable causes,
* troubleshooting checklists,
* estimated materials/tools.

## Phase 3 — AI Learning

* contextual micro-learning,
* provider coaching,
* certifications,
* skills graph.

## Phase 4 — AI Marketplace

* contextual material sales,
* supplier integration,
* smart bundles.

## Phase 5 — AI Financial Layer

* provider scoring,
* advances,
* tool financing,
* insurance,
* service guarantees.

---

# Product Philosophy

The system must feel:

* practical,
* lightweight,
* conversational,
* field-oriented,
* mobile-first,
* voice-first,
* adapted to African realities,
* and usable by non-technical populations.

The AI should not replace providers.

It should:

* augment them,
* structure their work,
* improve trust,
* increase professionalism,
* and unlock economic mobility.
