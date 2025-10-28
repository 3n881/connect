// // server/index.ts
// import express, { Request, Response } from 'express';
// import cors from 'cors';
// import crypto from 'crypto';
// import Razorpay from 'razorpay';
// import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
// import dotenv from 'dotenv';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID!,
//   key_secret: process.env.RAZORPAY_KEY_SECRET!,
// });

// // Agora Configuration
// const AGORA_APP_ID = process.env.AGORA_APP_ID!;
// const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

// // ============================================
// // AGORA ENDPOINTS
// // ============================================

// /**
//  * Generate Agora RTC Token
//  * POST /api/agora/token
//  * Body: { channelName: string, uid: number, role: 'publisher' | 'subscriber' }
//  */
// app.post('/api/agora/token', (req: Request, res: Response) => {
//   try {
//     const { channelName, uid, role = 'publisher' } = req.body;

//     if (!channelName) {
//       return res.status(400).json({ error: 'Channel name is required' });
//     }

//     const uidNum = uid || 0;
//     const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
//     // Token expires in 24 hours
//     const expirationTimeInSeconds = 86400;
//     const currentTimestamp = Math.floor(Date.now() / 1000);
//     const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

//     // Generate token
//     const token = RtcTokenBuilder.buildTokenWithUid(
//       AGORA_APP_ID,
//       AGORA_APP_CERTIFICATE,
//       channelName,
//       uidNum,
//       userRole,
//       privilegeExpiredTs
//     );

//     res.json({
//       success: true,
//       token,
//       appId: AGORA_APP_ID,
//       channelName,
//       uid: uidNum,
//       expiresAt: privilegeExpiredTs,
//     });
//   } catch (error) {
//     console.error('Error generating Agora token:', error);
//     res.status(500).json({ error: 'Failed to generate token' });
//   }
// });

// // ============================================
// // RAZORPAY ENDPOINTS
// // ============================================

// /**
//  * Create Razorpay Order
//  * POST /api/razorpay/create-order
//  * Body: { amount: number, currency: string, receipt?: string, notes?: object }
//  */
// app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
//   try {
//     const { amount, currency = 'INR', receipt, notes } = req.body;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ error: 'Valid amount is required' });
//     }

//     const options = {
//       amount: Math.round(amount * 100), // Convert to paise
//       currency,
//       receipt: receipt || `receipt_${Date.now()}`,
//       notes: notes || {},
//     };

//     const order = await razorpay.orders.create(options);

//     res.json({
//       success: true,
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       receipt: order.receipt,
//     });
//   } catch (error) {
//     console.error('Error creating Razorpay order:', error);
//     res.status(500).json({ error: 'Failed to create order' });
//   }
// });

// /**
//  * Verify Razorpay Payment
//  * POST /api/razorpay/verify-payment
//  * Body: { orderId: string, paymentId: string, signature: string }
//  */
// app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
//   try {
//     const { orderId, paymentId, signature } = req.body;

//     if (!orderId || !paymentId || !signature) {
//       return res.status(400).json({ error: 'Missing required fields' });
//     }

//     // Generate signature
//     const generatedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
//       .update(`${orderId}|${paymentId}`)
//       .digest('hex');

//     const isValid = generatedSignature === signature;

//     if (isValid) {
//       res.json({
//         success: true,
//         verified: true,
//         message: 'Payment verified successfully',
//       });
//     } else {
//       res.status(400).json({
//         success: false,
//         verified: false,
//         message: 'Invalid payment signature',
//       });
//     }
//   } catch (error) {
//     console.error('Error verifying payment:', error);
//     res.status(500).json({ error: 'Failed to verify payment' });
//   }
// });

// /**
//  * Fetch Payment Details
//  * GET /api/razorpay/payment/:paymentId
//  */
// app.get('/api/razorpay/payment/:paymentId', async (req: Request, res: Response) => {
//   try {
//     const { paymentId } = req.params;

//     const payment = await razorpay.payments.fetch(paymentId);

//     res.json({
//       success: true,
//       payment,
//     });
//   } catch (error) {
//     console.error('Error fetching payment:', error);
//     res.status(500).json({ error: 'Failed to fetch payment' });
//   }
// });

// /**
//  * Create Refund
//  * POST /api/razorpay/refund
//  * Body: { paymentId: string, amount?: number }
//  */
// app.post('/api/razorpay/refund', async (req: Request, res: Response) => {
//   try {
//     const { paymentId, amount } = req.body;

//     if (!paymentId) {
//       return res.status(400).json({ error: 'Payment ID is required' });
//     }

//     const refundOptions: any = {};
//     if (amount) {
//       refundOptions.amount = Math.round(amount * 100); // Convert to paise
//     }

//     const refund = await razorpay.payments.refund(paymentId, refundOptions);

//     res.json({
//       success: true,
//       refund,
//     });
//   } catch (error) {
//     console.error('Error creating refund:', error);
//     res.status(500).json({ error: 'Failed to create refund' });
//   }
// });

// // ============================================
// // HEALTH CHECK
// // ============================================

// app.get('/health', (req: Request, res: Response) => {
//   res.json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     services: {
//       agora: !!AGORA_APP_ID && !!AGORA_APP_CERTIFICATE,
//       razorpay: !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET,
//     },
//   });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📍 Health check: http://localhost:${PORT}/health`);
//   console.log(`\nAvailable endpoints:`);
//   console.log(`  POST /api/agora/token - Generate Agora token`);
//   console.log(`  POST /api/razorpay/create-order - Create payment order`);
//   console.log(`  POST /api/razorpay/verify-payment - Verify payment`);
//   console.log(`  GET  /api/razorpay/payment/:id - Fetch payment details`);
//   console.log(`  POST /api/razorpay/refund - Create refund`);
// });


// // server/index.ts
// import express, { Request, Response } from 'express';
// import cors from 'cors';
// import crypto from 'crypto';
// import Razorpay from 'razorpay';
// import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
// import dotenv from 'dotenv';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors({
//   origin: '*', // In production, specify your app's origin
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID!,
//   key_secret: process.env.RAZORPAY_KEY_SECRET!,
// });

// // Agora Configuration
// const AGORA_APP_ID = process.env.AGORA_APP_ID!;
// const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

// // Validate environment variables
// if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
//   console.error('❌ AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in environment variables');
// }

// if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
//   console.error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
// }

// // ============================================
// // AGORA ENDPOINTS
// // ============================================

