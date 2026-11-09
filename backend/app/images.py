"""Image generation helpers — OpenAI DALL·E with Pollinations demo fallback."""

from __future__ import annotations

import base64
import re
import uuid
from pathlib import Path
from urllib.parse import quote

import httpx

GENERATED_DIR = Path(__file__).resolve().parent.parent / "static" / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

VISUAL_NOUNS = (
    r"image|picture|photo|illustration|artwork|art|logo|icon|map|diagram|"
    r"poster|wallpaper|visual|drawing|sketch|infographic"
)

IMAGE_INTENT = re.compile(
    rf"(?:"
    # "Generate India Country Map…" / "create an image of…"
    rf"(?:generate|create|draw|make|paint|design|render|imagine)\b.{{0,160}}?\b(?:{VISUAL_NOUNS})\b"
    rf"|"
    # "map of India" / "image of a cat"
    rf"(?:an?\s+)?(?:{VISUAL_NOUNS})\s+of\b"
    rf"|"
    # "show me a map" / "give me an image"
    rf"(?:show|give)\s+(?:me\s+)?(?:an?\s+)?(?:generated\s+)?(?:{VISUAL_NOUNS})\b"
    rf")",
    re.I | re.S,
)

PROMPT_EXTRACTORS = [
    re.compile(
        rf"(?:generate|create|draw|make|paint|design|render|imagine)\s+"
        rf"(?:me\s+)?(?:an?\s+)?(?:{VISUAL_NOUNS})"
        rf"(?:\s+of|\s*:)?\s*(.*)$",
        re.I | re.S,
    ),
    re.compile(
        rf"(?:generate|create|draw|make|paint|design|render|imagine)\s+(.+)$",
        re.I | re.S,
    ),
    re.compile(rf"(?:an?\s+)?(?:{VISUAL_NOUNS})\s+of\s+(.+)$", re.I | re.S),
    re.compile(
        rf"(?:show|give)\s+(?:me\s+)?(?:an?\s+)?(?:generated\s+)?(?:{VISUAL_NOUNS})\s*(.*)$",
        re.I | re.S,
    ),
]


def is_image_generation_request(text: str) -> bool:
    """True when the user is asking to create a visual (image, map, diagram, etc.)."""
    raw = (text or "").strip()
    if not raw:
        return False
    if IMAGE_INTENT.search(raw):
        return True

    # Extra-safe fallback for natural phrasing like:
    # "Generate India Country Map in World map"
    lowered = raw.lower()
    has_verb = any(
        w in lowered
        for w in ("generate", "create", "draw", "make", "paint", "design", "render", "imagine")
    )
    has_visual = any(
        w in lowered
        for w in (
            "image",
            "picture",
            "photo",
            "illustration",
            "artwork",
            "map",
            "diagram",
            "poster",
            "wallpaper",
            "drawing",
            "sketch",
            "infographic",
            "logo",
            "icon",
        )
    )
    return has_verb and has_visual



def extract_image_prompt(text: str) -> str:
    raw = (text or "").strip()
    prompt = ""
    for pattern in PROMPT_EXTRACTORS:
        match = pattern.search(raw)
        if match:
            prompt = (match.group(1) or "").strip(" :,-")
            if prompt:
                break
    if not prompt:
        prompt = raw
    prompt = prompt[:1000] or "a serene mountain landscape at sunrise, cinematic lighting"

    # Help map/diagram prompts produce clearer illustrative results
    if re.search(r"\b(map|diagram|infographic)\b", prompt, re.I):
        return (
            f"High-quality illustrative {prompt}. Clean cartography or diagram style, "
            f"clear labels, accurate geography where relevant, professional educational visual, "
            f"no watermark."
        )[:1000]
    return prompt


def _save_bytes(data: bytes, suffix: str = ".png") -> str:
    filename = f"{uuid.uuid4().hex}{suffix}"
    path = GENERATED_DIR / filename
    path.write_bytes(data)
    return f"/static/generated/{filename}"


