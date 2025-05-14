import Redis from 'ioredis';
import { KubeConfig, CoreV1Api, NetworkingV1Api } from '@kubernetes/client-node';


const redis = new Redis({
  host: process.env.REDIS_HOST,  // Redis host (localhost)
  port: 6379,          // Redis port
});

const redisSub = new Redis({
  host: process.env.REDIS_HOST,  // Redis host (localhost)
  port: 6379,          // Redis port
});


const kc = new KubeConfig();
kc.loadFromDefault();
const coreV1Api = kc.makeApiClient(CoreV1Api);
const networkingV1Api = kc.makeApiClient(NetworkingV1Api);


function getReplRedisKey(userId, replId) {
  return `repl:delete:${userId}:${replId}`;
}

async function configureRedisNotifications() {
  await redis.config('SET', 'notify-keyspace-events', 'Ex');
  console.log('[Redis] Keyspace events enabled');
}

export async function startReplExpirationWatcher() {
  await configureRedisNotifications();
  await redisSub.psubscribe('__keyevent@0__:expired');

  redisSub.on('pmessage', async (_pattern, _channel, expiredKey) => {
    if (expiredKey.startsWith('repl:delete:')) {
      const parts = expiredKey.split(':');
      const userId = parts[2];
      const replId = parts[3];
      console.log(`[Redis] REPL expired: ${expiredKey} - deleting`);
      await deleteRepl(userId, replId);
    }
  });

  console.log('[Redis] Listening for REPL expiration events');
}

export async function incrementActiveUsers(replId, userId) {
  const activeUsersKey = `repl:activeUsers:${replId}-${userId}`;
  const count = await redis.incr(activeUsersKey);
  console.log(`[Redis] Incremented active users for ${replId}: ${count}`);
}

export async function decrementActiveUsers(replId, userId) {
  const activeUsersKey = `repl:activeUsers:${replId}-${userId}`;
  const count = await redis.decr(activeUsersKey);
  console.log(`[Redis] Decremented active users for ${replId}: ${count}`);

  // If no active users remain, schedule deletion
  if (count <= 0) {
    const userId = await redis.get(`repl:owner:${replId}`); // Retrieve owner ID
    if (userId) {
      await scheduleReplDeletion(userId, replId);
    }
  }
}

export async function scheduleReplDeletion(userId, replId) {
  const redisKey = getReplRedisKey(userId, replId);
  await redis.set(redisKey, 'pending', 'EX', 10);
  console.log(`[Redis] Scheduled deletion for ${redisKey}`);
}

export async function cancelReplDeletion(userId, replId) {
  const redisKey = getReplRedisKey(userId, replId);
  const result = await redis.del(redisKey);
  if (result) {
    console.log(`[Redis] Cancelled deletion for ${redisKey}`);
  }
}

