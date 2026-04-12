FROM nginx:alpine

ARG APP_HOST=localhost

RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 \
      -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/server.key \
      -out /etc/nginx/ssl/server.crt \
      -subj "/CN=${APP_HOST}" \
      -addext "subjectAltName=DNS:${APP_HOST},DNS:localhost,IP:127.0.0.1"

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 443 8443
