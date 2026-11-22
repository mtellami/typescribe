FROM node:24-bookworm-slim

RUN npm install --global pnpm@12.21.0
WORKDIR /workspace/app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . ./
EXPOSE 3000
CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
