interface HealthCheckOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  expectedStatus?: number;
  verbose?: boolean;
}

export async function waitForHealthy(
  url: string,
  options: HealthCheckOptions = {}
): Promise<void> {
  const {
    maxRetries = 60,
    retryDelay = 1000,
    timeout = 5000,
    expectedStatus = 200,
    verbose = true
  } = options;
  
  if (verbose) {
    console.log(`⏳ Waiting for ${url} to be healthy...`);
  }
  
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === expectedStatus) {
        if (verbose) {
          console.log(`✅ Service healthy at ${url} after ${i + 1} attempts`);
        }
        return;
      }
      
      lastError = new Error(`Unexpected status: ${response.status}`);
    } catch (error: any) {
      lastError = error;
      
      if (verbose && i % 10 === 0) {
        console.log(`⏳ Health check attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
      }
    }
    
    // Don't wait after the last attempt
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw new Error(
    `Service at ${url} failed to become healthy after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message || 'Unknown error'}`
  );
}

export async function waitForMultipleHealthy(
  urls: string[],
  options: HealthCheckOptions = {}
): Promise<void> {
  await Promise.all(urls.map(url => waitForHealthy(url, options)));
}

export async function checkPortsAvailable(ports: number[]): Promise<Map<number, boolean>> {
  const net = await import('net');
  const results = new Map<number, boolean>();
  
  await Promise.all(
    ports.map(port =>
      new Promise<void>((resolve) => {
        const server = net.createServer();
        
        server.once('error', () => {
          results.set(port, false);
          resolve();
        });
        
        server.once('listening', () => {
          server.close();
          results.set(port, true);
          resolve();
        });
        
        server.listen(port);
      })
    )
  );
  
  return results;
}