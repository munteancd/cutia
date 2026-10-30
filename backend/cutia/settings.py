"""Setări: secretele și IP-urile din `.env`, listele editabile din `config/*.yaml`."""
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]


def _read_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


@dataclass
class Settings:
    env: dict[str, str] = field(default_factory=dict)
    config_dir: Path = ROOT / "config"

    @classmethod
    def load(cls) -> "Settings":
        env = _read_env(ROOT / ".env")
        env.update({k: v for k, v in os.environ.items() if k.startswith("CUTIA_")})
        return cls(env=env)

    def get(self, key: str, default: str | None = None) -> str | None:
        return self.env.get(key) or default

    def config(self, name: str) -> Any:
        path = self.config_dir / f"{name}.yaml"
        if not path.exists():
            return []
        return yaml.safe_load(path.read_text(encoding="utf-8")) or []
