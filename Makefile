COMPOSE := docker compose

.PHONY: help run up down restart stop logs ps status clean test proxy-logs db-shell redis-shell

help:
	@echo "B5 WAF Makefile"
	@echo ""
	@echo "Targets:"
	@echo "  make run         Start the full stack in detached mode"
	@echo "  make up          Alias for run"
	@echo "  make stop        Stop containers without removing them"
	@echo "  make down        Stop and remove containers"
	@echo "  make restart     Restart the stack"
	@echo "  make ps          Show container status"
	@echo "  make status      Alias for ps"
	@echo "  make logs        Follow logs for all services"
	@echo "  make proxy-logs  Follow logs for the proxy only"
	@echo "  make db-shell    Open a psql shell in PostgreSQL"
	@echo "  make redis-shell Open a redis-cli shell in Redis"
	@echo "  make test        Check homepage and verify WAF blocks a SQLi payload"
	@echo "  make clean       Remove containers and volumes"

run:
	$(COMPOSE) up -d

up: run

stop:
	$(COMPOSE) stop

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) down
	$(COMPOSE) up -d

ps:
	$(COMPOSE) ps

status: ps

logs:
	$(COMPOSE) logs -f

proxy-logs:
	$(COMPOSE) logs -f b5-proxy

db-shell:
	$(COMPOSE) exec b5-postgres psql -U b5admin -d b5

redis-shell:
	$(COMPOSE) exec b5-redis redis-cli

test:
	@echo "Checking homepage through B5 proxy..."
	@curl -fsS http://localhost:8080 >/dev/null && echo "Homepage check passed"
	@echo "Checking SQLi blocking..."
	@status=$$(curl -o /dev/null -s -w "%{http_code}" "http://localhost:8080/?id=1'+UNION+SELECT+*+FROM+users--"); \
	if [ "$$status" = "403" ]; then \
		echo "WAF blocking check passed (HTTP $$status)"; \
	else \
		echo "WAF blocking check failed (HTTP $$status)"; \
		exit 1; \
	fi

clean:
	$(COMPOSE) down -v