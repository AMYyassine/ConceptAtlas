# ConceptAtlas V1 — Educational exploration, inspired by Luminate

This revised V1 starts with **a learning question**, generates **dimensions and explanations with an LLM**, and lets the learner explore them on a **zoomable canvas**. The visual layout follows Luminate's central interaction structure: a reading / writing panel on the left, a dimensional exploration space on the right, categorical axes and filters, and five semantic zoom levels.

The earlier fixed simulator has become a connected educational example inside this exploration space. The interface and teaching content are in English.

## Start with real AI generation

1. Extract the entire ZIP into a folder.
2. Install **Python 3.11 or newer** if needed. On Windows, `py` or `python` must be available.
3. Double-click **START_CONCEPTATLAS.bat**. First launch installs the Python server dependencies in a local `.venv` and requires an internet connection.
4. When the browser opens, click the **AI settings** gear in the upper-right corner.
5. Enter your provider's API base URL, an actual model ID available to your account, and your API key. Click **Save AI connection**.
6. Write a question such as **“Help me understand gradient descent.”** in the bottom-left input, then press the arrow.

The app first requests topic-appropriate dimensions. Once these are returned, they appear immediately in the interface while the second request generates the explanations. Choose 6, 12, or 18 explanations; 6 is a useful starting point with a slower model or restrictive provider limits.

The **AI configured** status means settings have been supplied, not that the provider has accepted a request. The first generation verifies the credentials and model. Authentication, rate-limit, validation, and timeout errors are shown without substituting fake generated content.

On macOS / Linux:

```bash
python3 launch.py
```

Keep the terminal open. Press Ctrl+C there to stop the server. If port 8000 is occupied, use `python launch.py --port 8001` (or `python3`). The prebuilt interface is included, so Node.js is not needed just to run the app.

## Prepared example without an API key

Double-click **START_DEMO.bat**, or run:

```bash
python3 launch.py --demo
```

Click **Open the prepared gradient-descent example**. This opens 12 authored explanations across Perspective, Learning depth, and Learning focus. They demonstrate the canvas, zoom, filters, bookmarks, notes, guidance, and linked simulation.

This mode needs only Python's standard library and the supplied files. It makes no AI requests. **Prepared example** is displayed explicitly. Asking about a new topic requires the full server and your own AI configuration; it does not silently return a canned answer.

Do not double-click `dist/index.html`; use a launcher so the browser can load application assets correctly.

## Explore the space

| Action | Result |
| --- | --- |
| Submit a learning question | AI generates dimensions, then explanations assigned to their values. |
| Select a point or card | Read its full explanation in the left panel. |
| Scroll on empty canvas / use + or − | Zoom in or out around the pointer / center. |
| Use the detail buttons | Switch between dots, titles, keywords, summaries, and full explanations. |
| Drag empty canvas | Pan the exploration space. |
| Double-click empty canvas | Switch between a full explanation view and a dot overview. |
| Change the horizontal or vertical dimension | Reorganize explanations according to their categorical values. |
| Click an axis value or use a dimension filter | Emphasize matching explanations; retain other points faintly for context. |
| Search | Match words in explanation titles, bodies, summaries, or keywords. |
| Bookmark | Save interesting explanations; the bookmark filter shows their locations. |
| Generate more here | Add explanations satisfying the active dimension filters. Text search is a display filter and is not a generation constraint. |
| Add a dimension (+ beside filters) | AI generates values for a new lens and classifies every existing explanation. It does not rewrite the explanation bodies. |
| My notes | Write your own understanding. Optionally include these notes when generating a new space or additional explanations. |
| Guide my exploration | Focus one accessible perspective and move through suggestions; free exploration remains available. |
| Ask about this explanation | Ask the LLM about the selected content and, when applicable, the current simulation. A suggested next card opens only when you choose it. |
| Import / export | Transfer spaces, notes, bookmarks, and the linked simulation as JSON. Keys are never included. |

The lower-left detail controls change the amount of information, not just text size. At high detail, pan to explore nearby explanations or use **Fit all explanations** to regain an overview. Full-text card interiors scroll independently; scroll outside them to zoom.

The horizontal and vertical axes must represent different dimensions. Selecting the dimension currently used by the other axis clears that other axis. Select “No … dimension” on both axes for an ungrouped overview.

Keyboard: Tab to navigate controls; Enter/Space to activate them; Escape closes dialogs; Ctrl+Enter in the learning question submits it. When the canvas itself is focused, +/− zoom and arrow keys pan.

## Connected educational example

When gradient descent is the requested topic, the AI can attach the registered **gradient_descent** module. Its shared example is:

- Objective: `J(w) = (w − 3)²`
- Gradient: `J'(w) = 2(w − 3)`
- Update: `w_next = w − learning_rate × gradient`

The prepared example also uses this module. Taking one iteration in a visual explanation updates every linked mathematical, code, and explanatory block. These changing blocks are computed by the application; they do not wait for a new LLM response. The original generated lesson text remains conceptual and the explicitly labeled **Linked example** block follows the current state.