async def generate_image(
    prompt: str,
    *,
    api_key: str = "",
    image_model: str = "dall-e-3",
) -> dict[str, str]:
    """
    Generate an image and persist it under /static/generated.
    Returns {url, prompt, provider, revised_prompt?}.
    """
    cleaned = prompt.strip()[:1000]

    if api_key.strip():
        try:
            return await _generate_openai(cleaned, api_key=api_key, image_model=image_model)
        except Exception as exc:  # noqa: BLE001
            demo = await _generate_pollinations(cleaned)
            demo["warning"] = f"OpenAI image generation failed ({exc}); used demo generator instead."
            return demo

    return await _generate_pollinations(cleaned)


async def _generate_openai(prompt: str, *, api_key: str, image_model: str) -> dict[str, str]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)

    # Current OpenAI image models return b64 by default and may not support
    # legacy params like response_format / dall-e-*. Prefer the configured model,
    # then known working gpt-image variants.
    models = []
    for candidate in (
        image_model,
        "gpt-image-1.5",
        "chatgpt-image-latest",
        "gpt-image-2",
        "gpt-image-1-mini",
    ):
        if candidate and candidate not in models:
            models.append(candidate)

    last_error: Exception | None = None
    result = None
    used_model = image_model
    for model in models:
        for kwargs in (
            {"model": model, "prompt": prompt, "size": "1024x1024"},
            {"model": model, "prompt": prompt},
        ):
            try:
                result = await client.images.generate(**kwargs)  # type: ignore[arg-type]
                used_model = model
                break
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                continue
        if result is not None:
            break

    if result is None:
        raise RuntimeError(str(last_error) if last_error else "OpenAI image generation failed")

    item = result.data[0]
    revised = getattr(item, "revised_prompt", None) or prompt

    b64 = getattr(item, "b64_json", None)
    if b64:
        local_url = _save_bytes(base64.b64decode(b64))
        return {
            "url": local_url,
            "prompt": prompt,
            "provider": f"openai:{used_model}",
            "revised_prompt": revised,
        }

    remote_url = getattr(item, "url", None)
    if not remote_url:
        raise RuntimeError("OpenAI image response missing url/b64_json")

    async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as http:
        response = await http.get(remote_url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "image/png")
        suffix = ".jpg" if "jpeg" in content_type or "jpg" in content_type else ".png"
        local_url = _save_bytes(response.content, suffix=suffix)

    return {
        "url": local_url,
        "prompt": prompt,
        "provider": f"openai:{used_model}",
        "revised_prompt": revised,
    }


async def _generate_pollinations(prompt: str) -> dict[str, str]:
    encoded = quote(prompt)
    remote = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width=1024&height=1024&nologo=true&enhance=true&seed={uuid.uuid4().int % 10_000_000}"
    )
    try:
        async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
            response = await client.get(remote)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "image/jpeg")
            suffix = ".png" if "png" in content_type else ".jpg"
            url = _save_bytes(response.content, suffix=suffix)
            return {
                "url": url,
                "prompt": prompt,
                "provider": "pollinations",
                "revised_prompt": prompt,
            }
    except Exception:
        # Last-resort hotlink if download fails
        return {
            "url": remote,
            "prompt": prompt,
            "provider": "pollinations",
            "revised_prompt": prompt,
        }


def format_image_markdown(image: dict[str, str]) -> str:
    caption = image.get("revised_prompt") or image.get("prompt") or "Generated image"
    warning = image.get("warning")
    provider = image.get("provider", "generator")
    lines = [
        "I've generated an image for you:",
        "",
        f"![{caption}]({image['url']})",
        "",
        f"*Prompt:* {caption}",
        f"*Provider:* {provider}",
    ]
    if warning:
        lines.extend(["", f"> {warning}"])
    lines.extend(
        [
            "",
            "You can ask me to refine it — for example: *make it darker*, *add a city skyline*, "
            "or *generate another version*.",
        ]
    )
    return "\n".join(lines)
