# Static site — Caddy serves the files as-is, no build step.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY . /srv

# The server config must not itself be downloadable from the site. (These
# cannot go in .dockerignore — the COPY above needs the Caddyfile present.)
RUN rm -f /srv/Caddyfile /srv/Dockerfile /srv/.dockerignore \
 && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
