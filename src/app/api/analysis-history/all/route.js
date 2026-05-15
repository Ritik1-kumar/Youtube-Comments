// src/app/api/analysis-history/all/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

const analysisCollection = 'youtube-analysis';

// Get all analysis history
export async function GET(req) {
  try {
    const userId = req.headers.get('Authorization')?.split(' ')[1];
    console.log(userId);
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const analysisRef = collection(db, analysisCollection);
    const q = query(analysisRef, where('userId', '==', userId), orderBy('date', 'desc'));
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
    console.error('Error fetching all analysis history:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis history' }, { status: 500 });
  }
}