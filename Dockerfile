# Static site — Caddy serves the files as-is, no build step.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY . /srv

# The server config must not itself be downloadable from the site. (These
# cannot go in .dockerignore — the COPY above needs the Caddyfile present.)
RUN rm -f /srv/Caddyfile /srv/Dockerfile /srv/.dockerignore \
 && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# Railway routes to one port; Caddy binds {$PORT:8080}. If those two ever
# disagree the edge reports "failed to connect" while Caddy logs a healthy
# start, so print the resolved port where the deploy log will show it.
EXPOSE 8080
CMD ["sh", "-c", "echo \"[boot] serving /srv on port ${PORT:-8080} (PORT env: ${PORT:-unset})\" && exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]
