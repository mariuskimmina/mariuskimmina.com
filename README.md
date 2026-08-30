# mariuskimmina.com

A static Astro site built from public records in `mariuskimmina.com`'s ATProto repository.

## Local development

```sh
devenv up
```

Open [http://127.0.0.1:4321](http://127.0.0.1:4321). The devenv task installs the locked pnpm dependencies on first run and starts Astro with live reload.

## Refresh public ATProto data

The checked-in snapshot keeps local development and deployments independent from PDS availability. Refresh it when desired:

```sh
devenv shell -- pnpm sync
```

`pnpm build` attempts a refresh and falls back to the existing snapshot if the network is unavailable. A cheap deployment can run this on a schedule through GitHub Actions, Cloudflare Pages, Netlify, or any static host with build hooks.

## Deployment

The GitHub Pages workflow in `.github/workflows/deploy.yml` refreshes the public ATProto data, builds the site, and deploys it:

- after every push to `main`
- hourly at 17 minutes past the hour
- manually through the Actions tab

In the repository settings, select **Settings → Pages → Build and deployment → GitHub Actions**, then set `mariuskimmina.com` as the custom domain. The build also includes `public/CNAME` for portability, but custom-workflow deployments still require the domain to be configured in the Pages settings. Configure the domain’s DNS records at the domain provider and enable **Enforce HTTPS** once GitHub has verified the domain.
# yapwr
