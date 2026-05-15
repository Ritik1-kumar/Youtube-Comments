// src/app/api/analysis-history/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, orderBy, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const analysisCollection = 'youtube-analysis';

// Get all analysis history
export async function GET(req) {
  try {
    // Get user ID from the request
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    const analysisRef = collection(db, analysisCollection);
    // Add where clause to filter by userId
    const q = query(
      analysisRef, 
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const history = [];
    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis history' }, { status: 500 });
  }
}

// Save or update analysis
export async function POST(req) {
  try {
    const analysisData = await req.json();
    
    // Check for required fields with specific errors
    if (!analysisData.url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    if (!analysisData.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!analysisData.userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }
    
    console.log("Processing analysis data:", {
      url: analysisData.url,
      title: analysisData.title,
      userId: analysisData.userId,
      hasId: !!analysisData.id
    });
    
    // Prepare the analysis data with userId
    const newAnalysis = {
      ...analysisData,
      date: analysisData.date || new Date().toISOString(),
      thumbnail: analysisData.thumbnail || null,
      userId: analysisData.userId
    };
    
    // Check if we have an ID (for updates)
    if (analysisData.id) {
      try {
        // Update existing document
        const docRef = doc(db, analysisCollection, analysisData.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // Verify ownership
          if (docSnap.data().userId !== analysisData.userId) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
          }
          
          await updateDoc(docRef, newAnalysis);
          return NextResponse.json({ success: true, id: analysisData.id, updated: true });
        } else {
          console.log(`Document with ID ${analysisData.id} not found`);
        }
      } catch (docError) {
        console.error("Error handling document update:", docError);
        return NextResponse.json({ error: `Document update error: ${docError.message}` }, { status: 500 });
      }
    }
    
    try {
      // Check if we already have this URL in the database for this user
      const analysisRef = collection(db, analysisCollection);
      const q = query(
        analysisRef, 
        where('url', '==', analysisData.url),
        where('userId', '==', analysisData.userId)
      );
      const querySnapshot = await getDocs(q);
      
      // If URL exists for this user, update that document instead of creating a new one
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const existingId = existingDoc.id;
        
        // Add the ID to the document data itself
        newAnalysis.id = existingId;
        
        await updateDoc(doc(db, analysisCollection, existingId), newAnalysis);
        return NextResponse.json({ success: true, id: existingId, updated: true });
      }
    } catch (queryError) {
      console.error("Error checking for existing document:", queryError);
      return NextResponse.json({ error: `Query error: ${queryError.message}` }, { status: 500 });
    }
    
    try {
      // If no matching document found, create a new one
      const docRef = await addDoc(collection(db, analysisCollection), newAnalysis);
      
      // Now update the document to include its own ID
      const documentId = docRef.id;
      await updateDoc(docRef, { id: documentId });
      
      return NextResponse.json({ success: true, id: documentId, updated: false });
    } catch (addError) {
      console.error("Error adding new document:", addError);
      return NextResponse.json({ error: `Add document error: ${addError.message}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json({ error: `Failed to save analysis: ${error.message}` }, { status: 500 });
  }
}

// Add DELETE handler for the id-specific route
export async function DELETE(req, { params }) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
    }
    
    const docRef = doc(db, analysisCollection, id);
    await deleteDoc(docRef);
    
    return NextResponse.json({ success: true, message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 });
  }
}