// /**
//  * Generate Agora RTC Token
//  * POST /api/agora/token
//  * Body: { channelName: string, uid: number, role: 'publisher' | 'subscriber' }
//  */
// app.post('/api/agora/token', (req: Request, res: Response) => {
//   try {
//     const { channelName, uid = 0, role = 'publisher' } = req.body;

//     if (!channelName) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Channel name is required' 
//       });
//     }

//     // Validate Agora credentials
//     if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
//       console.error('Agora credentials missing');
//       return res.status(500).json({ 
//         success: false,
//         error: 'Agora credentials not configured' 
//       });
//     }

//     const uidNum = parseInt(uid.toString()) || 0;
//     const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
//     // Token expires in 24 hours
//     const expirationTimeInSeconds = 86400;
//     const currentTimestamp = Math.floor(Date.now() / 1000);
//     const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

//     console.log('Generating token for:', {
//       channelName,
//       uid: uidNum,
//       role: userRole,
//       appId: AGORA_APP_ID
//     });

//     // Generate token
//     const token = RtcTokenBuilder.buildTokenWithUid(
//       AGORA_APP_ID,
//       AGORA_APP_CERTIFICATE,
//       channelName,
//       uidNum,
//       userRole,
//       privilegeExpiredTs
//     );

//     console.log('Token generated successfully');

//     res.json({
//       success: true,
//       token,
//       appId: AGORA_APP_ID,
//       channelName,
//       uid: uidNum,
//       expiresAt: privilegeExpiredTs,
//     });
//   } catch (error) {
//     console.error('Error generating Agora token:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to generate token',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Test endpoint to verify Agora configuration
//  * GET /api/agora/test
//  */
// app.get('/api/agora/test', (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     configured: !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE),
//     appId: AGORA_APP_ID ? AGORA_APP_ID.substring(0, 8) + '...' : 'NOT SET',
//     certificate: AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET'
//   });
// });

// // ============================================
// // RAZORPAY ENDPOINTS
// // ============================================

// /**
//  * Create Razorpay Order
//  * POST /api/razorpay/create-order
//  * Body: { amount: number, currency: string, receipt?: string, notes?: object }
//  */
// app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
//   try {
//     const { amount, currency = 'INR', receipt, notes } = req.body;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Valid amount is required' 
//       });
//     }

//     const options = {
//       amount: Math.round(amount * 100), // Convert to paise
//       currency,
//       receipt: receipt || `receipt_${Date.now()}`,
//       notes: notes || {},
//     };

//     console.log('Creating Razorpay order:', options);

//     const order = await razorpay.orders.create(options);

//     console.log('Order created successfully:', order.id);

//     res.json({
//       success: true,
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       receipt: order.receipt,
//     });
//   } catch (error) {
//     console.error('Error creating Razorpay order:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to create order',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Verify Razorpay Payment
//  * POST /api/razorpay/verify-payment
//  * Body: { orderId: string, paymentId: string, signature: string }
//  */
// app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
//   try {
//     const { orderId, paymentId, signature } = req.body;

//     if (!orderId || !paymentId || !signature) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Missing required fields: orderId, paymentId, signature' 
//       });
//     }

//     console.log('Verifying payment:', { orderId, paymentId });

//     // Generate signature
//     const generatedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
//       .update(`${orderId}|${paymentId}`)
//       .digest('hex');

//     const isValid = generatedSignature === signature;

//     if (isValid) {
//       console.log('Payment verified successfully');
//       res.json({
//         success: true,
//         verified: true,
//         message: 'Payment verified successfully',
//       });
//     } else {
//       console.log('Payment verification failed - signature mismatch');
//       res.status(400).json({
//         success: false,
//         verified: false,
//         message: 'Invalid payment signature',
//       });
//     }
//   } catch (error) {
//     console.error('Error verifying payment:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to verify payment',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Fetch Payment Details
//  * GET /api/razorpay/payment/:paymentId
//  */
// app.get('/api/razorpay/payment/:paymentId', async (req: Request, res: Response) => {
//   try {
//     const { paymentId } = req.params;

//     if (!paymentId) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Payment ID is required' 
//       });
//     }

//     console.log('Fetching payment:', paymentId);

//     const payment = await razorpay.payments.fetch(paymentId);

//     res.json({
//       success: true,
//       payment,
//     });
//   } catch (error) {
//     console.error('Error fetching payment:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to fetch payment',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Create Refund
//  * POST /api/razorpay/refund
//  * Body: { paymentId: string, amount?: number }
//  */
// app.post('/api/razorpay/refund', async (req: Request, res: Response) => {
//   try {
//     const { paymentId, amount } = req.body;

//     if (!paymentId) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Payment ID is required' 
//       });
//     }

//     console.log('Creating refund for payment:', paymentId);

//     const refundOptions: any = {};
//     if (amount) {
//       refundOptions.amount = Math.round(amount * 100); // Convert to paise
//     }

//     const refund = await razorpay.payments.refund(paymentId, refundOptions);

//     console.log('Refund created successfully:', refund.id);

//     res.json({
//       success: true,
//       refund,
//     });
//   } catch (error) {
//     console.error('Error creating refund:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to create refund',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Get Razorpay Key ID (for client-side initialization)
//  * GET /api/razorpay/key
//  */
// app.get('/api/razorpay/key', (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     key: process.env.RAZORPAY_KEY_ID,
//   });
// });

// // ============================================
// // HEALTH CHECK
// // ============================================

// app.get('/health', (req: Request, res: Response) => {
//   res.json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     services: {
//       agora: {
//         configured: !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE),
//         appId: AGORA_APP_ID ? 'SET' : 'NOT SET',
//         certificate: AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET'
//       },
//       razorpay: {
//         configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
//         keyId: process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET',
//         keySecret: process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET'
//       }
//     },
//   });
// });

// // Root endpoint
// app.get('/', (req: Request, res: Response) => {
//   res.json({
//     name: 'LoveConnect India API',
//     version: '1.0.0',
//     endpoints: {
//       agora: {
//         'POST /api/agora/token': 'Generate Agora RTC token',
//         'GET /api/agora/test': 'Test Agora configuration'
//       },
//       razorpay: {
//         'POST /api/razorpay/create-order': 'Create payment order',
//         'POST /api/razorpay/verify-payment': 'Verify payment',
//         'GET /api/razorpay/payment/:id': 'Fetch payment details',
//         'POST /api/razorpay/refund': 'Create refund',
//         'GET /api/razorpay/key': 'Get Razorpay key ID'
//       },
//       health: {
//         'GET /health': 'Health check endpoint'
//       }
//     }
//   });
// });

