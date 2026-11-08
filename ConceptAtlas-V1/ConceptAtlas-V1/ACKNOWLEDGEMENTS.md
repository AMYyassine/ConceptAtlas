# Acknowledgements

ConceptAtlas draws on **Luminate: Structured Generation and Exploration of Design Space with Large Language Models for Human-AI Co-Creation**, by Sangho Suh, Meng Chen, Bryan Min, Toby Jia-Jun Li, and Haijun Xia. CHI 2024. DOI: https://doi.org/10.1145/3613904.3642400.

- Source repository: https://github.com/project-luminate/luminate/
- Research page: https://luminate-research.github.io/
- Inspected reference commit: `5ad81fb3d08db7ef440a57a37ca30e4dcfa9cf18`
- Original repository copyright: © 2023 project-luminate, MIT License. Included at `THIRD_PARTY_LICENSES/Luminate-MIT.txt`.

The adaptation follows the left editor / right exploration layout, dimension-first generation, categorical axes, filters, bookmarks, and semantic zoom through dots, titles, keywords, summaries, and full text. The project uses its own educational content model, prompts, UI implementation, safe rendering, and local API adapter. Luminate's example API key-in-frontend setup was not reused; ConceptAtlas keeps credentials on the local server.

The linked gradient-descent calculation and learner-controlled guidance are educational prototype extensions. No affiliation with or endorsement by the Luminate authors is implied, and no empirical improvement in learning is claimed.

Runtime UI dependencies: React, React DOM, Scheduler, KaTeX, and Lucide. Their license texts and Vite's license are included in `THIRD_PARTY_LICENSES/`.
