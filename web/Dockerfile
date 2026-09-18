FROM public.ecr.aws/docker/library/node:22-slim AS landing-build

WORKDIR /app

RUN corepack enable

COPY landing/package.json landing/pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile --ignore-workspace

COPY landing/ .

RUN pnpm run build

FROM public.ecr.aws/docker/library/node:22-slim AS build

WORKDIR /app

RUN corepack enable

COPY web/package.json web/pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

COPY web/ .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm run build

FROM public.ecr.aws/docker/library/nginx:1.27-alpine AS runtime

COPY --from=landing-build /app/dist /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html/app
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
