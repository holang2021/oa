#!/bin/bash
set -e
echo "=== DNS check for oa.holangchina.com ==="
dig +short oa.holangchina.com @1.1.1.1 || true
echo "--- local resolver ---"
dig +short oa.holangchina.com || true
