SHELL := /bin/sh
.DEFAULT_GOAL := help

-include infra/.env
export

PNPM := pnpm --dir app
COMPOSE := docker compose --env-file infra/.env -f infra/compose.yaml

APP_PORT ?= 3000
POSTGRES_PORT ?= 5432
# Override existing app/.env.local URLs for the local database workflow.
DATABASE_URL := postgres://postgres:postgres@localhost:$(POSTGRES_PORT)/typescribe
DATABASE_URL_UNPOOLED := $(DATABASE_URL)
export DATABASE_URL DATABASE_URL_UNPOOLED

.PHONY: help init install up down logs db-up dev migrate seed seed-fixture db-generate db-studio build check test

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

init: ## Create local configuration with a random authentication secret
	@test -f infra/.env || cp infra/.env.example infra/.env
	@if ! grep -Eq '^BETTER_AUTH_SECRET=.+$$' infra/.env; then \
		secret=$$(openssl rand -base64 32) && \
		sed -i '/^BETTER_AUTH_SECRET=/d' infra/.env && \
		printf '\nBETTER_AUTH_SECRET=%s\n' "$$secret" >> infra/.env; \
	fi

install: ## Install app dependencies
	$(PNPM) install --frozen-lockfile

up: init ## Build and start app + PostgreSQL (http://localhost:3000)
	$(COMPOSE) up --build -d --wait

down: ## Stop containers, preserving database data
	$(COMPOSE) down

logs: ## Follow app and database logs
	$(COMPOSE) logs -f

db-up: init ## Start only PostgreSQL for host development
	$(COMPOSE) up -d --wait postgres

dev: ## Start Next.js on the host (run make db-up migrate first)
	$(PNPM) dev --port $(APP_PORT)

migrate: ## Apply migrations to local PostgreSQL from the host
	$(PNPM) db:migrate

seed: ## Seed real YouTube videos (requires internet)
	$(PNPM) db:seed

seed-fixture: ## Seed synthetic captions for offline testing (no playable video)
	$(PNPM) db:seed --fixture src/data/fixtures/transcript-sample.json

db-generate: ## Generate a Drizzle migration
	$(PNPM) db:generate

db-studio: ## Open Drizzle Studio on the host
	$(PNPM) db:studio

build: ## Build the Next.js app
	$(PNPM) build

check: ## Run lint and TypeScript checks
	$(PNPM) lint
	$(PNPM) typecheck

test: ## Run unit tests
	$(PNPM) test
