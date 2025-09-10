import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';

// Middleware to verify JWT token
export const verifyToken = async (req: Request, res: Response, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Token verification failed' });
  }
};

// Get current user profile
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabaseAdmin
      .from('user')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ user: data || null });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create or update user data
export const upsertUserData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { prompt, link } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabaseAdmin
      .from('user')
      .upsert({
        user_id: userId,
        prompt,
        link,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ data });
  } catch (error) {
    console.error('Upsert user data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's data history
export const getUserHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabaseAdmin
      .from('user')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ history: data });
  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
