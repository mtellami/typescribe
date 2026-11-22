FROM node:24-bookworm-slim

RUN npm install --global pnpm@12.21.0
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json ./app/package.json
RUN pnpm install --frozen-lockfile
COPY app ./app
WORKDIR /workspace/app
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
