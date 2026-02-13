#!/bin/bash
COMPOSE_CMD="docker-compose"
if docker compose version &>/dev/null 2>&1; then COMPOSE_CMD="docker compose"; fi
$COMPOSE_CMD down
echo "✅ FinanzasCL detenido"