// // Error handling middleware
// app.use((err: Error, req: Request, res: Response, next: any) => {
//   console.error('Unhandled error:', err);
//   res.status(500).json({
//     success: false,
//     error: 'Internal server error',
//     details: err.message
//   });
// });

// // 404 handler
// app.use((req: Request, res: Response) => {
//   res.status(404).json({
//     success: false,
//     error: 'Endpoint not found',
//     path: req.path
//   });
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`\n🚀 Server running on port ${PORT}`);
//   console.log(`📍 Health check: http://localhost:${PORT}/health`);
//   console.log(`📍 API docs: http://localhost:${PORT}/\n`);
  
//   console.log('Available endpoints:');
//   console.log('  POST /api/agora/token - Generate Agora token');
//   console.log('  GET  /api/agora/test - Test Agora configuration');
//   console.log('  POST /api/razorpay/create-order - Create payment order');
//   console.log('  POST /api/razorpay/verify-payment - Verify payment');
//   console.log('  GET  /api/razorpay/payment/:id - Fetch payment details');
//   console.log('  POST /api/razorpay/refund - Create refund');
//   console.log('  GET  /api/razorpay/key - Get Razorpay key\n');
  
//   // Validate configurations
//   if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
//     console.warn('⚠️  WARNING: Agora credentials not configured properly');
//   } else {
//     console.log('✅ Agora configured');
//   }
  
//   if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
//     console.warn('⚠️  WARNING: Razorpay credentials not configured properly');
//   } else {
//     console.log('✅ Razorpay configured');
//   }
// });


// // server/index.ts
// import express, { Request, Response } from 'express';
// import cors from 'cors';
// import crypto from 'crypto';
// import Razorpay from 'razorpay';
// import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
// import dotenv from 'dotenv';
// import axios from 'axios';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors({
//   origin: '*', // In production, specify your app's origin
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID!,
//   key_secret: process.env.RAZORPAY_KEY_SECRET!,
// });

// // Agora Configuration
// const AGORA_APP_ID = process.env.AGORA_APP_ID!;
// const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

// // SerpAPI Configuration
// const SERPAPI_KEY = process.env.SERPAPI_KEY!;
// const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// // Validate environment variables
// if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
//   console.error('❌ AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in environment variables');
// }

// if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
//   console.error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
// }

// if (!SERPAPI_KEY) {
//   console.warn('⚠️  WARNING: SERPAPI_KEY not set. Event fetching will be disabled.');
// }

// // ============================================
// // GOOGLE EVENTS API ENDPOINTS
// // ============================================

// /**
//  * Fetch events from Google Events API
//  * POST /api/events/fetch
//  * Body: { 
//  *   location: string (e.g., "Mumbai, Maharashtra"),
//  *   category?: string,
//  *   dateFilter?: string (today, tomorrow, week, weekend, next_week, month, next_month),
//  *   onlineOnly?: boolean
//  * }
//  */
// app.post('/api/events/fetch', async (req: Request, res: Response) => {
//   try {
//     const { location, category, dateFilter, onlineOnly } = req.body;

//     if (!location) {
//       return res.status(400).json({
//         success: false,
//         error: 'Location is required'
//       });
//     }

//     if (!SERPAPI_KEY) {
//       return res.status(503).json({
//         success: false,
//         error: 'SerpAPI key not configured'
//       });
//     }

//     // Build query
//     let query = `Events in ${location}`;
//     if (category) {
//       query = `${category} events in ${location}`;
//     }

//     // Build htichips filter
//     let htichips = '';
//     const filters = [];
    
//     if (dateFilter) {
//       filters.push(`date:${dateFilter}`);
//     }
    
//     if (onlineOnly) {
//       filters.push('event_type:Virtual-Event');
//     }
    
//     if (filters.length > 0) {
//       htichips = filters.join(',');
//     }

//     console.log('Fetching events:', { query, htichips, location });

//     // Call SerpAPI
//     const params: any = {
//       engine: 'google_events',
//       q: query,
//       hl: 'en',
//       gl: 'in',
//       api_key: SERPAPI_KEY,
//     };

//     if (htichips) {
//       params.htichips = htichips;
//     }

//     const response = await axios.get(SERPAPI_BASE_URL, { params });

//     if (response.data.error) {
//       console.error('SerpAPI error:', response.data.error);
//       return res.status(500).json({
//         success: false,
//         error: 'Failed to fetch events from Google',
//         details: response.data.error
//       });
//     }

//     const events = response.data.events_results || [];

//     // Transform events to match our format
//     const transformedEvents = events.map((event: any) => ({
//       id: crypto.randomBytes(16).toString('hex'),
//       title: event.title,
//       description: event.description || '',
//       coverImage: event.thumbnail || event.event_location_map?.image || '',
//       venue: event.address?.[0] || event.venue?.name || 'Venue TBA',
//       address: event.address?.join(', ') || '',
//       startTime: parseEventDate(event.date?.start_date, event.date?.when),
//       endTime: parseEventDate(event.date?.start_date, event.date?.when, true),
//       price: extractPrice(event.ticket_info),
//       capacity: extractCapacity(event.venue),
//       attendeesCount: 0,
//       category: mapCategory(category || event.title),
//       tags: extractTags(event.title, event.description),
//       organizer: {
//         name: event.venue?.name || 'Event Organizer',
//         image: '',
//         rating: event.venue?.rating || 0,
//         verified: event.venue?.rating ? event.venue.rating >= 4.0 : false
//       },
//       ticketInfo: event.ticket_info || [],
//       externalLink: event.link || '',
//       isOnline: onlineOnly || false,
//       allowMatchmaking: true,
//       featured: event.venue?.rating ? event.venue.rating >= 4.5 : false,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     }));

//     console.log(`Fetched ${transformedEvents.length} events`);

//     res.json({
//       success: true,
//       count: transformedEvents.length,
//       location,
//       events: transformedEvents,
//       searchMetadata: response.data.search_metadata
//     });

//   } catch (error) {
//     console.error('Error fetching events:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch events',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Fetch events by coordinates
//  * POST /api/events/fetch-nearby
//  * Body: { latitude: number, longitude: number, radius?: number, category?: string }
//  */
// app.post('/api/events/fetch-nearby', async (req: Request, res: Response) => {
//   try {
//     const { latitude, longitude, radius = 25, category } = req.body;

