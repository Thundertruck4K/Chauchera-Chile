# 💰 FinanzasCL

Gestor financiero personal para Chile. Node.js + React + PostgreSQL en Docker.

## 🚀 Inicio rápido

```bash
# 1. Clona / copia el proyecto
# 2. Configura variables de entorno
cp .env.example .env
nano .env   # Cambia todas las contraseñas y el JWT_SECRET

# 3. Levanta todo con Docker
./start.sh

# 4. Primer acceso → http://localhost:3000/setup
```

## ⚙️ Configuración (.env)

| Variable | Descripción |
|---|---|
| `DB_PASSWORD` | Contraseña PostgreSQL (cámbiala) |
| `JWT_SECRET` | Secret JWT, mínimo 32 chars aleatorios |
| `SETUP_TOKEN` | Token para el primer setup, bórralo después |
| `LOG_LEVEL` | debug / info / warn / error |

## 📦 Módulos

| Módulo | Descripción |
|---|---|
| **Dashboard** | Resumen financiero, gráficos, tendencia |
| **Cuentas** | Cuentas corrientes, tarjetas, wallets |
| **Movimientos** | Ingresos, gastos, transferencias |
| **Herramientas** | DAP, metas de ahorro, créditos, AFP, calculadora |
| **Cartolas** | Importa CSV/PDF/Excel de cualquier banco |
| **Reportes** | Reporte mensual imprimible |
| **Debug** | Logs en tiempo real, métricas del sistema |

## 🏦 Bancos compatibles

Banco de Chile, Santander, BancoEstado, BCI, Itaú, Scotiabank, BICE, Security, Falabella, Ripley, Consorcio, COOPEUCH, Tenpo, MACH, Mercado Pago.

## 🔌 API (futuro)

- `/api/indicators` → UF, UTM, USD, EUR desde mindicador.cl (actualización automática)
- Integración SII: en desarrollo (requiere clave tributaria del SII)

## 🛠 Comandos útiles

```bash
./start.sh                    # Inicia todo
./stop.sh                     # Detiene todo
docker logs finanzas_backend  # Ver logs backend
docker logs finanzas_db       # Ver logs PostgreSQL
```

## 📊 Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion + Recharts
- **Backend**: Node.js + Express + Winston (logs)
- **Base de datos**: PostgreSQL 16
- **Infra**: Docker + Docker Compose + Nginx

