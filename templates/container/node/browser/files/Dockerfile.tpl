{{dockerfileHeader}}
FROM node:20-alpine AS builder
WORKDIR /workspace
COPY . .
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npm run build -- --target {{targetName}} --profile {{profileName}} --config {{configPath}}

FROM nginx:1.27-alpine
RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
{{nginxConfig}}
EOF
COPY --from=builder /workspace/{{browserOutDir}}/ /usr/share/nginx/html/
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

