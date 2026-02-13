#!/bin/bash
set -e

echo "🚀 FinanzasCL – Iniciando..."

# Check .env
if [ ! -f .env ]; then
  echo "❌ Archivo .env no encontrado."
  echo "   Copia .env.example a .env y configura los valores."
  exit 1
fi

# Check Docker
if ! command -v docker &>/dev/null; then
  echo "❌ Docker no está instalado."
  exit 1
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  echo "❌ Docker Compose no está instalado."
  exit 1
fi

# Use docker compose v2 if available
COMPOSE_CMD="docker-compose"
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
fi

echo "🔨 Construyendo contenedores..."
$COMPOSE_CMD build --no-cache

echo "▶️  Iniciando servicios..."
$COMPOSE_CMD up -d

echo ""
echo "✅ FinanzasCL está corriendo:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend:  http://localhost:4000"
echo "   🗄️  DB:       localhost:5432"
echo ""
echo "📋 Primer acceso:"
echo "   1. Ve a http://localhost:3000/setup"
echo "   2. Ingresa el SETUP_TOKEN de tu .env"
echo "   3. Crea tu usuario y contraseña"
echo ""
