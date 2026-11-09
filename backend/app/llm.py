"""LLM reply generation with OpenAI streaming, image generation, and rich demo fallback."""

from __future__ import annotations

import asyncio
import re
from collections.abc import AsyncGenerator
from typing import Any, TypedDict

from app.images import (
    extract_image_prompt,
    format_image_markdown,
    generate_image,
    is_image_generation_request,
)


class StreamChunk(TypedDict, total=False):
    type: str
    content: str
    metadata: dict[str, Any]


DEMO_TRIGGERS: list[tuple[re.Pattern[str], Any]] = [
    (
        re.compile(r"chart|graph|plot|visuali[sz]e", re.I),
        lambda: {
            "content": (
                "Here's a sample chart of monthly active users:\n\n"
                "```chart\n"
                '{"type":"bar","title":"Monthly Active Users","labels":["Jan","Feb","Mar","Apr","May","Jun"],'
                '"datasets":[{"label":"Users","data":[1200,1450,1320,1680,1900,2100]}]}\n'
                "```\n\n"
                "And a line trend for retention:\n\n"
                "```chart\n"
                '{"type":"line","title":"Retention Rate (%)","labels":["Week 1","Week 2","Week 3","Week 4"],'
                '"datasets":[{"label":"Retention","data":[100,72,58,51]}]}\n'
                "```\n\n"
                "Would you like me to break this down further?"
            ),
            "metadata": {
                "actions": [
                    {"id": "explain", "label": "Explain the trends"},
                    {"id": "export", "label": "Export as CSV"},
                    {"id": "compare", "label": "Compare YoY"},
                ]
            },
        },
    ),
    (
        re.compile(r"table|compare|comparison", re.I),
        lambda: {
            "content": (
                "Here's a comparison table:\n\n"
                "| Feature | Free | Plus | Team |\n"
                "|---------|------|------|------|\n"
                "| Messages | Limited | Unlimited | Unlimited |\n"
                "| Model access | GPT-3.5 | GPT-4o | GPT-4o |\n"
                "| File uploads | ❌ | ✅ | ✅ |\n"
                "| Priority access | ❌ | ✅ | ✅ |\n"
                "| Admin console | ❌ | ❌ | ✅ |\n\n"
                "**Key takeaway:** Plus is best for individuals; Team for collaboration.\n\n"
                "### Highlights\n"
                "- Unlimited messaging on Plus and Team\n"
                "- Shared admin tools only on Team\n"
                "- Free tier is great for light exploration"
            ),
            "metadata": {
                "actions": [
                    {"id": "recommend", "label": "Recommend a plan"},
                    {"id": "pricing", "label": "Show pricing details"},
                    {"id": "generate-image", "label": "Illustrate with an image"},
                ]
            },
        },
    ),
    (
        re.compile(r"code|function|snippet|example", re.I),
        lambda: {
            "content": (
                "Here's a clean Python example with streaming:\n\n"
                "```python\n"
                "import httpx\n\n"
                "async def stream_chat(prompt: str, token: str):\n"
                "    async with httpx.AsyncClient(timeout=None) as client:\n"
                "        async with client.stream(\n"
                '            "POST",\n'
                '            "http://localhost:8000/api/chat/stream",\n'
                '            headers={"Authorization": f"Bearer {token}"},\n'
                '            json={"content": prompt},\n'
                "        ) as response:\n"
                "            async for line in response.aiter_lines():\n"
                '                if line.startswith("data: "):\n'
                "                    yield line[6:]\n"
                "```\n\n"
                "Use this with React state to append tokens as they arrive."
            ),
            "metadata": {
                "actions": [
                    {"id": "python", "label": "Show more Python"},
                    {"id": "error-handling", "label": "Add error handling"},
                ]
            },
        },
    ),
    (
        re.compile(r"list|steps|how to|guide", re.I),
        lambda: {
            "content": (
                "Here's a practical checklist:\n\n"
                "1. **Define the goal** — what should the user accomplish?\n"
                "2. **Sketch the data model** — users, conversations, messages\n"
                "3. **Build the API** — auth, CRUD, streaming endpoints\n"
                "4. **Wire the UI** — sidebar, message list, composer\n"
                "5. **Add polish** — markdown, dark mode, search, export, image generation\n\n"
                "### Tips\n"
                "- Prefer SSE for streaming\n"
                "- Keep conversation titles short and searchable\n"
                "- Cache hot conversation lists\n"
                "- Persist generated images under `/static/generated`\n\n"
                "Pick a next step and I'll expand it."
            ),
            "metadata": {
                "actions": [
                    {"id": "api", "label": "Deep dive: API"},
                    {"id": "ui", "label": "Deep dive: UI"},
                    {"id": "db", "label": "Deep dive: Database"},
                ]
            },
        },
    ),
]


