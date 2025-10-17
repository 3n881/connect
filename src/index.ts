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


// server/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // In production, specify your app's origin
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

// Validate environment variables
if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  console.error('❌ AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in environment variables');
}

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('❌ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
}

// ============================================
// AGORA ENDPOINTS
// ============================================

/**
 * Generate Agora RTC Token
 * POST /api/agora/token
 * Body: { channelName: string, uid: number, role: 'publisher' | 'subscriber' }
 */
app.post('/api/agora/token', (req: Request, res: Response) => {
  try {
    const { channelName, uid = 0, role = 'publisher' } = req.body;

    if (!channelName) {
      return res.status(400).json({ 
        success: false,
        error: 'Channel name is required' 
      });
    }

    // Validate Agora credentials
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('Agora credentials missing');
      return res.status(500).json({ 
        success: false,
        error: 'Agora credentials not configured' 
      });
    }

    const uidNum = parseInt(uid.toString()) || 0;
    const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    // Token expires in 24 hours
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    console.log('Generating token for:', {
      channelName,
      uid: uidNum,
      role: userRole,
      appId: AGORA_APP_ID
    });

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uidNum,
      userRole,
      privilegeExpiredTs
    );

    console.log('Token generated successfully');

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

/**
 * Test endpoint to verify Agora configuration
 * GET /api/agora/test
 */
app.get('/api/agora/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    configured: !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE),
    appId: AGORA_APP_ID ? AGORA_APP_ID.substring(0, 8) + '...' : 'NOT SET',
    certificate: AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET'
  });
});

// ============================================
// RAZORPAY ENDPOINTS
// ============================================

/**
 * Create Razorpay Order
 * POST /api/razorpay/create-order
 * Body: { amount: number, currency: string, receipt?: string, notes?: object }
 */
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
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    console.log('Creating Razorpay order:', options);

    const order = await razorpay.orders.create(options);

    console.log('Order created successfully:', order.id);

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

/**
 * Verify Razorpay Payment
 * POST /api/razorpay/verify-payment
 * Body: { orderId: string, paymentId: string, signature: string }
 */
app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: orderId, paymentId, signature' 
      });
    }

    console.log('Verifying payment:', { orderId, paymentId });

    // Generate signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === signature;

    if (isValid) {
      console.log('Payment verified successfully');
      res.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully',
      });
    } else {
      console.log('Payment verification failed - signature mismatch');
      res.status(400).json({
        success: false,
        verified: false,
        message: 'Invalid payment signature',
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to verify payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fetch Payment Details
 * GET /api/razorpay/payment/:paymentId
 */
app.get('/api/razorpay/payment/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment ID is required' 
      });
    }

    console.log('Fetching payment:', paymentId);

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create Refund
 * POST /api/razorpay/refund
 * Body: { paymentId: string, amount?: number }
 */
app.post('/api/razorpay/refund', async (req: Request, res: Response) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment ID is required' 
      });
    }

    console.log('Creating refund for payment:', paymentId);

    const refundOptions: any = {};
    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    console.log('Refund created successfully:', refund.id);

    res.json({
      success: true,
      refund,
    });
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get Razorpay Key ID (for client-side initialization)
 * GET /api/razorpay/key
 */
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
      agora: {
        configured: !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE),
        appId: AGORA_APP_ID ? 'SET' : 'NOT SET',
        certificate: AGORA_APP_CERTIFICATE ? 'SET' : 'NOT SET'
      },
      razorpay: {
        configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        keyId: process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET',
        keySecret: process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET'
      }
    },
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'LoveConnect India API',
    version: '1.0.0',
    endpoints: {
      agora: {
        'POST /api/agora/token': 'Generate Agora RTC token',
        'GET /api/agora/test': 'Test Agora configuration'
      },
      razorpay: {
        'POST /api/razorpay/create-order': 'Create payment order',
        'POST /api/razorpay/verify-payment': 'Verify payment',
        'GET /api/razorpay/payment/:id': 'Fetch payment details',
        'POST /api/razorpay/refund': 'Create refund',
        'GET /api/razorpay/key': 'Get Razorpay key ID'
      },
      health: {
        'GET /health': 'Health check endpoint'
      }
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 API docs: http://localhost:${PORT}/\n`);
  
  console.log('Available endpoints:');
  console.log('  POST /api/agora/token - Generate Agora token');
  console.log('  GET  /api/agora/test - Test Agora configuration');
  console.log('  POST /api/razorpay/create-order - Create payment order');
  console.log('  POST /api/razorpay/verify-payment - Verify payment');
  console.log('  GET  /api/razorpay/payment/:id - Fetch payment details');
  console.log('  POST /api/razorpay/refund - Create refund');
  console.log('  GET  /api/razorpay/key - Get Razorpay key\n');
  
  // Validate configurations
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    console.warn('⚠️  WARNING: Agora credentials not configured properly');
  } else {
    console.log('✅ Agora configured');
  }
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️  WARNING: Razorpay credentials not configured properly');
  } else {
    console.log('✅ Razorpay configured');
  }
});
