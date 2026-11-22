SHELL := /bin/sh
.DEFAULT_GOAL := help

-include .env
export

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
	@test -f .env || cp .env.example .env
	@if ! grep -Eq '^BETTER_AUTH_SECRET=.+$$' .env; then \
		secret=$$(openssl rand -base64 32) && \
		sed -i '/^BETTER_AUTH_SECRET=/d' .env && \
		printf '\nBETTER_AUTH_SECRET=%s\n' "$$secret" >> .env; \
	fi

install: ## Install workspace dependencies
	pnpm install --frozen-lockfile

up: init ## Build and start app + PostgreSQL (http://localhost:3000)
	docker compose up --build -d --wait

down: ## Stop containers, preserving database data
	docker compose down

logs: ## Follow app and database logs
	docker compose logs -f

db-up: init ## Start only PostgreSQL for host development
	docker compose up -d --wait postgres

dev: ## Start Next.js on the host (run make db-up migrate first)
	pnpm dev --port $(APP_PORT)

migrate: ## Apply migrations to local PostgreSQL from the host
	pnpm db:migrate

seed: ## Seed real YouTube videos (requires internet)
	pnpm db:seed

seed-fixture: ## Seed synthetic captions for offline testing (no playable video)
	pnpm db:seed --fixture src/data/fixtures/transcript-sample.json

db-generate: ## Generate a Drizzle migration
	pnpm db:generate

db-studio: ## Open Drizzle Studio on the host
	pnpm db:studio

build: ## Build the Next.js app
	pnpm build

check: ## Run lint and TypeScript checks
	pnpm lint
	pnpm typecheck

test: ## Run unit tests
	pnpm test
