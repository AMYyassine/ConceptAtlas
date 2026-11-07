# ConceptAtlas — Version 1

**Explore one concept through connected representations.** This English-language research prototype links a graph, equations, illustrative Python code, a numerical history, and explanations of gradient descent. Every view follows the same computed iteration.

## Start the included app

Extract the entire ZIP first. The built interface is included in `dist/`; Node.js is **not** required to run it.

### Windows: quickest demonstration

1. Install Python 3.11 or newer if it is not already installed. The installer must make `py` or `python` available.
2. Double-click **START_DEMO.bat**.
3. Your browser opens ConceptAtlas at `http://127.0.0.1:8000`.
4. Keep the terminal open during the demo. Press Ctrl+C there to stop it.

This mode uses only Python's standard library. No package installation, API key, or network connection is needed once Python and this folder are available. The built-in guide is active; personalized AI is disabled.

### Windows: server with optional AI

Double-click **START_CONCEPTATLAS.bat**. On its first run, the launcher creates a project-local Python environment, installs the pinned server dependencies, and creates `backend/.env` from the example. Internet access is required for that first installation. The app still works without AI credentials.

### macOS / Linux

```bash
python3 launch.py --demo
# Or run the optional server:
python3 launch.py
```

If port 8000 is occupied, use `python launch.py --demo --port 8001` (replace `python` with `python3` when appropriate). Do not open `dist/index.html` by double-clicking it; use the launcher so the browser can load the app correctly.

## What to try

- **Next iteration:** update all representations together.
- **Previous / history:** revisit any recorded step. Next replays existing recorded steps before extending the trajectory.
- **Learning rate:** change the next update. If you are reviewing an earlier step, changing the rate discards its later steps and starts a new branch from that point.
- **Starting parameter:** edit the number and press the restart icon or Enter to start a new experiment.
- **Show slope:** reveal the tangent used at the start of the selected update. At step zero, it shows the current tangent.
- **Graph points:** click a history point to revisit it. Panning is available; a new simulation action resets the view to the trajectory.
- **Representation tabs:** emphasize a view while keeping the other views visible.
- **Play / Pause:** run the updates automatically. The app stops near the minimum or at a display limit.
- **Guided exploration:** predict the direction of the next update and receive feedback. Return to free exploration at any time.
- **Ask the guide:** view a computed explanation and request a simple explanation of the rate, graph, or code. Without an API connection, responses come from a clearly labeled built-in guide.
- **Export session / Import:** save and restore a validated JSON experiment. The app also saves the experiment in this browser's local storage when available.
- **CSV:** export the numerical trajectory, including the rate used for each update.

Keyboard: Left/Right revisit or advance a step when focus is outside a control; Escape closes the guide or About dialog.

## Three demonstration scenarios

The objective is **J(w) = (w − 3)²**, with gradient **2(w − 3)** and update **w_next = w − η × gradient**. All presets start at w = 0.

| Preset | Rate | First updated w | First objective | What to notice |
| --- | --- | --- | --- | --- |
| Steady convergence | 0.1 | 0.6 | 5.76 | A negative slope moves w right, toward the minimum. |
| Oscillating convergence | 0.8 | 4.8 | 3.24 | Crossing the minimum can still reduce the objective. |
| Divergence | 1.1 | 6.6 | 12.96 | An oversized update moves farther from the minimum. |

At η = 0.5, this quadratic reaches its minimum in one update. At η = 1, a non-optimal starting point keeps oscillating at the same objective value. These thresholds are specific to this objective; they are not universal rules for gradient descent.

## Optional personalized AI explanations

The simulator performs the calculations. The optional LLM receives a validated snapshot and explains it; it cannot change the experiment. The selected point's gradient and the gradient used to reach it are supplied separately.

1. Start the full server once, then stop it with Ctrl+C.
2. Edit `backend/.env` locally:

```dotenv
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=your-own-key
LLM_MODEL=a-chat-model-supported-by-your-provider
```

3. Select an actual model available to your account. The model value above is a placeholder, not a valid model name. See the provider's current [API documentation](https://console.groq.com/docs/openai).
4. Restart using `START_CONCEPTATLAS.bat` or `python launch.py`.
5. Open **Ask the guide**. When the server has a key and model configured, the interface indicates that the AI connection is configured. The first question verifies whether those credentials and that model work.

The adapter uses the OpenAI-compatible `/chat/completions` format, so another compatible provider can be configured through its base URL. Compatibility depends on the provider and model. The key remains server-side. A question and its selected simulation state are sent to the chosen provider when you ask for an AI explanation. Provider usage may incur charges. Never commit or share `backend/.env`.

If the API is unavailable, computed explanations remain available. AI output should be checked against the displayed calculations. **No live provider call was tested for this delivery because no credentials were supplied**; API behavior was tested with mocked provider responses.

## Research concept and boundaries

ConceptAtlas is inspired by [Luminate (CHI 2024)](https://luminate-research.github.io/) and its structured exploration of possibilities ([paper DOI](https://doi.org/10.1145/3613904.3642400)). The proposed extension explores linked educational representations and learner-controlled guidance. It is not a reproduction of Luminate.

**Research question:** Does changing one representation while all others update help learners explain the same concept across graphical, mathematical, and computational forms?

This V1 is a demonstrator, not evidence of improved learning. It contains one verified quadratic module, not arbitrary topic generation. Guided mode uses a direction prediction prompt and optional explanations; it does not automatically diagnose overload. The displayed Python is illustrative, while numerical simulation runs in TypeScript. Graph arrows join discrete states; they do not represent a physical trajectory along the curve. There are no accounts, remote session storage, or research analytics.

To keep the display usable, an experiment stops near a zero gradient, at 150 updates, or before an update would exceed the parameter display range. Starting values are limited to −6 through 12 and rates to 0.01 through 1.5. Displayed values are rounded, while stored calculations retain full JavaScript numerical precision.

## Development

Use a current Node.js LTS release compatible with Vite 6 and Python 3.11+. The included lockfiles record the delivered dependencies.

```bash
npm ci
npm run dev
```

The Vite dev server proxies `/api` to `127.0.0.1:8000`. For AI during development, run the Python server in a second terminal:

```bash
python -m venv .venv
# Activate .venv using the command for your operating system, then:
python -m pip install -r backend/requirements.lock.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Rebuild the shipped interface after editing:

```bash
npm run build
```

### Architecture

| File | Responsibility |
| --- | --- |
| `src/engine.ts` | Deterministic updates, history, branching, numeric snapshots, session validation |
| `src/LabContext.tsx` | Shared React state and browser persistence |
| `src/Graph.tsx` | Plotly graph, slope display, point selection |
| `src/App.tsx` | Connected math/code/table views, controls, guided prediction |
| `src/Guide.tsx` | Computed explanations, built-in guide, optional AI requests |
| `backend/app.py` | FastAPI host, Pydantic math validation, optional provider adapter |
| `launch.py` | Local startup and dependency setup; standard-library demo mode |

React + TypeScript + Vite power the interface; Plotly renders the graph; KaTeX renders mathematics; Lucide supplies icons. The UI bundles its assets and does not need external fonts or a CDN.

### Validation

```bash
npm test
npm run build
# After activating the Python environment:
python -m unittest discover -s backend/tests -v
```

The test suite covers numeric trajectories, the distinction between oscillation and divergence, history replay and branching, imported calculation validation, display limits, API snapshot validation, error responses, and static hosting. The Windows launchers are provided but were not executed on Windows during development.

See `DEMO_SCRIPT.md` for an English walkthrough suitable for a short researcher-role presentation.
