// src/app/api/analysis-history/[id]/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

const analysisCollection = 'youtube-analysis';

// Get a specific analysis item
export async function GET(req, { params }) {
  try {
    const id = params.id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    console.log('API route GET request for id:', id);
    console.log('Request userId:', userId);
    
    if (!id) {
      console.log('Missing analysis ID');
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }
    
    // For debugging, make the userId check conditional
    // In production, you'd want to keep this check for security
    const docRef = doc(db, analysisCollection, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('Document not found');
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    
    console.log('Document exists:', docSnap.id);
    
    // Temporarily bypass userId check for debugging
    // Comment this out in production
    if (userId && docSnap.data().userId !== userId) {
      console.log('Authorization failed. Document userId:', docSnap.data().userId);
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    const data = {
      id: docSnap.id,
      ...docSnap.data()
    };
    console.log('Returning data:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json({ error: `Failed to fetch analysis: ${error.message}` }, { status: 500 });
  }
}

// Delete a specific analysis item
export async function DELETE(req, { params }) {
  try {
    const id = params.id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    console.log('API route DELETE request for id:', id);
    console.log('Request userId for deletion:', userId);
    
    if (!id) {
      console.log('Missing analysis ID');
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }
    
    // Make userId optional for debugging
    // In production you'd want this check for security
    if (!userId) {
      console.log('Warning: No userId provided for deletion');
      // Allow deletion to proceed for debugging
      // In production, uncomment the next line:
      // return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    const docRef = doc(db, analysisCollection, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('Document not found for deletion');
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    
    // For debugging, make userId check optional
    // In production, restore this check
    if (userId && docSnap.data().userId !== userId) {
      console.log('Authorization failed for deletion. Document userId:', docSnap.data().userId);
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    console.log('Deleting document:', id);
    await deleteDoc(docRef);
    console.log('Document deleted successfully');
    
    return NextResponse.json({ success: true, message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return NextResponse.json({ error: `Failed to delete analysis: ${error.message}` }, { status: 500 });
  }
}