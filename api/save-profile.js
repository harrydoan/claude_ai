
/ Ví dụ với Firebase (cần cài đặt firebase-admin)
import admin from 'firebase-admin';

// Initialize Firebase Admin (cần config)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { profile } = req.body;
    
    if (!profile || !profile.name || !profile.birthDate) {
      return res.status(400).json({ error: 'Invalid profile data' });
    }
    
    // Lưu vào Firestore
    await db.collection('profiles').doc(profile.id).set({
      ...profile,
      savedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return res.status(200).json({ 
      success: true,
      message: 'Profile saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving profile:', error);
    return res.status(500).json({ 
      error: 'Failed to save profile',
      message: error.message
    });
  }
}
