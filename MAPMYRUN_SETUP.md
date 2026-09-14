# MapMyRun automatic sync

The repository is prepared to pull workouts from the official MapMyFitness / MapMyRun API v7.1 and update `data/cardio.json` automatically through GitHub Actions.

## 1. Request API access

Open https://developer.mapmyfitness.com/requestkey/ and request a Personal Use API key.

For the callback URL use a local callback, for example:

`http://localhost.api.mapmyfitness.com:12345/callback`

Keep the returned Client ID and Client Secret private.

## 2. Authorize your MapMyRun account

Open this URL after replacing `CLIENT_ID`:

`https://www.mapmyfitness.com/oauth2/authorize/?client_id=CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2Flocalhost.api.mapmyfitness.com%3A12345%2Fcallback`

After login and authorization, MapMyFitness redirects to the callback URL with `?code=...`.

Exchange that code for tokens with a POST to:

`https://api.mapmyfitness.com/v7.1/oauth2/access_token/`

Headers:
- `Api-Key: CLIENT_ID`
- `Content-Type: application/x-www-form-urlencoded`

Form body:
- `grant_type=authorization_code`
- `client_id=CLIENT_ID`
- `client_secret=CLIENT_SECRET`
- `code=AUTHORIZATION_CODE`

The response includes `access_token`, `refresh_token`, and `user_id`.

## 3. Add GitHub repository secrets

In repository Settings → Secrets and variables → Actions, create:

- `MMF_CLIENT_ID`
- `MMF_ACCESS_TOKEN`
- `MMF_USER_ID`

Do not commit these values to the repository.

## 4. Sync

The workflow `.github/workflows/mapmyrun-sync.yml` runs hourly and can also be launched manually from GitHub Actions.

It updates `data/cardio.json`, avoids duplicate MapMyFitness workout IDs, and tries to merge a matching manually-entered run from the same day when distance and duration are very close.

## Token lifetime

MapMyFitness documents authorization-code access tokens as expiring after about 60 days. The current workflow intentionally does not store the Client Secret or refresh token in repository files. When the access token expires, renew it and replace `MMF_ACCESS_TOKEN` in GitHub Actions secrets.

A future version can add secure automatic token refresh if the secret rotation mechanism is hosted outside the public repository.
