import type { Express } from "express";
import { storage } from "../storage";
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

const MICROSOFT_SCOPES = [
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.Send',
  'Calendars.ReadWrite'
];

/**
 * Setup OAuth routes for email and calendar services
 */
export function setupOAuthRoutes(app: Express): void {
  // Google OAuth routes
  app.get('/api/auth/google', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return handleOAuthSimulation(req, res, 'google');
    }

    try {
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      const oauth2Client = getOAuth2Client(redirectUri);

      // Generate authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
        prompt: 'consent'  // Force to always get a refresh token
      });

      // Store the user ID in the session for the callback
      if (!req.session.oauthState) {
        req.session.oauthState = {};
      }
      req.session.oauthState.userId = req.user.id;

      // Redirect to Google's authorization page
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      res.status(500).json({ message: 'Failed to initiate Google OAuth', error: (error as Error).message });
    }
  });

  // Google OAuth callback route
  app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;

    // If no code or no session state, something went wrong
    if (!code || !req.session.oauthState) {
      return res.status(400).redirect('/settings?error=oauth_failed');
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return handleOAuthSimulation(req, res, 'google');
    }

    try {
      const userId = req.session.oauthState.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).redirect('/settings?error=user_not_found');
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      const oauth2Client = getOAuth2Client(redirectUri);

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        return res.status(400).redirect('/settings?error=tokens_missing');
      }

      // Get user info to get the email
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();

      if (!userInfo.email) {
        return res.status(400).redirect('/settings?error=email_missing');
      }

      // Expiry date calculation
      const expiryDate = tokens.expiry_date 
        ? new Date(tokens.expiry_date) 
        : new Date(Date.now() + 3600 * 1000); // Default to 1 hour if not provided

      // Create Gmail connection
      await storage.createConnection({
        userId,
        service: 'gmail',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: expiryDate,
        email: userInfo.email
      });

      // Create Google Calendar connection
      await storage.createConnection({
        userId,
        service: 'google_calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: expiryDate,
        email: userInfo.email
      });

      // Remove OAuth state from session
      delete req.session.oauthState;

      // Redirect to settings page with success message
      res.redirect('/settings?success=google_connected');
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      res.status(500).redirect('/settings?error=oauth_failed');
    }
  });

  // Microsoft OAuth route
  app.get('/api/auth/microsoft', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return handleOAuthSimulation(req, res, 'microsoft');
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/microsoft/callback`;
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(MICROSOFT_SCOPES.join(' '))}` ;

    if (!req.session.oauthState) {
      req.session.oauthState = {};
    }
    req.session.oauthState.userId = req.user.id;

    res.redirect(authUrl);
  });

  // Microsoft OAuth callback route
  app.get('/api/auth/microsoft/callback', async (req, res) => {
    const code = req.query.code as string;

    if (!code || !req.session.oauthState) {
      return res.status(400).redirect('/settings?error=oauth_failed');
    }

    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return handleOAuthSimulation(req, res, 'microsoft');
    }

    try {
      const userId = req.session.oauthState.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).redirect('/settings?error=user_not_found');
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/microsoft/callback`;
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token || !tokens.refresh_token) {
        return res.status(400).redirect('/settings?error=tokens_missing');
      }

      // Get user email from Microsoft Graph API
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` }
      });
      const userInfo = await userInfoResponse.json();

      if (!userInfo.mail) {
        return res.status(400).redirect('/settings?error=email_missing');
      }

      const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

      // Create Outlook connection
      await storage.createConnection({
        userId,
        service: 'outlook',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: expiryDate,
        email: userInfo.mail
      });

      // Create Outlook Calendar connection
      await storage.createConnection({
        userId,
        service: 'outlook_calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: expiryDate,
        email: userInfo.mail
      });

      delete req.session.oauthState;

      res.redirect('/settings?success=microsoft_connected');
    } catch (error) {
      console.error('Error in Microsoft OAuth callback:', error);
      res.status(500).redirect('/settings?error=oauth_failed');
    }
  });

  // Disconnect service
  app.post('/api/auth/disconnect/:service', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const service = req.params.service;
    const userId = (req.user as any).id;

    try {
      await storage.removeConnection(userId, service);

      // If this is a google service, also remove the related one (gmail/google_calendar)
      if (service === 'gmail') {
        await storage.removeConnection(userId, 'google_calendar').catch(() => {});
      } else if (service === 'google_calendar') {
        await storage.removeConnection(userId, 'gmail').catch(() => {});
      } else if (service === 'outlook') {
        await storage.removeConnection(userId, 'outlook_calendar').catch(() => {});
      } else if (service === 'outlook_calendar') {
        await storage.removeConnection(userId, 'outlook').catch(() => {});
      }

      res.json({ message: `Disconnected from ${service}` });
    } catch (error) {
      console.error(`Error disconnecting from ${service}:`, error);
      res.status(500).json({ message: `Failed to disconnect from ${service}`, error: (error as Error).message });
    }
  });
}