def pick_demo_response(prompt: str) -> dict[str, Any]:
    for pattern, builder in DEMO_TRIGGERS:
        if pattern.search(prompt):
            return builder()

    preview = prompt[:280] + ("…" if len(prompt) > 280 else "")
    return {
        "content": (
            "Thanks for your message! You said:\n\n"
            f"> {preview}\n\n"
            "I can demonstrate rich responses:\n\n"
            "- **Streaming** token-by-token replies\n"
            "- **Markdown** with lists, tables, and code\n"
            "- **Charts** — try *show me a chart*\n"
            "- **Image generation** — try *generate an image of a futuristic city*\n"
            "- **Tables** — try *show a comparison table*\n\n"
            "### Quick facts\n"
            "- Auth + persistence are fully wired\n"
            "- Conversations are stored in SQLite (PostgreSQL in Docker)\n"
            "- Set `OPENAI_API_KEY` for real LLM replies and DALL·E images\n\n"
            "What would you like to explore?"
        ),
        "metadata": {
            "actions": [
                {"id": "chart", "label": "Show a chart"},
                {"id": "code", "label": "Show code"},
                {"id": "table", "label": "Show a table"},
                {"id": "generate-image", "label": "Generate an image"},
            ]
        },
    }


ACTION_PROMPTS: dict[str, str] = {
    "chart": "Show me a chart of sample data",
    "code": "Give me a code example for streaming chat",
    "table": "Show a comparison table of plans",
    "image": "Generate an image of a serene mountain lake at sunrise",
    "generate-image": "Generate an image of a serene mountain lake at sunrise",
    "explain": "Explain the chart trends in plain language",
    "export": "How would I export this chart data as CSV?",
    "compare": "Compare this year vs last year for those metrics",
    "recommend": "Recommend which plan I should choose",
    "pricing": "Break down pricing considerations",
    "python": "Show more Python streaming examples",
    "error-handling": "Add robust error handling to that code",
    "api": "Deep dive into the REST API design",
    "ui": "Deep dive into the React UI architecture",
    "db": "Deep dive into the database schema",
}


def action_to_prompt(action_id: str) -> str:
    return ACTION_PROMPTS.get(action_id, f"Tell me more about: {action_id}")


async def _stream_text(text: str, delay_ms: float = 12) -> AsyncGenerator[StreamChunk, None]:
    parts = re.split(r"(\s+)", text)
    for part in parts:
        if part:
            yield {"type": "token", "content": part}
            if delay_ms > 0:
                await asyncio.sleep(delay_ms / 1000)


DEFAULT_SYSTEM_PROMPT = (
    "You are BlueYonder ChatGPT, a helpful assistant. Always use GitHub-flavored markdown. "
    "When useful, include tables, numbered/bulleted lists, images via markdown "
    "![alt](url), and fenced code blocks. For charts, use a ```chart fenced block with JSON: "
    "{type,title,labels,datasets}. Keep replies clear and well structured. "
    "This product can generate images and maps for the user automatically when they ask — "
    "do not say you cannot generate images or maps."
)


async def generate_reply(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    system_prompt: str | None = None,
    api_key: str = "",
    default_model: str = "gpt-4o-mini",
    image_model: str = "dall-e-3",
) -> AsyncGenerator[StreamChunk, None]:
    last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")

    # Image generation path (works with or without OpenAI key)
    if is_image_generation_request(last_user):
        yield {"type": "token", "content": "Generating your image"}
        for dots in (".", ".", "."):
            await asyncio.sleep(0.25)
            yield {"type": "token", "content": dots}
        yield {"type": "token", "content": "\n\n"}

        prompt = extract_image_prompt(last_user)
        image = await generate_image(prompt, api_key=api_key, image_model=image_model)
        markdown = format_image_markdown(image)
        async for chunk in _stream_text(markdown, delay_ms=6):
            yield chunk
        yield {
            "type": "rich",
            "metadata": {
                "actions": [
                    {"id": "generate-image", "label": "Generate another"},
                    {"id": "image", "label": "Try a different scene"},
                ],
                "generatedImage": image,
            },
        }
        yield {"type": "done"}
        return

    if not api_key.strip():
        demo = pick_demo_response(last_user)
        async for chunk in _stream_text(demo["content"]):
            yield chunk
        if demo.get("metadata"):
            yield {"type": "rich", "metadata": demo["metadata"]}
        yield {"type": "done"}
        return

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=api_key)
        chosen_model = model or default_model
        system = system_prompt or DEFAULT_SYSTEM_PROMPT
        stream = await client.chat.completions.create(
            model=chosen_model,
            stream=True,
            messages=[
                {"role": "system", "content": system},
                *[{"role": m["role"], "content": m["content"]} for m in messages],
            ],
        )
        async for part in stream:
            token = part.choices[0].delta.content if part.choices else None
            if token:
                yield {"type": "token", "content": token}
        yield {"type": "done"}
    except Exception as exc:  # noqa: BLE001
        yield {"type": "error", "content": str(exc)}