export async function deployRepl(userId, replId, language) {
  await cancelReplDeletion(userId, replId);

  const ownerKey = `repl:owner:${replId}`;
  await redis.set(ownerKey, userId);

  const namePrefix = `${userId.substring(0, 8)}-${replId.substring(0, 8)}`;
  const podName = `repl-${namePrefix}`;
  const serviceName = `svc-${namePrefix}`;
  const ingressName = `ing-${namePrefix}`;
  const runnerDomain = `${namePrefix}.codefluxcloud.in`;

  let workerImage = 'piyushgpt/repl-worker';
  if (language.toLowerCase() === 'react' || language.toLowerCase() === 'reactjs') {
    workerImage = 'piyushgpt/repl-worker';
  }
  if(language.toLowerCase()==='python' || language.toLowerCase()==='python3'){
    workerImage = 'piyushgpt/repl-worker-python';
  }
  if(language.toLowerCase()==='cpp' || language.toLowerCase()==='c++'){
    workerImage = 'piyushgpt/repl-worker-cpp';
  }

  const podManifest = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: podName,
      labels: { app: `repl-${namePrefix}`, userId, replId },
    },
    spec: {
      containers: [
        {
          name: 'runner',
          image: 'piyushgpt/repl-runner',
          ports: [{ containerPort: 3001 }],
          resources: {
            limits: { cpu: '100m', memory: '160Mi' },
            requests: { cpu: '10m', memory: '80Mi' },
          },
        },
        {
          name: 'worker',
          image: workerImage,
          ports: [{ containerPort: 3002 }, { containerPort: 5173 }],
          env: [{ name: 'NODE_OPTIONS', value: '--max-old-space-size=512' }],
          resources: {
            limits: { cpu: '200m', memory: '256Mi' },
            requests: { cpu: '20m', memory: '128Mi' },
          },
          volumeMounts: [{ name: 'workspace-volume', mountPath: '/workspace' }],
        },
      ],
      initContainers: [
        {
          name: 'init-r2-downloader',
          image: 'amazon/aws-cli',
          command: ['sh', '-c', `
            aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID &&
            aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY &&
            aws configure set default.region us-east-1 &&
            aws s3 cp s3://replit/code/${userId}/${replId}/ /workspace/ --recursive --endpoint-url https://4ea86ca138a9f14ac92232c42ba24b37.r2.cloudflarestorage.com
          `],
          env: [
            { name: 'AWS_ACCESS_KEY_ID', valueFrom: { secretKeyRef: { name: 'codeflux-secrets', key: 'AWS_ACCESS_KEY_ID' } } },
            { name: 'AWS_SECRET_ACCESS_KEY', valueFrom: { secretKeyRef: { name: 'codeflux-secrets', key: 'AWS_SECRET_ACCESS_KEY' } } },
          ],
          volumeMounts: [{ name: 'workspace-volume', mountPath: '/workspace' }],
        },
      ],
      volumes: [{ name: 'workspace-volume', emptyDir: {} }],
    },
  };

  const serviceManifest = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name: serviceName },
    spec: {
      selector: { app: `repl-${namePrefix}` },
      ports: [
        { name: 'runner', port: 3001, targetPort: 3001 },
        { name: 'worker', port: 3002, targetPort: 3002 },
        { name: 'vite', port: 5173, targetPort: 5173 },
      ],
    },
  };

  const ingressManifest = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: ingressName,
      annotations: {
        'nginx.ingress.kubernetes.io/proxy-read-timeout': '3600',
        'nginx.ingress.kubernetes.io/proxy-send-timeout': '3600',
        'nginx.ingress.kubernetes.io/proxy-connect-timeout': '3600',
        'nginx.ingress.kubernetes.io/websocket-services': 'true',
        'nginx.ingress.kubernetes.io/enable-websocket': 'true',
        'nginx.ingress.kubernetes.io/enable-cors': 'true',
        'nginx.ingress.kubernetes.io/cors-allow-origin': '*',
        'nginx.ingress.kubernetes.io/cors-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'nginx.ingress.kubernetes.io/cors-allow-headers': '*'
      },
    },
    spec: {
      ingressClassName: 'nginx',
      tls: [
        {
          hosts: ['*.codefluxcloud.in'],
          secretName: 'codefluxcloud-in-tls'
        }
      ],
      rules: [
        {
          host: runnerDomain,
          http: {
            paths: [
              { path: '/runner', pathType: 'Prefix', backend: { service: { name: serviceName, port: { number: 3001 } } } },
              { path: '/worker', pathType: 'Prefix', backend: { service: { name: serviceName, port: { number: 3002 } } } },
              { path: '/', pathType: 'Prefix', backend: { service: { name: serviceName, port: { number: 5173 } } } },
            ],
          },
        },
      ],
    },
  };

  try {
    await coreV1Api.createNamespacedPod({ namespace: 'default', body: podManifest });
    await coreV1Api.createNamespacedService({ namespace: 'default', body: serviceManifest });
    await networkingV1Api.createNamespacedIngress({ namespace: 'default', body: ingressManifest });
    return { success: true, podName, serviceName, ingressName, domain: runnerDomain, message: 'Repl deployed successfully' };
  } catch (error) {
    if (error.message.includes('HTTP-Code: 409')) {
      return { success: true, podName, serviceName, ingressName, domain: runnerDomain, message: 'Repl already exists' };
    }
    return { success: false, error: error.body?.message || error.message };
  }
}

export async function deleteRepl(userId, replId) {
  const namePrefix = `${userId.substring(0, 8)}-${replId.substring(0, 8)}`;
  const podName = `repl-${namePrefix}`;
  const serviceName = `svc-${namePrefix}`;
  const ingressName = `ing-${namePrefix}`;

  try {
    await networkingV1Api.deleteNamespacedIngress({ name: ingressName, namespace: 'default' });
    await coreV1Api.deleteNamespacedService({ name: serviceName, namespace: 'default' });
    await coreV1Api.deleteNamespacedPod({ name: podName, namespace: 'default' });
    return { success: true, message: 'Repl deleted' };
  } catch (error) {
    return { success: false, error: error.body?.message || error.message };
  }
}
