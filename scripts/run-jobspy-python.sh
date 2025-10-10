#!/bin/bash
# Wrapper to run Python 3.11 with correct environment for jobspy
export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"
exec /opt/homebrew/opt/python@3.11/bin/python3.11 "$@"

