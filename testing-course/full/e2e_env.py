"""Shared settings of the end-to-end scripts, read from the environment.

E2E_BROWSER  chromium channel or engine: "msedge" (default, the owner's machine) or "chromium" (CI, the Playwright build).
E2E_OUT      folder for the *-e2e.json results; default is this folder, where the committed results live.
E2E_SHOTS    folder for the screenshots; default is testing-course/screens.
"""
import os
from pathlib import Path

HERE = Path(__file__).parent
OUT = Path(os.environ.get("E2E_OUT") or HERE)
SHOTS = Path(os.environ.get("E2E_SHOTS") or HERE.parent / "screens")
OUT.mkdir(parents=True, exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)


def launch(p):
    """Open the browser chosen by E2E_BROWSER."""
    browser = os.environ.get("E2E_BROWSER", "msedge")
    if browser == "chromium":
        return p.chromium.launch()
    return p.chromium.launch(channel=browser)


def answer(page, value=True):
    """Answer the next own dialog of the site (rename, trash, delete): a string types it and accepts, True accepts, False or None cancels."""
    page.evaluate(
        """(value) => {
          window.__answer = value;
          if (window.__answerWatch) return;
          window.__answerWatch = new MutationObserver(() => {
            const box = document.querySelector('.dialog');
            if (!box || window.__answer === undefined) return;
            const given = window.__answer;
            window.__answer = undefined;
            setTimeout(() => {
              if (given === false || given === null) box.querySelector('.dialog__actions .button--quiet').click();
              else {
                const field = box.querySelector('.dialog__input');
                if (field && typeof given === 'string') field.value = given;
                box.querySelector('form').requestSubmit();
              }
            }, 0);
          });
          window.__answerWatch.observe(document.body, { childList: true });
        }""",
        value,
    )