//     if (!latitude || !longitude) {
//       return res.status(400).json({
//         success: false,
//         error: 'Latitude and longitude are required'
//       });
//     }

//     // Reverse geocode to get city name
//     // You can use a geocoding service or pass the city name directly
//     // For now, we'll use a placeholder
//     const location = req.body.cityName || 'Mumbai, India';

//     // Use the existing fetch endpoint logic
//     const result = await axios.post(`http://localhost:${PORT}/api/events/fetch`, {
//       location,
//       category
//     });

//     // Filter by distance (simplified - in production, use proper geospatial queries)
//     const events = result.data.events || [];

//     res.json({
//       success: true,
//       count: events.length,
//       location,
//       coordinates: { latitude, longitude },
//       radius,
//       events
//     });

//   } catch (error) {
//     console.error('Error fetching nearby events:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch nearby events',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Get featured events
//  * GET /api/events/featured
//  * Query: ?limit=10&location=Mumbai
//  */
// app.get('/api/events/featured', async (req: Request, res: Response) => {
//   try {
//     const { limit = 10, location = 'Mumbai, India' } = req.query;

//     if (!SERPAPI_KEY) {
//       return res.status(503).json({
//         success: false,
//         error: 'SerpAPI key not configured'
//       });
//     }

//     console.log('Fetching featured events for:', location);

//     const params = {
//       engine: 'google_events',
//       q: `trending events in ${location}`,
//       hl: 'en',
//       gl: 'in',
//       api_key: SERPAPI_KEY,
//     };

//     const response = await axios.get(SERPAPI_BASE_URL, { params });
//     const events = response.data.events_results || [];

//     // Get top-rated events
//     const featuredEvents = events
//       .filter((e: any) => e.venue?.rating && e.venue.rating >= 4.5)
//       .slice(0, parseInt(limit as string))
//       .map((event: any) => ({
//         id: crypto.randomBytes(16).toString('hex'),
//         title: event.title,
//         description: event.description || '',
//         coverImage: event.thumbnail || '',
//         venue: event.venue?.name || 'Venue TBA',
//         startTime: parseEventDate(event.date?.start_date, event.date?.when),
//         price: extractPrice(event.ticket_info),
//         rating: event.venue?.rating || 0,
//         category: mapCategory(event.title),
//         featured: true
//       }));

//     res.json({
//       success: true,
//       count: featuredEvents.length,
//       events: featuredEvents
//     });

//   } catch (error) {
//     console.error('Error fetching featured events:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to fetch featured events',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// /**
//  * Search events
//  * GET /api/events/search
//  * Query: ?q=concert&location=Mumbai&category=music
//  */
// app.get('/api/events/search', async (req: Request, res: Response) => {
//   try {
//     const { q, location = 'Mumbai, India', category, dateFilter } = req.query;

//     if (!q) {
//       return res.status(400).json({
//         success: false,
//         error: 'Search query is required'
//       });
//     }

//     if (!SERPAPI_KEY) {
//       return res.status(503).json({
//         success: false,
//         error: 'SerpAPI key not configured'
//       });
//     }

//     let query = `${q} events in ${location}`;
//     let htichips = '';

//     if (dateFilter) {
//       htichips = `date:${dateFilter}`;
//     }

//     const params: any = {
//       engine: 'google_events',
//       q: query,
//       hl: 'en',
//       gl: 'in',
//       api_key: SERPAPI_KEY,
//     };

//     if (htichips) {
//       params.htichips = htichips;
//     }

//     const response = await axios.get(SERPAPI_BASE_URL, { params });
//     const events = response.data.events_results || [];

//     const transformedEvents = events.map((event: any) => ({
//       id: crypto.randomBytes(16).toString('hex'),
//       title: event.title,
//       description: event.description || '',
//       coverImage: event.thumbnail || '',
//       venue: event.venue?.name || event.address?.[0] || 'Venue TBA',
//       startTime: parseEventDate(event.date?.start_date, event.date?.when),
//       price: extractPrice(event.ticket_info),
//       category: mapCategory(category as string || event.title),
//       externalLink: event.link
//     }));

//     res.json({
//       success: true,
//       count: transformedEvents.length,
//       query: q,
//       location,
//       events: transformedEvents
//     });

//   } catch (error) {
//     console.error('Error searching events:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Failed to search events',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// function parseEventDate(startDate: string, when: string, isEndTime = false): string {
//   try {
//     const now = new Date();
//     const currentYear = now.getFullYear();
    
//     if (!startDate) return now.toISOString();

//     // Handle formats like "Oct 1", "Jul 3"
//     const dateStr = `${startDate} ${currentYear}`;
//     const date = new Date(dateStr);

//     // If the when string contains time, parse it
//     if (when && when.includes(':')) {
//       const timeMatch = when.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
//       if (timeMatch) {
//         let hours = parseInt(timeMatch[1]);
//         const minutes = parseInt(timeMatch[2]);
//         const meridiem = timeMatch[3]?.toUpperCase();

//         if (meridiem === 'PM' && hours !== 12) hours += 12;
//         if (meridiem === 'AM' && hours === 12) hours = 0;

//         date.setHours(hours, minutes, 0, 0);

//         if (isEndTime) {
//           date.setHours(date.getHours() + 3); // Add 3 hours for end time
//         }
//       }
//     }

//     return date.toISOString();
//   } catch (error) {
//     return new Date().toISOString();
//   }
// }

// function extractPrice(ticketInfo: any[]): number {
//   if (!ticketInfo || ticketInfo.length === 0) return 0;

//   // Try to find price in ticket info
//   for (const ticket of ticketInfo) {
//     const priceMatch = ticket.source?.match(/₹(\d+)/);
//     if (priceMatch) {
//       return parseInt(priceMatch[1]);
//     }
//   }

//   // Default prices based on ticket availability
//   return ticketInfo.some(t => t.link_type === 'tickets') ? 500 : 0;
// }

// function extractCapacity(venue: any): number {
//   if (!venue) return 100;
  
//   // Estimate capacity based on venue rating and reviews
//   const reviews = venue.reviews || 0;
//   if (reviews > 1000) return 500;
//   if (reviews > 500) return 300;
//   if (reviews > 100) return 150;
//   return 100;
// }

// function mapCategory(input: string): string {
//   const lower = input.toLowerCase();
  
