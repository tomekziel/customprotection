export async function onRequest(context) {
	
  console.log(`Request from ${context.request.url} / ${context.params.dane} `);

  const ip = context.request.headers.get("CF-Connecting-IP");
  const key = `rate_limit_${ip}`;
  const limit = 20;
  const window = 60; // seconds
  
  let data = await context.env.RATE_LIMIT_KV.get(key, { type: "json" }) || { count: 0, timestamp: Date.now() };
  let now = Date.now();
  
  if (now - data.timestamp > window * 1000) {
    data = { count: 0, timestamp: now };
  }
  
  let requestsLeft = limit - data.count;
  
  if (data.count >= limit) {
    return new Response(JSON.stringify({ status: "ERROR", error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-Requests-Left": requestsLeft.toString()
      },
    });
  }
  
  data.count++;
  requestsLeft = limit - data.count;
  await context.env.RATE_LIMIT_KV.put(key, JSON.stringify(data), { expirationTtl: window });
  
  return new Response(JSON.stringify({ status: "OK", parameter: context.params.dane }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Requests-Left": requestsLeft.toString()
    },
  });
}