export async function POST(request: Request) {
  if (request.method && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // Forward Authorization header if present
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;
console.log('Forwarding to Supabase:', { body, headers }); // Add this
    const response = await fetch(
      'https://ljmdbrunpuhnnmouuzg.supabase.co/functions/v1/send-telegram-notification',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }
    );
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 