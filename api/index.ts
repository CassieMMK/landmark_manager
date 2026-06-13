import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const { name = 'World' } = request.query;
  
  return response.status(200).json({
    message: `Hello ${name}! Welcome to the Landmark Manager API.`,
    timestamp: new Date().toISOString(),
    status: 'online',
    version: '1.0.0'
  });
}
