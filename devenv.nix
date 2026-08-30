{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm.enable = true;
  };

  env.ASTRO_TELEMETRY_DISABLED = "1";

  tasks."website:install" = {
    exec = "pnpm install --frozen-lockfile";
    status = "test -f node_modules/.modules.yaml && test node_modules/.modules.yaml -nt pnpm-lock.yaml";
    before = [ "devenv:enterShell" ];
  };

  processes.atproto-sync = {
    exec = "node scripts/sync-atproto.mjs --soft --watch";
  };

  processes.website = {
    exec = "pnpm dev --host 127.0.0.1";
  };

  enterShell = ''
    echo "Website environment ready — run 'devenv up'; PDS data refreshes every minute"
  '';
}