//   if (lower.includes('concert') || lower.includes('music')) return 'concert';
//   if (lower.includes('comedy')) return 'comedy';
//   if (lower.includes('sport')) return 'sports';
//   if (lower.includes('theater') || lower.includes('drama')) return 'theater';
//   if (lower.includes('workshop') || lower.includes('class')) return 'workshop';
//   if (lower.includes('networking') || lower.includes('meetup')) return 'networking';
//   if (lower.includes('food') || lower.includes('restaurant')) return 'food';
//   if (lower.includes('nightlife') || lower.includes('club')) return 'nightlife';
//   if (lower.includes('art') || lower.includes('gallery')) return 'art';
//   if (lower.includes('fitness') || lower.includes('yoga')) return 'fitness';
//   if (lower.includes('spiritual') || lower.includes('meditation')) return 'spiritual';
//   if (lower.includes('festival')) return 'festival';
//   if (lower.includes('dating') || lower.includes('speed dating')) return 'dating';
  
//   return 'other';
// }

// function extractTags(title: string, description: string): string[] {
//   const tags: Set<string> = new Set();
//   const text = `${title} ${description}`.toLowerCase();
  
//   const keywords = [
//     'live', 'virtual', 'online', 'outdoor', 'indoor',
//     'weekend', 'night', 'day', 'family', 'couples',
//     'singles', 'professional', 'casual', 'formal',
//     'free', 'paid', 'premium', 'exclusive'
//   ];

//   keywords.forEach(keyword => {
//     if (text.includes(keyword)) {
//       tags.add(keyword);
//     }
//   });

//   return Array.from(tags).slice(0, 5);
// }

// // ============================================
// // AGORA ENDPOINTS (unchanged)
// // ============================================

// app.post('/api/agora/token', (req: Request, res: Response) => {
//   try {
//     const { channelName, uid = 0, role = 'publisher' } = req.body;

//     if (!channelName) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Channel name is required' 
//       });
//     }

//     if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
//       console.error('Agora credentials missing');
//       return res.status(500).json({ 
//         success: false,
//         error: 'Agora credentials not configured' 
//       });
//     }

//     const uidNum = parseInt(uid.toString()) || 0;
//     const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
//     const expirationTimeInSeconds = 86400;
//     const currentTimestamp = Math.floor(Date.now() / 1000);
//     const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

//     const token = RtcTokenBuilder.buildTokenWithUid(
//       AGORA_APP_ID,
//       AGORA_APP_CERTIFICATE,
//       channelName,
//       uidNum,
//       userRole,
//       privilegeExpiredTs
//     );

//     res.json({
//       success: true,
//       token,
//       appId: AGORA_APP_ID,
//       channelName,
//       uid: uidNum,
//       expiresAt: privilegeExpiredTs,
//     });
//   } catch (error) {
//     console.error('Error generating Agora token:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to generate token',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// app.get('/api/agora/test', (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     configured: !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE),
//     appId: AGORA_APP_ID ? AGORA_APP_ID.substring(0, 8) + '...' : 'NOT SET',
//     certificate: AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET'
//   });
// });

// // ============================================
// // RAZORPAY ENDPOINTS (unchanged)
// // ============================================

// app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
//   try {
//     const { amount, currency = 'INR', receipt, notes } = req.body;

//     if (!amount || amount <= 0) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Valid amount is required' 
//       });
//     }

//     const options = {
//       amount: Math.round(amount * 100),
//       currency,
//       receipt: receipt || `receipt_${Date.now()}`,
//       notes: notes || {},
//     };

//     const order = await razorpay.orders.create(options);

//     res.json({
//       success: true,
//       orderId: order.id,
//       amount: order.amount,
//       currency: order.currency,
//       receipt: order.receipt,
//     });
//   } catch (error) {
//     console.error('Error creating Razorpay order:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to create order',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
//   try {
//     const { orderId, paymentId, signature } = req.body;

//     if (!orderId || !paymentId || !signature) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Missing required fields: orderId, paymentId, signature' 
//       });
//     }

//     const generatedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
//       .update(`${orderId}|${paymentId}`)
//       .digest('hex');

//     const isValid = generatedSignature === signature;

//     if (isValid) {
//       res.json({
//         success: true,
//         verified: true,
//         message: 'Payment verified successfully',
//       });
//     } else {
//       res.status(400).json({
//         success: false,
//         verified: false,
//         message: 'Invalid payment signature',
//       });
//     }
//   } catch (error) {
//     console.error('Error verifying payment:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to verify payment',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// app.get('/api/razorpay/payment/:paymentId', async (req: Request, res: Response) => {
//   try {
//     const { paymentId } = req.params;

//     if (!paymentId) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Payment ID is required' 
//       });
//     }

//     const payment = await razorpay.payments.fetch(paymentId);

//     res.json({
//       success: true,
//       payment,
//     });
//   } catch (error) {
//     console.error('Error fetching payment:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to fetch payment',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// app.post('/api/razorpay/refund', async (req: Request, res: Response) => {
//   try {
//     const { paymentId, amount } = req.body;

//     if (!paymentId) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Payment ID is required' 
//       });
//     }

//     const refundOptions: any = {};
//     if (amount) {
//       refundOptions.amount = Math.round(amount * 100);
//     }

//     const refund = await razorpay.payments.refund(paymentId, refundOptions);

//     res.json({
//       success: true,
//       refund,
//     });
//   } catch (error) {
//     console.error('Error creating refund:', error);
//     res.status(500).json({ 
//       success: false,
//       error: 'Failed to create refund',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

// app.get('/api/razorpay/key', (req: Request, res: Response) => {
//   res.json({
//     success: true,
//     key: process.env.RAZORPAY_KEY_ID,
//   });
// });

// // ============================================
// // HEALTH CHECK
// // ============================================

// app.get('/health', (req: Request, res: Response) => {
//   res.json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     services: {
//       agora: {
//         configured: !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE),
//         appId: AGORA_APP_ID ? 'SET' : 'NOT SET',
//         certificate: AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET'
//       },
//       razorpay: {
//         configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
//         keyId: process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET',
//         keySecret: process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET'
//       },
//       serpapi: {
//         configured: !!SERPAPI_KEY,
//         key: SERPAPI_KEY ? 'SET' : 'NOT SET'
//       }
//     },
//   });
// });

