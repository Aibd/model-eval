This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Docker Deployment

This project is optimized for Docker deployment using `standalone` output mode.

### Prerequisites

- Docker and Docker Compose installed.
- An existing Docker network named `proxy-network` (or modify `docker-compose.yml` to match your network).

To create the network if it doesn't exist:
```bash
docker network create proxy-network
```

### Deployment Steps

1. **Build and Start with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the Application:**
   The container runs on port `3000` within the `proxy-network`. If you need to access it directly from your host, uncomment the `ports` section in `docker-compose.yml`.

### Docker Configuration Details

- **Dockerfile**: Uses a multi-stage build (deps, builder, runner) based on `node:20-alpine` for minimal image size.
- **Next.js Standalone**: Configured in `next.config.ts` to reduce the production image footprint by only including necessary files.
- **Networking**: Joined to the `proxy-network` by default for production proxy integration (e.g., Nginx, Traefik).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
