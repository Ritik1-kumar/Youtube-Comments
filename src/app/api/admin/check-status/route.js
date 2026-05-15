// src/app/api/admin/check-status/route.js
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if user is in the admins collection
    const adminRef = await adminDb.collection('admins').doc(userId).get();
    const isAdmin = adminRef.exists;

    return NextResponse.json({
      isAdmin
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { message: error.message || 'An error occurred while checking admin status' },
      { status: 500 }
    );
  }
}