/**
 * Handle simulated OAuth flow for services without credentials
 */
async function handleOAuthSimulation(req: any, res: any, service: string): Promise<void> {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + 3600 * 1000); // 1 hour from now

    // Create connections based on service
    if (service === 'google') {
      // Create Gmail connection
      const existingGmail = await storage.getConnection(userId, 'gmail');
      if (!existingGmail) {
        await storage.createConnection({
          userId,
          service: 'gmail',
          accessToken: 'simulated-access-token',
          refreshToken: 'simulated-refresh-token',
          tokenExpiry: expiryDate,
          email: user.email
        });
      }

      // Create Google Calendar connection
      const existingCalendar = await storage.getConnection(userId, 'google_calendar');
      if (!existingCalendar) {
        await storage.createConnection({
          userId,
          service: 'google_calendar',
          accessToken: 'simulated-access-token',
          refreshToken: 'simulated-refresh-token',
          tokenExpiry: expiryDate,
          email: user.email
        });
      }
    } else if (service === 'microsoft') {
      // Create Outlook connection
      const existingOutlook = await storage.getConnection(userId, 'outlook');
      if (!existingOutlook) {
        await storage.createConnection({
          userId,
          service: 'outlook',
          accessToken: 'simulated-access-token',
          refreshToken: 'simulated-refresh-token',
          tokenExpiry: expiryDate,
          email: user.email
        });
      }

      // Create Outlook Calendar connection
      const existingCalendar = await storage.getConnection(userId, 'outlook_calendar');
      if (!existingCalendar) {
        await storage.createConnection({
          userId,
          service: 'outlook_calendar',
          accessToken: 'simulated-access-token',
          refreshToken: 'simulated-refresh-token',
          tokenExpiry: expiryDate,
          email: user.email
        });
      }
    }

    // Redirect to settings page
    res.redirect('/settings?success=simulated_oauth');
  } catch (error) {
    console.error(`Error in simulated OAuth flow for ${service}:`, error);
    res.status(500).json({ message: 'OAuth simulation failed', error: (error as Error).message });
  }
}

/**
 * Get OAuth2 client for Google API
 */
function getOAuth2Client(redirectUri: string): OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/**
 * Get an authorized OAuth2 client by refreshing token if needed
 */
export async function getAuthorizedOAuth2Client(userId: number, service: string): Promise<OAuth2Client | null> {
  try {
    // Get connection from database
    const connection = await storage.getConnection(userId, service);
    if (!connection) {
      return null;
    }

    // Check if this is a simulated connection
    if (connection.accessToken === 'simulated-access-token') {
      console.log(`Using simulated OAuth credentials for ${service}`);

      // Return a mock OAuth2 client for simulated connections
      // This will only be used for testing, and real API calls will be mocked
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return null;
      }

      // Create a real client, but we won't actually use it for API calls
      // Instead, we'll intercept those calls in our service layers
      const redirectUri = '/api/auth/google/callback';
      const oauth2Client = new OAuth2Client(
        GOOGLE_CLIENT_ID || 'mock-client-id',
        GOOGLE_CLIENT_SECRET || 'mock-client-secret',
        redirectUri
      );

      // Set mock credentials
      oauth2Client.setCredentials({
        access_token: 'simulated-access-token',
        refresh_token: 'simulated-refresh-token',
        expiry_date: new Date().getTime() + 3600 * 1000
      });

      return oauth2Client;
    }

    // For real connections, continue with actual OAuth flow

    // Check if we have Google credentials configured
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials');
      return null;
    }

    // Get redirect URI (not used for token refresh but needed for client creation)
    const redirectUri = '/api/auth/google/callback';

    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Set credentials
    const tokenExpiryTime = connection.tokenExpiry instanceof Date 
      ? connection.tokenExpiry.getTime() 
      : new Date(connection.tokenExpiry).getTime();

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: tokenExpiryTime
    });

    // Check if token is expired and refresh if needed
    const currentDate = new Date();
    const expiryDate = connection.tokenExpiry instanceof Date 
      ? connection.tokenExpiry
      : new Date(connection.tokenExpiry);

    if (currentDate >= expiryDate) {
      console.log(`Token for ${service} has expired, refreshing...`);

      try {
        // Refresh token
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update token in database
        if (credentials.access_token && credentials.expiry_date) {
          const newExpiryDate = new Date(credentials.expiry_date);

          await storage.updateConnection(connection.id, {
            accessToken: credentials.access_token,
            tokenExpiry: newExpiryDate
          });

          // Update credentials in client
          oauth2Client.setCredentials(credentials);
        }
      } catch (refreshError) {
        console.error(`Error refreshing token for ${service}:`, refreshError);
        // Continue with existing token, it might still work
      }
    }

    return oauth2Client;
  } catch (error) {
    console.error(`Error getting authorized OAuth2 client for ${service}:`, error);
    return null;
  }
}