// app.get('/', (req: Request, res: Response) => {
//   res.json({
//     name: 'LoveConnect India API',
//     version: '2.0.0',
//     endpoints: {
//       events: {
//         'POST /api/events/fetch': 'Fetch events by location',
//         'POST /api/events/fetch-nearby': 'Fetch events by coordinates',
//         'GET /api/events/featured': 'Get featured events',
//         'GET /api/events/search': 'Search events'
//       },
//       agora: {
//         'POST /api/agora/token': 'Generate Agora RTC token',
//         'GET /api/agora/test': 'Test Agora configuration'
//       },
//       razorpay: {
//         'POST /api/razorpay/create-order': 'Create payment order',
//         'POST /api/razorpay/verify-payment': 'Verify payment',
//         'GET /api/razorpay/payment/:id': 'Fetch payment details',
//         'POST /api/razorpay/refund': 'Create refund',
//         'GET /api/razorpay/key': 'Get Razorpay key ID'
//       },
//       health: {
//         'GET /health': 'Health check endpoint'
//       }
//     }
//   });
// });

// app.use((err: Error, req: Request, res: Response, next: any) => {
//   console.error('Unhandled error:', err);
//   res.status(500).json({
//     success: false,
//     error: 'Internal server error',
//     details: err.message
//   });
// });

// app.use((req: Request, res: Response) => {
//   res.status(404).json({
//     success: false,
//     error: 'Endpoint not found',
//     path: req.path
//   });
// });

// app.listen(PORT, () => {
//   console.log(`\n🚀 Server running on port ${PORT}`);
//   console.log(`📍 Health check: http://localhost:${PORT}/health`);
//   console.log(`📍 API docs: http://localhost:${PORT}/\n`);
  
//   console.log('Available endpoints:');
//   console.log('  POST /api/events/fetch - Fetch events by location');
//   console.log('  POST /api/events/fetch-nearby - Fetch events by coordinates');
//   console.log('  GET  /api/events/featured - Get featured events');
//   console.log('  GET  /api/events/search - Search events');
//   console.log('  POST /api/agora/token - Generate Agora token');
//   console.log('  GET  /api/agora/test - Test Agora configuration');
//   console.log('  POST /api/razorpay/create-order - Create payment order');
//   console.log('  POST /api/razorpay/verify-payment - Verify payment');
//   console.log('  GET  /api/razorpay/payment/:id - Fetch payment details');
//   console.log('  POST /api/razorpay/refund - Create refund');
//   console.log('  GET  /api/razorpay/key - Get Razorpay key\n');
  
//   if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
//     console.warn('⚠️  WARNING: Agora credentials not configured properly');
//   } else {
//     console.log('✅ Agora configured');
//   }
  
//   if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
//     console.warn('⚠️  WARNING: Razorpay credentials not configured properly');
//   } else {
//     console.log('✅ Razorpay configured');
//   }

//   if (!SERPAPI_KEY) {
//     console.warn('⚠️  WARNING: SerpAPI key not configured');
//   } else {
//     console.log('✅ SerpAPI configured');
//   }
// });


// server/index.ts - Updated with fallback logic for small cities
import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Agora Configuration
const AGORA_APP_ID = process.env.AGORA_APP_ID!;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

// SerpAPI Configuration
const SERPAPI_KEY = process.env.SERPAPI_KEY!;
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Major cities fallback map for Maharashtra
const MAJOR_CITIES_MAP: Record<string, string> = {
  'maharashtra': 'Mumbai, Maharashtra',
  'mumbai': 'Mumbai, Maharashtra',
  'pune': 'Pune, Maharashtra',
  'nagpur': 'Nagpur, Maharashtra',
  'nashik': 'Nashik, Maharashtra',
  'aurangabad': 'Aurangabad, Maharashtra',
  'thane': 'Thane, Maharashtra',
  'navi mumbai': 'Navi Mumbai, Maharashtra',
};

// Get nearest major city
function getNearestMajorCity(location: string): string {
  const lowerLocation = location.toLowerCase();
  
  // Check if location contains any major city name
  for (const [city, fullName] of Object.entries(MAJOR_CITIES_MAP)) {
    if (lowerLocation.includes(city)) {
      return fullName;
    }
  }
  
  // Default fallback to Mumbai for Maharashtra
  if (lowerLocation.includes('maharashtra')) {
    return 'Mumbai, Maharashtra';
  }
  
  // If state is mentioned but not Maharashtra, try to extract state name
  const stateMatch = location.match(/,\s*([^,]+)$/);
  if (stateMatch) {
    const state = stateMatch[1].trim();
    return `${state} city, ${state}`; // Generic state capital fallback
  }
  
  return 'Mumbai, India'; // Ultimate fallback
}

// Validate environment variables
if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  console.error('❌ AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set');
}

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
}

if (!SERPAPI_KEY) {
  console.warn('⚠️  WARNING: SERPAPI_KEY not set. Event fetching will be disabled.');
}

// ============================================
// GOOGLE EVENTS API ENDPOINTS
// ============================================

/**
 * Fetch events with automatic fallback to nearby major city
 */
async function fetchEventsWithFallback(
  location: string,
  category?: string,
  dateFilter?: string,
  onlineOnly?: boolean,
  retryCount = 0
): Promise<{ events: any[], searchedLocation: string, wasFallback: boolean }> {
  
  const maxRetries = 2;
  let currentLocation = location;
  let wasFallback = false;

  // Build query
  let query = `Events in ${currentLocation}`;
  if (category) {
    query = `${category} events in ${currentLocation}`;
  }

  // Build htichips filter
  let htichips = '';
  const filters = [];
  
  if (dateFilter) {
    filters.push(`date:${dateFilter}`);
  }
  
  if (onlineOnly) {
    filters.push('event_type:Virtual-Event');
  }
  
  if (filters.length > 0) {
    htichips = filters.join(',');
  }

  console.log(`[Attempt ${retryCount + 1}] Fetching events:`, { query, htichips, location: currentLocation });

  try {
    // Call SerpAPI
    const params: any = {
      engine: 'google_events',
      q: query,
      hl: 'en',
      gl: 'in',
      api_key: SERPAPI_KEY,
    };

    if (htichips) {
      params.htichips = htichips;
    }

    const response = await axios.get(SERPAPI_BASE_URL, { 
      params,
      timeout: 10000 // 10 second timeout
    });

    // Check if we got results
    const events = response.data.events_results || [];
    
    if (events.length === 0 && retryCount < maxRetries) {
      // No results found, try fallback to major city
      console.log(`No events found for "${currentLocation}". Trying fallback to major city...`);
      const fallbackCity = getNearestMajorCity(currentLocation);
      
      if (fallbackCity !== currentLocation) {
        return await fetchEventsWithFallback(fallbackCity, category, dateFilter, onlineOnly, retryCount + 1);
      }
    }

    if (retryCount > 0) {
      wasFallback = true;
    }

    return {
      events,
      searchedLocation: currentLocation,
      wasFallback
    };

  } catch (error: any) {
    console.error(`SerpAPI error for "${currentLocation}":`, error.message);
    
    // If this is not the last retry and we haven't tried a major city yet
    if (retryCount < maxRetries) {
      const fallbackCity = getNearestMajorCity(currentLocation);
      
      if (fallbackCity !== currentLocation) {
        console.log(`Retrying with fallback city: ${fallbackCity}`);
        return await fetchEventsWithFallback(fallbackCity, category, dateFilter, onlineOnly, retryCount + 1);
      }
    }
    
    throw error;
  }
}

