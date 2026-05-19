import { NextResponse, type NextRequest } from 'next/server';

// Firebase Auth is fully client-side — no middleware needed.
// This stub stays to keep Next.js happy if you ever want to add edge logic.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
