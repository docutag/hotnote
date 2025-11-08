import * as pulumi from '@pulumi/pulumi';
import * as digitalocean from '@pulumi/digitalocean';

// Get configuration
const config = new pulumi.Config();
const imageTag = process.env.IMAGE_TAG || 'latest';

// Use existing DigitalOcean Container Registry (registry.digitalocean.com/hotnote)
const registry = 'hotnote';
const repository = 'hotnote';

// Create a DigitalOcean App Platform app
const app = new digitalocean.App('hotnote-app', {
  spec: {
    name: 'hotnote',
    region: 'fra', // Frankfurt
    services: [
      {
        name: 'hotnote-web',
        instanceCount: 1,
        instanceSizeSlug: 'basic-xxs',
        image: {
          registryType: 'DOCR',
          registry: registry,
          repository: repository,
          tag: imageTag,
        },
        httpPort: 80,
        healthCheck: {
          httpPath: '/',
        },
      },
    ],
  },
});

// Export the app's live URL
export const appUrl = app.liveUrl;
export const appId = app.id;
