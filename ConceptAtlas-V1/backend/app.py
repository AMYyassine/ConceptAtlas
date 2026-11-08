"""Optional explanation API and static app host. Numeric truth stays in the simulator."""
from __future__ import annotations
import math
import os
from pathlib import Path
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, model_validator

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / 'backend' / '.env')
API_BASE = os.getenv('LLM_BASE_URL', 'https://api.groq.com/openai/v1').rstrip('/')
API_KEY = os.getenv('LLM_API_KEY', '')
MODEL = os.getenv('LLM_MODEL', '')

class Snapshot(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    iteration: int = Field(ge=0, le=150)
    w: float = Field(ge=-100000, le=100000)
    loss: float = Field(ge=0)
    gradient: float
    previous_w: float | None = None
    previous_loss: float | None = None
    applied_gradient: float | None = None
    step_rate: float | None = Field(default=None, ge=0.01, le=1.5)
    next_rate: float = Field(ge=0.01, le=1.5)
    mode: Literal['free', 'guided']

    @model_validator(mode='after')
    def validate_math(self):
        def close(a, b):
            return math.isclose(a, b, rel_tol=1e-7, abs_tol=1e-7)
        if not close(self.loss, (self.w-3)**2) or not close(self.gradient, 2*(self.w-3)):
            raise ValueError('The current state is inconsistent with the quadratic.')
        fields = [self.previous_w, self.previous_loss, self.applied_gradient, self.step_rate]
        if self.iteration == 0:
            if any(x is not None for x in fields):
                raise ValueError('The initial state has no preceding update.')
        else:
            if any(x is None for x in fields):
                raise ValueError('The previous update is required.')
            if not close(self.previous_loss, (self.previous_w-3)**2):
                raise ValueError('Previous loss is inconsistent.')
            if not close(self.applied_gradient, 2*(self.previous_w-3)):
                raise ValueError('Applied gradient is inconsistent.')
            if not close(self.w, self.previous_w-self.step_rate*self.applied_gradient):
                raise ValueError('The update is inconsistent.')
        return self

class ExplainRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: str = Field(min_length=1, max_length=100, pattern=r'^[a-zA-Z0-9:_-]+$')
    question: str = Field(min_length=1, max_length=2000)
    focus: Literal['all', 'graph', 'math', 'code', 'table']
    snapshot: Snapshot

class ExplainResponse(BaseModel):
    request_id: str
    explanation: str
    source: Literal['llm'] = 'llm'

app = FastAPI(title='ConceptAtlas', version='0.1.0')

@app.get('/api/health')
async def health():
    return {'app':'ConceptAtlas', 'version':'0.1.0', 'configured':bool(API_KEY and MODEL), 'model':MODEL if API_KEY and MODEL else None}

async def call_llm(request: ExplainRequest) -> str:
    system = (
        'You are the English-language learning guide in ConceptAtlas, a research prototype. '
        'Explain gradient descent for J(w)=(w-3)^2 and J\'(w)=2(w-3). '
        'Use the supplied validated numeric snapshot as ground truth. The selected row gradient is '
        'evaluated at the new w; applied_gradient is the gradient used for the previous-to-current update. '
        'step_rate is the learning rate that produced the selected step; next_rate is for the next action. '
        'Connect graph, math, code and numeric values using this same example. '
        'For this function: 0<eta<0.5 converges monotonically, eta=0.5 reaches 3 in one step, '
        '0.5<eta<1 converges with oscillations, eta=1 oscillates, eta>1 diverges unless starting at 3. '
        'Do not diagnose a learner or claim a test proved understanding. Ask a short question if helpful. '
        'Use clear plain text in at most 200 words. Suggest actions but never claim to execute them. '
        'Do not invent extra steps, observations, course content, or other mathematical modules.'
    )
    payload = {'model': MODEL, 'messages': [
        {'role':'system', 'content':system},
        {'role':'user', 'content':f'Selected view: {request.focus}\nValidated snapshot: {request.snapshot.model_dump_json()}\nStudent question: {request.question}'}
    ], 'temperature':0.3, 'max_tokens':650}
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=8.0)) as client:
        response = await client.post(f'{API_BASE}/chat/completions', headers={'Authorization':f'Bearer {API_KEY}'}, json=payload)
        response.raise_for_status()
        data = response.json()
    answer = data['choices'][0]['message']['content']
    if not isinstance(answer, str) or not answer.strip():
        raise ValueError('The provider returned an empty explanation.')
    return answer.strip()[:12000]

@app.post('/api/explain', response_model=ExplainResponse)
async def explain(request: ExplainRequest):
    if not API_KEY or not MODEL:
        raise HTTPException(status_code=503, detail='Configure LLM_API_KEY and LLM_MODEL in backend/.env. The built-in guide remains available.')
    try:
        answer = await call_llm(request)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail='The AI provider timed out. Try again.') from None
    except (httpx.HTTPError, KeyError, ValueError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail='The AI provider could not return an explanation. Check the server-side configuration.') from None
    return ExplainResponse(request_id=request.request_id, explanation=answer)

from .learning_api import attach_routes
import sys
attach_routes(app, sys.modules[__name__])

@app.get('/api/{unknown_path:path}', include_in_schema=False)
async def unknown_api(unknown_path: str):
    return JSONResponse({'detail':'Unknown API route.'}, status_code=404)

if (ROOT/'dist').is_dir():
    app.mount('/', StaticFiles(directory=ROOT/'dist', html=True), name='frontend')
