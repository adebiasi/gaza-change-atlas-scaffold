# Server-side Copernicus adapter

This folder is the production boundary for live Copernicus Data Space requests.
The static GitHub Pages frontend must never receive the OAuth client secret.

Implemented primitives:

- OAuth client-credentials token caching
- STAC Catalog search for `sentinel-2-l2a`
- Sentinel Hub Processing API true-colour request

Deploy these functions behind your preferred serverless/runtime and expose only
narrow application endpoints such as `/acquisitions` and `/imagery`.

The endpoints and authentication flow are based on the current Copernicus Data
Space documentation. Keep quotas, billing/processing-unit limits and service
terms under review before public operation.
