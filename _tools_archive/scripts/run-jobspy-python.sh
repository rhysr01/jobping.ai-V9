#!/bin/bash
# Wrapper to run Python 3.11 with correct environment for jobspy
# Supports both macOS (Homebrew) and Linux (GitHub Actions)

# First, check if PYTHON environment variable is set (used in CI/CD)
if [ -n "$PYTHON" ]; then
  exec "$PYTHON" "$@"
fi

# Try macOS Homebrew path (for local development)
if [ -f "/opt/homebrew/opt/python@3.11/bin/python3.11" ]; then
  export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"
  exec /opt/homebrew/opt/python@3.11/bin/python3.11 "$@"
fi

# Try GitHub Actions Python path
if [ -f "/opt/hostedtoolcache/Python/3.11.14/x64/bin/python" ]; then
  exec /opt/hostedtoolcache/Python/3.11.14/x64/bin/python "$@"
fi

# Try python3.11 in PATH
if command -v python3.11 >/dev/null 2>&1; then
  exec python3.11 "$@"
fi

# Fallback to python3
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$@"
fi

# Last resort: python
exec python "$@"