Try rates 0.1 (steady convergence), 0.8 (oscillating convergence), and 1.1 (divergence). At rate 1, the objective stays unchanged while the point oscillates; at 0.5, it reaches the minimum in one update. These thresholds apply to this particular quadratic. Changing the rate while revisiting an earlier step discards its old future and starts a new continuation.

The simulation stops near a zero gradient, at 150 steps, or before the parameter exceeds the display range. All gradient-descent spaces currently share this one example state. Changing spaces does not reconstruct a different objective. Other topics receive AI-generated text and mathematical/code illustrations; **arbitrary executable simulations or images are not generated in this version**. Generated code is displayed as text and never executed.

## AI configuration and data flow

The backend uses an OpenAI-compatible **Chat Completions** API. For example, Groq's base URL is `https://api.groq.com/openai/v1`; use a model ID currently available to your account. A provider/model must support the requested token budget and reliable JSON output. If the provider explicitly rejects `response_format`, the adapter retries without that option and still validates the result.

Settings entered through the interface remain in the local server's memory. Closing a browser tab does not clear that server process; stopping the server clears in-memory overrides. For configuration across restarts, edit `backend/.env`:

```dotenv
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=your-own-key
LLM_MODEL=your-actual-chat-model-id
```

The model ID above is a placeholder. No API key or model is bundled. The launcher creates `.env` from `.env.example` when needed. Never share `.env` or commit it. The server binds to `127.0.0.1` for local use.

The provider receives the question, selected notes when enabled, dimensions and existing explanation context when needed, and the validated simulation snapshot for a contextual tutor question. Provider charges and limits depend on your account. Saving settings alone does not invoke generation.

A new space normally uses two requests: dimensions, then cards. Adding a dimension, generating more cards, or asking the tutor uses a further request. Cancellation stops the browser from using the result; a provider request already sent may still complete or count toward usage.

Server validation checks JSON structure, unique dimension values, allowed dimension assignments, filter compliance, and complete reclassification of cards. This does not prove the educational claims are correct. Check generated explanations against course materials.

## Storage and limits

Spaces, notes, and bookmarks are saved in this browser's local storage when available. The app retains up to 16 spaces, discarding the oldest when a seventeenth is added; export before that point if needed. A space supports up to 8 dimensions and 80 cards. If browser storage is full, export the session. Imported JSON is validated before use. This explorer's export format differs from the earlier fixed-simulator V1.

There are no accounts, cloud storage, background analytics, or inferred student profiles. Guided navigation does not automatically diagnose overload or claim that a learner has mastered a topic.

## Development and checks

React + TypeScript + Vite render the app, native SVG renders the controlled simulation, and KaTeX renders formulas. FastAPI/Pydantic validate generation requests and outputs; httpx calls the configured provider. UI assets and fonts are bundled locally.

```bash
npm ci
npm run dev
```

For AI during frontend development, run the Python backend in another terminal (after creating and activating `.venv`):

```bash
python -m pip install -r backend/requirements.lock.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Vite proxies `/api` to that local server. For the normal prebuilt app, `python launch.py` handles this automatically.

```bash
npm test
npm run build
python -m unittest discover -s backend/tests -v
```

The delivered version passed 23 TypeScript tests and 22 Python tests, including the original simulation checks and new generation, schema, filtering, layout, zoom, and API contract checks. Browser checks covered the prepared-space interactions and the unconfigured generation path. **Live generation was not tested with a real provider because no credentials were supplied.** Provider calls were mocked in automated tests. The Windows launchers are supplied but were not run on Windows in this environment.

| Source file | Purpose |
| --- | --- |
| `src/App.tsx` | Question-to-space flow, API settings, reader, notes, guided navigation |
| `src/AtlasCanvas.tsx` | Categorical canvas, semantic zoom, filters, axes, bookmarks |
| `src/atlas.ts` | Space types, import validation, layout, camera math |
| `src/prepared.ts` | Explicitly labeled authored example |
| `src/Content.tsx` | Safe content rendering and synchronized live blocks |
| `src/engine.ts` | Verified gradient-descent state and history |
| `backend/learning_api.py` | Dimension/card generation, additional dimension, tutor and settings |
| `backend/app.py` | Local static host, numeric snapshot validation, explanation adapter |

## Luminate connection and research framing

Reference repository: https://github.com/project-luminate/luminate/

Reference inspected at commit: `5ad81fb3d08db7ef440a57a37ca30e4dcfa9cf18`.

This is an educational adaptation of Luminate's interface organization and interaction ideas, with a newly implemented frontend and local backend. It is not the official Luminate system or a complete reproduction of every feature. It does not include Editor.js rich-text block editing, automatic lesson verification, force-directed clustering, or arbitrary simulation generation. The educational additions are linked concept representations and learner-controlled guidance.

See `ACKNOWLEDGEMENTS.md` for attribution and `DEMO_SCRIPT.md` for a short English researcher-role demonstration.
