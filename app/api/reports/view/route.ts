import { NextRequest, NextResponse } from 'next/server'
import { verifyReportToken } from '@/lib/report-link'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse('Missing report token', { status: 400 })
  }

  const result = verifyReportToken(token)

  if (!result.valid) {
    return new NextResponse('Invalid report token', { status: 400 })
  }

  if (result.expired) {
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Report Link Expired</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body {
        margin: 0;
        padding: 1.5rem;
        background-color: #0b1120;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        box-sizing: border-box;
      }
      .card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 16px;
        padding: 2.5rem 2rem;
        max-width: 460px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      }
      .icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 1.25rem;
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .badge {
        display: inline-block;
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 4px 10px;
        border-radius: 9999px;
        margin-bottom: 1rem;
      }
      h1 {
        font-size: 1.35rem;
        font-weight: 700;
        margin: 0 0 0.75rem 0;
        letter-spacing: -0.02em;
      }
      p {
        color: #94a3b8;
        font-size: 0.925rem;
        line-height: 1.6;
        margin: 0 0 1.75rem 0;
      }
      .notice {
        background: rgba(15, 23, 42, 0.6);
        border: 1px dashed #475569;
        border-radius: 10px;
        padding: 0.875rem 1rem;
        font-size: 0.825rem;
        color: #cbd5e1;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="badge">Security Notice</div>
      <h1>Report Link Expired</h1>
      <p>
        For client data privacy and medical compliance, medical report links stop working after 15 minutes.
      </p>
      <div class="notice">
        Please sign in to Fitflix and view this report inside the client's consultation profile.
      </div>
    </div>
  </body>
</html>`

    return new NextResponse(html, {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  }

  // Active token -> redirect to target URL
  return NextResponse.redirect(new URL(result.url!, request.url), 307)
}
