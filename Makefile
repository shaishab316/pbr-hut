.PHONY: help dev build prod deploy secrets-dev secrets-prod push-env pull-dev pull-prod example-env

ENV=shaishab316/pbr-hut-backend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Run local development
	esc run $(ENV)/dev -- npm run start:dev

build: ## Build project
	npm run build

prod: ## Run production
	esc run $(ENV)/prod -- npm run start:prod

secrets-dev: ## Edit dev secrets
	esc env edit $(ENV)/dev

secrets-prod: ## Edit prod secrets
	esc env edit $(ENV)/prod

push-env: ## Push .env to dev
	esc env set $(ENV)/dev $(shell cat .env | grep -v '^#' | grep -v '^$$' | xargs)

pull-dev: ## Pull dev secrets to .env
	esc open $(ENV)/dev --format dotenv > .env

pull-prod: ## Pull prod secrets to .env
	esc open $(ENV)/prod --format dotenv > .env

example-env: ## Generate .env.example from dev secrets (values removed)
	esc open $(ENV)/dev --format dotenv | sed 's/=.*/=/' > .env.example

shell-dev: ## Load dev envs into current shell
	eval $$(esc open $(ENV)/dev --format shell)

shell-prod: ## Load prod envs into current shell
	eval $$(esc open $(ENV)/prod --format shell)