/**
 * Fetch events from Google Events API
 * POST /api/events/fetch
 */
app.post('/api/events/fetch', async (req: Request, res: Response) => {
  try {
    const { location, category, dateFilter, onlineOnly } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }

    if (!SERPAPI_KEY) {
      return res.status(503).json({
        success: false,
        error: 'SerpAPI key not configured'
      });
    }

    const { events, searchedLocation, wasFallback } = await fetchEventsWithFallback(
      location,
      category,
      dateFilter,
      onlineOnly
    );

    // Transform events to match our format
    const transformedEvents = events.map((event: any) => ({
      id: crypto.randomBytes(16).toString('hex'),
      title: event.title,
      description: event.description || '',
      coverImage: event.thumbnail || event.event_location_map?.image || '',
      venue: event.address?.[0] || event.venue?.name || 'Venue TBA',
      address: event.address?.join(', ') || '',
      startTime: parseEventDate(event.date?.start_date, event.date?.when),
      endTime: parseEventDate(event.date?.start_date, event.date?.when, true),
      price: extractPrice(event.ticket_info),
      capacity: extractCapacity(event.venue),
      attendeesCount: 0,
      category: mapCategory(category || event.title),
      tags: extractTags(event.title, event.description),
      organizer: {
        name: event.venue?.name || 'Event Organizer',
        image: '',
        rating: event.venue?.rating || 0,
        verified: event.venue?.rating ? event.venue.rating >= 4.0 : false
      },
      ticketInfo: event.ticket_info || [],
      externalLink: event.link || '',
      isOnline: onlineOnly || false,
      allowMatchmaking: true,
      featured: event.venue?.rating ? event.venue.rating >= 4.5 : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add location for distance calculation
      location: event.venue?.gps_coordinates ? {
        latitude: event.venue.gps_coordinates.latitude,
        longitude: event.venue.gps_coordinates.longitude
      } : undefined
    }));

    console.log(`✅ Fetched ${transformedEvents.length} events from ${searchedLocation}`);

    res.json({
      success: true,
      count: transformedEvents.length,
      requestedLocation: location,
      searchedLocation: searchedLocation,
      wasFallback: wasFallback,
      fallbackMessage: wasFallback 
        ? `No events found in ${location}. Showing events from ${searchedLocation} instead.`
        : undefined,
      events: transformedEvents,
      searchMetadata: {
        timestamp: new Date().toISOString(),
        query: req.body
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fetch events by coordinates with city name resolution
 * POST /api/events/fetch-nearby
 */
app.post('/api/events/fetch-nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 25, category, cityName } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    if (!SERPAPI_KEY) {
      return res.status(503).json({
        success: false,
        error: 'SerpAPI key not configured'
      });
    }

    // Use provided city name or default
    const location = cityName || 'Mumbai, India';

    console.log('Fetching nearby events for:', { latitude, longitude, location, radius });

    const { events, searchedLocation, wasFallback } = await fetchEventsWithFallback(
      location,
      category
    );

    // Transform events
    const transformedEvents = events.map((event: any) => ({
      id: crypto.randomBytes(16).toString('hex'),
      title: event.title,
      description: event.description || '',
      coverImage: event.thumbnail || event.event_location_map?.image || '',
      venue: event.address?.[0] || event.venue?.name || 'Venue TBA',
      address: event.address?.join(', ') || '',
      startTime: parseEventDate(event.date?.start_date, event.date?.when),
      endTime: parseEventDate(event.date?.start_date, event.date?.when, true),
      price: extractPrice(event.ticket_info),
      capacity: extractCapacity(event.venue),
      attendeesCount: 0,
      category: mapCategory(category || event.title),
      tags: extractTags(event.title, event.description),
      organizer: {
        name: event.venue?.name || 'Event Organizer',
        image: '',
        rating: event.venue?.rating || 0,
        verified: event.venue?.rating ? event.venue.rating >= 4.0 : false
      },
      ticketInfo: event.ticket_info || [],
      externalLink: event.link || '',
      isOnline: false,
      allowMatchmaking: true,
      featured: event.venue?.rating ? event.venue.rating >= 4.5 : false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: event.venue?.gps_coordinates ? {
        latitude: event.venue.gps_coordinates.latitude,
        longitude: event.venue.gps_coordinates.longitude
      } : undefined
    }));

    res.json({
      success: true,
      count: transformedEvents.length,
      requestedLocation: location,
      searchedLocation: searchedLocation,
      wasFallback: wasFallback,
      coordinates: { latitude, longitude },
      radius,
      fallbackMessage: wasFallback 
        ? `No events found near your location. Showing events from ${searchedLocation}.`
        : undefined,
      events: transformedEvents
    });

  } catch (error) {
    console.error('Error fetching nearby events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get featured events with fallback
 * GET /api/events/featured
 */
app.get('/api/events/featured', async (req: Request, res: Response) => {
  try {
    const { limit = 10, location = 'Mumbai, India' } = req.query;

    if (!SERPAPI_KEY) {
      return res.status(503).json({
        success: false,
        error: 'SerpAPI key not configured'
      });
    }

    console.log('Fetching featured events for:', location);

    const { events, searchedLocation, wasFallback } = await fetchEventsWithFallback(
      location as string,
      undefined, // no category filter
      undefined, // no date filter
      false
    );

    // Get top-rated events
    const featuredEvents = events
      .filter((e: any) => e.venue?.rating && e.venue.rating >= 4.0)
      .sort((a: any, b: any) => (b.venue?.rating || 0) - (a.venue?.rating || 0))
      .slice(0, parseInt(limit as string))
      .map((event: any) => ({
        id: crypto.randomBytes(16).toString('hex'),
        title: event.title,
        description: event.description || '',
        coverImage: event.thumbnail || '',
        venue: event.venue?.name || 'Venue TBA',
        startTime: parseEventDate(event.date?.start_date, event.date?.when),
        price: extractPrice(event.ticket_info),
        rating: event.venue?.rating || 0,
        category: mapCategory(event.title),
        featured: true,
        externalLink: event.link || '',
        location: event.venue?.gps_coordinates ? {
          latitude: event.venue.gps_coordinates.latitude,
          longitude: event.venue.gps_coordinates.longitude
        } : undefined
      }));

    res.json({
      success: true,
      count: featuredEvents.length,
      requestedLocation: location,
      searchedLocation: searchedLocation,
      wasFallback: wasFallback,
      events: featuredEvents
    });

  } catch (error) {
    console.error('Error fetching featured events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Search events with fallback
 * GET /api/events/search
 */
app.get('/api/events/search', async (req: Request, res: Response) => {
  try {
    const { q, location = 'Mumbai, India', category, dateFilter } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    if (!SERPAPI_KEY) {
      return res.status(503).json({
        success: false,
        error: 'SerpAPI key not configured'
      });
    }

    const { events, searchedLocation, wasFallback } = await fetchEventsWithFallback(
      location as string,
      `${q} ${category || ''}`.trim(),
      dateFilter as string,
      false
    );

    const transformedEvents = events.map((event: any) => ({
      id: crypto.randomBytes(16).toString('hex'),
      title: event.title,
      description: event.description || '',
      coverImage: event.thumbnail || '',
      venue: event.venue?.name || event.address?.[0] || 'Venue TBA',
      startTime: parseEventDate(event.date?.start_date, event.date?.when),
      price: extractPrice(event.ticket_info),
      category: mapCategory(category as string || event.title),
      externalLink: event.link,
      location: event.venue?.gps_coordinates ? {
        latitude: event.venue.gps_coordinates.latitude,
        longitude: event.venue.gps_coordinates.longitude
      } : undefined
    }));

    res.json({
      success: true,
      count: transformedEvents.length,
      query: q,
      requestedLocation: location,
      searchedLocation: searchedLocation,
      wasFallback: wasFallback,
      events: transformedEvents
    });

  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseEventDate(startDate: string, when: string, isEndTime = false): string {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (!startDate) return now.toISOString();

    const dateStr = `${startDate} ${currentYear}`;
    const date = new Date(dateStr);

    if (when && when.includes(':')) {
      const timeMatch = when.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const meridiem = timeMatch[3]?.toUpperCase();

        if (meridiem === 'PM' && hours !== 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        date.setHours(hours, minutes, 0, 0);

        if (isEndTime) {
          date.setHours(date.getHours() + 3);
        }
      }
    }

    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

function extractPrice(ticketInfo: any[]): number {
  if (!ticketInfo || ticketInfo.length === 0) return 0;

  for (const ticket of ticketInfo) {
    const priceMatch = ticket.source?.match(/₹(\d+)/);
    if (priceMatch) {
      return parseInt(priceMatch[1]);
    }
  }

  return ticketInfo.some(t => t.link_type === 'tickets') ? 500 : 0;
}

function extractCapacity(venue: any): number {
  if (!venue) return 100;
  
  const reviews = venue.reviews || 0;
  if (reviews > 1000) return 500;
  if (reviews > 500) return 300;
  if (reviews > 100) return 150;
  return 100;
}

function mapCategory(input: string): string {
  const lower = input.toLowerCase();
  
  if (lower.includes('concert') || lower.includes('music')) return 'concert';
  if (lower.includes('comedy')) return 'comedy';
  if (lower.includes('sport')) return 'sports';
  if (lower.includes('theater') || lower.includes('drama')) return 'theater';
  if (lower.includes('workshop') || lower.includes('class')) return 'workshop';
  if (lower.includes('networking') || lower.includes('meetup')) return 'networking';
  if (lower.includes('food') || lower.includes('restaurant')) return 'food';
  if (lower.includes('nightlife') || lower.includes('club')) return 'nightlife';
  if (lower.includes('art') || lower.includes('gallery')) return 'art';
  if (lower.includes('fitness') || lower.includes('yoga')) return 'fitness';
  if (lower.includes('spiritual') || lower.includes('meditation')) return 'spiritual';
  if (lower.includes('festival')) return 'festival';
  if (lower.includes('dating') || lower.includes('speed dating')) return 'dating';
  
  return 'other';
}

function extractTags(title: string, description: string): string[] {
  const tags: Set<string> = new Set();
  const text = `${title} ${description}`.toLowerCase();
  
  const keywords = [
    'live', 'virtual', 'online', 'outdoor', 'indoor',
    'weekend', 'night', 'day', 'family', 'couples',
    'singles', 'professional', 'casual', 'formal',
    'free', 'paid', 'premium', 'exclusive'
  ];

  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      tags.add(keyword);
    }
  });

  return Array.from(tags).slice(0, 5);
}

// ============================================
// AGORA ENDPOINTS
// ============================================

app.post('/api/agora/token', (req: Request, res: Response) => {
  try {
    const { channelName, uid = 0, role = 'publisher' } = req.body;

    if (!channelName) {
      return res.status(400).json({ 
        success: false,
        error: 'Channel name is required' 
      });
    }

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      return res.status(500).json({ 
        success: false,
        error: 'Agora credentials not configured' 
      });
    }

    const uidNum = parseInt(uid.toString()) || 0;
    const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uidNum,
      userRole,
      privilegeExpiredTs
    );

    res.json({
      success: true,
      token,
      appId: AGORA_APP_ID,
      channelName,
      uid: uidNum,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// RAZORPAY ENDPOINTS
// ============================================

app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required' 
      });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === signature;

    res.json({
      success: true,
      verified: isValid,
      message: isValid ? 'Payment verified successfully' : 'Invalid payment signature',
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to verify payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/razorpay/key', (req: Request, res: Response) => {
  res.json({
    success: true,
    key: process.env.RAZORPAY_KEY_ID,
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      agora: { configured: !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE) },
      razorpay: { configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) },
      serpapi: { configured: !!SERPAPI_KEY }
    },
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'LoveConnect India API',
    version: '2.0.0',
    status: 'running'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  if (AGORA_APP_ID && AGORA_APP_CERTIFICATE) console.log('✅ Agora configured');
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) console.log('✅ Razorpay configured');
  if (SERPAPI_KEY) console.log('✅ SerpAPI configured');
});
